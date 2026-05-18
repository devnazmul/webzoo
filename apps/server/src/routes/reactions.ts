import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/authenticate';
import { io } from '../index';

const router = Router({ mergeParams: true });
router.use(authenticate);

async function isMember(userId: string, workspaceId: string): Promise<boolean> {
  const member = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
  });
  return !!member;
}

const reactionSchema = z.object({
  emoji: z.string().min(1).max(10),
});

// POST /api/workspaces/:workspaceId/topics/:topicId/messages/:messageId/reactions
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId, topicId, messageId } = req.params;
    if (!(await isMember(req.user!.userId, workspaceId))) {
      res.status(403).json({ status: 'error', message: 'Access denied' });
      return;
    }

    const body = reactionSchema.safeParse(req.body);
    if (!body.success) {
      res.status(422).json({ status: 'error', message: body.error.errors[0].message });
      return;
    }

    // Toggle reaction — if exists remove it, if not add it
    const existing = await prisma.reaction.findUnique({
      where: {
        messageId_userId_emoji: {
          messageId,
          userId: req.user!.userId,
          emoji: body.data.emoji,
        },
      },
    });

    if (existing) {
      await prisma.reaction.delete({ where: { id: existing.id } });
    } else {
      await prisma.reaction.create({
        data: {
          emoji: body.data.emoji,
          messageId,
          userId: req.user!.userId,
        },
      });
    }

    // Get updated reactions for this message
    const reactions = await prisma.reaction.findMany({
      where: { messageId },
      include: {
        user: { select: { id: true, name: true } },
      },
    });

    // Emit real-time update to topic room
    io.to(topicId).emit('reaction:update', { messageId, reactions });

    res.status(200).json({ data: { reactions } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// GET /api/workspaces/:workspaceId/topics/:topicId/messages/:messageId/reactions
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId, messageId } = req.params;
    if (!(await isMember(req.user!.userId, workspaceId))) {
      res.status(403).json({ status: 'error', message: 'Access denied' });
      return;
    }

    const reactions = await prisma.reaction.findMany({
      where: { messageId },
      include: {
        user: { select: { id: true, name: true } },
      },
    });

    res.status(200).json({ data: { reactions } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

export default router;
