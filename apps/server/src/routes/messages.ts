import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/authenticate';
import { io } from '../index';
import {
  createMentionNotifications,
  createNotification,
} from '../utils/notifications';

const router = Router({ mergeParams: true });
router.use(authenticate);

const sendMessageSchema = z.object({
  content: z.string().min(1).max(50000),
  replyToId: z.string().optional(),
});

async function isMember(userId: string, workspaceId: string): Promise<boolean> {
  const member = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: { userId, workspaceId },
    },
  });
  return !!member;
}

// Extract URLs from message content (plain text or JSON)
function extractUrls(content: string): string[] {
  const urls: string[] = [];
  const urlRegex = /https?:\/\/[^\s"'<>]+/gi;
  const matches = content.match(urlRegex);
  if (matches) urls.push(...matches);
  return [...new Set(urls)]; // deduplicate
}

// Extract plain text from Lexical JSON or return raw string
function extractPlainText(content: string): string {
  try {
    const parsed = JSON.parse(content);
    if (parsed?.plainText) return parsed.plainText;
  } catch {}
  return content;
}

// GET /api/workspaces/:workspaceId/topics/:topicId/messages
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId, topicId } = req.params;

    if (!(await isMember(req.user!.userId, workspaceId))) {
      res.status(403).json({ status: "error", message: "Access denied" });
      return;
    }

    const cursor = req.query.cursor as string | undefined;
    const limit = 50;

    const messages = await prisma.message.findMany({
      where: {
        topicId,
        replyToId: null,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      ...(cursor && {
        skip: 1,
        cursor: { id: cursor },
      }),
      include: {
        author: {
          select: { id: true, name: true },
        },
        _count: {
          select: { replies: true },
        },
      },
    });

    const nextCursor =
      messages.length === limit ? messages[messages.length - 1].id : null;

    res.status(200).json({
      data: {
        messages: messages.reverse(),
        nextCursor,
      },
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

// POST /api/workspaces/:workspaceId/topics/:topicId/messages
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId, topicId } = req.params;

    if (!(await isMember(req.user!.userId, workspaceId))) {
      res.status(403).json({ status: 'error', message: 'Access denied' });
      return;
    }

    const body = sendMessageSchema.safeParse(req.body);
    if (!body.success) {
      res
        .status(422)
        .json({ status: 'error', message: body.error.errors[0].message });
      return;
    }

    // Verify topic belongs to workspace
    const topic = await prisma.topic.findUnique({
      where: { id: topicId },
    });

    if (!topic || topic.workspaceId !== workspaceId) {
      res.status(404).json({ status: 'error', message: 'Topic not found' });
      return;
    }

    const replyToId = req.body.replyToId as string | undefined;

    // Validate replyToId exists if provided
    if (replyToId) {
      const parent = await prisma.message.findUnique({
        where: { id: replyToId },
      });
      if (!parent || parent.topicId !== topicId) {
        res.status(404).json({ status: "error", message: "Parent message not found" });
        return;
      }
    }

    const message = await prisma.message.create({
      data: {
        content: body.data.content,
        topicId,
        authorId: req.user!.userId,
        ...(replyToId ? { replyToId } : {}),
      },
      include: {
        author: {
          select: { id: true, name: true },
        },
        _count: {
          select: { replies: true },
        },
      },
    });

    // Auto-extract URLs and save to SharedLink
    const plainText = extractPlainText(body.data.content);
    const urls = extractUrls(plainText);
    if (urls.length > 0) {
      await Promise.all(
        urls.map((url) =>
          prisma.sharedLink.create({
            data: {
              url,
              topicId,
              sharedById: req.user!.userId,
              messageId: message.id,
            },
          }).catch(() => {}) // Ignore duplicate or invalid URLs
        )
      );
    }

    io.to(topicId).emit('message:new', { message });

    // Trigger mention notifications
    await createMentionNotifications({
      content: body.data.content,
      actorId: req.user!.userId,
      workspaceId,
      topicId,
      messageId: message.id,
    });

    // Trigger reply notification
    if (body.data.replyToId) {
      const originalMessage = await prisma.message.findUnique({
        where: { id: body.data.replyToId },
        select: { authorId: true },
      });
      if (originalMessage) {
        await createNotification({
          type: 'REPLY',
          userId: originalMessage.authorId,
          actorId: req.user!.userId,
          workspaceId,
          topicId,
          messageId: message.id,
        });
      }
    }

    res.status(201).json({ data: { message } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// GET /api/workspaces/:workspaceId/topics/:topicId/messages/:messageId/replies
router.get('/:messageId/replies', async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId, topicId, messageId } = req.params;

    if (!(await isMember(req.user!.userId, workspaceId))) {
      res.status(403).json({ status: 'error', message: 'Access denied' });
      return;
    }

    const replies = await prisma.message.findMany({
      where: { topicId, replyToId: messageId },
      orderBy: { createdAt: 'asc' },
      include: {
        author: { select: { id: true, name: true } },
      },
    });

    res.status(200).json({ data: { messages: replies } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// DELETE /api/workspaces/:workspaceId/topics/:topicId/messages/:messageId
router.delete('/:messageId', async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId, topicId, messageId } = req.params;
    const { deleteFor } = req.query; // 'me' | 'everyone'

    if (!(await isMember(req.user!.userId, workspaceId))) {
      res.status(403).json({ status: 'error', message: 'Access denied' });
      return;
    }

    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message || message.topicId !== topicId) {
      res.status(404).json({ status: 'error', message: 'Message not found' });
      return;
    }

    if (deleteFor === 'everyone') {
      // Only author can delete for everyone
      if (message.authorId !== req.user!.userId) {
        res.status(403).json({ status: 'error', message: 'Only the author can delete for everyone' });
        return;
      }
      // Soft-delete: mark as deleted
      const updated = await prisma.message.update({
        where: { id: messageId },
        data: { content: '__deleted__', deletedAt: new Date() } as any,
        include: { author: { select: { id: true, name: true } } },
      });
      io.to(topicId).emit('message:deleted', { messageId, topicId, deletedFor: 'everyone' });
      res.status(200).json({ data: { message: updated } });
    } else {
      // Delete for me — just acknowledge, frontend handles local removal
      io.to(topicId).emit('message:deleted:me', {
        messageId,
        topicId,
        userId: req.user!.userId,
      });
      res.status(200).json({ data: { messageId, deletedFor: 'me' } });
    }
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

export default router;
