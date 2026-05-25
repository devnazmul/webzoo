import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import authRouter from './routes/auth';
import workspacesRouter from './routes/workspaces';
import topicsRouter from './routes/topics';
import messagesRouter from './routes/messages';
import uploadsRouter from './routes/uploads';
import path from 'path';
import tasksRouter from './routes/tasks';
import vaultRouter from './routes/vault';
import linksRouter from './routes/links';
import reactionsRouter from './routes/reactions';
import notificationsRouter from './routes/notifications';
import dmRouter from './routes/dm';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './lib/swagger';

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRouter);
app.use('/api/workspaces', workspacesRouter);
// Also mount uploads at top-level for editor convenience
app.use('/api/upload', uploadsRouter);
app.use('/api/workspaces/:workspaceId/topics', topicsRouter);
app.use('/api/workspaces/:workspaceId/topics/:topicId/messages', messagesRouter);
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use(
  '/api/workspaces/:workspaceId/topics/:topicId/upload',
  uploadsRouter
);
app.use(
  '/api/workspaces/:workspaceId/topics/:topicId/media',
  uploadsRouter
);
app.use('/api/workspaces/:workspaceId/topics/:topicId', tasksRouter);
app.use('/api/workspaces/:workspaceId/topics/:topicId/vault', vaultRouter);
app.use('/api/workspaces/:workspaceId/topics/:topicId/links', linksRouter);
app.use(
  '/api/workspaces/:workspaceId/topics/:topicId/messages/:messageId/reactions',
  reactionsRouter
);
app.use('/api/notifications', notificationsRouter);
app.use('/api/dm', dmRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'webzoo-server' });
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'WebZoo API Docs',
  swaggerOptions: {
    persistAuthorization: true,
  },
}));
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ status: 'error', message: 'Route not found' });
});

// Track online users per topic: topicId -> Set of userIds
const topicPresence = new Map<string, Set<string>>();

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  let currentUserId: string | null = null;
  let currentTopics: Set<string> = new Set();

  socket.on('presence:init', (userId: string) => {
    currentUserId = userId;
    // Join personal room for notifications
    socket.join(`user:${userId}`);
    console.log(`User ${userId} initialized presence`);
  });

  socket.on('topic:join', (topicId: string) => {
    socket.join(topicId);
    currentTopics.add(topicId);

    if (currentUserId) {
      if (!topicPresence.has(topicId)) {
        topicPresence.set(topicId, new Set());
      }
      topicPresence.get(topicId)!.add(currentUserId);

      // Broadcast updated online users to everyone in topic
      io.to(topicId).emit('presence:update', {
        topicId,
        onlineUsers: Array.from(topicPresence.get(topicId)!),
      });
    }

    console.log(`Socket ${socket.id} joined topic ${topicId}`);
  });

  socket.on('dm:join', (conversationId: string) => {
    socket.join(`dm:${conversationId}`);
    console.log(`Socket ${socket.id} joined DM ${conversationId}`);
  });

  socket.on('dm:leave', (conversationId: string) => {
    socket.leave(`dm:${conversationId}`);
    console.log(`Socket ${socket.id} left DM ${conversationId}`);
  });

  socket.on('topic:leave', (topicId: string) => {
    socket.leave(topicId);
    currentTopics.delete(topicId);

    if (currentUserId && topicPresence.has(topicId)) {
      topicPresence.get(topicId)!.delete(currentUserId);

      io.to(topicId).emit('presence:update', {
        topicId,
        onlineUsers: Array.from(topicPresence.get(topicId)!),
      });
    }

    console.log(`Socket ${socket.id} left topic ${topicId}`);
  });

  socket.on('typing:start', (topicId: string) => {
    if (currentUserId) {
      socket.to(topicId).emit('typing:update', {
        topicId,
        userId: currentUserId,
        isTyping: true,
      });
    }
  });

  socket.on('typing:stop', (topicId: string) => {
    if (currentUserId) {
      socket.to(topicId).emit('typing:update', {
        topicId,
        userId: currentUserId,
        isTyping: false,
      });
    }
  });

  socket.on('disconnect', () => {
    // Clean up presence for all topics this socket was in
    if (currentUserId) {
      currentTopics.forEach((topicId) => {
        if (topicPresence.has(topicId)) {
          topicPresence.get(topicId)!.delete(currentUserId!);

          io.to(topicId).emit('presence:update', {
            topicId,
            onlineUsers: Array.from(topicPresence.get(topicId)!),
          });
        }
      });
    }
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export { io };
