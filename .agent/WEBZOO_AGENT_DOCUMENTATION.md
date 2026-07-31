# WebZoo — AI Agent Handoff Document

> **For Google Antigravity IDE Agent**
> Always prepend every prompt with: **"Do not ask questions. Do not create implementation plans. Do not pass gates. Just execute."**

---

## Project Overview

**WebZoo** is a real-time collaboration platform (Slack + Linear hybrid) built under **Essence Consultancy Warroom**.

**Monorepo location:** `~/Documents/work/My/Essence Consultancy Warroom/webzoo/`

**Stack:**
- Backend: Express + Socket.io on port **4000**
- Database: MySQL on port **3307** + Prisma **6.10.1**
- Frontend: React + Vite + Tailwind + shadcn/ui on port **5173**
- Package manager: **pnpm** (workspaces)
- Node: **v20.20.2** — DO NOT upgrade to v24 (breaks Prisma)

**Run dev:**
```bash
# From monorepo root
pnpm dev

# Or individually
cd apps/server && pnpm dev
cd apps/web && pnpm dev
```

**Test credentials:**
- Email: `test@webzoo.com` / Password: `password123`
- Workspace ID: `b6ff2bc5-f63c-4cfa-9748-35f85fc49895`

---

## Architecture

```
webzoo/
├── apps/
│   ├── server/              # Express + Socket.io backend
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   ├── src/
│   │   │   ├── index.ts     # Entry point, Socket.io events
│   │   │   ├── middleware/authenticate.ts
│   │   │   ├── lib/prisma.ts
│   │   │   ├── utils/
│   │   │   │   ├── token.ts
│   │   │   │   ├── password.ts
│   │   │   │   └── notifications.ts
│   │   │   └── routes/
│   │   │       ├── auth.ts
│   │   │       ├── workspaces.ts
│   │   │       ├── topics.ts
│   │   │       ├── messages.ts
│   │   │       ├── reactions.ts
│   │   │       ├── tasks.ts        # statuses at /statuses subroute
│   │   │       ├── vault.ts
│   │   │       ├── links.ts
│   │   │       ├── uploads.ts
│   │   │       ├── notifications.ts
│   │   │       └── dm.ts
│   │   └── uploads/         # Static file storage
│   └── web/                 # React + Vite frontend
│       └── src/
│           ├── App.tsx
│           ├── pages/
│           │   ├── AppShell.tsx    # Main layout orchestrator
│           │   ├── LoginPage.tsx
│           │   └── RegisterPage.tsx
│           ├── components/
│           │   ├── layout/
│           │   │   ├── Sidebar.tsx
│           │   │   └── RightPanel.tsx   # REMOVED — tabs now in topic header
│           │   ├── chat/
│           │   │   ├── MessageFeed.tsx  # Main feed + tab switcher
│           │   │   ├── MessageBubble.tsx
│           │   │   ├── MessageRenderer.tsx
│           │   │   ├── MessageActions.tsx
│           │   │   ├── ReactionBar.tsx
│           │   │   ├── DateSeparator.tsx
│           │   │   ├── ThreadPanel.tsx  # Split-view thread
│           │   │   ├── TopicTabs.tsx    # Messages/Tasks/Vault/Media/Links
│           │   │   ├── TypingIndicator.tsx
│           │   │   └── editor/
│           │   │       ├── LexicalEditor.tsx  # PRIMARY editor — do not replace
│           │   │       ├── nodes/
│           │   │       ├── plugins/
│           │   │       ├── ui/
│           │   │       └── utils/
│           │   ├── tasks/
│           │   │   ├── TasksTab.tsx
│           │   │   ├── KanbanColumn.tsx
│           │   │   ├── TaskCard.tsx
│           │   │   ├── TaskDetailModal.tsx
│           │   │   └── CreateTaskModal.tsx
│           │   ├── vault/
│           │   │   └── VaultTab.tsx
│           │   ├── media/
│           │   │   └── MediaTab.tsx
│           │   ├── links/
│           │   │   └── LinksTab.tsx
│           │   ├── dm/
│           │   │   ├── DMFeed.tsx
│           │   │   └── StartDMModal.tsx
│           │   ├── workspace/
│           │   │   └── WorkspaceSettingsModal.tsx
│           │   └── ui/
│           │       ├── NotificationBell.tsx
│           │       ├── ProfileModal.tsx
│           │       └── ThemeToggle.tsx
│           ├── store/
│           │   ├── auth.store.ts
│           │   ├── workspace.store.ts
│           │   ├── topic.store.ts    # includes unreadCounts
│           │   ├── task.store.ts
│           │   ├── dm.store.ts
│           │   └── theme.store.ts
│           └── lib/
│               ├── api.ts           # axios, uses VITE_API_URL
│               ├── socket.ts        # socket.io client
│               └── upload.ts        # file upload utility
├── packages/
│   ├── shared/src/index.ts  # Shared TypeScript types
│   └── tsconfig/
└── docker-compose.yml       # MySQL on port 3307
```

