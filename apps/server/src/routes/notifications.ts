import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/authenticate';

const router = Router();
router.use(authenticate);

// GET /api/notifications
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        actor: { select: { id: true, name: true } },
        workspace: { select: { id: true, name: true } },
      },
    });

    res.status(200).json({ data: { notifications } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// GET /api/notifications/unread-count
router.get('/unread-count', async (req: AuthRequest, res: Response) => {
  try {
    const count = await prisma.notification.count({
      where: {
        userId: req.user!.userId,
        read: false,
      },
    });

    res.status(200).json({ data: { count } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// POST /api/notifications/mark-read
router.post('/mark-read', async (req: AuthRequest, res: Response) => {
  try {
    const { notificationIds } = req.body;

    if (notificationIds && Array.isArray(notificationIds)) {
      // Mark specific notifications as read
      await prisma.notification.updateMany({
        where: {
          id: { in: notificationIds },
          userId: req.user!.userId,
        },
        data: { read: true },
      });
    } else {
      // Mark all as read
      await prisma.notification.updateMany({
        where: { userId: req.user!.userId, read: false },
        data: { read: true },
      });
    }

    res.status(200).json({ data: { success: true } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// DELETE /api/notifications/:notificationId
router.delete('/:notificationId', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.notification.deleteMany({
      where: {
        id: req.params.notificationId,
        userId: req.user!.userId,
      },
    });

    res.status(204).send();
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

export default router;
