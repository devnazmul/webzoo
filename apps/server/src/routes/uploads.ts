import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/authenticate';

const router = Router({ mergeParams: true });
router.use(authenticate);

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer storage config
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${unique}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
  },
});

// POST /api/workspaces/:workspaceId/topics/:topicId/upload
router.post(
  '/',
  upload.array('files', 10),
  async (req: AuthRequest, res: Response) => {
    try {
      const { workspaceId, topicId } = req.params;
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        res.status(422).json({ status: 'error', message: 'No files uploaded' });
        return;
      }

      // Verify workspace membership
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

      // Verify topic belongs to workspace
      const topic = await prisma.topic.findUnique({
        where: { id: topicId },
      });

      if (!topic || topic.workspaceId !== workspaceId) {
        res.status(404).json({ status: 'error', message: 'Topic not found' });
        return;
      }

      // Save attachments to DB
      const attachments = await Promise.all(
        files.map((file) =>
          prisma.attachment.create({
            data: {
              filename: file.filename,
              originalName: file.originalname,
              mimeType: file.mimetype,
              size: file.size,
              url: `/uploads/${file.filename}`,
              topicId,
              uploadedById: req.user!.userId,
            },
          })
        )
      );

      res.status(201).json({ data: { attachments } });
    } catch (err) {
      res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
  }
);

// GET /api/workspaces/:workspaceId/topics/:topicId/media
router.get(
  '/media',
  async (req: AuthRequest, res: Response) => {
    try {
      const { workspaceId, topicId } = req.params;

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

      const attachments = await prisma.attachment.findMany({
        where: { topicId },
        orderBy: { createdAt: 'desc' },
        include: {
          uploadedBy: {
            select: { id: true, name: true },
          },
        },
      });

      res.status(200).json({ data: { attachments } });
    } catch (err) {
      res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
  }
);

export default router;
