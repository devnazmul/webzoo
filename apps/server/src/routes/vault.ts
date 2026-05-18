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

const createDocSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().default(''),
});

const updateDocSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().optional(),
});

// GET /api/workspaces/:workspaceId/topics/:topicId/vault
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId, topicId } = req.params;
    if (!(await isMember(req.user!.userId, workspaceId))) {
      res.status(403).json({ status: 'error', message: 'Access denied' });
      return;
    }

    const documents = await prisma.vaultDocument.findMany({
      where: { topicId },
      orderBy: { updatedAt: 'desc' },
      include: {
        createdBy: { select: { id: true, name: true } },
      },
    });

    res.status(200).json({ data: { documents } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// POST /api/workspaces/:workspaceId/topics/:topicId/vault
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId, topicId } = req.params;
    if (!(await isMember(req.user!.userId, workspaceId))) {
      res.status(403).json({ status: 'error', message: 'Access denied' });
      return;
    }

    const body = createDocSchema.safeParse(req.body);
    if (!body.success) {
      res.status(422).json({ status: 'error', message: body.error.errors[0].message });
      return;
    }

    const document = await prisma.vaultDocument.create({
      data: {
        title: body.data.title,
        content: body.data.content,
        topicId,
        createdById: req.user!.userId,
      },
      include: {
        createdBy: { select: { id: true, name: true } },
      },
    });

    res.status(201).json({ data: { document } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// GET /api/workspaces/:workspaceId/topics/:topicId/vault/:docId
router.get('/:docId', async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId, docId } = req.params;
    if (!(await isMember(req.user!.userId, workspaceId))) {
      res.status(403).json({ status: 'error', message: 'Access denied' });
      return;
    }

    const document = await prisma.vaultDocument.findUnique({
      where: { id: docId },
      include: {
        createdBy: { select: { id: true, name: true } },
      },
    });

    if (!document) {
      res.status(404).json({ status: 'error', message: 'Document not found' });
      return;
    }

    res.status(200).json({ data: { document } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// PATCH /api/workspaces/:workspaceId/topics/:topicId/vault/:docId
router.patch('/:docId', async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId, docId } = req.params;
    if (!(await isMember(req.user!.userId, workspaceId))) {
      res.status(403).json({ status: 'error', message: 'Access denied' });
      return;
    }

    const body = updateDocSchema.safeParse(req.body);
    if (!body.success) {
      res.status(422).json({ status: 'error', message: body.error.errors[0].message });
      return;
    }

    const document = await prisma.vaultDocument.update({
      where: { id: docId },
      data: {
        ...(body.data.title !== undefined && { title: body.data.title }),
        ...(body.data.content !== undefined && { content: body.data.content }),
      },
      include: {
        createdBy: { select: { id: true, name: true } },
      },
    });

    res.status(200).json({ data: { document } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// DELETE /api/workspaces/:workspaceId/topics/:topicId/vault/:docId
router.delete('/:docId', async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId, docId } = req.params;
    if (!(await isMember(req.user!.userId, workspaceId))) {
      res.status(403).json({ status: 'error', message: 'Access denied' });
      return;
    }

    await prisma.vaultDocument.delete({ where: { id: docId } });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

export default router;
