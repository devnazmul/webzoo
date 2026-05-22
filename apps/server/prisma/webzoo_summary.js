const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
  LevelFormat, PageNumber, Footer, Header, PageBreak
} = require('docx');
const fs = require('fs');

const border = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
const borders = { top: border, bottom: border, left: border, right: border };
const headerBorder = { style: BorderStyle.SINGLE, size: 1, color: '3B5BDB' };
const headerBorders = { top: headerBorder, bottom: headerBorder, left: headerBorder, right: headerBorder };

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200 },
    children: [new TextRun({ text, bold: true, size: 32, color: '1E3A8A', font: 'Arial' })]
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 150 },
    children: [new TextRun({ text, bold: true, size: 26, color: '1D4ED8', font: 'Arial' })]
  });
}

function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 100 },
    children: [new TextRun({ text, bold: true, size: 22, color: '2563EB', font: 'Arial' })]
  });
}

function p(text, options = {}) {
  return new Paragraph({
    spacing: { before: 80, after: 80 },
    children: [new TextRun({ text, size: 22, font: 'Arial', ...options })]
  });
}

function bullet(text) {
  return new Paragraph({
    numbering: { reference: 'bullets', level: 0 },
    spacing: { before: 60, after: 60 },
    children: [new TextRun({ text, size: 22, font: 'Arial' })]
  });
}

function code(text) {
  return new Paragraph({
    spacing: { before: 60, after: 60 },
    shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
    indent: { left: 360 },
    children: [new TextRun({ text, size: 20, font: 'Courier New', color: '1E293B' })]
  });
}

function statusRow(feature, status, notes) {
  const isDone = status === '✅ Complete';
  const isPartial = status === '⚠️ Partial';
  const fill = isDone ? 'DCFCE7' : isPartial ? 'FEF9C3' : 'FEE2E2';
  return new TableRow({
    children: [
      new TableCell({
        borders, width: { size: 3000, type: WidthType.DXA },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [new Paragraph({ children: [new TextRun({ text: feature, size: 20, font: 'Arial' })] })]
      }),
      new TableCell({
        borders, width: { size: 1500, type: WidthType.DXA },
        shading: { fill, type: ShadingType.CLEAR },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [new Paragraph({ children: [new TextRun({ text: status, size: 20, font: 'Arial', bold: true })] })]
      }),
      new TableCell({
        borders, width: { size: 4860, type: WidthType.DXA },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [new Paragraph({ children: [new TextRun({ text: notes, size: 20, font: 'Arial' })] })]
      }),
    ]
  });
}

