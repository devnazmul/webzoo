# WebZoo — Project Overview & Onboarding Guide

> A Slack + Linear hybrid real-time collaboration platform.
> This doc is meant to let a new developer (or a fresh Claude/Antigravity session) understand the project in one read: what exists, how data flows, what's next, and what to watch out for.

---

## 1. Vision & Target

**Target product**: A workspace-based team collaboration app combining:
- Slack-style real-time messaging (channels called **Topics**, DMs, threads, reactions, markdown)
- Linear-style task management (kanban, custom statuses, subtasks, @mention auto-assign)
- A Notion-like **document vault** (docs + file uploads)
- Eventually: Electron desktop app + React Native mobile app, using the same backend/API

**Success definition**: fully functional web app first, then wrap the same React codebase for desktop/mobile.

---

## 2. Tech Stack

| Layer | Tech |
|---|---|
| Monorepo | pnpm workspaces (`apps/*`, `packages/*`) |
| Backend | Express + Socket.io (port 4000) |
| ORM / DB | Prisma 6.10.1 → MySQL 8 (port 3307 via Docker) |
| Frontend | React 19 + Vite + TypeScript + Tailwind + shadcn/ui (port 5173) |
| State | Zustand (`auth.store`, `workspace.store`, `topic.store`, `theme.store`) |
| Realtime | socket.io-client |
| Editor | **LexicalEditor** (intended final choice — see ⚠️ discrepancy in §7) |
| Auth | JWT access token (15 min) + rotating refresh token stored in DB |
| Runtime | **Node v20.20.2 required** (v24 breaks Prisma 6.10.1) |

**Repo root**: `~/Documents/work/My/Essence Consultancy Warroom/webzoo/`

---

## 3. Monorepo Structure

```
webzoo/
├── apps/
│   ├── server/            # Express + Socket.io API (100% of the CURRENT scope done)
│   │   ├── src/
│   │   │   ├── index.ts           # HTTP server + Socket.io event handlers + presence map
│   │   │   ├── routes/             # auth, workspaces, topics, messages (REST)
│   │   │   ├── middleware/         # authenticate.ts (JWT guard)
│   │   │   ├── lib/prisma.ts       # Prisma client singleton
│   │   │   └── utils/               # token.ts, password.ts
│   │   └── prisma/schema.prisma    # DB schema + migrations
│   └── web/                # React SPA (~40% of full target scope done)
│       └── src/
│           ├── pages/        # LoginPage, RegisterPage, AppShell
│           ├── components/
│           │   ├── layout/Sidebar.tsx
│           │   ├── chat/     # MessageFeed, MessageBubble, MessageRenderer, TypingIndicator, editor/
│           │   └── ui/       # shadcn primitives
│           ├── store/        # zustand stores
│           └── lib/          # api.ts (axios), socket.ts (socket.io client)
└── packages/
    ├── shared/            # Shared TS types (User, Workspace, Topic, Message, ApiResponse...)
    └── tsconfig/          # Shared tsconfig base
```

---

## 4. Data Flow

### 4.1 Auth flow
1. `RegisterPage` / `LoginPage` → `POST /api/auth/register` or `/login`
2. Server hashes password (bcryptjs), creates `User`, issues **access token** (JWT, 15 min) + **refresh token** (random hex, stored in `RefreshToken` table, 7-day expiry)
3. Client stores both tokens + user in `localStorage` via `auth.store.ts`, then Axios (`lib/api.ts`) attaches `Authorization: Bearer <accessToken>` to every request
4. On `401`, the Axios response interceptor auto-calls `POST /api/auth/refresh` (rotates the refresh token — old one deleted, new one issued) and retries the original request. If refresh fails, `localStorage` is cleared and the user is redirected to `/login`.

### 4.2 Workspace / Topic bootstrap (on login)
1. `AppShell` mounts → `connectSocket(user.id)` opens the socket and emits `presence:init`
2. `GET /api/workspaces` → populates `workspace.store`; first workspace is auto-selected
3. On active workspace change → `GET /api/workspaces/:id/topics` → populates `topic.store`; first topic auto-selected
4. Selecting a topic renders `MessageFeed`

### 4.3 Real-time messaging flow
1. `MessageFeed` on topic change: emits `topic:leave` (previous room) → `topic:join` (new room) via Socket.io rooms, then `GET /api/.../messages` (cursor-paginated, 50/page, newest-first from DB then reversed for display)
2. Sending: `MarkdownInput` → `onSend(content)` → `POST /api/workspaces/:wsId/topics/:topicId/messages`
3. Server validates membership → creates `Message` row → **broadcasts** `io.to(topicId).emit('message:new', { message })**`
4. All connected clients in that topic room receive `message:new` and append it to local state (de-duped by id)

### 4.4 Presence & typing (ephemeral, in-memory — not persisted)
- Server keeps `Map<topicId, Set<userId>>` in `index.ts` (`topicPresence`)
- `topic:join` / `topic:leave` / socket `disconnect` mutate the set and broadcast `presence:update`
- `typing:start` / `typing:stop` are relayed (not stored) as `typing:update` to everyone else in the room

