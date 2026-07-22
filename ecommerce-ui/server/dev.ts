import http from "node:http"
import { getRequestListener } from "@hono/node-server"
import { createServer as createViteServer } from "vite"

// Canonical Vite middleware-mode + SSR wiring (lit-web-apps project-setup.md).
// Vite serves assets/HMR and proxies /api → the Effect backend; everything else
// falls through to the SSR handler, re-loaded per request for server HMR.

const vite = await createViteServer({
  server: { middlewareMode: true },
  appType: "custom",
})

const ssrHandler = getRequestListener(async (req) => {
  const { createApp } = (await vite.ssrLoadModule("/src/entry-server.ts")) as {
    createApp: () => { fetch: (req: Request) => Response | Promise<Response> }
  }
  return createApp().fetch(req)
})

const port = Number(process.env["UI_PORT"] ?? 5173)
http
  .createServer((req, res) => {
    vite.middlewares(req, res, () => void ssrHandler(req, res))
  })
  .listen(port, () => console.log(`ui dev: http://localhost:${port}`))
