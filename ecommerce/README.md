# ecommerce

Full commerce API — catalog, search, category navigation, register/login, cart, **atomic checkout**, order history. The [effect-fp-skill](https://github.com/mikezupper/effect-fp-skill) at production scale, with real persistence (`effect/sql` + `@effect/sql-sqlite-node`, which drives Node's built-in `node:sqlite`). Built on **Effect 4** (`effect@4.0.1`): HTTP, SQL and Schema all come from `effect` itself (`effect/http`, `effect/http-api`, `effect/sql`).

## Run

```bash
npm ci
PORT=3001 npm run dev      # http://localhost:3001, Swagger UI at /docs, spec at /openapi.json
npm test                   # 13 tests incl. checkout-atomicity proof
npm run typecheck
```

Requires Node ≥ 22.5 (`node:sqlite`). Config: `PORT` (default 3000, validated as a port), `DB_FILE` (default `ecommerce.db`; `:memory:` for ephemeral). The DB self-migrates and self-seeds idempotently on boot — delete the file to reset.

## API surface

| Endpoint | Auth | Errors |
|---|---|---|
| `POST /auth/register`, `POST /auth/login` | — | `EmailTaken` 409, `InvalidCredentials` 401 |
| `GET /catalog/categories` (tree), `GET /catalog/products?search=&category=`, `GET /catalog/products/:id` | — | `ProductNotFound` 404 |
| `GET /cart`, `PUT /cart/items`, `DELETE /cart/items/:productId` | bearer | `Unauthorized` 401, `ProductNotFound` 404 |
| `POST /orders` (checkout), `GET /orders`, `GET /orders/:id` | bearer | `CartEmpty` 409, `InsufficientStock` 409, `OrderNotFound` 404 |

## What it demonstrates

- **Transaction boundary at the workflow** (`src/workflows/orders.ts`): `sql.withTransaction` wraps read-cart → reserve-stock → write-order → clear-cart; repos are transaction-unaware — the connection propagates through the fiber context. `test/workflows.test.ts` proves a mid-checkout stock failure rolls everything back.
- **Every DB row decoded by Schema** (`src/services/*Repo.ts`, via `SqlSchema.findOneOption` / `findAll` / `void`) — the database is a boundary like any other; infra failures are defects, domain outcomes are typed errors.
- **Services as `Context.Service` classes with a static `layer`**; workflows are `Effect.fn` functions whose requirements stay in the type (`Effect.fn.Return<A, E, R>`). HTTP handler groups capture those capabilities once at layer build (`Effect.context` → `Effect.provideContext`), since Effect 4 turns any requirement left on a handler into a per-request one.
- **Compile-time auth** (`src/http/security.ts`): an `HttpApiMiddleware.Service` provides `CurrentUser`; protected handlers cannot be wired without an auth implementation.
- **HTTP status codes live in the API definition** (`src/http/api.ts`, `HttpApiSchema.status(...)`), not on the domain errors. Malformed requests get Effect's built-in empty `400`.
- **Security posture**: scrypt hashing behind a service, `Redacted` passwords end-to-end, anti-enumeration login, `Model.Sensitive`-style field hygiene, order lines snapshot price/name at purchase.
- **Property tests** (`test/domain.test.ts`): cart-total invariants; the category-tree totality property that caught a real cycle-handling bug.
