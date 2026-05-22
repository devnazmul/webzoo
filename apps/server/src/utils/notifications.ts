import { prisma } from '../lib/prisma';
import { io } from '../index';

type NotificationType =
  | 'MENTION'
  | 'REPLY'
  | 'TASK_ASSIGNED'
  | 'REACTION'
  | 'WORKSPACE_INVITE';

interface CreateNotificationParams {
  type: NotificationType;
  userId: string;       // recipient
  actorId: string;      // who triggered it
  workspaceId: string;
  topicId?: string;
  messageId?: string;
  taskId?: string;
}

export async function createNotification(
  params: CreateNotificationParams
): Promise<void> {
  // Don't notify yourself
  if (params.userId === params.actorId) return;

  try {
    const notification = await prisma.notification.create({
      data: {
        type: params.type,
        userId: params.userId,
        actorId: params.actorId,
        workspaceId: params.workspaceId,
        topicId: params.topicId,
        messageId: params.messageId,
        taskId: params.taskId,
      },
      include: {
        actor: { select: { id: true, name: true } },
        workspace: { select: { id: true, name: true } },
      },
    });

    // Emit real-time notification to recipient's personal room
    io.to(`user:${params.userId}`).emit('notification:new', { notification });
  } catch (err) {
    console.error('[Notifications] Failed to create notification:', err);
  }
}

export async function createMentionNotifications(params: {
  content: string;
  actorId: string;
  workspaceId: string;
  topicId: string;
  messageId: string;
}): Promise<void> {
  try {
    // Extract mention IDs from Lexical JSON
    let mentionedUserIds: string[] = [];

    try {
      const parsed = JSON.parse(params.content);
      if (parsed?.mentions && Array.isArray(parsed.mentions)) {
        mentionedUserIds = parsed.mentions
          .filter((m: any) => m.mentionType === 'user')
          .map((m: any) => m.id);
      }
    } catch {
      // Plain text — no structured mentions
    }

    // Create notification for each mentioned user
    for (const userId of mentionedUserIds) {
      await createNotification({
        type: 'MENTION',
        userId,
        actorId: params.actorId,
        workspaceId: params.workspaceId,
        topicId: params.topicId,
        messageId: params.messageId,
      });
    }
  } catch (err) {
    console.error('[Notifications] Failed to create mention notifications:', err);
  }
}