### 4.5 Data retention principle (locked-in decision)
Messages are **never deleted or archived** — no TTL on the messages collection/table. This must be respected in any future migration or cleanup job.

---

## 5. Current Database Schema (as of the migration shown)

```
User(id, email, name, passwordHash, createdAt, updatedAt)
Workspace(id, name, createdAt, updatedAt)
WorkspaceMember(userId, workspaceId, role[OWNER|MEMBER], joinedAt)  -- composite PK
Topic(id, name, workspaceId, createdAt, updatedAt)
Message(id, content, topicId, authorId, createdAt)  -- indexed on (topicId, createdAt)
RefreshToken(id, token, userId, expiresAt, createdAt)
```

⚠️ **Note**: this schema does not yet contain DM models (`DirectConversation`, `DirectConversationParticipant`), reactions, thread replies, or task/subtask tables that later features reference — those must exist further along in the build than this snapshot, or are still pending. Whoever picks this up should run `npx prisma studio` / inspect the live `schema.prisma` to confirm current state before writing new migrations.

**Known critical field-naming gotcha**: use `subtasks` (lowercase `s`) in Prisma `include` blocks — not `subTasks`.

---

## 6. Features — Status Matrix

| Feature | Status | Notes |
|---|---|---|
| Register / Login / Refresh / Logout | ✅ Done | JWT + rotating refresh token |
| Workspace create / list / get | ✅ Done | Owner auto-assigned on create |
| Workspace invite by email | ✅ Done (basic) | Only existing users; no invite-token flow yet for non-users |
| Topic create / list / get | ✅ Done | Scoped to workspace |
| Message send / paginated fetch | ✅ Done | Cursor pagination, 50/page |
| Real-time message delivery | ✅ Done | Socket.io rooms per topic |
| Typing indicator | ✅ Done | Ephemeral, not persisted |
| Presence (online users per topic) | ✅ Done | In-memory `Map`, lost on server restart |
| Markdown rendering (bold/italic/code/lists/links/mentions) | ✅ Done | `MessageRenderer.tsx` + `react-markdown` + `react-syntax-highlighter` |
| @mention / #topic / `/` slash-command autocomplete | ✅ Done | In `MarkdownInput.tsx` |
| Emoji picker | ✅ Done | `emoji-picker-react` |
| Message reactions | 🟡 Partial / buggy | "Reactions intermittent" per known bugs |
| Message actions (edit/delete/etc.) | 🟡 Partial | Present on `MessageBubble` per memory, not visible in this snapshot |
| Thread replies | 🟡 Buggy | Design: replies never show in main feed, only as "N replies" link opening a split panel; **reply count doesn't update live** |
| Direct Messages (DMs) | 🔴 Broken | `dm.ts` route field names mismatch actual Prisma schema for `DirectConversationParticipant` → throws `"userId is required"`; DM sidebar shows "Unknown" for participant names |
| Rich text editor | 🟡 In flux | **LexicalEditor is the intended permanent choice**, but current code still wires `MarkdownInput` (plain textarea + regex) into `MessageFeed`, and `QuillMessageInput.tsx` also still exists in the tree — reconcile before continuing (see §7) |
| Unread counts | 🔴 Not started | **Next milestone (Antigravity Prompt 19)** |
| Topic header tabs (Messages/Tasks/Vault/Media/Links) | 🔴 Not started | Replaces the current static topic header |
| Tasks / Kanban | 🔴 Not started | DND kanban; default statuses ToDo/In Progress/Bugs/Done auto-seeded; subtasks; auto-assign via @mention; task-from-message creates title `"[CreatorName] added this task"` with message content as description |
| Vault (Notion-like docs + files) | 🔴 Not started | "Vault document creation inconsistent" already flagged as a bug once earlier work started |
| Media / Links tabs | 🔴 Not started | |
| Email invitations (non-user invites) | 🔴 Post-MVP | Needs Resend/SendGrid + invite token table + acceptance flow |
| Profile picture upload | 🔴 Post-MVP | |
| Global search | 🔴 Post-MVP | |
| Message pinning | 🔴 Post-MVP | |
| Task labels | 🔴 Post-MVP | |
| Electron desktop wrapper | 🔴 Post-MVP | |
| React Native mobile app | 🔴 Post-MVP | |

**Legend**: ✅ done · 🟡 exists but broken/inconsistent · 🔴 not built yet

---

## 7. Known Bugs & Discrepancies to Resolve First

1. **DM flow throws `"userId is required"`** on opening a conversation — root cause is a field-name mismatch between `dm.ts` routes and the actual `DirectConversationParticipant` Prisma model. Fix the route to match the real schema field names.
2. **DM sidebar shows "Unknown"** for participant names — likely missing `include`/`select` on the user relation when fetching conversations.
3. **Reactions intermittent** — check the socket event vs REST persistence race condition.
4. **Thread reply count doesn't update live** — likely missing a socket broadcast when a reply is created (mirror the `message:new` pattern used for top-level messages).
5. **Vault document creation inconsistent** — needs investigation once vault work resumes.
6. **Editor discrepancy** — memory says LexicalEditor is the final, locked-in choice, but the code in this snapshot still has `MarkdownInput.tsx` (plain textarea) wired into `MessageFeed.tsx`, and `QuillMessageInput.tsx` is still present in the tree unused/orphaned. **Before continuing frontend work, confirm which editor is actually live in the current build** and delete the losing candidates (Quill and Markdown-textarea) to avoid confusion for the next Antigravity prompt.
7. **Field name is `subtasks`** (lowercase) in Prisma includes — a recurring source of runtime errors if mistyped as `subTasks`.

