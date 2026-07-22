import { SqlClient } from "@effect/sql"
import { Array as Arr, DateTime, Effect, Option } from "effect"
import { CartEmpty, InsufficientStock, OrderNotFound } from "../domain/errors.js"
import { Order, OrderId, orderTotal, toOrderLines } from "../domain/order.js"
import { UserId } from "../domain/user.js"
import { CartRepo } from "../services/CartRepo.js"
import { IdGen } from "../services/IdGen.js"
import { OrderRepo } from "../services/OrderRepo.js"
import { ProductRepo } from "../services/ProductRepo.js"
import { getCart } from "./cart.js"

// THE transaction boundary of the app: read cart → reserve stock → write order → clear
// cart, atomically. Any failure (InsufficientStock, defect, interruption) rolls the
// whole thing back — stock and cart are untouched. Repos share the transaction
// connection implicitly through the fiber context; no plumbing.
export const checkout = (
  userId: UserId
): Effect.Effect<
  Order,
  CartEmpty | InsufficientStock,
  SqlClient.SqlClient | CartRepo | ProductRepo | OrderRepo | IdGen
> =>
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient
    const products = yield* ProductRepo
    const orders = yield* OrderRepo
    const carts = yield* CartRepo
    const ids = yield* IdGen

    return yield* sql.withTransaction(
      Effect.gen(function* () {
        const cart = yield* getCart(userId)
        if (!Arr.isNonEmptyReadonlyArray(cart.lines)) {
          return yield* new CartEmpty()
        }

        // Reserve stock line by line — sequential inside a transaction (one connection).
        yield* Effect.forEach(
          cart.lines,
          (line) =>
            Effect.gen(function* () {
              const ok = yield* products.decrementStock(line.product.id, line.quantity)
              if (!ok) {
                const current = yield* products.findById(line.product.id)
                return yield* new InsufficientStock({
                  productId: line.product.id,
                  requested: line.quantity,
                  available: Option.match(current, {
                    onNone: () => 0,
                    onSome: (p) => p.stock,
                  }),
                })
              }
            }),
          { concurrency: 1 }
        )

        const lines = toOrderLines(cart.lines) // pure snapshot
        const order = new Order({
          id: OrderId.make(yield* ids.next),
          userId,
          lines,
          totalCents: orderTotal(lines), // pure
          placedAt: yield* DateTime.now,
        })
        yield* orders.insert(order)
        yield* carts.clear(userId)
        yield* Effect.logInfo("order placed").pipe(
          Effect.annotateLogs({ orderId: order.id, totalCents: order.totalCents })
        )
        return order
      })
    )
  }).pipe(
    // withTransaction adds SqlError; BEGIN/COMMIT failing is infra breakage → defect.
    Effect.catchTag("SqlError", (e) => Effect.die(e)),
    Effect.withSpan("Orders.checkout")
  )

export const orderHistory = (
  userId: UserId
): Effect.Effect<ReadonlyArray<Order>, never, OrderRepo> =>
  Effect.gen(function* () {
    const orders = yield* OrderRepo
    return yield* orders.listByUser(userId)
  }).pipe(Effect.withSpan("Orders.orderHistory"))

export const getOrder = (
  userId: UserId,
  orderId: OrderId
): Effect.Effect<Order, OrderNotFound, OrderRepo> =>
  Effect.gen(function* () {
    const orders = yield* OrderRepo
    return yield* orders.findById(userId, orderId).pipe(
      Effect.flatMap(
        Option.match({
          onNone: () => new OrderNotFound({ orderId }),
          onSome: (order) => Effect.succeed(order),
        })
      )
    )
  }).pipe(Effect.withSpan("Orders.getOrder"))
