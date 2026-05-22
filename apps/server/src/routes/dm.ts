import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/authenticate';
import { io } from '../index';

const router = Router();
router.use(authenticate);

const sendDmSchema = z.object({
  content: z.string().min(1).max(50000),
  replyToId: z.string().optional(),
});

// Helper: get or create a conversation between two users
async function getOrCreateConversation(
  userIdA: string,
  userIdB: string
): Promise<string> {
  // Find existing conversation with both participants
  const existing = await prisma.directConversation.findFirst({
    where: {
      participants: {
        every: {
          userId: { in: [userIdA, userIdB] },
        },
      },
    },
    include: {
      participants: true,
    },
  });

  if (existing && existing.participants.length === 2) {
    return existing.id;
  }

  // Create new conversation
  const conversation = await prisma.directConversation.create({
    data: {
      participants: {
        create: [{ userId: userIdA }, { userId: userIdB }],
      },
    },
  });

  return conversation.id;
}

// GET /api/dm/conversations
// List all DM conversations for current user
router.get('/conversations', async (req: AuthRequest, res: Response) => {
  try {
    const conversations = await prisma.directConversation.findMany({
      where: {
        participants: {
          some: { userId: req.user!.userId },
        },
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        participants: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            author: { select: { id: true, name: true } },
          },
        },
      },
    });

    res.status(200).json({ data: { conversations } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// POST /api/dm/conversations
// Start or get a DM conversation with another user
router.post('/conversations', async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      res.status(422).json({ status: 'error', message: 'userId is required' });
      return;
    }

    if (userId === req.user!.userId) {
      res.status(422).json({ status: 'error', message: 'Cannot start a conversation with yourself' });
      return;
    }

    // Check target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true },
    });

    if (!targetUser) {
      res.status(404).json({ status: 'error', message: 'User not found' });
      return;
    }

    const conversationId = await getOrCreateConversation(
      req.user!.userId,
      userId
    );

    const conversation = await prisma.directConversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            author: { select: { id: true, name: true } },
          },
        },
      },
    });

    res.status(200).json({ data: { conversation } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// GET /api/dm/conversations/:conversationId/messages
router.get(
  '/conversations/:conversationId/messages',
  async (req: AuthRequest, res: Response) => {
    try {
      const { conversationId } = req.params;

      // Verify user is a participant
      const participant = await prisma.directConversationParticipant.findUnique({
        where: {
          conversationId_userId: {
            conversationId,
            userId: req.user!.userId,
          },
        },
      });

      if (!participant) {
        res.status(403).json({ status: 'error', message: 'Access denied' });
        return;
      }

      const cursor = req.query.cursor as string | undefined;
      const limit = 50;

      const messages = await prisma.directMessage.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        ...(cursor && { skip: 1, cursor: { id: cursor } }),
        include: {
          author: { select: { id: true, name: true } },
          reactions: {
            include: {
              user: { select: { id: true, name: true } },
            },
          },
          replyTo: {
            include: {
              author: { select: { id: true, name: true } },
            },
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
      res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
  }
);

// POST /api/dm/conversations/:conversationId/messages
router.post(
  '/conversations/:conversationId/messages',
  async (req: AuthRequest, res: Response) => {
    try {
      const { conversationId } = req.params;

      // Verify user is a participant
      const participant = await prisma.directConversationParticipant.findUnique({
        where: {
          conversationId_userId: {
            conversationId,
            userId: req.user!.userId,
          },
        },
      });

      if (!participant) {
        res.status(403).json({ status: 'error', message: 'Access denied' });
        return;
      }

      const body = sendDmSchema.safeParse(req.body);
      if (!body.success) {
        res.status(422).json({ status: 'error', message: body.error.errors[0].message });
        return;
      }

      const message = await prisma.directMessage.create({
        data: {
          content: body.data.content,
          conversationId,
          authorId: req.user!.userId,
          replyToId: body.data.replyToId,
        },
        include: {
          author: { select: { id: true, name: true } },
          reactions: {
            include: {
              user: { select: { id: true, name: true } },
            },
          },
          replyTo: {
            include: {
              author: { select: { id: true, name: true } },
            },
          },
        },
      });

      // Update conversation updatedAt
      await prisma.directConversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      // Emit to conversation room
      io.to(`dm:${conversationId}`).emit('dm:message:new', { message });

      // Notify all other participants
      const participants = await prisma.directConversationParticipant.findMany({
        where: {
          conversationId,
          userId: { not: req.user!.userId },
        },
      });

      for (const p of participants) {
        io.to(`user:${p.userId}`).emit('dm:notification', {
          conversationId,
          message,
        });
      }

      res.status(201).json({ data: { message } });
    } catch (err) {
      res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
  }
);

// POST /api/dm/conversations/:conversationId/reactions
router.post(
  '/conversations/:conversationId/reactions',
  async (req: AuthRequest, res: Response) => {
    try {
      const { conversationId, messageId } = req.body;
      const { emoji } = req.body;

      if (!messageId || !emoji) {
        res.status(422).json({ status: 'error', message: 'messageId and emoji are required' });
        return;
      }

      const existing = await prisma.directMessageReaction.findUnique({
        where: {
          messageId_userId_emoji: {
            messageId,
            userId: req.user!.userId,
            emoji,
          },
        },
      });

      if (existing) {
        await prisma.directMessageReaction.delete({ where: { id: existing.id } });
      } else {
        await prisma.directMessageReaction.create({
          data: { emoji, messageId, userId: req.user!.userId },
        });
      }

      const reactions = await prisma.directMessageReaction.findMany({
        where: { messageId },
        include: {
          user: { select: { id: true, name: true } },
        },
      });

      io.to(`dm:${req.params.conversationId}`).emit('dm:reaction:update', {
        messageId,
        reactions,
      });

      res.status(200).json({ data: { reactions } });
    } catch (err) {
      res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
  }
);

export default router;
