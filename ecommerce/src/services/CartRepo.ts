import { SqlClient } from "@effect/sql"
import { Effect, Schema } from "effect"
import { Quantity } from "../domain/cart.js"
import { Product, ProductId } from "../domain/catalog.js"
import { UserId } from "../domain/user.js"

// Flat row = product columns + quantity; reassembled into domain shapes purely.
const CartItemRow = Schema.Struct({ ...Product.fields, quantity: Quantity })

export class CartRepo extends Effect.Service<CartRepo>()("app/CartRepo", {
  effect: Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient
    const decodeRows = Schema.decodeUnknown(Schema.Array(CartItemRow))

    return {
      items: (
        userId: UserId
      ): Effect.Effect<ReadonlyArray<{ product: Product; quantity: Quantity }>> =>
        Effect.gen(function* () {
          const rows = yield* sql`
            SELECT p.*, ci.quantity FROM cart_items ci
            JOIN products p ON p.id = ci.product_id
            WHERE ci.user_id = ${userId}
            ORDER BY p.name`
          const decoded = yield* decodeRows(rows)
          return decoded.map(({ quantity, ...product }) => ({
            product: new Product(product),
            quantity,
          }))
        }).pipe(Effect.orDie),

      setItem: (userId: UserId, productId: ProductId, quantity: Quantity): Effect.Effect<void> =>
        sql`INSERT INTO cart_items (user_id, product_id, quantity)
            VALUES (${userId}, ${productId}, ${quantity})
            ON CONFLICT (user_id, product_id) DO UPDATE SET quantity = excluded.quantity`.pipe(
          Effect.asVoid,
          Effect.orDie
        ),

      removeItem: (userId: UserId, productId: ProductId): Effect.Effect<void> =>
        sql`DELETE FROM cart_items WHERE user_id = ${userId} AND product_id = ${productId}`.pipe(
          Effect.asVoid,
          Effect.orDie
        ),

      clear: (userId: UserId): Effect.Effect<void> =>
        sql`DELETE FROM cart_items WHERE user_id = ${userId}`.pipe(Effect.asVoid, Effect.orDie),
    } as const
  }),
}) {}
