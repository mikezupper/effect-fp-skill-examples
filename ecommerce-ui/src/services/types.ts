// Wire-contract types, derived from the backend's OWN schemas — type-only, so
// nothing from the backend (or Effect) lands in the bundle. Crucially these are
// the ENCODED side: what actually crosses the wire (ISO strings, null — not
// DateTime/Option, which only exist after the backend decodes).
import type { Schema } from "effect"
import type { CartView } from "@backend/domain/cart.js"
import type { Product } from "@backend/domain/catalog.js"
import type { Order } from "@backend/domain/order.js"
import type { AuthSession } from "@backend/workflows/auth.js"

export type ProductDto = Schema.Schema.Encoded<typeof Product>
export type CartViewDto = Schema.Schema.Encoded<typeof CartView>
export type CartLineDto = CartViewDto["lines"][number]
export type OrderDto = Schema.Schema.Encoded<typeof Order>
export type AuthSessionDto = Schema.Schema.Encoded<typeof AuthSession>

// CategoryTree is already a plain (Type = Encoded) recursive interface.
export type { CategoryTree } from "@backend/domain/catalog.js"

// Error tags the backend can return — matches its Schema.TaggedError union.
export type ApiErrorTag =
  | "EmailTaken"
  | "InvalidCredentials"
  | "ProductNotFound"
  | "CartEmpty"
  | "InsufficientStock"
  | "OrderNotFound"
  | "Unauthorized"
  | "HttpApiDecodeError"
