import { describe, it } from "@effect/vitest"
import { Array as Arr, Schema } from "effect"
import { makeCartView, Quantity } from "../src/domain/cart.js"
import { buildCategoryTree, Category, Product } from "../src/domain/catalog.js"
import { orderTotal } from "../src/domain/order.js"

const CartInput = Schema.Array(Schema.Struct({ product: Product, quantity: Quantity }))

describe("cart pricing (pure)", () => {
  it.prop("total equals the sum of line totals", [CartInput], ([items]) => {
    const view = makeCartView(items)
    return view.totalCents === Arr.reduce(view.lines, 0, (s, l) => s + l.lineTotalCents)
  })

  it.prop("total is invariant under reordering", [CartInput], ([items]) => {
    return makeCartView(items).totalCents === makeCartView(Arr.reverse(items)).totalCents
  })

  it.prop("every line total = price × quantity", [CartInput], ([items]) => {
    return makeCartView(items).lines.every(
      (l) => l.lineTotalCents === l.product.priceCents * l.quantity
    )
  })
})

describe("category navigation (pure)", () => {
  const countNodes = (nodes: ReadonlyArray<{ children: ReadonlyArray<never> }>): number =>
    Arr.reduce(nodes, 0, (sum, n) => sum + 1 + countNodes(n.children as never))

  it.prop(
    "the tree contains every category exactly once",
    [Schema.Array(Category)],
    ([categories]) => {
      // dedupe ids — generator may repeat them, and ids are primary keys
      const unique = Arr.dedupeWith(categories, (a, b) => a.id === b.id)
      return countNodes(buildCategoryTree(unique) as never) === unique.length
    }
  )
})