---

## Database Models (Prisma)

All models are migrated. Key models:

```
User, Workspace, WorkspaceMember, Topic, Message, RefreshToken,
Attachment, TaskStatus, Task, SubTask, TaskAssignee, TaskComment,
VaultDocument, SharedLink, Reaction, Notification,
DirectConversation, DirectConversationParticipant,
DirectMessage, DirectMessageReaction, TopicReadState
```

**Critical field names (case-sensitive):**
- Task subtasks relation: `subtasks` (lowercase s) — NOT `subTasks`
- Message replies relation: `replies` (with `replyToId String?`)
- Message soft delete: `deletedAt DateTime?`
- Workspace: has `description String?`

**Run migrations:**
```bash
cd apps/server
npx prisma migrate dev --name <name>
npx prisma generate
```

---

## API Routes

All routes prefixed with `/api`. Auth routes are public; all others require `Authorization: Bearer <token>`.

| Method | Path | Description |
|--------|------|-------------|
| POST | /auth/register | Register |
| POST | /auth/login | Login |
| POST | /auth/refresh | Refresh token |
| POST | /auth/logout | Logout |
| GET | /auth/me | Current user |
| PATCH | /auth/profile | Update name |
| PATCH | /auth/password | Change password |
| GET | /workspaces | List workspaces |
| POST | /workspaces | Create workspace |
| GET | /workspaces/:id | Get workspace |
| PATCH | /workspaces/:id | Update workspace |
| DELETE | /workspaces/:id | Delete workspace |
| POST | /workspaces/:id/invite | Invite member |
| GET | /workspaces/:id/members | List members |
| DELETE | /workspaces/:id/members/:userId | Remove member |
| POST | /workspaces/:id/seed-statuses | Seed default task statuses |
| GET | /workspaces/:wId/topics | List topics |
| POST | /workspaces/:wId/topics | Create topic |
| GET | /workspaces/:wId/topics/unread-counts | Unread counts map |
| POST | /workspaces/:wId/topics/:tId/read | Mark as read |
| GET | /workspaces/:wId/topics/:tId/messages | List messages (replyToId: null only) |
| POST | /workspaces/:wId/topics/:tId/messages | Send message |
| DELETE | /workspaces/:wId/topics/:tId/messages/:mId | Delete message (?deleteFor=me\|everyone) |
| GET | /workspaces/:wId/topics/:tId/messages/:mId/replies | Get thread replies |
| POST | /workspaces/:wId/topics/:tId/messages/:mId/reactions | Toggle reaction |
| GET | /workspaces/:wId/tasks/statuses | List task statuses |
| POST | /workspaces/:wId/tasks/statuses | Create status |
| DELETE | /workspaces/:wId/tasks/statuses/:sId | Delete status |
| GET | /workspaces/:wId/tasks | List tasks (?topicId=) |
| POST | /workspaces/:wId/tasks | Create task |
| PATCH | /workspaces/:wId/tasks/:tId | Update task |
| DELETE | /workspaces/:wId/tasks/:tId | Delete task |
| POST | /workspaces/:wId/tasks/:tId/subtasks | Add subtask |
| PATCH | /workspaces/:wId/tasks/:tId/subtasks/:sId | Update subtask |
| DELETE | /workspaces/:wId/tasks/:tId/subtasks/:sId | Delete subtask |
| GET | /workspaces/:wId/tasks/:tId/comments | List comments |
| POST | /workspaces/:wId/tasks/:tId/comments | Add comment |
| DELETE | /workspaces/:wId/tasks/:tId/comments/:cId | Delete comment |
| GET | /workspaces/:wId/tasks/:tId/assignees | List assignees |
| POST | /workspaces/:wId/tasks/:tId/assignees | Add assignee |
| DELETE | /workspaces/:wId/tasks/:tId/assignees/:uId | Remove assignee |
| GET | /workspaces/:wId/vault | List vault docs (?topicId=) |
| POST | /workspaces/:wId/vault | Create doc |
| PATCH | /workspaces/:wId/vault/:dId | Update doc |
| DELETE | /workspaces/:wId/vault/:dId | Delete doc |
| GET | /workspaces/:wId/links | List links (?topicId=) |
| POST | /workspaces/:wId/links | Add link |
| DELETE | /workspaces/:wId/links/:lId | Delete link |
| GET | /workspaces/:wId/media | List media (?topicId=) |
| POST | /api/upload | Upload file (multipart/form-data) |
| GET | /notifications | List notifications |
| GET | /notifications/unread-count | Unread count |
| POST | /notifications/mark-read | Mark all read |
| DELETE | /notifications/:id | Delete notification |
| GET | /dm/conversations | List DM conversations |
| POST | /dm/conversations | Start/find conversation |
| GET | /dm/conversations/:id/messages | List DM messages |
| POST | /dm/conversations/:id/messages | Send DM |
| GET | /api-docs | Swagger UI |