---

## 8. What To Do Next (in order)

1. **Reconcile the editor** — verify LexicalEditor is actually integrated and remove `QuillMessageInput.tsx` / `MarkdownInput.tsx` if superseded, to keep the codebase clean for Antigravity.
2. **Fix the four known bugs above** (DM `userId` error, DM "Unknown" names, reactions, thread reply live-count) — these block DM and thread features from being usable.
3. **Unread counts** (Prompt 19 — the next planned Antigravity milestone).
4. **Topic header tabs**: Messages / Tasks / Vault / Media / Links (replaces the current static topic header in `MessageFeed.tsx`).
5. **Tasks phase**: DND kanban, custom statuses (default ToDo/In Progress/Done — note: bug list says "Bugs" was also a default status at some point; confirm the current agreed default set), subtasks (`subtasks` field name!), auto-assign from @mentions, and the "create task from message" flow.
6. **Vault**: Notion-like docs + file uploads + assets; then fix "inconsistent creation" bug.
7. **Media and Links tabs.**
8. **Post-MVP backlog** (prompts pre-written in `WEBZOO_UPCOMING_WORK.md`): email invitations (Resend/SendGrid + invite tokens), profile picture upload, global search, message pinning, task labels, Electron wrapper, React Native app.

### Architecture gaps flagged in the microservices review (address opportunistically, not urgent for MVP)
- No API versioning strategy
- No service discovery/mesh
- Zookeeper referenced as legacy — prefer **KRaft** if/when Kafka is introduced
- No conflict resolution for concurrent real-time edits (matters once Vault/collaborative docs land)
- No data retention/TTL policy for non-message data (messages themselves are explicitly retain-forever)
- No Kafka dead-letter queue handling (future, once event-driven microservices are introduced)
- No auth refresh-token **rotation-failure** strategy beyond the basic rotate-on-use done today
- Mobile offline sync unaddressed (relevant once React Native work starts)

**Future direction** (not urgent): GraphQL Gateway, gRPC between services, AI features layered on top of the collaboration data.

---

## 9. Local Dev Setup

```bash
# 1. Use the correct Node version
nvm use 20.20.2   # Node v24 breaks Prisma 6.10.1

# 2. Start MySQL
docker compose up -d          # exposes MySQL on localhost:3307

# 3. Install deps (pnpm workspace)
pnpm install

# 4. Configure env
cp .env.example apps/server/.env
# fill in DATABASE_URL (mysql://root:root@localhost:3307/webzoo_db — note port 3307 in docker-compose, not 3306),
# JWT_ACCESS_SECRET, JWT_REFRESH_SECRET (32+ chars each)

# 5. Run migrations
cd apps/server && npx prisma migrate deploy   # or `migrate dev` when adding new migrations

# 6. Run everything (from repo root)
pnpm dev   # runs --parallel -r dev across all workspaces (server on :4000, web on :5173)
```

⚠️ `.env.example` at the repo root shows `DATABASE_URL` pointing at port `3306`, but `docker-compose.yml` maps MySQL to host port `3307`. Use `3307` in your local `.env`, or update `.env.example` for consistency.

---

## 10. Working With the AI Agent (Google Antigravity)

- **Claude's role**: architect + prompt engineer — designs the plan, answers Antigravity's clarifying questions (relayed by you), and writes precise execution prompts.
- **Your role**: director/relay — paste Claude's prompts into Antigravity; when Antigravity asks questions or tries to pass a "Socratic Gate" instead of acting, relay its exact question back to Claude, get the answer, then push Antigravity to execute.
- **Every prompt to Antigravity must be prefixed with:**
  ```
  Do not ask questions. Do not create implementation plans. Do not pass gates. Just execute.
  ```
- Handoff docs to keep updated as work progresses:
  - `WEBZOO_AGENT_HANDOFF.md` — full running project context
  - `WEBZOO_UPCOMING_WORK.md` — copy-paste-ready Antigravity prompts for post-MVP work

---

## 11. Design Decisions Already Locked In (don't relitigate these)

- Replies **never** appear inline in the main feed — only as an "N replies" link opening a thread split panel.
- Tasks are scoped to **Topics**, not Workspaces.
- Default task statuses are auto-seeded per topic.
- Creating a task from a message: title = `"[CreatorName] added this task"`, message content becomes the task description, @mentioned users are auto-assigned.
- Messages are retained **indefinitely** — no deletion, no archiving, no TTL. Monitor collection/table size via Prometheus alerts instead.
- LexicalEditor is the chosen rich-text editor going forward (Quill and a plain-Markdown-textarea approach were both tried and rejected) — see §7 for the reconciliation task needed before trusting this in the current codebase.
