import { Array as Arr, Schema } from "effect"
import type { CartLine } from "./cart.js"
import { Cents, NonEmptyTrimmedString, ProductId } from "./catalog.js"
import { Quantity } from "./cart.js"
import { UserId } from "./user.js"

export const OrderId = Schema.String.pipe(Schema.brand("OrderId"))
export type OrderId = typeof OrderId.Type

// Order lines snapshot name and price at purchase time — later catalog edits must not
// rewrite history.
export class OrderLine extends Schema.Class<OrderLine>("OrderLine")({
  productId: ProductId,
  name: NonEmptyTrimmedString,
  unitPriceCents: Cents,
  quantity: Quantity,
}) {}

export class Order extends Schema.Class<Order>("Order")({
  id: OrderId,
  userId: UserId,
  lines: Schema.NonEmptyArray(OrderLine), // an order with no lines is unrepresentable
  totalCents: Cents,
  // ISO string on the wire and in SQLite; DateTime.Utc in the domain.
  placedAt: Schema.DateTimeUtcFromString,
}) {}

// ---------- Pure ----------

export const toOrderLines = (
  cartLines: Arr.NonEmptyReadonlyArray<CartLine>
): Arr.NonEmptyReadonlyArray<OrderLine> =>
  Arr.map(
    cartLines,
    (line) =>
      new OrderLine({
        productId: line.product.id,
        name: line.product.name,
        unitPriceCents: line.product.priceCents,
        quantity: line.quantity,
      })
  )

export const orderTotal = (lines: ReadonlyArray<OrderLine>): Cents =>
  Cents.make(Arr.reduce(lines, 0, (sum, l) => sum + l.unitPriceCents * l.quantity))
