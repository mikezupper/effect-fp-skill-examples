import { Array as Arr, DateTime, Effect, Option } from "effect"
import { SqlClient } from "effect/sql"
import { CartEmpty, InsufficientStock, OrderNotFound } from "../domain/errors.js"
import type { CartLine } from "../domain/cart.js"
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
export const checkout = Effect.fn("Orders.checkout")(
  function* (
    userId: UserId
  ): Effect.fn.Return<
    Order,
    CartEmpty | InsufficientStock,
    SqlClient.SqlClient | CartRepo | ProductRepo | OrderRepo | IdGen
  > {
    const sql = yield* SqlClient.SqlClient
    const products = yield* ProductRepo
    const orders = yield* OrderRepo
    const carts = yield* CartRepo
    const ids = yield* IdGen

    // Reserve one line's stock, or explain precisely why not.
    const reserve = Effect.fnUntraced(function* (line: CartLine) {
      const ok = yield* products.decrementStock(line.product.id, line.quantity)
      if (!ok) {
        const current = yield* products.findById(line.product.id)
        return yield* new InsufficientStock({
          productId: line.product.id,
          requested: line.quantity,
          available: Option.match(current, { onNone: () => 0, onSome: (p) => p.stock }),
        })
      }
    })

    return yield* sql.withTransaction(
      Effect.gen(function* () {
        const cart = yield* getCart(userId)
        if (!Arr.isReadonlyArrayNonEmpty(cart.lines)) {
          return yield* new CartEmpty()
        }

        // Reserve stock line by line — sequential inside a transaction (one connection).
        yield* Effect.forEach(cart.lines, reserve, { concurrency: 1, discard: true })

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
    ).pipe(
      // withTransaction adds SqlError; BEGIN/COMMIT failing is infra breakage → defect.
      Effect.catchTag("SqlError", Effect.die)
    )
  }
)

export const orderHistory = Effect.fn("Orders.orderHistory")(function* (
  userId: UserId
): Effect.fn.Return<ReadonlyArray<Order>, never, OrderRepo> {
  const orders = yield* OrderRepo
  return yield* orders.listByUser(userId)
})

export const getOrder = Effect.fn("Orders.getOrder")(function* (
  userId: UserId,
  orderId: OrderId
): Effect.fn.Return<Order, OrderNotFound, OrderRepo> {
  const orders = yield* OrderRepo
  const order = yield* orders.findById(userId, orderId)
  if (Option.isNone(order)) {
    return yield* new OrderNotFound({ orderId })
  }
  return order.value
})
