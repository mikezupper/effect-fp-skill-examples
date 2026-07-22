import { Schema } from "effect"
import { ProductId } from "./catalog.js"
import { OrderId } from "./order.js"
import { Email } from "./user.js"

// All Schema.TaggedError: they cross the HTTP boundary. Each carries what a handler
// needs to react — never just a message.

export class EmailTaken extends Schema.TaggedError<EmailTaken>()("EmailTaken", {
  email: Email,
}) {}

// Deliberately identical for unknown email and wrong password — no account enumeration.
export class InvalidCredentials extends Schema.TaggedError<InvalidCredentials>()(
  "InvalidCredentials",
  {}
) {}

export class ProductNotFound extends Schema.TaggedError<ProductNotFound>()(
  "ProductNotFound",
  { productId: ProductId }
) {}

export class CartEmpty extends Schema.TaggedError<CartEmpty>()("CartEmpty", {}) {}

export class InsufficientStock extends Schema.TaggedError<InsufficientStock>()(
  "InsufficientStock",
  {
    productId: ProductId,
    requested: Schema.Int,
    available: Schema.Int,
  }
) {}

export class OrderNotFound extends Schema.TaggedError<OrderNotFound>()("OrderNotFound", {
  orderId: OrderId,
}) {}
