import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticate, AuthRequest } from "../middleware/authenticate";

const router = Router();

router.use(authenticate);

const createWorkspaceSchema = z.object({
  name: z.string().min(2).max(50),
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
    });

    if (!requester || requester.role !== "OWNER") {
      res
        .status(403)
        .json({ status: "error", message: "Only owners can invite members" });
      return;
    }

    // Find user by email
    const invitee = await prisma.user.findUnique({ where: { email } });
    if (!invitee) {
      res.status(404).json({ status: "error", message: "User not found" });
      return;
    }

    // Check if already a member
    const existing = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId: invitee.id,
          workspaceId,
        },
      },
    });

    if (existing) {
      res
        .status(409)
        .json({ status: "error", message: "User is already a member" });
      return;
    }

    const member = await prisma.workspaceMember.create({
      data: {
        userId: invitee.id,
        workspaceId,
        role: "MEMBER",
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    res.status(201).json({ data: { member } });
  } catch (err) {
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

export default router;
