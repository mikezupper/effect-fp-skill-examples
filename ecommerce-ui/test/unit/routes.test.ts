import { describe, expect, it } from "vitest"
import { matchRoute } from "../../src/routes.js"

// URLPattern is native in Node 24 — the same matching runs on the SSR server.
describe("matchRoute", () => {
  it("matches the catalog root, with and without query params", () => {
    expect(matchRoute(new URL("http://x/"))?.route.path).toBe("/")
    expect(matchRoute(new URL("http://x/?search=laptop&category=laptops"))?.route.path).toBe("/")
  })

  it("extracts product params", () => {
    const m = matchRoute(new URL("http://x/products/p-laptop-pro"))
    expect(m?.route.path).toBe("/products/:id")
    expect(m?.params["id"]).toBe("p-laptop-pro")
  })

  it("matches orders as a csr route", () => {
    const m = matchRoute(new URL("http://x/orders"))
    expect(m?.route.mode).toBe("csr")
  })

  it("returns null for unknown paths (browser handles them)", () => {
    expect(matchRoute(new URL("http://x/no/such/page"))).toBeNull()
  })
})
