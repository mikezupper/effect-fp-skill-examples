import { Array as Arr, Context, Effect, Layer, Option, Schema } from "effect"
import { SqlClient } from "effect/sql"
import type { SqlError } from "effect/sql/SqlError"
import { Order, OrderId, OrderLine } from "../domain/order.js"
import { UserId } from "../domain/user.js"

const OrderRow = Schema.Struct({
  id: OrderId,
  userId: UserId,
  totalCents: Order.fields.totalCents,
  placedAt: Order.fields.placedAt,
})

const LineRow = Schema.Struct({ ...OrderLine.fields, orderId: OrderId })

export class OrderRepo extends Context.Service<
  OrderRepo,
  {
    readonly insert: (order: Order) => Effect.Effect<void>
    readonly listByUser: (userId: UserId) => Effect.Effect<ReadonlyArray<Order>>
    readonly findById: (userId: UserId, orderId: OrderId) => Effect.Effect<Option.Option<Order>>
  }
>()("app/OrderRepo") {
  static readonly layer = Layer.effect(
    OrderRepo,
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient
      const decodeOrders = Schema.decodeUnknownEffect(Schema.Array(OrderRow))
      const decodeLines = Schema.decodeUnknownEffect(Schema.Array(LineRow))

      // Two queries + pure grouping — no N+1.
      const assemble = (
        orderRows: ReadonlyArray<typeof OrderRow.Type>,
        lineRows: ReadonlyArray<typeof LineRow.Type>
      ): Effect.Effect<ReadonlyArray<Order>> =>
        Effect.forEach(orderRows, (row) => {
          const lines = Arr.filter(lineRows, (l) => l.orderId === row.id).map(
            ({ orderId: _, ...line }) => new OrderLine(line)
          )
          return Arr.isReadonlyArrayNonEmpty(lines)
            ? Effect.succeed(new Order({ ...row, lines }))
            : Effect.die(`order ${row.id} has no lines`) // broken invariant = defect
        })

      type Rows = Effect.Effect<ReadonlyArray<unknown>, SqlError>
      const fetchWhere = Effect.fnUntraced(
        function* (whereOrders: Rows, whereLines: Rows) {
          const orderRows = yield* decodeOrders(yield* whereOrders)
          if (orderRows.length === 0) return []
          const lineRows = yield* decodeLines(yield* whereLines)
          return yield* assemble(orderRows, lineRows)
        },
        Effect.orDie
      )

      const insert = Effect.fn("OrderRepo.insert")(
        function* (order: Order) {
          const encoded = yield* Schema.encodeEffect(OrderRow)(order)
          yield* sql`INSERT INTO orders (id, user_id, total_cents, placed_at)
                     VALUES (${encoded.id}, ${encoded.userId}, ${encoded.totalCents},
                             ${encoded.placedAt})`
          yield* Effect.forEach(
            order.lines,
            (line) => sql`
              INSERT INTO order_lines (order_id, product_id, name, unit_price_cents, quantity)
              VALUES (${order.id}, ${line.productId}, ${line.name},
                      ${line.unitPriceCents}, ${line.quantity})`,
            { concurrency: 1 } // sequential: we may be inside a transaction (single connection)
          )
        },
        Effect.orDie
      )

      return OrderRepo.of({
        insert,
        listByUser: (userId) =>
          fetchWhere(
            sql`SELECT * FROM orders WHERE user_id = ${userId} ORDER BY placed_at DESC`,
            sql`SELECT l.* FROM order_lines l
                JOIN orders o ON o.id = l.order_id WHERE o.user_id = ${userId}`
          ),
        findById: (userId, orderId) =>
          fetchWhere(
            sql`SELECT * FROM orders WHERE id = ${orderId} AND user_id = ${userId}`,
            sql`SELECT * FROM order_lines WHERE order_id = ${orderId}`
          ).pipe(Effect.map(Arr.head)),
      })
    })
  )
}
