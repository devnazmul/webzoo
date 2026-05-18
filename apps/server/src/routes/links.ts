import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/authenticate';

const router = Router({ mergeParams: true });
router.use(authenticate);

async function isMember(userId: string, workspaceId: string): Promise<boolean> {
  const member = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
  });
  return !!member;
}

const createLinkSchema = z.object({
  url: z.string().url(),
  title: z.string().optional(),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  messageId: z.string().optional(),
});

// GET /api/workspaces/:workspaceId/topics/:topicId/links
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId, topicId } = req.params;
    if (!(await isMember(req.user!.userId, workspaceId))) {
      res.status(403).json({ status: 'error', message: 'Access denied' });
      return;
    }

    const links = await prisma.sharedLink.findMany({
      where: { topicId },
      orderBy: { createdAt: 'desc' },
      include: {
        sharedBy: { select: { id: true, name: true } },
      },
    });

    res.status(200).json({ data: { links } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// POST /api/workspaces/:workspaceId/topics/:topicId/links
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId, topicId } = req.params;
    if (!(await isMember(req.user!.userId, workspaceId))) {
      res.status(403).json({ status: 'error', message: 'Access denied' });
      return;
    }

    const body = createLinkSchema.safeParse(req.body);
    if (!body.success) {
      res.status(422).json({ status: 'error', message: body.error.errors[0].message });
      return;
    }

    const link = await prisma.sharedLink.create({
      data: {
        url: body.data.url,
        title: body.data.title,
        description: body.data.description,
        imageUrl: body.data.imageUrl,
        topicId,
        sharedById: req.user!.userId,
        messageId: body.data.messageId,
      },
      include: {
        sharedBy: { select: { id: true, name: true } },
      },
    });

    res.status(201).json({ data: { link } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// DELETE /api/workspaces/:workspaceId/topics/:topicId/links/:linkId
router.delete('/:linkId', async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId, linkId } = req.params;
    if (!(await isMember(req.user!.userId, workspaceId))) {
      res.status(403).json({ status: 'error', message: 'Access denied' });
      return;
    }

    await prisma.sharedLink.delete({ where: { id: linkId } });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

export default router;
