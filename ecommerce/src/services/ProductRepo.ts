import { Context, Effect, Layer, Option, Schema } from "effect"
import { SqlClient, SqlSchema } from "effect/sql"
import { Category, CategoryId, Product, ProductId } from "../domain/catalog.js"

export interface ProductFilter {
  readonly search: Option.Option<string>
  readonly categoryId: Option.Option<CategoryId>
}

export class ProductRepo extends Context.Service<
  ProductRepo,
  {
    readonly findById: (id: ProductId) => Effect.Effect<Option.Option<Product>>
    readonly list: (filter: ProductFilter) => Effect.Effect<ReadonlyArray<Product>>
    readonly listCategories: Effect.Effect<ReadonlyArray<Category>>
    readonly findCategoryBySlug: (slug: string) => Effect.Effect<Option.Option<Category>>
    readonly decrementStock: (id: ProductId, quantity: number) => Effect.Effect<boolean>
  }
>()("app/ProductRepo") {
  static readonly layer = Layer.effect(
    ProductRepo,
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient

      const findById = SqlSchema.findOneOption({
        Request: ProductId,
        Result: Product,
        execute: (id) => sql`SELECT * FROM products WHERE id = ${id}`,
      })

      const listCategories = SqlSchema.findAll({
        Request: Schema.Void,
        Result: Category,
        execute: () => sql`SELECT * FROM categories ORDER BY name`,
      })

      const findCategoryBySlug = SqlSchema.findOneOption({
        Request: Schema.String,
        Result: Category,
        execute: (slug) => sql`SELECT * FROM categories WHERE slug = ${slug}`,
      })

      // Dynamic WHERE: build fragments, then decode the rows at the boundary.
      const decodeProducts = Schema.decodeUnknownEffect(Schema.Array(Product))
      const list = Effect.fn("ProductRepo.list")(
        function* (filter: ProductFilter) {
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
        },
        Effect.orDie
      )

      // Atomic conditional decrement — succeeds only if enough stock remains.
      // Runs inside whatever transaction the calling workflow has opened.
      const decrementStock = Effect.fn("ProductRepo.decrementStock")(
        function* (id: ProductId, quantity: number) {
          const rows = yield* sql`
            UPDATE products SET stock = stock - ${quantity}
            WHERE id = ${id} AND stock >= ${quantity}
            RETURNING stock`
          return rows.length > 0
        },
        Effect.orDie
      )

      return ProductRepo.of({
        findById: (id) => findById(id).pipe(Effect.orDie),
        list,
        listCategories: listCategories(undefined).pipe(Effect.orDie),
        findCategoryBySlug: (slug) => findCategoryBySlug(slug).pipe(Effect.orDie),
        decrementStock,
      })
    })
  )
}