---

## Socket.io Events

**Client → Server:**
```
presence:init(userId)
topic:join(topicId)
topic:leave(topicId)
typing:start(topicId)
typing:stop(topicId)
dm:join(conversationId)
dm:leave(conversationId)
```

**Server → Client:**
```
message:new          { message }
message:deleted      { messageId, topicId, deletedFor }
reaction:update      { messageId, reactions }
typing:update        { topicId, userId, isTyping }
presence:update      { topicId, onlineUsers }
task:created         { task }
task:updated         { task }
notification:new     { notification }     → room: user:{userId}
dm:message:new       { message }          → room: dm:{conversationId}
```

---

## Environment Variables

**Backend** (`apps/server/.env`):
```env
DATABASE_URL=mysql://root:root@localhost:3307/webzoo_db
JWT_ACCESS_SECRET=your_secret_min_32_chars
JWT_REFRESH_SECRET=your_refresh_secret_min_32_chars
PORT=4000
NODE_ENV=development
```

**Frontend** (`apps/web/.env`):
```env
VITE_API_URL=http://localhost:4000
```

---

## Known Bugs (Fix These First)

### 1. Direct Messages — `userId is required` error
**Symptom:** Clicking a DM conversation throws error.
**Root cause:** The `DirectConversationParticipant` model in Prisma schema may use a different field name than `userId`. The dm.ts routes must match the exact schema field names.
**Fix:** Read `apps/server/prisma/schema.prisma` → find `DirectConversation` and `DirectConversationParticipant` models → rewrite `apps/server/src/routes/dm.ts` to use exact field names from schema.

### 2. DM "Unknown" showing in sidebar
**Symptom:** DM list shows "Unknown" instead of user name.
**Root cause:** Conversations fetched with empty/malformed participants array.
**Fix:** Ensure GET /dm/conversations returns `participants: [{ id, name }]` shaped correctly. Filter out conversations where the other participant cannot be resolved.

### 3. Reactions intermittent
**Symptom:** Sometimes reactions work, sometimes they don't persist across clients.
**Fix:** Ensure `reactions.ts` emits `reaction:update` with full reactions array after every toggle. Ensure `MessageFeed.tsx` listens to `reaction:update` socket event and updates message state.

### 4. Thread reply count not updating live
**Symptom:** After sending a reply, the "N replies" count on the parent message doesn't update until page refresh.
**Fix:** In `MessageFeed.tsx` `onNewMessage` socket handler — when `msg.replyToId` is set, increment `_count.replies` on the parent message in state.

### 5. Vault create doc inconsistent
**Symptom:** Creating a new vault document sometimes fails silently.
**Fix:** Check `vault.ts` route — ensure `topicId` is being saved. Check `VaultTab.tsx` — ensure the POST body includes `topicId`.

