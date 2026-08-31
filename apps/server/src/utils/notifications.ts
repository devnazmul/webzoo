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

    let message = '';
    switch (notification.type) {
      case 'MENTION': message = `${notification.actor.name} mentioned you in ${notification.workspace.name}`; break;
      case 'REPLY': message = `${notification.actor.name} replied to your message in ${notification.workspace.name}`; break;
      case 'TASK_ASSIGNED': message = `${notification.actor.name} assigned you a task in ${notification.workspace.name}`; break;
      case 'REACTION': message = `${notification.actor.name} reacted to your message in ${notification.workspace.name}`; break;
      case 'WORKSPACE_INVITE': message = `${notification.actor.name} invited you to join ${notification.workspace.name}`; break;
      default: message = `New notification from ${notification.actor.name}`;
    }

    const mappedNotification = {
      ...notification,
      message,
      actorName: notification.actor.name,
      workspaceName: notification.workspace.name,
    };

    // Emit real-time notification to recipient's personal room
    io.to(`user:${params.userId}`).emit('notification:new', mappedNotification);
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
      console.log('[Mentions] Parsed payload mentions:', parsed.mentions);
      if (parsed?.mentions && Array.isArray(parsed.mentions)) {
        mentionedUserIds = parsed.mentions
          .filter((m: any) => m.mentionType === 'user')
          .map((m: any) => m.id);
      }
    } catch (e) {
      console.log('[Mentions] Parse error:', e);
    }
    
    console.log('[Mentions] Found mentioned users:', mentionedUserIds);

    // Create notification for each mentioned user
    for (const userId of mentionedUserIds) {
      console.log(`[Mentions] Creating notification for user ${userId} by actor ${params.actorId}`);
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
