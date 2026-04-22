import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import authRouter from './routes/auth';
import workspacesRouter from './routes/workspaces';
import topicsRouter from './routes/topics';
import messagesRouter from './routes/messages';

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
app.use('/api/workspaces/:workspaceId/topics', topicsRouter);
app.use('/api/workspaces/:workspaceId/topics/:topicId/messages', messagesRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'webzoo-server' });
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