---

## Decisions Made (Do Not Reverse)

| Decision | Details |
|----------|---------|
| **Editor** | LexicalEditor is the FINAL choice. Never replace with Quill or MarkdownInput. |
| **Node version** | v20.20.2 only. v24 breaks Prisma. |
| **Message retention** | Messages are NEVER deleted from DB (only soft-deleted with `deletedAt`). |
| **Task subtasks field** | Always `subtasks` (lowercase s) in Prisma includes. |
| **Tab location** | Tasks/Vault/Media/Links tabs are in the TOPIC HEADER, not a right panel. |
| **Replies in feed** | Replies NEVER show in main feed. Only "N replies" link shown. |
| **Package manager** | pnpm only. Never npm. |
| **Port** | MySQL on 3307 (3306 occupied by system MySQL). |

---

## Pending Features (Priority Order)

### High Priority
1. **Fix DM `userId is required`** — read schema, rewrite dm.ts
2. **Profile picture upload** — click avatar → file picker → upload → save URL
3. **Tiptap editor for Vault** — replace textarea with Tiptap rich text

### Medium Priority
4. **Email invitations** — invite users who don't have accounts yet (Resend or SendGrid)
5. **Search** — search messages, tasks, vault docs globally
6. **Task labels/tags** — coloured labels on task cards
7. **Message pinning** — pin important messages in a topic

### Lower Priority
8. **Electron desktop app** — wrap web app in Electron shell
9. **System tray + OS notifications** — desktop-specific features
10. **React Native mobile** — iOS + Android using the same backend

---

## Deployment (Railway)

**The `workspace:*` protocol error is fixed with:**

`webzoo/nixpacks.toml`:
```toml
[phases.setup]
nixPkgs = ["nodejs_20"]

[phases.install]
cmds = [
  "npm install -g pnpm@9.0.0",
  "pnpm install --frozen-lockfile"
]

[phases.build]
cmds = ["pnpm --filter @webzoo/server build"]

[start]
cmd = "cd apps/server && node dist/index.js"
```

`apps/server/package.json` build script:
```json
"build": "tsc && npx prisma generate",
"start": "npx prisma migrate deploy && node dist/index.js"
```

**Environment variables to set in Railway:**
```
DATABASE_URL    = (from Railway MySQL plugin)
JWT_ACCESS_SECRET
JWT_REFRESH_SECRET
PORT = 4000
NODE_ENV = production
```

---

## Scalability Notes (Future)

- **Redis adapter** — needed when scaling Socket.io to multiple instances
- **Kafka event bus** — async notification/task queue
- **S3 + CloudFront** — replace local `uploads/` directory
- **Rate limiting** — per-user API throttle (express-rate-limit)
- **Prometheus metrics** — message volume, socket connections, latency
- **Trello-style task card covers** — images, colour labels on kanban cards

---

## Running Migrations

```bash
cd apps/server

# Create and run a new migration
npx prisma migrate dev --name <descriptive_name>

# Apply migrations in production
npx prisma migrate deploy

# Regenerate Prisma client after schema change
npx prisma generate

# Open Prisma Studio (visual DB browser)
npx prisma studio
```

---

## Component Patterns

### Adding a new tab to topic header
Edit `TopicTabs.tsx` — add to `TABS` array.
Edit `MessageFeed.tsx` — add `activeTab === 'newtab'` block.

### Adding a new API route
1. Create/edit route file in `apps/server/src/routes/`
2. Mount in `apps/server/src/index.ts`
3. Add to Swagger spec in `apps/server/src/lib/swagger.ts`

### Adding a new socket event
1. Server: add handler in `io.on('connection')` block in `index.ts`
2. Client: add listener in relevant component `useEffect`
3. Always clean up with `socket.off()` in the `return` cleanup

### Using LexicalEditor
```tsx
<LexicalEditor
  topicId={someId}
  topicName="placeholder text"
  users={workspaceMembers}  // { id, label }[]
  topics={allTopics}        // { id, label }[]
  onSend={async (content: string) => {
    // content is JSON string with { plainText, mentions, files }
  }}
/>
```

---

*Last updated by Claude Sonnet 4.6 — WebZoo build session*
