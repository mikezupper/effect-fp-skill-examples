import { Readable } from "node:stream"
import { render } from "@lit-labs/ssr"
import { RenderResultReadable } from "@lit-labs/ssr/lib/render-result-readable.js"
import { Hono } from "hono"
import { html } from "lit"
import { documentTemplate } from "./document.js"
import { matchRoute } from "./routes.js"

// Server imports all page modules up front (client lazy-loads via enter()).
import "./components/app-shell.js"
import "./pages/home-page.js"
import "./pages/product-page.js"
import "./pages/orders-page.js"

export function createApp() {
  const app = new Hono()
  app.get("*", async (c) => {
    const url = new URL(c.req.url)
    const match = matchRoute(url)
    if (!match) return c.notFound()

    // ALL async work happens HERE — server component render is synchronous.
    // csr-mode routes skip load: the shell renders and the page fetches client-side.
    const data =
      match.route.mode === "ssr"
        ? ((await match.route.load?.(match.params, url)) ?? null)
        : null

    const page = match.route.template(data as never)
    const body = html`<app-shell>${page}</app-shell>`
    const result = render(documentTemplate(match.route.meta(data as never), body, data))
    return c.body(Readable.toWeb(new RenderResultReadable(result)) as ReadableStream, 200, {
      "content-type": "text/html; charset=utf-8",
    })
  })
  return app
}
