# ecommerce

Full commerce API — catalog, search, category navigation, register/login, cart, **atomic checkout**, order history. The [effect-fp-skill](https://github.com/mikezupper/effect-fp-skill) at production scale, with real persistence (`@effect/sql` + SQLite).

## Run

```bash
npm ci
PORT=3001 npm run dev      # http://localhost:3001, Swagger UI at /docs
npm test                   # 13 tests incl. checkout-atomicity proof
npm run typecheck
```

Config: `PORT` (default 3000), `DB_FILE` (default `ecommerce.db`; `:memory:` for ephemeral). The DB self-migrates and self-seeds idempotently on boot — delete the file to reset.

## API surface

| Endpoint | Auth | Errors |
|---|---|---|
| `POST /auth/register`, `POST /auth/login` | — | `EmailTaken` 409, `InvalidCredentials` 401 |
| `GET /catalog/categories` (tree), `GET /catalog/products?search=&category=`, `GET /catalog/products/:id` | — | `ProductNotFound` 404 |
| `GET /cart`, `PUT /cart/items`, `DELETE /cart/items/:productId` | bearer | `Unauthorized` 401, `ProductNotFound` 404 |
| `POST /orders` (checkout), `GET /orders`, `GET /orders/:id` | bearer | `CartEmpty` 409, `InsufficientStock` 409, `OrderNotFound` 404 |

## What it demonstrates

- **Transaction boundary at the workflow** (`src/workflows/orders.ts`): `sql.withTransaction` wraps read-cart → reserve-stock → write-order → clear-cart; repos are transaction-unaware — the connection propagates through the fiber context. `test/workflows.test.ts` proves a mid-checkout stock failure rolls everything back.
- **Every DB row decoded by Schema** (`src/services/*Repo.ts`) — the database is a boundary like any other; infra failures are defects, domain outcomes are typed errors.
- **Compile-time auth** (`src/http/security.ts`): `HttpApiMiddleware` provides `CurrentUser`; protected handlers cannot be wired without an auth implementation.
- **Security posture**: scrypt hashing behind a service, `Redacted` passwords end-to-end, anti-enumeration login, `Model.Sensitive`-style field hygiene, order lines snapshot price/name at purchase.
- **Property tests** (`test/domain.test.ts`): cart-total invariants; the category-tree totality property that caught a real cycle-handling bug.
