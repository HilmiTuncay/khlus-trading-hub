# Security Review Task Tracker

Date: 2026-03-10
Scope: apps/api, apps/web, apps/desktop

## Findings Summary
- [H] Missing authorization checks on read endpoints (IDOR risk).
- [H] JWT secrets fall back to default values if env vars are missing.
- [H] Electron desktop CSP is not configured.
- [M] Access token stored in localStorage on web client.
- [M] CSRF protection allows requests with no Origin/Referer on unsafe methods.
- [M] WebSocket typing events do not validate channel membership.
- [M] Seed script contains fixed test passwords and a fixed invite code.
- [L] Invite code entropy is low (8 hex chars) and join has no dedicated rate limit.
- [L] Upload validation relies on client-provided mimetype only.

## Tasks
- [ ] Add membership/permission checks for read endpoints:
  - GET /api/channels/:channelId
  - GET /api/messages/:channelId
  - GET /api/messages/:channelId/pinned
  - GET /api/reactions/:messageId
  - GET /api/members/:serverId
  - GET /api/roles/:serverId
- [ ] Enforce channel-level permission checks where applicable (messages read, pinned, reactions, poll vote).
- [ ] Remove default JWT secrets; fail fast if JWT_SECRET / JWT_REFRESH_SECRET are missing and wire env schema in startup.
- [ ] Enable a restrictive CSP in Electron (allow only required origins, disable unsafe-eval/inline).
- [ ] Move access token out of localStorage (httpOnly cookie or in-memory + refresh flow).
- [ ] Tighten CSRF protection for unsafe methods:
  - Require Origin/Referer, or
  - Add CSRF token (double-submit or server-side token), and
  - Revisit SameSite settings for refresh cookies.
- [ ] Validate membership for WebSocket typing events or gate typing to joined rooms only.
- [ ] Guard seed/reset scripts for non-production use (NODE_ENV check) and remove fixed credentials for prod.
- [ ] Increase invite code entropy (>= 16 hex chars) and add a dedicated rate limit for join.
- [ ] Harden uploads: verify file signatures, consider Content-Disposition: attachment, and/or store outside web root.
