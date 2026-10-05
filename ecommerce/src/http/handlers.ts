import { Effect } from "effect"
import { HttpApiBuilder } from "effect/http-api"
import type { SqlClient } from "effect/sql"
import type { CartRepo } from "../services/CartRepo.js"
import type { IdGen } from "../services/IdGen.js"
import type { OrderRepo } from "../services/OrderRepo.js"
import type { PasswordHasher } from "../services/PasswordHasher.js"
import type { ProductRepo } from "../services/ProductRepo.js"
import type { SessionRepo } from "../services/SessionRepo.js"
import type { UserRepo } from "../services/UserRepo.js"
import { login, register } from "../workflows/auth.js"
import { getCart, removeCartItem, setCartItem } from "../workflows/cart.js"
import { browseProducts, categoryNavigation, getProduct } from "../workflows/catalog.js"
import { checkout, getOrder, orderHistory } from "../workflows/orders.js"
import { Api } from "./api.js"
import { CurrentUser } from "./security.js"

// Handlers are thin: pull decoded input (and CurrentUser where authorized), call the
// workflow. Status codes and error serialization come from the api definition.
//
// Capabilities are captured ONCE, when each group Layer is built, and provided to every
// request. A service requirement left on a handler would instead surface as a
// per-request `HttpRouter.Request<"Requires", _>` that Layer.provide cannot satisfy.
// CurrentUser is different: it IS per-request, provided by the Authorization middleware.

export const AuthLive = HttpApiBuilder.group(
  Api,
  "auth",
  Effect.fn(function* (handlers) {
    const capabilities = yield* Effect.context<UserRepo | SessionRepo | PasswordHasher | IdGen>()
    return handlers.handleAll({
      register: ({ payload }) =>
        register(payload.email, payload.password).pipe(Effect.provideContext(capabilities)),
      login: ({ payload }) =>
        login(payload.email, payload.password).pipe(Effect.provideContext(capabilities)),
    })
  })
)

export const CatalogLive = HttpApiBuilder.group(
  Api,
  "catalog",
  Effect.fn(function* (handlers) {
    const capabilities = yield* Effect.context<ProductRepo>()
    return handlers.handleAll({
      categories: () => categoryNavigation().pipe(Effect.provideContext(capabilities)),
      products: ({ query }) =>
        browseProducts({ search: query.search, categorySlug: query.category }).pipe(
          Effect.provideContext(capabilities)
        ),
      product: ({ params }) => getProduct(params.id).pipe(Effect.provideContext(capabilities)),
    })
  })
)

export const CartLive = HttpApiBuilder.group(
  Api,
  "cart",
  Effect.fn(function* (handlers) {
    const capabilities = yield* Effect.context<CartRepo | ProductRepo>()
    return handlers.handleAll({
      getCart: () =>
        CurrentUser.pipe(
          Effect.flatMap((user) => getCart(user.userId)),
          Effect.provideContext(capabilities)
        ),
      setItem: ({ payload }) =>
        CurrentUser.pipe(
          Effect.flatMap((user) => setCartItem(user.userId, payload.productId, payload.quantity)),
          Effect.provideContext(capabilities)
        ),
      removeItem: ({ params }) =>
        CurrentUser.pipe(
          Effect.flatMap((user) => removeCartItem(user.userId, params.productId)),
          Effect.provideContext(capabilities)
        ),
    })
  })
)

export const OrdersLive = HttpApiBuilder.group(
  Api,
  "orders",
  Effect.fn(function* (handlers) {
    const capabilities = yield* Effect.context<
      SqlClient.SqlClient | CartRepo | ProductRepo | OrderRepo | IdGen
    >()
    return handlers.handleAll({
      checkout: () =>
        CurrentUser.pipe(
          Effect.flatMap((user) => checkout(user.userId)),
          Effect.provideContext(capabilities)
        ),
      history: () =>
        CurrentUser.pipe(
          Effect.flatMap((user) => orderHistory(user.userId)),
          Effect.provideContext(capabilities)
        ),
      getOrder: ({ params }) =>
        CurrentUser.pipe(
          Effect.flatMap((user) => getOrder(user.userId, params.id)),
          Effect.provideContext(capabilities)
        ),
    })
  })
)
