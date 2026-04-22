import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticate, AuthRequest } from "../middleware/authenticate";

const router = Router({ mergeParams: true });

router.use(authenticate);

const createTopicSchema = z.object({
  name: z.string().min(2).max(50),
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

// GET /api/workspaces/:workspaceId/topics
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId } = req.params;

    if (!(await isMember(req.user!.userId, workspaceId))) {
      res.status(403).json({ status: "error", message: "Access denied" });
      return;
    }

    const topics = await prisma.topic.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "asc" },
    });

    res.status(200).json({ data: { topics } });
  } catch (err) {
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

// POST /api/workspaces/:workspaceId/topics
router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId } = req.params;

    if (!(await isMember(req.user!.userId, workspaceId))) {
      res.status(403).json({ status: "error", message: "Access denied" });
      return;
    }

    const body = createTopicSchema.safeParse(req.body);
    if (!body.success) {
      res
        .status(422)
        .json({ status: "error", message: body.error.errors[0].message });
      return;
    }

    const topic = await prisma.topic.create({
      data: {
        name: body.data.name,
        workspaceId,
      },
    });

    res.status(201).json({ data: { topic } });
  } catch (err) {
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

// GET /api/workspaces/:workspaceId/topics/:topicId
router.get("/:topicId", async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId, topicId } = req.params;

    if (!(await isMember(req.user!.userId, workspaceId))) {
      res.status(403).json({ status: "error", message: "Access denied" });
      return;
    }

    const topic = await prisma.topic.findUnique({
      where: { id: topicId },
    });

    if (!topic || topic.workspaceId !== workspaceId) {
      res.status(404).json({ status: "error", message: "Topic not found" });
      return;
    }

    res.status(200).json({ data: { topic } });
  } catch (err) {
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

export default router;
