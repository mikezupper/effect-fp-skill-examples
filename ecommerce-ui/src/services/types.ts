// Wire-contract types, derived from the backend's OWN schemas — type-only, so
// nothing from the backend (or Effect) lands in the bundle. Crucially these are
// the ENCODED side: what actually crosses the wire (ISO strings, null — not
// DateTime/Option, which only exist after the backend decodes).
import type { CartView } from "@backend/domain/cart.js"
import type { Product } from "@backend/domain/catalog.js"
import type { Order } from "@backend/domain/order.js"
import type { AuthSession } from "@backend/workflows/auth.js"

export type ProductDto = (typeof Product)["Encoded"]
export type CartViewDto = (typeof CartView)["Encoded"]
export type CartLineDto = CartViewDto["lines"][number]
export type OrderDto = (typeof Order)["Encoded"]
export type AuthSessionDto = (typeof AuthSession)["Encoded"]

// CategoryTree is already a plain (Type = Encoded) recursive interface.
export type { CategoryTree } from "@backend/domain/catalog.js"

// Error tags the backend can return — matches its Schema.TaggedError union.
// (Request-decoding failures are an EMPTY 400 in Effect 4 — no tag; they surface as "Unknown".)
export type ApiErrorTag =
  | "EmailTaken"
  | "InvalidCredentials"
  | "ProductNotFound"
  | "CartEmpty"
  | "InsufficientStock"
  | "OrderNotFound"
  | "Unauthorized"
