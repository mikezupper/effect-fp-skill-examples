import { describe, expect, it } from "vitest"
import { formatPrice, productHue } from "../../src/format.js"

describe("formatPrice", () => {
  it("formats cents as USD", () => {
    expect(formatPrice(199900)).toBe("$1,999.00")
    expect(formatPrice(4999)).toBe("$49.99")
    expect(formatPrice(0)).toBe("$0.00")
  })
})

describe("productHue", () => {
  it("is deterministic and within [0, 360)", () => {
    expect(productHue("LAP-PRO-14")).toBe(productHue("LAP-PRO-14"))
    for (const sku of ["LAP-PRO-14", "AUD-EARB-1", "BOOK-DMMF", ""]) {
      const hue = productHue(sku)
      expect(hue).toBeGreaterThanOrEqual(0)
      expect(hue).toBeLessThan(360)
    }
  })
})
