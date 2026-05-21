# Lease agreements API

Security deposits are paid in **ETB** via [Chapa](https://developer.chapa.co/) (test mode). Non-ETB deposits are converted using [ExchangeRate-API](https://www.exchangerate-api.com/docs/overview).

## Status values (API)

Each agreement includes `status` (enum) and `statusLabel` (user-facing):

| status | statusLabel |
|--------|-------------|
| `draft` | Draft |
| `sent` | Sent |
| `payment_pending` | Payment Pending |
| `completed` | Completed |
| `rejected` | Rejected |
| `cancelled` | Cancelled |
| `terminated` | Terminated |
| `expired` | Expired |

## Owner flow

1. `POST /api/v1/owner/agreements` — create (requires `offerExpiresAt`; optional `send: true`)
2. `PATCH /api/v1/owner/agreements/:id` — edit while `draft`
3. `POST /api/v1/owner/agreements/:id/send` — `draft` → `sent`
4. `POST /api/v1/owner/agreements/:id/cancel` — cancel before completion

## Renter flow

1. `GET /api/v1/agreements/me`
2. `POST /api/v1/agreements/:id/accept` — → `payment_pending`
3. `POST /api/v1/agreements/:id/reject`
4. `POST /api/v1/agreements/:id/deposit/initiate` — Chapa checkout URL
5. `GET /api/v1/agreements/:id/deposit/status`

## Chapa

- `POST /api/v1/payments/chapa/webhook` — server callback
- `GET /api/v1/payments/chapa/callback?tx_ref=...` — return URL
- `POST /api/v1/payments/chapa/verify` — body `{ "tx_ref": "..." }`

## Environment

```
CHAPA_SECRET_KEY=...
CHAPA_PUBLICK_KEY=...
EXCHANGE_API_KEY=...
APP_BASE_URL=http://localhost:5000
FRONTEND_URL=http://localhost:5173
```

Stripe checkout for deposits has been removed.
