import { describe, expect, it } from "vitest"
import "../../src/components/product-card.js"
import type { ProductDto } from "../../src/services/types.js"

const product: ProductDto = {
  id: "p-test",
  sku: "TEST-1",
  name: "Test Lantern",
  description: "Signals in the dark",
  priceCents: 12900,
  categoryId: "cat-test",
  stock: 3,
}

// Real browser (playwright/chromium): shadow DOM + custom elements need it.
async function mount(p: ProductDto) {
  const el = document.createElement("product-card")
  el.product = p
  document.body.append(el)
  await el.updateComplete
  return el
}

describe("product-card", () => {
  it("renders name, formatted price, and low-stock state", async () => {
    const el = await mount(product)
    const text = el.shadowRoot!.textContent!
    expect(text).toContain("Test Lantern")
    expect(text).toContain("$129.00")
    expect(text).toContain("Only 3 left")
    el.remove()
  })

  it("dispatches a composed add-to-cart event", async () => {
    const el = await mount(product)
    let detail: { productId: string } | null = null
    el.addEventListener("add-to-cart", (e) => {
      detail = (e as CustomEvent<{ productId: string }>).detail
    })
    el.shadowRoot!.querySelector("button")!.click()
    expect(detail).toEqual({ productId: "p-test" })
    el.remove()
  })

  it("disables Add when out of stock", async () => {
    const el = await mount({ ...product, stock: 0 })
    expect(el.shadowRoot!.querySelector("button")!.disabled).toBe(true)
    expect(el.shadowRoot!.textContent).toContain("Out of stock")
    el.remove()
  })
})
