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

1. `POST /api/agreements` — create (requires `offerExpiresAt`; optional `send: true`)
2. `PATCH /api/agreements/:id` — edit while `draft`
3. `POST /api/agreements/:id/send` — `draft` → `sent`
4. `POST /api/agreements/:id/cancel` — cancel before completion

## Renter flow

1. `GET /api/agreements/me`
2. `POST /api/agreements/:id/accept` — → `payment_pending`
3. `POST /api/agreements/:id/reject`
4. `POST /api/agreements/:id/deposit/initiate` — Chapa checkout URL
5. `GET /api/agreements/:id/deposit/status`

## Chapa

- `POST /api/payments/chapa/webhook` — server callback
- `GET /api/payments/chapa/callback?tx_ref=...` — return URL
- `POST /api/payments/chapa/verify` — body `{ "tx_ref": "..." }`

## Environment

```
CHAPA_SECRET_KEY=...
CHAPA_PUBLICK_KEY=...
EXCHANGE_API_KEY=...
APP_BASE_URL=http://localhost:5000
FRONTEND_URL=http://localhost:5173
```

