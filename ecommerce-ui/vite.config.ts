import { fileURLToPath } from "node:url"
import { defineConfig } from "vite"

export default defineConfig({
  build: { target: "es2022" },
  resolve: {
    alias: {
      // Type-only imports of the backend's schemas (wire-contract safety).
      "@backend": fileURLToPath(new URL("../ecommerce/src", import.meta.url)),
    },
  },
  server: {
    // Browser → /api/* → Effect backend. Server-side rendering talks to it directly.
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
  // Keep lit + ssr packages external in SSR so Node's export conditions pick the
  // node build (which installs the DOM shim). (lit-web-apps project-setup.md)
  ssr: {
    external: ["lit", "@lit-labs/ssr", "@lit-labs/ssr-client", "@lit/task", "@lit-labs/signals"],
  },
})
