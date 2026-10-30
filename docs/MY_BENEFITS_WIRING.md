# Mijn voordelen — frontend wiring

Consumer UI at `/mijn-voordelen` now uses Laravel benefits APIs. Financial totals are never derived from list rows or `localStorage`.

## Client modules

| File | Role |
|------|------|
| `src/lib/benefits.ts` | Wallet, vouchers, ledger, checkout, disputes, AI chat |
| `src/lib/money.ts` | Minor-unit EUR formatting (`1220` → `€12,20`) |
| `src/lib/echo.ts` | Optional Reverb subscribe → HTTP wallet refetch |
| `src/store/ShopBonusContext.tsx` | Auth wallet state, copy/reveal, checkout unlock, Reverb |
| `src/app/mijn-voordelen/page.tsx` | Design + KPIs + vouchers + transactions + AI panel |
| `src/components/SupportChatPanel.tsx` | `Probleem met code?` → `POST /api/v1/ai/chat` |
| `src/components/Header.tsx` | Navbar balance = `available_minor` |

## APIs reused (no new financial routes)

See backend `docs/benefits/API_INVENTORY.md`.

- `GET /api/v1/me/wallet` — available / earned / spent
- `GET /api/v1/consumer/vouchers` (+ `/{id}` audited code reveal)
- `GET /api/v1/consumer/wallet/transactions`
- `POST /api/v1/consumer/checkouts/quote` + `POST .../checkouts`
- `POST /api/v1/ai/chat` with `reference` + `current_page=/mijn-voordelen`
- Reverb `private-shopbonus.user.{id}.wallet` / `WalletBalanceChanged` (invalidation only)

## Design rules applied

- Pale-blue page, rounded white cards, navy/brand title, tab pills
- Wallet KPIs: **Beschikbaar**, **Totaal verdiend**, **Totaal besteed**
- Progress bar only when `savings_goal` is present (backend currently `null`)
- No pending cashback UI; no sidebar ledger column
- Navbar wallet always mirrors `available_minor`

## Env

```
NEXT_PUBLIC_API_BASE_URL=...
NEXT_PUBLIC_USE_COOKIE_AUTH=true
# optional realtime
NEXT_PUBLIC_REVERB_APP_KEY=
NEXT_PUBLIC_REVERB_HOST=127.0.0.1
NEXT_PUBLIC_REVERB_PORT=8080
NEXT_PUBLIC_REVERB_SCHEME=http
```

## Backend E2E

`shopbonus_backend/tests/Feature/Benefits/MyBenefitsE2ETest.php` — 10 acceptance scenarios.
