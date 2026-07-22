import { html } from "@lit-labs/ssr" // server-only html — NOT lit's
import type { TemplateResult } from "lit"
import { unsafeHTML } from "lit/directives/unsafe-html.js"
import type { PageMeta } from "./routes.js"

// Script-safe JSON: '</script>' inside data must not break out (lit security.md).
const safeJson = (data: unknown) =>
  JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029")

export const documentTemplate = (meta: PageMeta, body: TemplateResult, data: unknown) => html`
  <!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      <title>${meta.title}</title>
      <meta name="description" content=${meta.description} />
      <link rel="stylesheet" href="/src/styles/global.css" />
      <style>
        :not(:defined) {
          visibility: hidden;
        }
      </style>
    </head>
    <body>
      ${body}
      ${unsafeHTML(
        // One raw chunk: a text binding inside <script> would be HTML-escaped.
        // Safe: safeJson escapes every "<", so the payload cannot close the tag.
        `<script type="application/json" id="__DATA__">${safeJson(data)}</script>`
      )}
      <script type="module" src="/src/entry-client.ts"></script>
    </body>
  </html>
`
