import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/authenticate';

const router = Router();

// GET /api/invitations/:token
// Public route to get invitation details
router.get('/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    const invitation = await prisma.workspaceInvitation.findUnique({
      where: { token },
      include: {
        workspace: { select: { name: true } },
        invitedBy: { select: { name: true } },
      },
    });

    if (!invitation) {
      res.status(404).json({ status: 'error', message: 'Invitation not found' });
      return;
    }

    if (invitation.status !== 'PENDING') {
      res.status(400).json({ status: 'error', message: `Invitation is already ${invitation.status.toLowerCase()}` });
      return;
    }

    if (invitation.expiresAt < new Date()) {
      await prisma.workspaceInvitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' },
      });
      res.status(400).json({ status: 'error', message: 'Invitation has expired' });
      return;
    }

    res.status(200).json({
      data: {
        email: invitation.email,
        workspaceName: invitation.workspace.name,
        inviterName: invitation.invitedBy.name,
        expiresAt: invitation.expiresAt,
        status: invitation.status,
      },
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// POST /api/invitations/:token/accept
// Requires authentication
router.post('/:token/accept', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { token } = req.params;

    const invitation = await prisma.workspaceInvitation.findUnique({
      where: { token },
    });

    if (!invitation) {
      res.status(404).json({ status: 'error', message: 'Invitation not found' });
      return;
    }

    if (invitation.status !== 'PENDING') {
      res.status(400).json({ status: 'error', message: `Invitation is already ${invitation.status.toLowerCase()}` });
      return;
    }

    if (invitation.expiresAt < new Date()) {
      await prisma.workspaceInvitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' },
      });
      res.status(400).json({ status: 'error', message: 'Invitation has expired' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    
    if (invitation.email && user?.email !== invitation.email) {
      res.status(422).json({ status: 'error', message: 'Email does not match the invitation' });
      return;
    }

    // Check if already a member
    const existing = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId: user!.id,
          workspaceId: invitation.workspaceId,
        },
      },
    });

    if (!existing) {
      await prisma.workspaceMember.create({
        data: {
          userId: user!.id,
          workspaceId: invitation.workspaceId,
          role: 'MEMBER',
        },
      });
    }

    // Only mark as accepted if it's a direct email invitation
    // Generic links (email = null) remain pending until they expire
    if (invitation.email) {
      await prisma.workspaceInvitation.update({
        where: { id: invitation.id },
        data: { status: 'ACCEPTED' },
      });
    }

    res.status(200).json({ data: { message: 'Invitation accepted' } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

export default router;
