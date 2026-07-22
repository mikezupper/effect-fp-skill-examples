// ORDER IS LOAD-BEARING: hydrate-support patches LitElement and MUST run
// before any module that imports 'lit'. (lit-web-apps golden rule #3)
import "@lit-labs/ssr-client/lit-element-hydrate-support.js"

// Seed serialized route data before components load, so the first client
// render matches the server's exactly (data-and-state.md pipeline step 4).
import("./components/app-shell.js")
