import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticate, AuthRequest } from "../middleware/authenticate";

const router = Router();

router.use(authenticate);

const createWorkspaceSchema = z.object({
  name: z.string().min(2).max(50),
  description: z.string().optional(),
  logoUrl: z.string().optional(),
});

// POST /api/workspaces
router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const body = createWorkspaceSchema.safeParse(req.body);
    if (!body.success) {
      res
        .status(422)
        .json({ status: "error", message: body.error.errors[0].message });
      return;
    }

    const workspace = await prisma.workspace.create({
      data: {
        name: body.data.name,
        description: body.data.description,
        logoUrl: body.data.logoUrl,
        members: {
          create: {
            userId: req.user!.userId,
            role: "OWNER",
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    res.status(201).json({ data: { workspace } });
  } catch (err) {
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

// GET /api/workspaces
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const workspaces = await prisma.workspace.findMany({
      where: {
        members: {
          some: { userId: req.user!.userId },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    res.status(200).json({ data: { workspaces } });
  } catch (err) {
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

// GET /api/workspaces/:workspaceId
router.get("/:workspaceId", async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId } = req.params;

    const member = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId: req.user!.userId,
          workspaceId,
        },
      },
    });

    if (!member) {
      res.status(403).json({ status: "error", message: "Access denied" });
      return;
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    if (!workspace) {
      res.status(404).json({ status: "error", message: "Workspace not found" });
      return;
    }

    res.status(200).json({ data: { workspace } });
  } catch (err) {
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

// POST /api/workspaces/:workspaceId/invite
router.post("/:workspaceId/invite", async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const { email } = req.body;

    if (!email) {
      res.status(422).json({ status: "error", message: "Email is required" });
      return;
    }

    // Only owners can invite
    const requester = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId: req.user!.userId,
          workspaceId,
        },
      },
      include: {
        user: true,
        workspace: true,
      },
    });

    if (!requester || requester.role !== "OWNER") {
      res
        .status(403)
        .json({ status: "error", message: "Only owners can invite members" });
      return;
    }

    // Find user by email
    const invitee = await prisma.user.findUnique({ where: { email } });

    // Check if already a member
    if (invitee) {
      const existing = await prisma.workspaceMember.findUnique({
        where: {
          userId_workspaceId: {
            userId: invitee.id,
            workspaceId,
          },
        },
      });

      if (existing) {
        // Just return 200 without error as per user requirement
        res.status(200).json({ data: { message: "User is already a member" } });
        return;
      }
    }

    const token = require('crypto').randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const invitation = await prisma.workspaceInvitation.create({
      data: {
        token,
        email,
        workspaceId,
        invitedById: req.user!.userId,
        expiresAt,
      },
    });

    const { sendInviteEmail, sendNotificationEmail } = await import('../utils/email');

    if (invitee) {
      // Create in-app notification and emit real-time event
      const { createNotification } = await import('../utils/notifications');
      await createNotification({
        type: "WORKSPACE_INVITE",
        userId: invitee.id,
        actorId: req.user!.userId,
        workspaceId: workspaceId,
      });
      // Send simple notification email (link to app)
      await sendNotificationEmail(email, requester.workspace.name, requester.user.name);
    } else {
      // Send invite email with token link
      await sendInviteEmail(email, requester.workspace.name, requester.user.name, token);
    }

    res.status(201).json({ data: { message: "Invitation sent successfully" } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

// POST /api/workspaces/:workspaceId/invite-link
router.post("/:workspaceId/invite-link", async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId } = req.params;

    // Only owners can generate invite links
    const requester = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId: req.user!.userId,
          workspaceId,
        },
      },
    });

    if (!requester || requester.role !== "OWNER") {
      res
        .status(403)
        .json({ status: "error", message: "Only owners can generate invite links" });
      return;
    }

    const token = require('crypto').randomUUID();
    const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

    await prisma.workspaceInvitation.create({
      data: {
        token,
        workspaceId,
        invitedById: req.user!.userId,
        expiresAt,
      },
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const link = `${frontendUrl}/invite/${token}`;

    res.status(201).json({ data: { link, token, expiresAt } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

// GET /api/workspaces/:workspaceId/members
router.get('/:workspaceId/members', async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId } = req.params;

    const member = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId: req.user!.userId,
          workspaceId,
        },
      },
    });

    if (!member) {
      res.status(403).json({ status: 'error', message: 'Access denied' });
      return;
    }

    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: {
        user: {
          select: { id: true, name: true, email: true, createdAt: true },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });

    res.status(200).json({ data: { members } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// DELETE /api/workspaces/:workspaceId/members/:userId
router.delete('/:workspaceId/members/:userId', async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId, userId } = req.params;

    // Only owners can remove other members. A user can always remove themselves.
    const requester = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId: req.user!.userId,
          workspaceId,
        },
      },
    });

    if (!requester || (requester.role !== 'OWNER' && req.user!.userId !== userId)) {
      res.status(403).json({ status: 'error', message: 'Only owners can remove other members' });
      return;
    }

    // Cannot remove yourself if you are the only owner
    if (userId === req.user!.userId && requester.role === 'OWNER') {
      const ownerCount = await prisma.workspaceMember.count({
        where: { workspaceId, role: 'OWNER' },
      });
      
      if (ownerCount <= 1) {
        res.status(422).json({ status: 'error', message: 'Cannot leave workspace as the only owner. Transfer ownership or delete the workspace instead.' });
        return;
      }
    }

    await prisma.workspaceMember.delete({
      where: {
        userId_workspaceId: { userId, workspaceId },
      },
    });

    res.status(204).send();
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// POST /api/workspaces/:workspaceId/join
router.post('/:workspaceId/join', async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user!.userId;

    // Verify they have an invitation or notification for this workspace
    const notification = await prisma.notification.findFirst({
      where: {
        userId,
        workspaceId,
        type: 'WORKSPACE_INVITE',
      }
    });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    
    const invitation = await prisma.workspaceInvitation.findFirst({
      where: {
        email: user?.email,
        workspaceId,
        status: 'PENDING',
      }
    });

    if (!notification && !invitation) {
      res.status(403).json({ status: 'error', message: 'No pending invitation found for this workspace' });
      return;
    }

    const existing = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: { userId, workspaceId },
      },
    });

    if (!existing) {
      await prisma.workspaceMember.create({
        data: {
          userId,
          workspaceId,
          role: 'MEMBER',
        },
      });
    }

    if (invitation) {
      await prisma.workspaceInvitation.update({
        where: { id: invitation.id },
        data: { status: 'ACCEPTED' },
      });
    }

    res.status(200).json({ data: { message: 'Successfully joined workspace' } });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

export default router;
