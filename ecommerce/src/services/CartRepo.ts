import { Context, Effect, Layer, Schema } from "effect"
import { SqlClient, SqlSchema } from "effect/sql"
import { Quantity } from "../domain/cart.js"
import { Product, ProductId } from "../domain/catalog.js"
import { UserId } from "../domain/user.js"

// Flat row = product columns + quantity; reassembled into domain shapes purely.
const CartItemRow = Schema.Struct({ ...Product.fields, quantity: Quantity })

export interface CartItem {
  readonly product: Product
  readonly quantity: Quantity
}

export class CartRepo extends Context.Service<
  CartRepo,
  {
    readonly items: (userId: UserId) => Effect.Effect<ReadonlyArray<CartItem>>
    readonly setItem: (userId: UserId, productId: ProductId, quantity: Quantity) => Effect.Effect<void>
    readonly removeItem: (userId: UserId, productId: ProductId) => Effect.Effect<void>
    readonly clear: (userId: UserId) => Effect.Effect<void>
  }
>()("app/CartRepo") {
  static readonly layer = Layer.effect(
    CartRepo,
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient

      const findItems = SqlSchema.findAll({
        Request: UserId,
        Result: CartItemRow,
        execute: (userId) => sql`
          SELECT p.*, ci.quantity FROM cart_items ci
          JOIN products p ON p.id = ci.product_id
          WHERE ci.user_id = ${userId}
          ORDER BY p.name`,
      })

      return CartRepo.of({
        items: (userId) =>
          findItems(userId).pipe(
            Effect.map((rows) =>
              rows.map(({ quantity, ...product }) => ({ product: new Product(product), quantity }))
            ),
            Effect.orDie
          ),

        setItem: (userId, productId, quantity) =>
          sql`INSERT INTO cart_items (user_id, product_id, quantity)
              VALUES (${userId}, ${productId}, ${quantity})
              ON CONFLICT (user_id, product_id) DO UPDATE SET quantity = excluded.quantity`.pipe(
            Effect.asVoid,
            Effect.orDie
          ),

        removeItem: (userId, productId) =>
          sql`DELETE FROM cart_items WHERE user_id = ${userId} AND product_id = ${productId}`.pipe(
            Effect.asVoid,
            Effect.orDie
          ),

        clear: (userId) =>
          sql`DELETE FROM cart_items WHERE user_id = ${userId}`.pipe(Effect.asVoid, Effect.orDie),
      })
    })
  )
}
