import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'WebZoo API',
      version: '1.0.0',
      description: 'Real-time collaboration platform API',
    },
    servers: [{ url: 'http://localhost:4000/api' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'error' },
            message: { type: 'string' },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            name: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Workspace: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            members: { type: 'array', items: { $ref: '#/components/schemas/WorkspaceMember' } },
          },
        },
        WorkspaceMember: {
          type: 'object',
          properties: {
            userId: { type: 'string' },
            workspaceId: { type: 'string' },
            role: { type: 'string', enum: ['OWNER', 'MEMBER'] },
            user: { $ref: '#/components/schemas/User' },
          },
        },
        Topic: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            workspaceId: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Message: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            content: { type: 'string' },
            topicId: { type: 'string' },
            authorId: { type: 'string' },
            author: { $ref: '#/components/schemas/User' },
            replyTo: { $ref: '#/components/schemas/Message', nullable: true },
            reactions: {
              type: 'array',
              items: { $ref: '#/components/schemas/Reaction' },
            },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Reaction: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            emoji: { type: 'string' },
            user: { $ref: '#/components/schemas/User' },
          },
        },
        Task: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string', nullable: true },
            statusId: { type: 'string' },
            priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] },
            assigneeId: { type: 'string', nullable: true },
            dueDate: { type: 'string', format: 'date-time', nullable: true },
            topicId: { type: 'string' },
            workspaceId: { type: 'string' },
            subTasks: { type: 'array', items: { $ref: '#/components/schemas/SubTask' } },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        SubTask: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            done: { type: 'boolean' },
          },
        },
        TaskStatus: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            color: { type: 'string' },
            position: { type: 'number' },
          },
        },
        VaultDocument: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            content: { type: 'string' },
            topicId: { type: 'string' },
            author: { $ref: '#/components/schemas/User' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        SharedLink: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            url: { type: 'string' },
            title: { type: 'string', nullable: true },
            topicId: { type: 'string' },
            addedBy: { $ref: '#/components/schemas/User' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Notification: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            type: { type: 'string', enum: ['MENTION', 'REPLY', 'TASK_ASSIGNED', 'REACTION', 'WORKSPACE_INVITE'] },
            message: { type: 'string' },
            isRead: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        DMConversation: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            participants: {
              type: 'array',
              items: { $ref: '#/components/schemas/User' },
            },
            lastMessage: { $ref: '#/components/schemas/Message', nullable: true },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    paths: {
      '/auth/register': {
        post: {
          tags: ['Auth'],
          summary: 'Register a new user',
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'name', 'password'],
                  properties: {
                    email: { type: 'string', format: 'email' },
                    name: { type: 'string', minLength: 2 },
                    password: { type: 'string', minLength: 8 },
                  },
                },
              },
            },
          },
          responses: {
            201: {
              description: 'User registered',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'object',
                        properties: {
                          accessToken: { type: 'string' },
                          refreshToken: { type: 'string' },
                          user: { $ref: '#/components/schemas/User' },
                        },
                      },
                    },
                  },
                },
              },
            },
            409: { description: 'Email already in use' },
            422: { description: 'Validation error' },
          },
        },
      },
      '/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Login',
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Login successful' },
            401: { description: 'Invalid credentials' },
          },
        },
      },
      '/auth/refresh': {
        post: {
          tags: ['Auth'],
          summary: 'Refresh access token',
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['refreshToken'],
                  properties: { refreshToken: { type: 'string' } },
                },
              },
            },
          },
          responses: {
            200: { description: 'New tokens issued' },
            401: { description: 'Invalid or expired refresh token' },
          },
        },
      },
      '/auth/logout': {
        post: {
          tags: ['Auth'],
          summary: 'Logout',
          security: [],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { refreshToken: { type: 'string' } },
                },
              },
            },
          },
          responses: { 204: { description: 'Logged out' } },
        },
      },
      '/auth/me': {
        get: {
          tags: ['Auth'],
          summary: 'Get current user',
          responses: {
            200: { description: 'Current user profile' },
            401: { description: 'Unauthorized' },
          },
        },
      },
      '/auth/profile': {
        patch: {
          tags: ['Auth'],
          summary: 'Update display name',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { name: { type: 'string', minLength: 2 } },
                },
              },
            },
          },
          responses: { 200: { description: 'Profile updated' } },
        },
      },
      '/auth/password': {
        patch: {
          tags: ['Auth'],
          summary: 'Change password',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['currentPassword', 'newPassword'],
                  properties: {
                    currentPassword: { type: 'string' },
                    newPassword: { type: 'string', minLength: 8 },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Password changed' },
            401: { description: 'Wrong current password' },
          },
        },
      },
      '/workspaces': {
        get: {
          tags: ['Workspaces'],
          summary: 'List all workspaces for the current user',
          responses: { 200: { description: 'List of workspaces' } },
        },
        post: {
          tags: ['Workspaces'],
          summary: 'Create a workspace',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name'],
                  properties: { name: { type: 'string', minLength: 2, maxLength: 50 } },
                },
              },
            },
          },
          responses: { 201: { description: 'Workspace created' } },
        },
      },
      '/workspaces/{workspaceId}': {
        get: {
          tags: ['Workspaces'],
          summary: 'Get a workspace by ID',
          parameters: [{ name: 'workspaceId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Workspace details' }, 403: { description: 'Access denied' } },
        },
      },
      '/workspaces/{workspaceId}/invite': {
        post: {
          tags: ['Workspaces'],
          summary: 'Invite a user by email (owners only)',
          parameters: [{ name: 'workspaceId', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email'],
                  properties: { email: { type: 'string', format: 'email' } },
                },
              },
            },
          },
          responses: {
            201: { description: 'Member added' },
            404: { description: 'User not found' },
            409: { description: 'Already a member' },
          },
        },
      },
      '/workspaces/{workspaceId}/members': {
        get: {
          tags: ['Workspaces'],
          summary: 'List workspace members',
          parameters: [{ name: 'workspaceId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Member list' } },
        },
      },
      '/workspaces/{workspaceId}/members/{userId}': {
        delete: {
          tags: ['Workspaces'],
          summary: 'Remove a member (owners only)',
          parameters: [
            { name: 'workspaceId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'userId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: { 204: { description: 'Member removed' } },
        },
      },
      '/workspaces/{workspaceId}/topics': {
        get: {
          tags: ['Topics'],
          summary: 'List topics in a workspace',
          parameters: [{ name: 'workspaceId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Topic list' } },
        },
        post: {
          tags: ['Topics'],
          summary: 'Create a topic',
          parameters: [{ name: 'workspaceId', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name'],
                  properties: { name: { type: 'string', minLength: 2, maxLength: 50 } },
                },
              },
            },
          },
          responses: { 201: { description: 'Topic created' } },
        },
      },
      '/workspaces/{workspaceId}/topics/unread-counts': {
        get: {
          tags: ['Topics'],
          summary: 'Get unread message counts per topic',
          parameters: [{ name: 'workspaceId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Map of topicId to unread count' } },
        },
      },
      '/workspaces/{workspaceId}/topics/{topicId}': {
        get: {
          tags: ['Topics'],
          summary: 'Get a single topic',
          parameters: [
            { name: 'workspaceId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'topicId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: { 200: { description: 'Topic details' } },
        },
      },
      '/workspaces/{workspaceId}/topics/{topicId}/read': {
        post: {
          tags: ['Topics'],
          summary: 'Mark topic as read',
          parameters: [
            { name: 'workspaceId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'topicId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: { 200: { description: 'Marked as read' } },
        },
      },
      '/workspaces/{workspaceId}/topics/{topicId}/messages': {
        get: {
          tags: ['Messages'],
          summary: 'List messages in a topic (cursor paginated)',
          parameters: [
            { name: 'workspaceId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'topicId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'cursor', in: 'query', schema: { type: 'string' }, description: 'Last message ID for pagination' },
          ],
          responses: { 200: { description: 'Paginated messages + nextCursor' } },
        },
        post: {
          tags: ['Messages'],
          summary: 'Send a message',
          parameters: [
            { name: 'workspaceId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'topicId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['content'],
                  properties: {
                    content: { type: 'string', minLength: 1, maxLength: 5000 },
                    replyToId: { type: 'string', nullable: true },
                  },
                },
              },
            },
          },
          responses: { 201: { description: 'Message sent' } },
        },
      },
      '/workspaces/{workspaceId}/topics/{topicId}/messages/{messageId}/reactions': {
        get: {
          tags: ['Reactions'],
          summary: 'List reactions on a message',
          parameters: [
            { name: 'workspaceId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'topicId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'messageId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: { 200: { description: 'Reaction list' } },
        },
        post: {
          tags: ['Reactions'],
          summary: 'Toggle a reaction (add or remove)',
          parameters: [
            { name: 'workspaceId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'topicId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'messageId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['emoji'],
                  properties: { emoji: { type: 'string' } },
                },
              },
            },
          },
          responses: { 200: { description: 'Updated reaction list' } },
        },
      },
      '/workspaces/{workspaceId}/task-statuses': {
        get: {
          tags: ['Tasks'],
          summary: 'List task statuses for a workspace',
          parameters: [{ name: 'workspaceId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Status list' } },
        },
        post: {
          tags: ['Tasks'],
          summary: 'Create a task status',
          parameters: [{ name: 'workspaceId', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name', 'color'],
                  properties: {
                    name: { type: 'string' },
                    color: { type: 'string' },
                    position: { type: 'number' },
                  },
                },
              },
            },
          },
          responses: { 201: { description: 'Status created' } },
        },
      },
      '/workspaces/{workspaceId}/task-statuses/{statusId}': {
        delete: {
          tags: ['Tasks'],
          summary: 'Delete a task status',
          parameters: [
            { name: 'workspaceId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'statusId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: { 204: { description: 'Deleted' } },
        },
      },
      '/workspaces/{workspaceId}/tasks': {
        get: {
          tags: ['Tasks'],
          summary: 'List tasks (filter by topicId)',
          parameters: [
            { name: 'workspaceId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'topicId', in: 'query', schema: { type: 'string' } },
          ],
          responses: { 200: { description: 'Task list' } },
        },
        post: {
          tags: ['Tasks'],
          summary: 'Create a task',
          parameters: [{ name: 'workspaceId', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['title', 'statusId', 'topicId'],
                  properties: {
                    title: { type: 'string' },
                    description: { type: 'string' },
                    statusId: { type: 'string' },
                    priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] },
                    assigneeId: { type: 'string' },
                    dueDate: { type: 'string', format: 'date-time' },
                    topicId: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: { 201: { description: 'Task created' } },
        },
      },
      '/workspaces/{workspaceId}/tasks/{taskId}': {
        patch: {
          tags: ['Tasks'],
          summary: 'Update a task',
          parameters: [
            { name: 'workspaceId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'taskId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    description: { type: 'string' },
                    statusId: { type: 'string' },
                    priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] },
                    assigneeId: { type: 'string' },
                    dueDate: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          responses: { 200: { description: 'Task updated' } },
        },
        delete: {
          tags: ['Tasks'],
          summary: 'Delete a task',
          parameters: [
            { name: 'workspaceId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'taskId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: { 204: { description: 'Deleted' } },
        },
      },
      '/workspaces/{workspaceId}/tasks/{taskId}/subtasks': {
        post: {
          tags: ['Tasks'],
          summary: 'Add a subtask',
          parameters: [
            { name: 'workspaceId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'taskId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['title'],
                  properties: { title: { type: 'string' } },
                },
              },
            },
          },
          responses: { 201: { description: 'Subtask created' } },
        },
      },
      '/workspaces/{workspaceId}/tasks/{taskId}/subtasks/{subtaskId}': {
        patch: {
          tags: ['Tasks'],
          summary: 'Update a subtask (toggle done)',
          parameters: [
            { name: 'workspaceId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'taskId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'subtaskId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    done: { type: 'boolean' },
                  },
                },
              },
            },
          },
          responses: { 200: { description: 'Subtask updated' } },
        },
        delete: {
          tags: ['Tasks'],
          summary: 'Delete a subtask',
          parameters: [
            { name: 'workspaceId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'taskId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'subtaskId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: { 204: { description: 'Deleted' } },
        },
      },
      '/workspaces/{workspaceId}/vault': {
        get: {
          tags: ['Vault'],
          summary: 'List vault documents (filter by topicId)',
          parameters: [
            { name: 'workspaceId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'topicId', in: 'query', schema: { type: 'string' } },
          ],
          responses: { 200: { description: 'Document list' } },
        },
        post: {
          tags: ['Vault'],
          summary: 'Create a vault document',
          parameters: [{ name: 'workspaceId', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['title', 'topicId'],
                  properties: {
                    title: { type: 'string' },
                    content: { type: 'string' },
                    topicId: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: { 201: { description: 'Document created' } },
        },
      },
      '/workspaces/{workspaceId}/vault/{docId}': {
        patch: {
          tags: ['Vault'],
          summary: 'Update a vault document',
          parameters: [
            { name: 'workspaceId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'docId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    content: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: { 200: { description: 'Document updated' } },
        },
        delete: {
          tags: ['Vault'],
          summary: 'Delete a vault document',
          parameters: [
            { name: 'workspaceId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'docId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: { 204: { description: 'Deleted' } },
        },
      },
      '/workspaces/{workspaceId}/links': {
        get: {
          tags: ['Links'],
          summary: 'List shared links (filter by topicId)',
          parameters: [
            { name: 'workspaceId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'topicId', in: 'query', schema: { type: 'string' } },
          ],
          responses: { 200: { description: 'Link list' } },
        },
        post: {
          tags: ['Links'],
          summary: 'Add a shared link',
          parameters: [{ name: 'workspaceId', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['url', 'topicId'],
                  properties: {
                    url: { type: 'string', format: 'uri' },
                    title: { type: 'string' },
                    topicId: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: { 201: { description: 'Link added' } },
        },
      },
      '/workspaces/{workspaceId}/links/{linkId}': {
        delete: {
          tags: ['Links'],
          summary: 'Delete a shared link',
          parameters: [
            { name: 'workspaceId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'linkId', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: { 204: { description: 'Deleted' } },
        },
      },
      '/workspaces/{workspaceId}/media': {
        get: {
          tags: ['Files'],
          summary: 'List uploaded media files (filter by topicId)',
          parameters: [
            { name: 'workspaceId', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'topicId', in: 'query', schema: { type: 'string' } },
          ],
          responses: { 200: { description: 'File list' } },
        },
      },
      '/upload': {
        post: {
          tags: ['Files'],
          summary: 'Upload a file',
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  properties: { file: { type: 'string', format: 'binary' } },
                },
              },
            },
          },
          responses: { 201: { description: 'File uploaded, returns file metadata' } },
        },
      },
      '/notifications': {
        get: {
          tags: ['Notifications'],
          summary: 'List notifications for current user',
          responses: { 200: { description: 'Notification list' } },
        },
      },
      '/notifications/unread-count': {
        get: {
          tags: ['Notifications'],
          summary: 'Get unread notification count',
          responses: { 200: { description: 'Count' } },
        },
      },
      '/notifications/mark-read': {
        post: {
          tags: ['Notifications'],
          summary: 'Mark all notifications as read',
          responses: { 200: { description: 'All marked read' } },
        },
      },
      '/notifications/{id}': {
        delete: {
          tags: ['Notifications'],
          summary: 'Delete a notification',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 204: { description: 'Deleted' } },
        },
      },
      '/dm/conversations': {
        get: {
          tags: ['Direct Messages'],
          summary: 'List DM conversations for current user',
          responses: { 200: { description: 'Conversation list' } },
        },
        post: {
          tags: ['Direct Messages'],
          summary: 'Start or get a DM conversation',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['participantId'],
                  properties: { participantId: { type: 'string' } },
                },
              },
            },
          },
          responses: { 200: { description: 'Existing or new conversation' } },
        },
      },
      '/dm/conversations/{id}/messages': {
        get: {
          tags: ['Direct Messages'],
          summary: 'List messages in a DM conversation',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: { description: 'Message list' } },
        },
        post: {
          tags: ['Direct Messages'],
          summary: 'Send a DM message',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['content'],
                  properties: { content: { type: 'string' } },
                },
              },
            },
          },
          responses: { 201: { description: 'Message sent' } },
        },
      },
    },
  },
  apis: [],
};

export const swaggerSpec = swaggerJsdoc(options);
