# ecommerce-ui — "Railway Supply Co."

Server-rendered Lit storefront over the [`ecommerce`](../ecommerce/) API. Built with the [lit-web-apps skill](https://github.com/mikezupper/lit-web-apps-skill) (SSR/CSR hybrid, platform-native routing, signals) and the modern-css skill (one-hue oklch design system, container queries, top-layer dialogs).

## Run

```bash
# terminal 1 — the API this UI consumes:
cd ../ecommerce && PORT=3001 npm run dev

# terminal 2:
npm ci
npm run dev            # http://localhost:5173
npm test               # unit (node) + component tests (real Chromium via Playwright)
npm run typecheck
```

Config: `UI_PORT` (default 5173), `API_URL` (default `http://localhost:3001` — used by **SSR**; browser traffic goes through the Vite `/api` proxy in `vite.config.ts`).

## Architecture

- **Route table with per-route modes** (`src/routes.ts`): `/` and `/products/:id` are **SSR** (streamed Declarative Shadow DOM, real titles/meta, crawlable without JS); `/orders` is **CSR** (auth-gated). One component set serves both.
- **Router** (`src/router.ts`): ~80 lines on `URLPattern` + Navigation API, view transitions on SPA navigation, plain `<a href>` everywhere. The server matches the same table.
- **SSR pipeline**: Hono + `@lit-labs/ssr` streaming (`src/entry-server.ts`), server-only document template with script-safe `__DATA__` serialization (`src/document.ts`), Vite middleware-mode dev server (`server/dev.ts`).
- **Hydration discipline** (the part that bites — see the root README's findings): session restore waits for whole-tree hydration (`src/components/app-shell.ts`), Task INITIAL/PENDING render identically (`src/pages/orders-page.ts`).
- **Wire types without runtime coupling** (`src/services/types.ts`): DTOs are `(typeof Order)["Encoded"]` etc. (Effect 4 schemas expose `Type`/`Encoded` as members). — type-only imports of the backend's own schemas. Zero Effect in the bundle; backend schema changes break this build.
- **State ladder**: signals (`src/state/`) for session + cart, `@lit/task` for fetches, reactive properties locally.
- **CSS** (`src/styles/`): `@layer reset/tokens/base`, whole theme derived from `--hue: 62` via oklch + `color-mix`, `light-dark()` both themes, container-query product cards, `<dialog>` drawer with `@starting-style` slide-in, `:user-invalid` forms, reduced-motion kill switch.