function tableHeader(cols, widths) {
  return new TableRow({
    tableHeader: true,
    children: cols.map((col, i) => new TableCell({
      borders: headerBorders,
      width: { size: widths[i], type: WidthType.DXA },
      shading: { fill: '1E3A8A', type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [new Paragraph({ children: [new TextRun({ text: col, size: 20, font: 'Arial', bold: true, color: 'FFFFFF' })] })]
    }))
  });
}

function apiRow(method, path, desc) {
  const methodColor = method === 'GET' ? '059669' : method === 'POST' ? '2563EB' : method === 'PATCH' ? 'D97706' : 'DC2626';
  return new TableRow({
    children: [
      new TableCell({
        borders, width: { size: 900, type: WidthType.DXA },
        shading: { fill: method === 'GET' ? 'DCFCE7' : method === 'POST' ? 'DBEAFE' : method === 'PATCH' ? 'FEF3C7' : 'FEE2E2', type: ShadingType.CLEAR },
        margins: { top: 60, bottom: 60, left: 100, right: 100 },
        children: [new Paragraph({ children: [new TextRun({ text: method, size: 18, font: 'Courier New', bold: true, color: methodColor })] })]
      }),
      new TableCell({
        borders, width: { size: 3600, type: WidthType.DXA },
        margins: { top: 60, bottom: 60, left: 100, right: 100 },
        children: [new Paragraph({ children: [new TextRun({ text: path, size: 18, font: 'Courier New', color: '1E293B' })] })]
      }),
      new TableCell({
        borders, width: { size: 4860, type: WidthType.DXA },
        margins: { top: 60, bottom: 60, left: 100, right: 100 },
        children: [new Paragraph({ children: [new TextRun({ text: desc, size: 18, font: 'Arial', color: '374151' })] })]
      }),
    ]
  });
}

const doc = new Document({
  numbering: {
    config: [
      {
        reference: 'bullets',
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: '•',
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } }
        }]
      }
    ]
  },
  styles: {
    default: { document: { run: { font: 'Arial', size: 22 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 32, bold: true, font: 'Arial', color: '1E3A8A' },
        paragraph: { spacing: { before: 400, after: 200 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 26, bold: true, font: 'Arial', color: '1D4ED8' },
        paragraph: { spacing: { before: 300, after: 150 }, outlineLevel: 1 } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 22, bold: true, font: 'Arial', color: '2563EB' },
        paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 2 } },
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1080, bottom: 1440, left: 1080 }
      }
    },
    children: [
      // ─── Cover ───────────────────────────────────────────────────────────────
      new Paragraph({
        spacing: { before: 2880, after: 200 },
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'WebZoo', size: 72, bold: true, font: 'Arial', color: '1E3A8A' })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 200 },
        children: [new TextRun({ text: 'Real-Time Collaboration Platform', size: 36, font: 'Arial', color: '3B5BDB' })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 600 },
        children: [new TextRun({ text: 'Full Project Summary & Handover Document', size: 24, font: 'Arial', color: '6B7280', italics: true })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 200 },
        children: [new TextRun({ text: `Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, size: 20, font: 'Arial', color: '9CA3AF' })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 200 },
        children: [new TextRun({ text: 'GitHub: github.com/devnazmul/webzoo', size: 20, font: 'Arial', color: '9CA3AF' })]
      }),
      new Paragraph({ children: [new PageBreak()] }),

      // ─── 1. Project Overview ──────────────────────────────────────────────────
      h1('1. Project Overview'),
      p('WebZoo is a production-grade real-time collaboration platform — similar in concept to Slack — built as a monorepo with a TypeScript-first stack. It supports multiple workspaces, topic-based channels, real-time messaging, file sharing, tasks, a document vault, and direct messaging.'),
      new Paragraph({ spacing: { before: 120, after: 80 }, children: [new TextRun({ text: 'Key Characteristics', size: 24, bold: true, font: 'Arial', color: '1E3A8A' })] }),
      bullet('Monorepo managed with pnpm workspaces'),
      bullet('Single Express server with Socket.io for real-time features'),
      bullet('MySQL database with Prisma ORM — full schema migrations in place'),
      bullet('React web frontend with Lexical rich text editor'),
      bullet('Dark space-themed UI with light/dark toggle'),
      bullet('JWT authentication with refresh token rotation'),
      bullet('Structured JSON message format (Lexical AST)'),

      // ─── 2. Tech Stack ────────────────────────────────────────────────────────
      new Paragraph({ spacing: { before: 200 }, children: [] }),
      h1('2. Technology Stack'),

      h2('Backend'),
      bullet('Runtime: Node.js v20 with TypeScript (tsx watch for dev)'),
      bullet('Framework: Express.js 4.x'),
      bullet('Real-time: Socket.io 4.x'),
      bullet('Database: MySQL 8.0 via Docker'),
      bullet('ORM: Prisma 6.10.1'),
      bullet('Auth: JWT (jsonwebtoken) + bcryptjs'),
      bullet('Validation: Zod'),
      bullet('File uploads: Multer (local disk storage, /uploads folder)'),

      h2('Frontend (Web)'),
      bullet('Framework: React 19 + Vite 8'),
      bullet('Language: TypeScript (strict mode)'),
      bullet('Styling: Tailwind CSS + shadcn/ui components'),
      bullet('State: Zustand'),
      bullet('HTTP: Axios with auto-refresh interceptor'),
      bullet('Real-time: socket.io-client'),
      bullet('Rich text editor: Lexical (Meta) with custom nodes and plugins'),
      bullet('Message rendering: react-markdown + react-syntax-highlighter'),
      bullet('Routing: react-router-dom v7'),

      h2('Infrastructure'),
      bullet('Docker Compose: MySQL on port 3307 (3306 used by existing stack)'),
      bullet('Package manager: pnpm 9.0.0'),
      bullet('Node version: 20.x (required — Prisma breaks on Node 24)'),

      // ─── 3. Monorepo Structure ────────────────────────────────────────────────
      new Paragraph({ spacing: { before: 200 }, children: [] }),
      h1('3. Monorepo Structure'),
      code('webzoo/'),
      code('├── apps/'),
      code('│   ├── server/          # Express + Socket.io backend'),
      code('│   │   ├── src/'),
      code('│   │   │   ├── index.ts          # Entry point, Socket.io setup'),
      code('│   │   │   ├── routes/           # All API routes'),
      code('│   │   │   │   ├── auth.ts'),
      code('│   │   │   │   ├── workspaces.ts'),
      code('│   │   │   │   ├── topics.ts'),
      code('│   │   │   │   ├── messages.ts'),
      code('│   │   │   │   ├── tasks.ts'),
      code('│   │   │   │   ├── vault.ts'),
      code('│   │   │   │   ├── links.ts'),
      code('│   │   │   │   ├── reactions.ts'),
      code('│   │   │   │   ├── uploads.ts'),
      code('│   │   │   │   └── notifications.ts  # In progress'),
      code('│   │   │   ├── middleware/'),
      code('│   │   │   │   └── authenticate.ts'),
      code('│   │   │   ├── utils/'),
      code('│   │   │   │   ├── token.ts'),
      code('│   │   │   │   ├── password.ts'),
      code('│   │   │   │   └── notifications.ts  # In progress'),
      code('│   │   │   └── lib/'),
      code('│   │   │       └── prisma.ts'),
      code('│   │   ├── prisma/'),
      code('│   │   │   ├── schema.prisma'),
      code('│   │   │   └── migrations/'),
      code('│   │   └── uploads/              # File storage'),
      code('│   └── web/             # React frontend'),
      code('│       └── src/'),
      code('│           ├── components/'),
      code('│           │   ├── chat/'),
      code('│           │   │   ├── editor/   # Lexical editor system'),
      code('│           │   │   │   ├── LexicalEditor.tsx'),
      code('│           │   │   │   ├── nodes/'),
      code('│           │   │   │   ├── plugins/'),
      code('│           │   │   │   ├── ui/'),
      code('│           │   │   │   └── utils/'),
      code('│           │   │   ├── MessageFeed.tsx'),
      code('│           │   │   ├── MessageBubble.tsx'),
      code('│           │   │   └── MessageRenderer.tsx'),
      code('│           │   └── layout/'),
      code('│           ├── pages/'),
      code('│           │   ├── LoginPage.tsx'),
      code('│           │   ├── RegisterPage.tsx'),
      code('│           │   └── AppShell.tsx'),
      code('│           └── store/'),
      code('│               ├── auth.store.ts'),
      code('│               ├── workspace.store.ts'),
      code('│               ├── topic.store.ts'),
      code('│               └── theme.store.ts'),
      code('└── packages/'),
      code('    ├── shared/          # Shared TypeScript types'),
      code('    └── tsconfig/        # Shared TypeScript config'),

      // ─── 4. Database Schema ───────────────────────────────────────────────────
      new Paragraph({ spacing: { before: 200 }, children: [] }),
      h1('4. Database Schema'),
      p('All models are in apps/server/prisma/schema.prisma. Two migrations have been applied:'),
      bullet('20260423044956_init — Core models'),
      bullet('20260518063506_add_tasks_vault_media_links — Tasks, Vault, Media, Links, Reactions'),
      bullet('20260519040831_add_notifications_dm_readstate — Notifications, DMs, ReadState'),

      h2('Models'),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2200, 7160],
        rows: [
          tableHeader(['Model', 'Purpose'], [2200, 7160]),
          ...([
            ['User', 'Auth, profile. Has workspaces, messages, tasks, reactions, notifications'],
            ['Workspace', 'Container for topics and members'],
            ['WorkspaceMember', 'Junction: User ↔ Workspace with role (OWNER/MEMBER)'],
            ['Topic', 'Channel/topic within a workspace'],
            ['Message', 'Chat message with replyToId, Lexical JSON content'],
            ['RefreshToken', 'Opaque refresh token with expiry'],
            ['Attachment', 'Uploaded file linked to topic and optionally a message'],
            ['TaskStatus', 'Kanban column with name, color, order — seeded with 3 defaults'],
            ['Task', 'Task with optimistic locking (version field), assignee, subtasks'],
            ['SubTask', 'Child task with completed flag'],
            ['VaultDocument', 'Notion-like document with LongText content'],
            ['SharedLink', 'URL auto-extracted from messages or manually shared'],
            ['Reaction', 'Emoji reaction on a message (unique per user+emoji+message)'],
            ['Notification', 'MENTION, REPLY, TASK_ASSIGNED, REACTION, WORKSPACE_INVITE'],
            ['DirectConversation', '1-to-1 conversation container'],
            ['DirectConversationParticipant', 'Junction: User ↔ DirectConversation'],
            ['DirectMessage', 'DM with reply support and reactions'],
            ['DirectMessageReaction', 'Emoji reaction on a DM'],
            ['TopicReadState', 'Tracks last read timestamp per user per topic'],
          ].map(([model, purpose]) => new TableRow({
            children: [
              new TableCell({ borders, width: { size: 2200, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: model, size: 20, font: 'Courier New', bold: true })] })] }),
              new TableCell({ borders, width: { size: 7160, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: purpose, size: 20, font: 'Arial' })] })] }),
            ]
          })))
        ]
      }),

      // ─── 5. API Reference ─────────────────────────────────────────────────────
      new Paragraph({ spacing: { before: 200 }, children: [] }),
      h1('5. Complete API Reference'),
      p('Base URL: http://localhost:4000/api — All routes except auth require Authorization: Bearer <accessToken> header.'),

      h2('Auth'),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [900, 3600, 4860],
        rows: [
          tableHeader(['Method', 'Endpoint', 'Description'], [900, 3600, 4860]),
          apiRow('POST', '/auth/register', 'Register. Body: { email, name, password }'),
          apiRow('POST', '/auth/login', 'Login. Body: { email, password }. Returns accessToken + refreshToken'),
          apiRow('POST', '/auth/refresh', 'Rotate refresh token. Body: { refreshToken }'),
          apiRow('POST', '/auth/logout', 'Revoke refresh token. Body: { refreshToken }'),
          apiRow('GET', '/auth/me', 'Get current user profile'),
          apiRow('PATCH', '/auth/profile', 'Update name. Body: { name }'),
          apiRow('PATCH', '/auth/password', 'Change password. Body: { currentPassword, newPassword }'),
        ]
      }),

      h2('Workspaces'),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [900, 3600, 4860],
        rows: [
          tableHeader(['Method', 'Endpoint', 'Description'], [900, 3600, 4860]),
          apiRow('GET', '/workspaces', 'List all workspaces for current user'),
          apiRow('POST', '/workspaces', 'Create workspace. Body: { name }'),
          apiRow('GET', '/workspaces/:wId', 'Get workspace with members'),
          apiRow('POST', '/workspaces/:wId/invite', 'Invite member by email. Body: { email }'),
        ]
      }),

      h2('Topics'),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [900, 3600, 4860],
        rows: [
          tableHeader(['Method', 'Endpoint', 'Description'], [900, 3600, 4860]),
          apiRow('GET', '/workspaces/:wId/topics', 'List topics in workspace'),
          apiRow('POST', '/workspaces/:wId/topics', 'Create topic. Body: { name }'),
          apiRow('GET', '/workspaces/:wId/topics/:tId', 'Get single topic'),
        ]
      }),

      h2('Messages'),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [900, 3600, 4860],
        rows: [
          tableHeader(['Method', 'Endpoint', 'Description'], [900, 3600, 4860]),
          apiRow('GET', '/workspaces/:wId/topics/:tId/messages', 'Paginated messages. Query: cursor'),
          apiRow('POST', '/workspaces/:wId/topics/:tId/messages', 'Send message. Body: { content, replyToId? }. Auto-extracts URLs'),
        ]
      }),

      h2('Reactions'),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [900, 3600, 4860],
        rows: [
          tableHeader(['Method', 'Endpoint', 'Description'], [900, 3600, 4860]),
          apiRow('GET', '/workspaces/:wId/topics/:tId/messages/:mId/reactions', 'Get reactions for a message'),
          apiRow('POST', '/workspaces/:wId/topics/:tId/messages/:mId/reactions', 'Toggle reaction. Body: { emoji }. Emits reaction:update via Socket.io'),
        ]
      }),

      h2('Tasks'),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [900, 3600, 4860],
        rows: [
          tableHeader(['Method', 'Endpoint', 'Description'], [900, 3600, 4860]),
          apiRow('GET', '/workspaces/:wId/topics/:tId/task-statuses', 'Get kanban columns. Seeds To Do/In Progress/Done on first call'),
          apiRow('POST', '/workspaces/:wId/topics/:tId/task-statuses', 'Create custom status. Body: { name, color }'),
          apiRow('DELETE', '/workspaces/:wId/topics/:tId/task-statuses/:sId', 'Delete status (only if no tasks)'),
          apiRow('POST', '/workspaces/:wId/topics/:tId/tasks', 'Create task. Body: { title, statusId, assigneeId?, messageId?, dueDate? }'),
          apiRow('PATCH', '/workspaces/:wId/topics/:tId/tasks/:taskId', 'Update task. Body: { ...fields, version } — optimistic locking'),
          apiRow('DELETE', '/workspaces/:wId/topics/:tId/tasks/:taskId', 'Delete task and subtasks'),
          apiRow('POST', '/workspaces/:wId/topics/:tId/tasks/:taskId/subtasks', 'Add subtask. Body: { title }'),
          apiRow('PATCH', '/workspaces/:wId/topics/:tId/tasks/:taskId/subtasks/:sId', 'Update subtask. Body: { title?, completed? }'),
          apiRow('DELETE', '/workspaces/:wId/topics/:tId/tasks/:taskId/subtasks/:sId', 'Delete subtask'),
        ]
      }),

      h2('Vault'),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [900, 3600, 4860],
        rows: [
          tableHeader(['Method', 'Endpoint', 'Description'], [900, 3600, 4860]),
          apiRow('GET', '/workspaces/:wId/topics/:tId/vault', 'List documents'),
          apiRow('POST', '/workspaces/:wId/topics/:tId/vault', 'Create document. Body: { title, content? }'),
          apiRow('GET', '/workspaces/:wId/topics/:tId/vault/:docId', 'Get single document'),
          apiRow('PATCH', '/workspaces/:wId/topics/:tId/vault/:docId', 'Update document. Body: { title?, content? }'),
          apiRow('DELETE', '/workspaces/:wId/topics/:tId/vault/:docId', 'Delete document'),
        ]
      }),

      h2('Files & Media'),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [900, 3600, 4860],
        rows: [
          tableHeader(['Method', 'Endpoint', 'Description'], [900, 3600, 4860]),
          apiRow('POST', '/workspaces/:wId/topics/:tId/upload', 'Upload files. multipart/form-data, field: files (max 10, 50MB each)'),
          apiRow('GET', '/workspaces/:wId/topics/:tId/media', 'List all attachments for topic'),
          apiRow('GET', '/uploads/:filename', 'Serve uploaded file (static)'),
        ]
      }),

      h2('Links'),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [900, 3600, 4860],
        rows: [
          tableHeader(['Method', 'Endpoint', 'Description'], [900, 3600, 4860]),
          apiRow('GET', '/workspaces/:wId/topics/:tId/links', 'List shared links (auto-populated from messages)'),
          apiRow('POST', '/workspaces/:wId/topics/:tId/links', 'Manually share link. Body: { url, title?, description? }'),
          apiRow('DELETE', '/workspaces/:wId/topics/:tId/links/:linkId', 'Delete link'),
        ]
      }),

      h2('Notifications'),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [900, 3600, 4860],
        rows: [
          tableHeader(['Method', 'Endpoint', 'Description'], [900, 3600, 4860]),
          apiRow('GET', '/notifications', 'List notifications for current user (last 50)'),
          apiRow('GET', '/notifications/unread-count', 'Get unread notification count'),
          apiRow('POST', '/notifications/mark-read', 'Mark notifications read. Body: { notificationIds? } — omit for all'),
          apiRow('DELETE', '/notifications/:notificationId', 'Delete a notification'),
        ]
      }),

      // ─── 6. Socket.io Events ──────────────────────────────────────────────────
      new Paragraph({ spacing: { before: 200 }, children: [] }),
      h1('6. Socket.io Real-Time Events'),
      p('Server URL: http://localhost:4000'),

      h2('Client → Server (Emit)'),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2500, 6860],
        rows: [
          tableHeader(['Event', 'Payload / Purpose'], [2500, 6860]),
          ...([
            ['presence:init', 'userId — joins personal room user:<userId> for notifications'],
            ['topic:join', 'topicId — joins Socket.io room for that topic'],
            ['topic:leave', 'topicId — leaves topic room'],
            ['typing:start', 'topicId — broadcast typing indicator to others'],
            ['typing:stop', 'topicId — stop typing indicator'],
          ].map(([event, desc]) => new TableRow({
            children: [
              new TableCell({ borders, width: { size: 2500, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: event, size: 20, font: 'Courier New', bold: true })] })] }),
              new TableCell({ borders, width: { size: 6860, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: desc, size: 20, font: 'Arial' })] })] }),
            ]
          })))
        ]
      }),

      h2('Server → Client (Listen)'),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [2500, 6860],
        rows: [
          tableHeader(['Event', 'Payload / When fired'], [2500, 6860]),
          ...([
            ['message:new', '{ message } — new message in topic room'],
            ['typing:update', '{ topicId, userId, isTyping } — typing state change'],
            ['presence:update', '{ topicId, onlineUsers[] } — user joined/left topic'],
            ['reaction:update', '{ messageId, reactions[] } — reaction toggled'],
            ['task:created', '{ task } — new task created in topic'],
            ['task:updated', '{ task } — task updated (status, assignee, etc.)'],
            ['notification:new', '{ notification } — sent to user:<userId> personal room'],
          ].map(([event, desc]) => new TableRow({
            children: [
              new TableCell({ borders, width: { size: 2500, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: event, size: 20, font: 'Courier New', bold: true })] })] }),
              new TableCell({ borders, width: { size: 6860, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: desc, size: 20, font: 'Arial' })] })] }),
            ]
          })))
        ]
      }),

      // ─── 7. Feature Status ────────────────────────────────────────────────────
      new Paragraph({ spacing: { before: 200 }, children: [] }),
      h1('7. Feature Completion Status'),
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [3000, 1500, 4860],
        rows: [
          tableHeader(['Feature', 'Status', 'Notes'], [3000, 1500, 4860]),
          statusRow('Auth (register/login/refresh)', '✅ Complete', 'JWT + refresh token rotation'),
          statusRow('User profile update', '✅ Complete', 'PATCH /auth/profile and /auth/password'),
          statusRow('Workspaces CRUD', '✅ Complete', 'Create, list, get, invite member'),
          statusRow('Topics CRUD', '✅ Complete', 'Create, list, get per workspace'),
          statusRow('Send & receive messages', '✅ Complete', 'Lexical JSON format, paginated'),
          statusRow('Real-time messaging', '✅ Complete', 'Socket.io message:new event'),
          statusRow('Message replies', '✅ Complete', 'replyToId field on Message model'),
          statusRow('Typing indicators', '✅ Complete', 'typing:start/stop + typing:update'),
          statusRow('Presence / online users', '✅ Complete', 'Per-topic online user tracking'),
          statusRow('Emoji reactions', '✅ Complete', 'Toggle + real-time reaction:update'),
          statusRow('URL auto-extraction', '✅ Complete', 'Extracts URLs from messages to SharedLink'),
          statusRow('File upload', '✅ Complete', 'Multer, 50MB, 10 files max. Local disk'),
          statusRow('Media listing', '✅ Complete', 'GET /media returns all topic attachments'),
          statusRow('Task statuses (kanban)', '✅ Complete', 'Custom columns, default 3 seeded'),
          statusRow('Tasks CRUD', '✅ Complete', 'Optimistic locking, assignee, due date'),
          statusRow('Subtasks', '✅ Complete', 'Nested under tasks, completable'),
          statusRow('Task real-time events', '✅ Complete', 'task:created, task:updated via Socket.io'),
          statusRow('Vault documents', '✅ Complete', 'Notion-like docs CRUD'),
          statusRow('Shared links', '✅ Complete', 'Auto + manual, per topic'),
          statusRow('Notifications schema', '✅ Complete', 'All types: MENTION, REPLY, TASK_ASSIGNED'),
          statusRow('Notifications API', '⚠️ Partial', 'Routes created — wiring in progress'),
          statusRow('Mention notifications', '⚠️ Partial', 'Helper written — needs mounting'),
          statusRow('Direct Messages', '⚠️ Partial', 'Schema done — routes not yet built'),
          statusRow('Login page (Web)', '✅ Complete', 'Dark/light theme'),
          statusRow('Register page (Web)', '✅ Complete', ''),
          statusRow('App shell layout (Web)', '✅ Complete', 'Sidebar, workspace switcher, right panel'),
          statusRow('Message feed (Web)', '✅ Complete', 'With typing indicators, auto-scroll'),
          statusRow('Lexical rich text editor', '✅ Complete', '@mention, #topic, /slash, emoji, files'),
          statusRow('Message rendering', '✅ Complete', 'Handles Lexical JSON + legacy Markdown'),
          statusRow('Theme toggle', '✅ Complete', 'Light/dark persisted in localStorage'),
          statusRow('Tasks UI (Kanban)', '❌ Not started', 'DND kanban board'),
          statusRow('Vault UI', '❌ Not started', 'Document editor'),
          statusRow('Media tab UI', '❌ Not started', 'File gallery'),
          statusRow('Links tab UI', '❌ Not started', 'Link list'),
          statusRow('Notifications UI', '❌ Not started', 'Bell icon + dropdown'),
          statusRow('Message actions UI', '❌ Not started', 'Reactions, reply, create task, menu'),
          statusRow('Date separators in feed', '❌ Not started', 'WhatsApp-style date groups'),
          statusRow('Direct Messages UI', '❌ Not started', 'DM conversation view'),
          statusRow('User profile UI', '❌ Not started', 'Settings modal'),
          statusRow('Mobile (React Native)', '❌ Not started', 'Planned post-web'),
        ]
      }),

      // ─── 8. What Needs to Be Done ─────────────────────────────────────────────
      new Paragraph({ spacing: { before: 200 }, children: [] }),
      h1('8. What Still Needs to Be Done'),

      h2('Backend (In Progress)'),
      bullet('Complete Prompt 10: Finish mounting notifications route + wiring mention/reply notifications into messages route'),
      bullet('Build Direct Messages routes (GET conversations, POST message, real-time DM delivery)'),
      bullet('Add GET /workspaces/:wId/members route to list all workspace members'),

      h2('Frontend — Web'),
      bullet('Date separators in message feed (WhatsApp-style "Today", "Yesterday")'),
      bullet('Message actions: hover menu with reaction picker, reply, create task, 3-dot menu'),
      bullet('Right panel tabs: Tasks (kanban DND), Vault (doc editor), Media (gallery), Links (list)'),
      bullet('Notifications UI: bell icon in topbar, unread count badge, dropdown list'),
      bullet('User profile settings modal (update name, change password)'),
      bullet('Direct Messages UI: conversation list in sidebar, DM chat view'),
      bullet('File upload wiring: connect Lexical editor FilePlugin to /upload API'),
      bullet('Unread message count badge per topic in sidebar'),

      h2('Frontend — Mobile (React Native)'),
      bullet('Not started — planned after web is complete'),
      bullet('Expo-based React Native app'),
      bullet('Shared types and API client from packages/shared'),

      // ─── 9. Local Development Setup ───────────────────────────────────────────
      new Paragraph({ spacing: { before: 200 }, children: [] }),
      h1('9. Local Development Setup'),

      h2('Prerequisites'),
      bullet('Node.js v20.x (REQUIRED — Prisma breaks on Node 24)'),
      bullet('pnpm 9.0.0 — install with: npm install -g pnpm@9.0.0'),
      bullet('Docker Desktop or Docker Engine'),
      bullet('MySQL already running on port 3306? Docker maps to 3307'),

      h2('First Time Setup'),
      code('# 1. Clone the repo'),
      code('git clone https://github.com/devnazmul/webzoo.git'),
      code('cd webzoo'),
      code(''),
      code('# 2. Install dependencies'),
      code('pnpm install'),
      code(''),
      code('# 3. Copy env file'),
      code('cp .env.example apps/server/.env'),
      code('# Edit apps/server/.env — set JWT secrets to random 32+ char strings'),
      code(''),
      code('# 4. Start MySQL'),
      code('docker compose up -d'),
      code(''),
      code('# 5. Run migrations'),
      code('cd apps/server && npx prisma migrate deploy'),
      code(''),
      code('# 6. Generate Prisma client'),
      code('npx prisma generate'),
      code(''),
      code('# 7. Start everything'),
      code('cd ../.. && pnpm dev'),

      h2('Environment Variables (apps/server/.env)'),
      code('DATABASE_URL=mysql://root:root@localhost:3307/webzoo_db'),
      code('JWT_ACCESS_SECRET=<random 32+ characters>'),
      code('JWT_REFRESH_SECRET=<random 32+ characters>'),
      code('PORT=4000'),

      h2('Dev URLs'),
      bullet('Backend API: http://localhost:4000'),
      bullet('Frontend: http://localhost:5173'),
      bullet('Health check: http://localhost:4000/health'),

      // ─── 10. Important Notes ──────────────────────────────────────────────────
      new Paragraph({ spacing: { before: 200 }, children: [] }),
      h1('10. Important Notes & Decisions'),

      h2('Message Format'),
      p('Messages are stored as JSON strings in the content field (TEXT column). The format is a Lexical AST:'),
      code('{ "document": { "type": "root", "children": [...] }, "plainText": "...", "mentions": [...], "files": [...] }'),
      p('The MessageRenderer component handles both this Lexical JSON format and legacy plain Markdown (for backward compatibility).'),

      h2('Prisma Version'),
      p('Pinned to 6.10.1. Do NOT upgrade to 7.x without updating the schema and testing — breaking changes in Prisma 7.'),

      h2('Node Version'),
      p('Must use Node 20. Prisma engine panics on Node 24 due to missing enableTracing field. Use nvm to manage: nvm use 20'),

      h2('File Storage'),
      p('Files are stored on local disk at apps/server/uploads/. For production, replace Multer disk storage with an S3-compatible adapter (e.g., multer-s3). The URL field in Attachment model stores the relative path — update the base URL logic when moving to cloud storage.'),

      h2('Optimistic Locking on Tasks'),
      p('Task updates require a version field in the request body matching the current DB version. If another user updated the task first, the server returns 409 Conflict. The frontend must re-fetch and retry.'),

      h2('Antigravity Agent Note'),
      p('The project was built using the Antigravity AI coding agent. The agent occasionally added unsolicited UI customizations (space/aurora dark theme, custom Tailwind classes like space-black, spectral-white, ghost-border). These are in AppShell.tsx, MessageFeed.tsx, and Sidebar components. The theme system (light/dark toggle) is in src/store/theme.store.ts and src/components/ui/ThemeToggle.tsx.'),

      // ─── Footer note ──────────────────────────────────────────────────────────
      new Paragraph({
        spacing: { before: 400 },
        alignment: AlignmentType.CENTER,
        border: { top: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' } },
        children: [new TextRun({ text: 'WebZoo — Project Summary Document — github.com/devnazmul/webzoo', size: 18, font: 'Arial', color: '9CA3AF', italics: true })]
      }),
    ]
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync('/mnt/user-data/outputs/WebZoo_Project_Summary.docx', buffer);
  console.log('Done');
});