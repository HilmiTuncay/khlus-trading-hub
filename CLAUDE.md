# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Khlus Trading Hub is a Discord-like communication platform for traders. It's a monorepo with three applications sharing a common package.

## Architecture

```
apps/
  api/        # Express.js REST API + Socket.io (port 3001)
  web/        # Next.js 14 frontend (port 3000)
  desktop/    # Electron desktop app (wraps web frontend)
packages/
  shared/     # Shared types, constants, permissions (used by api & web)
```

### Key Technologies
- **API**: Express, Prisma (PostgreSQL), Socket.io, JWT auth, Zod validation
- **Web**: Next.js 14 (App Router), Zustand stores, Tailwind CSS, Socket.io-client
- **Desktop**: Electron (desktop shell around web app)
- **Voice/Video**: LiveKit integration

### Data Flow
1. Web/Desktop → REST API for CRUD operations
2. Web/Desktop ↔ Socket.io for real-time (messages, typing, voice presence)
3. Auth: JWT access token (memory) + refresh token (httpOnly cookie)

## Common Commands

```bash
# Development (run from root)
npm run dev:api          # Start API server
npm run dev:web          # Start web frontend
npm run dev              # Start all workspaces

# Database (requires apps/api/.env with DATABASE_URL)
npm run db:generate      # Generate Prisma client
npm run db:push          # Push schema to database
npm run db:studio        # Open Prisma Studio
npm run db:seed -w apps/api  # Seed test data

# Build
npm run build:api
npm run build:web
npm run build:desktop    # Build Electron app

# Type checking
npm run lint             # All workspaces
npm run lint -w apps/api # Single workspace
```

## Environment Variables

API requires `apps/api/.env`:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Min 32 chars, no default (fails if missing)
- `JWT_REFRESH_SECRET` - Min 32 chars, no default
- `CORS_ORIGIN` - Comma-separated frontend origins
- `LIVEKIT_*` - Optional, for voice/video

Web uses `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:3001`)

## Code Patterns

### API Routes
All routes in `apps/api/src/routes/` follow this pattern:
- Zod schema validation for request bodies
- `authenticate` middleware for protected routes
- `checkPermission()` for role-based access
- Member verification for server-scoped resources

### Frontend State
Zustand stores in `apps/web/src/stores/`:
- `auth.ts` - User session (token in memory, not localStorage)
- `server.ts` - Active server/channel selection
- `voice.ts` - Voice channel state
- `dm.ts` - Direct messages
- `unread.ts` - Unread message counts

### Shared Package
`packages/shared/src/` exports:
- Socket.io event types (`ServerToClientEvents`, `ClientToServerEvents`)
- Permission bitfield utilities
- Constants

## Security Notes

- CSRF protection via Origin/Referer + Authorization header validation
- All GET endpoints require server membership verification (IDOR protection)
- File uploads validate magic bytes, not just mimetype
- Electron has CSP enabled via BrowserWindow webPreferences
