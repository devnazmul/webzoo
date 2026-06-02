import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/authenticate';
import { io } from '../index';

const router = Router({ mergeParams: true });
router.use(authenticate);

async function isMember(userId: string, workspaceId: string) {
  const m = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
  });
  return !!m;
}

// ─── Task Statuses ───────────────────────────────────────

// GET /api/workspaces/:workspaceId/tasks/statuses
router.get('/statuses', async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const topicId = req.query.topicId as string;
    
    if (!(await isMember(req.user!.userId, workspaceId))) {
      res.status(403).json({ status: 'error', message: 'Access denied' });
      return;
    }
    if (!topicId) {
      res.status(400).json({ status: 'error', message: 'topicId is required' });
      return;
    }

    let statuses = await prisma.taskStatus.findMany({
      where: { topicId },
      orderBy: { order: 'asc' },
    });

    // Auto-seed if empty
    if (statuses.length === 0) {
      const defaults = [
        { name: 'Todo',        color: '#6366f1', order: 0 },
        { name: 'In Progress', color: '#f59e0b', order: 1 },
        { name: 'Bugs',        color: '#ef4444', order: 2 },
        { name: 'Done',        color: '#22c55e', order: 3 },
      ];
      await prisma.taskStatus.createMany({
        data: defaults.map((s) => ({ ...s, topicId })),
      });
      statuses = await prisma.taskStatus.findMany({
        where: { topicId },
        orderBy: { order: 'asc' },
      });
    }

    res.status(200).json({ data: { statuses } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// POST /api/workspaces/:workspaceId/tasks/statuses
router.post('/statuses', async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId } = req.params;
    if (!(await isMember(req.user!.userId, workspaceId))) {
      res.status(403).json({ status: 'error', message: 'Access denied' });
      return;
    }
    const { name, color, position, topicId } = req.body;
    if (!name || !color || !topicId) {
      res.status(422).json({ status: 'error', message: 'name, color and topicId required' });
      return;
    }
    const status = await prisma.taskStatus.create({
      data: { name, color, order: position ?? 0, topicId },
    });
    res.status(201).json({ data: { status } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// DELETE /api/workspaces/:workspaceId/tasks/statuses/:statusId
router.delete('/statuses/:statusId', async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId, statusId } = req.params;
    if (!(await isMember(req.user!.userId, workspaceId))) {
      res.status(403).json({ status: 'error', message: 'Access denied' });
      return;
    }
    await prisma.taskStatus.delete({ where: { id: statusId } });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// ─── Tasks ───────────────────────────────────────────────

const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  statusId: z.string().min(1),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM').optional(),
  assigneeId: z.string().optional(),
  dueDate: z.string().optional(),
  topicId: z.string().min(1),
});

// GET /api/workspaces/:workspaceId/tasks
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId } = req.params;
    if (!(await isMember(req.user!.userId, workspaceId))) {
      res.status(403).json({ status: 'error', message: 'Access denied' });
      return;
    }
    const topicId = req.query.topicId as string | undefined;
    if (!topicId) {
      res.status(400).json({ status: 'error', message: 'topicId is required' });
      return;
    }
    const tasks = await prisma.task.findMany({
      where: {
        topicId
      },
      orderBy: { createdAt: 'asc' },
      include: {
        assignee: { select: { id: true, name: true } },
        assignees: { include: { user: { select: { id: true, name: true } } } },
        subtasks: true,
      },
    });
    res.status(200).json({ data: { tasks } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// POST /api/workspaces/:workspaceId/tasks
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId } = req.params;
    if (!(await isMember(req.user!.userId, workspaceId))) {
      res.status(403).json({ status: 'error', message: 'Access denied' });
      return;
    }
    const body = createTaskSchema.safeParse(req.body);
    if (!body.success) {
      res.status(422).json({ status: 'error', message: body.error.errors[0].message });
      return;
    }
    const task = await prisma.task.create({
      data: {
        title: body.data.title,
        description: body.data.description,
        statusId: body.data.statusId,
        topicId: body.data.topicId,
        createdById: req.user!.userId,
        assigneeId: body.data.assigneeId || null,
        dueDate: body.data.dueDate ? new Date(body.data.dueDate) : null,
      },
      include: {
        assignee: { select: { id: true, name: true } },
        assignees: { include: { user: { select: { id: true, name: true } } } },
        subtasks: true,
      },
    });
    io.to(body.data.topicId).emit('task:created', { task });
    res.status(201).json({ data: { task } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// PATCH /api/workspaces/:workspaceId/tasks/:taskId
router.patch('/:taskId', async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId, taskId } = req.params;
    if (!(await isMember(req.user!.userId, workspaceId))) {
      res.status(403).json({ status: 'error', message: 'Access denied' });
      return;
    }
    const task = await prisma.task.update({
      where: { id: taskId },
      data: {
        ...(req.body.title !== undefined && { title: req.body.title }),
        ...(req.body.description !== undefined && { description: req.body.description }),
        ...(req.body.statusId !== undefined && { statusId: req.body.statusId }),
        ...(req.body.priority !== undefined && { priority: req.body.priority }),
        ...(req.body.assigneeId !== undefined && { assigneeId: req.body.assigneeId || null }),
        ...(req.body.dueDate !== undefined && { dueDate: req.body.dueDate ? new Date(req.body.dueDate) : null }),
      },
      include: {
        assignee: { select: { id: true, name: true } },
        assignees: { include: { user: { select: { id: true, name: true } } } },
        subtasks: true,
      },
    });
    io.to(task.topicId).emit('task:updated', { task });
    res.status(200).json({ data: { task } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// DELETE /api/workspaces/:workspaceId/tasks/:taskId
router.delete('/:taskId', async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId, taskId } = req.params;
    if (!(await isMember(req.user!.userId, workspaceId))) {
      res.status(403).json({ status: 'error', message: 'Access denied' });
      return;
    }
    await prisma.task.delete({ where: { id: taskId } });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// ─── Subtasks ─────────────────────────────────────────────

router.post('/:taskId/subtasks', async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId, taskId } = req.params;
    if (!(await isMember(req.user!.userId, workspaceId))) {
      res.status(403).json({ status: 'error', message: 'Access denied' });
      return;
    }
    const { title } = req.body;
    if (!title) {
      res.status(422).json({ status: 'error', message: 'title required' });
      return;
    }
    const subTask = await prisma.subTask.create({
      data: { title, taskId },
    });
    res.status(201).json({ data: { subTask } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

router.patch('/:taskId/subtasks/:subtaskId', async (req: AuthRequest, res: Response) => {
  try {
    const { subtaskId } = req.params;
    const subTask = await prisma.subTask.update({
      where: { id: subtaskId },
      data: {
        ...(req.body.title !== undefined && { title: req.body.title }),
        ...(req.body.completed !== undefined && { completed: req.body.completed }),
      },
    });
    res.status(200).json({ data: { subTask } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

router.delete('/:taskId/subtasks/:subtaskId', async (req: AuthRequest, res: Response) => {
  try {
    const { subtaskId } = req.params;
    await prisma.subTask.delete({ where: { id: subtaskId } });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// GET /api/workspaces/:workspaceId/tasks/:taskId/comments
router.get('/:taskId/comments', async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId, taskId } = req.params;
    if (!(await isMember(req.user!.userId, workspaceId))) {
      res.status(403).json({ status: 'error', message: 'Access denied' });
      return;
    }
    const comments = await prisma.taskComment.findMany({
      where: { taskId },
      orderBy: { createdAt: 'asc' },
      include: { author: { select: { id: true, name: true } } },
    });
    res.status(200).json({ data: { comments } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// POST /api/workspaces/:workspaceId/tasks/:taskId/comments
router.post('/:taskId/comments', async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId, taskId } = req.params;
    if (!(await isMember(req.user!.userId, workspaceId))) {
      res.status(403).json({ status: 'error', message: 'Access denied' });
      return;
    }
    const { content } = req.body;
    if (!content?.trim()) {
      res.status(422).json({ status: 'error', message: 'content required' });
      return;
    }
    const comment = await prisma.taskComment.create({
      data: { content, taskId, authorId: req.user!.userId },
      include: { author: { select: { id: true, name: true } } },
    });
    res.status(201).json({ data: { comment } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// DELETE /api/workspaces/:workspaceId/tasks/:taskId/comments/:commentId
router.delete('/:taskId/comments/:commentId', async (req: AuthRequest, res: Response) => {
  try {
    const { commentId } = req.params;
    await prisma.taskComment.delete({ where: { id: commentId } });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// GET /api/workspaces/:workspaceId/tasks/:taskId/assignees
router.get('/:taskId/assignees', async (req: AuthRequest, res: Response) => {
  try {
    const { taskId } = req.params;
    const assignees = await prisma.taskAssignee.findMany({
      where: { taskId },
      include: { user: { select: { id: true, name: true } } },
    });
    res.status(200).json({ data: { assignees: assignees.map((a) => a.user) } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// POST /api/workspaces/:workspaceId/tasks/:taskId/assignees
router.post('/:taskId/assignees', async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId, taskId } = req.params;
    if (!(await isMember(req.user!.userId, workspaceId))) {
      res.status(403).json({ status: 'error', message: 'Access denied' });
      return;
    }
    const { userId } = req.body;
    await prisma.taskAssignee.upsert({
      where: { taskId_userId: { taskId, userId } },
      create: { taskId, userId },
      update: {},
    });
    const assignees = await prisma.taskAssignee.findMany({
      where: { taskId },
      include: { user: { select: { id: true, name: true } } },
    });
    res.status(200).json({ data: { assignees: assignees.map((a) => a.user) } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// DELETE /api/workspaces/:workspaceId/tasks/:taskId/assignees/:userId
router.delete('/:taskId/assignees/:userId', async (req: AuthRequest, res: Response) => {
  try {
    const { taskId, userId } = req.params;
    await prisma.taskAssignee.delete({
      where: { taskId_userId: { taskId, userId } },
    });
    const assignees = await prisma.taskAssignee.findMany({
      where: { taskId },
      include: { user: { select: { id: true, name: true } } },
    });
    res.status(200).json({ data: { assignees: assignees.map((a) => a.user) } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

export default router;
