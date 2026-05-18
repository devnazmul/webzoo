import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/authenticate';

const router = Router({ mergeParams: true });
router.use(authenticate);

// Helper: check workspace membership
async function isMember(userId: string, workspaceId: string): Promise<boolean> {
  const member = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
  });
  return !!member;
}

const createStatusSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#6366f1'),
});

const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  statusId: z.string(),
  assigneeId: z.string().optional(),
  messageId: z.string().optional(),
  dueDate: z.string().optional(),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  statusId: z.string().optional(),
  assigneeId: z.string().nullable().optional(),
  order: z.number().optional(),
  dueDate: z.string().nullable().optional(),
  version: z.number(),
});

const createSubtaskSchema = z.object({
  title: z.string().min(1).max(200),
});

// ─── Task Statuses ────────────────────────────────────────────────────────────

// GET /api/workspaces/:workspaceId/topics/:topicId/task-statuses
router.get('/task-statuses', async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId, topicId } = req.params;
    if (!(await isMember(req.user!.userId, workspaceId))) {
      res.status(403).json({ status: 'error', message: 'Access denied' });
      return;
    }

    const statuses = await prisma.taskStatus.findMany({
      where: { topicId },
      orderBy: { order: 'asc' },
      include: {
        tasks: {
          orderBy: { order: 'asc' },
          include: {
            assignee: { select: { id: true, name: true } },
            createdBy: { select: { id: true, name: true } },
            subtasks: { orderBy: { order: 'asc' } },
            _count: { select: { subtasks: true } },
          },
        },
      },
    });

    // Seed default statuses if none exist
    if (statuses.length === 0) {
      const defaults = [
        { name: 'To Do', color: '#6366f1', order: 0 },
        { name: 'In Progress', color: '#f59e0b', order: 1 },
        { name: 'Done', color: '#10b981', order: 2 },
      ];
      const created = await Promise.all(
        defaults.map((d) =>
          prisma.taskStatus.create({ data: { ...d, topicId } })
        )
      );
      res.status(200).json({
        data: { statuses: created.map((s) => ({ ...s, tasks: [] })) },
      });
      return;
    }

    res.status(200).json({ data: { statuses } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// POST /api/workspaces/:workspaceId/topics/:topicId/task-statuses
router.post('/task-statuses', async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId, topicId } = req.params;
    if (!(await isMember(req.user!.userId, workspaceId))) {
      res.status(403).json({ status: 'error', message: 'Access denied' });
      return;
    }

    const body = createStatusSchema.safeParse(req.body);
    if (!body.success) {
      res.status(422).json({ status: 'error', message: body.error.errors[0].message });
      return;
    }

    const lastStatus = await prisma.taskStatus.findFirst({
      where: { topicId },
      orderBy: { order: 'desc' },
    });

    const status = await prisma.taskStatus.create({
      data: {
        name: body.data.name,
        color: body.data.color,
        order: (lastStatus?.order ?? -1) + 1,
        topicId,
      },
    });

    res.status(201).json({ data: { status } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// DELETE /api/workspaces/:workspaceId/topics/:topicId/task-statuses/:statusId
router.delete('/task-statuses/:statusId', async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId, topicId, statusId } = req.params;
    if (!(await isMember(req.user!.userId, workspaceId))) {
      res.status(403).json({ status: 'error', message: 'Access denied' });
      return;
    }

    // Check no tasks in this status
    const taskCount = await prisma.task.count({ where: { statusId } });
    if (taskCount > 0) {
      res.status(409).json({
        status: 'error',
        message: 'Move or delete tasks in this status first',
      });
      return;
    }

    await prisma.taskStatus.delete({ where: { id: statusId } });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// ─── Tasks ────────────────────────────────────────────────────────────────────

// POST /api/workspaces/:workspaceId/topics/:topicId/tasks
router.post('/tasks', async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId, topicId } = req.params;
    if (!(await isMember(req.user!.userId, workspaceId))) {
      res.status(403).json({ status: 'error', message: 'Access denied' });
      return;
    }

    const body = createTaskSchema.safeParse(req.body);
    if (!body.success) {
      res.status(422).json({ status: 'error', message: body.error.errors[0].message });
      return;
    }

    // Get last order in this status
    const lastTask = await prisma.task.findFirst({
      where: { statusId: body.data.statusId },
      orderBy: { order: 'desc' },
    });

    const task = await prisma.task.create({
      data: {
        title: body.data.title,
        description: body.data.description,
        statusId: body.data.statusId,
        topicId,
        createdById: req.user!.userId,
        assigneeId: body.data.assigneeId,
        messageId: body.data.messageId,
        dueDate: body.data.dueDate ? new Date(body.data.dueDate) : null,
        order: (lastTask?.order ?? -1) + 1,
      },
      include: {
        assignee: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        subtasks: true,
        status: true,
      },
    });

    res.status(201).json({ data: { task } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// PATCH /api/workspaces/:workspaceId/topics/:topicId/tasks/:taskId
router.patch('/tasks/:taskId', async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId, taskId } = req.params;
    if (!(await isMember(req.user!.userId, workspaceId))) {
      res.status(403).json({ status: 'error', message: 'Access denied' });
      return;
    }

    const body = updateTaskSchema.safeParse(req.body);
    if (!body.success) {
      res.status(422).json({ status: 'error', message: body.error.errors[0].message });
      return;
    }

    // Optimistic locking
    const existing = await prisma.task.findUnique({ where: { id: taskId } });
    if (!existing) {
      res.status(404).json({ status: 'error', message: 'Task not found' });
      return;
    }
    if (existing.version !== body.data.version) {
      res.status(409).json({ status: 'error', message: 'Task was modified by someone else. Please refresh.' });
      return;
    }

    const task = await prisma.task.update({
      where: { id: taskId },
      data: {
        ...(body.data.title && { title: body.data.title }),
        ...(body.data.description !== undefined && { description: body.data.description }),
        ...(body.data.statusId && { statusId: body.data.statusId }),
        ...(body.data.assigneeId !== undefined && { assigneeId: body.data.assigneeId }),
        ...(body.data.order !== undefined && { order: body.data.order }),
        ...(body.data.dueDate !== undefined && {
          dueDate: body.data.dueDate ? new Date(body.data.dueDate) : null,
        }),
        version: { increment: 1 },
      },
      include: {
        assignee: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        subtasks: { orderBy: { order: 'asc' } },
        status: true,
      },
    });

    res.status(200).json({ data: { task } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// DELETE /api/workspaces/:workspaceId/topics/:topicId/tasks/:taskId
router.delete('/tasks/:taskId', async (req: AuthRequest, res: Response) => {
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

// ─── Subtasks ─────────────────────────────────────────────────────────────────

// POST /api/workspaces/:workspaceId/topics/:topicId/tasks/:taskId/subtasks
router.post('/tasks/:taskId/subtasks', async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId, taskId } = req.params;
    if (!(await isMember(req.user!.userId, workspaceId))) {
      res.status(403).json({ status: 'error', message: 'Access denied' });
      return;
    }

    const body = createSubtaskSchema.safeParse(req.body);
    if (!body.success) {
      res.status(422).json({ status: 'error', message: body.error.errors[0].message });
      return;
    }

    const lastSubtask = await prisma.subTask.findFirst({
      where: { taskId },
      orderBy: { order: 'desc' },
    });

    const subtask = await prisma.subTask.create({
      data: {
        title: body.data.title,
        taskId,
        order: (lastSubtask?.order ?? -1) + 1,
      },
    });

    res.status(201).json({ data: { subtask } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// PATCH /api/workspaces/:workspaceId/topics/:topicId/tasks/:taskId/subtasks/:subtaskId
router.patch('/tasks/:taskId/subtasks/:subtaskId', async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId, subtaskId } = req.params;
    if (!(await isMember(req.user!.userId, workspaceId))) {
      res.status(403).json({ status: 'error', message: 'Access denied' });
      return;
    }

    const { title, completed } = req.body;
    const subtask = await prisma.subTask.update({
      where: { id: subtaskId },
      data: {
        ...(title !== undefined && { title }),
        ...(completed !== undefined && { completed }),
      },
    });

    res.status(200).json({ data: { subtask } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// DELETE /api/workspaces/:workspaceId/topics/:topicId/tasks/:taskId/subtasks/:subtaskId
router.delete('/tasks/:taskId/subtasks/:subtaskId', async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId, subtaskId } = req.params;
    if (!(await isMember(req.user!.userId, workspaceId))) {
      res.status(403).json({ status: 'error', message: 'Access denied' });
      return;
    }

    await prisma.subTask.delete({ where: { id: subtaskId } });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

export default router;
