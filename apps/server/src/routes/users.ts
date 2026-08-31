import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/authenticate';

const router = Router();

// GET /api/users
// Get all users (excluding the current user) for inviting/messaging
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        id: {
          not: req.user!.userId,
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    res.status(200).json({ data: { users } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

export default router;
