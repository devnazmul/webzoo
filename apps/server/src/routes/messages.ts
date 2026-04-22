import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticate, AuthRequest } from "../middleware/authenticate";
import { io } from "../index";

const router = Router({ mergeParams: true });

router.use(authenticate);

const sendMessageSchema = z.object({
  content: z.string().min(1).max(5000),
});

// Helper: check if user is a member of the workspace
async function isMember(userId: string, workspaceId: string): Promise<boolean> {
  const member = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: { userId, workspaceId },
    },
  });
  return !!member;
}

// GET /api/workspaces/:workspaceId/topics/:topicId/messages
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId, topicId } = req.params;

    if (!(await isMember(req.user!.userId, workspaceId))) {
      res.status(403).json({ status: "error", message: "Access denied" });
      return;
    }

    const cursor = req.query.cursor as string | undefined;
    const limit = 50;

    const messages = await prisma.message.findMany({
      where: { topicId },
      orderBy: { createdAt: "desc" },
      take: limit,
      ...(cursor && {
        skip: 1,
        cursor: { id: cursor },
      }),
      include: {
        author: {
          select: { id: true, name: true },
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
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

// POST /api/workspaces/:workspaceId/topics/:topicId/messages
router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId, topicId } = req.params;

    if (!(await isMember(req.user!.userId, workspaceId))) {
      res.status(403).json({ status: "error", message: "Access denied" });
      return;
    }

    const body = sendMessageSchema.safeParse(req.body);
    if (!body.success) {
      res
        .status(422)
        .json({ status: "error", message: body.error.errors[0].message });
      return;
    }

    // Verify topic belongs to workspace
    const topic = await prisma.topic.findUnique({
      where: { id: topicId },
    });

    if (!topic || topic.workspaceId !== workspaceId) {
      res.status(404).json({ status: "error", message: "Topic not found" });
      return;
    }

    const message = await prisma.message.create({
      data: {
        content: body.data.content,
        topicId,
        authorId: req.user!.userId,
      },
      include: {
        author: {
          select: { id: true, name: true },
        },
      },
    });

    io.to(topicId).emit('message:new', { message });

    res.status(201).json({ data: { message } });
  } catch (err) {
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

export default router;
