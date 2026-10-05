import { Array as Arr, Schema } from "effect"
import { Cents, Product } from "./catalog.js"

export const Quantity = Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 99 })).pipe(
  Schema.brand("Quantity")
)
export type Quantity = typeof Quantity.Type

export class CartLine extends Schema.Class<CartLine>("CartLine")({
  product: Product,
  quantity: Quantity,
  lineTotalCents: Cents,
}) {}

export class CartView extends Schema.Class<CartView>("CartView")({
  lines: Schema.Array(CartLine),
  totalCents: Cents,
}) {}

// ---------- Pure pricing ----------

export const lineTotal = (priceCents: Cents, quantity: Quantity): Cents =>
  Cents.make(priceCents * quantity)

export const makeCartView = (
  items: ReadonlyArray<{ readonly product: Product; readonly quantity: Quantity }>
): CartView => {
  const lines = Arr.map(
    items,
    ({ product, quantity }) =>
      new CartLine({
        product,
        quantity,
        lineTotalCents: lineTotal(product.priceCents, quantity),
      })
  )
  const totalCents = Cents.make(
    Arr.reduce(lines, 0, (sum, line) => sum + line.lineTotalCents)
  )
  return new CartView({ lines, totalCents })
}
