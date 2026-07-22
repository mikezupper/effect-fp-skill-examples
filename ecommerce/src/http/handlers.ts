import { HttpApiBuilder } from "@effect/platform"
import { Effect } from "effect"
import { login, register } from "../workflows/auth.js"
import { getCart, removeCartItem, setCartItem } from "../workflows/cart.js"
import { browseProducts, categoryNavigation, getProduct } from "../workflows/catalog.js"
import { checkout, getOrder, orderHistory } from "../workflows/orders.js"
import { Api } from "./api.js"
import { CurrentUser } from "./security.js"

// Handlers are thin: pull decoded input (and CurrentUser where authorized), call the
// workflow. Status codes and error serialization come from the api definition.

export const AuthLive = HttpApiBuilder.group(Api, "auth", (handlers) =>
  handlers
    .handle("register", ({ payload }) => register(payload.email, payload.password))
    .handle("login", ({ payload }) => login(payload.email, payload.password))
)

export const CatalogLive = HttpApiBuilder.group(Api, "catalog", (handlers) =>
  handlers
    .handle("categories", () => categoryNavigation())
    .handle("products", ({ urlParams }) =>
      browseProducts({ search: urlParams.search, categorySlug: urlParams.category })
    )
    .handle("product", ({ path }) => getProduct(path.id))
)

export const CartLive = HttpApiBuilder.group(Api, "cart", (handlers) =>
  handlers
    .handle("getCart", () =>
      CurrentUser.pipe(Effect.flatMap((user) => getCart(user.userId)))
    )
    .handle("setItem", ({ payload }) =>
      CurrentUser.pipe(
        Effect.flatMap((user) => setCartItem(user.userId, payload.productId, payload.quantity))
      )
    )
    .handle("removeItem", ({ path }) =>
      CurrentUser.pipe(Effect.flatMap((user) => removeCartItem(user.userId, path.productId)))
    )
)

export const OrdersLive = HttpApiBuilder.group(Api, "orders", (handlers) =>
  handlers
    .handle("checkout", () =>
      CurrentUser.pipe(Effect.flatMap((user) => checkout(user.userId)))
    )
    .handle("history", () =>
      CurrentUser.pipe(Effect.flatMap((user) => orderHistory(user.userId)))
    )
    .handle("getOrder", ({ path }) =>
      CurrentUser.pipe(Effect.flatMap((user) => getOrder(user.userId, path.id)))
    )
)
