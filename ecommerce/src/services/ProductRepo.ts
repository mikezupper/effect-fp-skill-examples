import { SqlClient, SqlSchema } from "@effect/sql"
import { Effect, Option, Schema } from "effect"
import { Category, CategoryId, Product, ProductId } from "../domain/catalog.js"

export interface ProductFilter {
  readonly search: Option.Option<string>
  readonly categoryId: Option.Option<CategoryId>
}

export class ProductRepo extends Effect.Service<ProductRepo>()("app/ProductRepo", {
  effect: Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient

    const findById = SqlSchema.findOne({
      Request: ProductId,
      Result: Product,
      execute: (id) => sql`SELECT * FROM products WHERE id = ${id}`,
    })

    const decodeProducts = Schema.decodeUnknown(Schema.Array(Product))
    const decodeCategories = Schema.decodeUnknown(Schema.Array(Category))

    return {
      findById: (id: ProductId): Effect.Effect<Option.Option<Product>> =>
        findById(id).pipe(Effect.orDie),

      list: (filter: ProductFilter): Effect.Effect<ReadonlyArray<Product>> =>
        Effect.gen(function* () {
          const conditions = [
            ...Option.match(filter.categoryId, {
              onNone: () => [],
              onSome: (id) => [sql`category_id = ${id}`],
            }),
            ...Option.match(filter.search, {
              onNone: () => [],
              onSome: (q) => [sql`name LIKE ${`%${q}%`}`],
            }),
          ]
          const rows =
            conditions.length === 0
              ? yield* sql`SELECT * FROM products ORDER BY name`
              : yield* sql`SELECT * FROM products WHERE ${sql.and(conditions)} ORDER BY name`
          return yield* decodeProducts(rows)
        }).pipe(Effect.orDie),

      listCategories: (): Effect.Effect<ReadonlyArray<Category>> =>
        Effect.gen(function* () {
          const rows = yield* sql`SELECT * FROM categories ORDER BY name`
          return yield* decodeCategories(rows)
        }).pipe(Effect.orDie),

      findCategoryBySlug: (slug: string): Effect.Effect<Option.Option<Category>> =>
        Effect.gen(function* () {
          const rows = yield* sql`SELECT * FROM categories WHERE slug = ${slug}`
          const categories = yield* decodeCategories(rows)
          return Option.fromNullable(categories[0])
        }).pipe(Effect.orDie),

      // Atomic conditional decrement — succeeds only if enough stock remains.
      // Runs inside whatever transaction the calling workflow has opened.
      decrementStock: (id: ProductId, quantity: number): Effect.Effect<boolean> =>
        Effect.gen(function* () {
          const rows = yield* sql`
            UPDATE products SET stock = stock - ${quantity}
            WHERE id = ${id} AND stock >= ${quantity}
            RETURNING stock`
          return rows.length > 0
        }).pipe(Effect.orDie),
    } as const
  }),
}) {}
