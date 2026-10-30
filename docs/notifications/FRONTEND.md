# Central notifications — frontend

Integrates the completed Laravel notification backend (`docs/notifications/NOTIFICATIONS.md` in `shopbonus_backend`).

## Surfaces

| Audience | Bell | Center | Preferences | Admin |
| --- | --- | --- | --- | --- |
| Consumer | `Header` → `NotificationBell` | `/app/notifications` | `/profiel#notifications` | — |
| Workspace | `DashboardShell` → `NotificationBell` | `/dashboard/notifications` | link to settings | — |
| Super Admin | `DashboardShell` | `/admin/notifications` | — | `/app/platform/notifications` |

## Shared modules

- `src/lib/notifications.ts` — central inbox + preference + platform APIs
- `src/lib/echo.ts` — `subscribeNotifications` on `shopbonus.user.{id}.notifications`
- `src/hooks/useCentralNotifications.ts` — list/count, mark read, reconnect refetch, toast on create
- `src/components/notifications/NotificationBell.tsx`
- `src/components/notifications/NotificationCenter.tsx`
- `src/components/notifications/NotificationPreferencesPanel.tsx`

## Realtime contract

Invalidation-only events: `NotificationCreated`, `NotificationRead`, `NotificationReadAll`, `NotificationCountUpdated`.
Payload: `{ notification_id }` or null. Always refetch owned inbox/count after events, focus, or reconnect.

## Action route mapping

Server routes are remapped in `resolveNotificationHref`:

- `/app/benefits` → `/mijn-voordelen`
- `/app/platform` → `/app/platform/notifications`
- `/app/workspaces?workspace=` → `/dashboard?workspace=`
- `/app/support?…` unchanged

## E2E

`e2e/notifications.spec.ts` (10 journeys). Env: `NOTIF_E2E_*` credentials + `BASE_URL`.

## Backend ownership

Event catalogue, outbox, mail, reminders, AI templates, OpenAPI and Feature tests remain in `shopbonus_backend`. Frontend does not invent a second notification system.
