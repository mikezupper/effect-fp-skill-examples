import { Effect, Option } from "effect"
import { buildCategoryTree, type CategoryTree, Product, ProductId } from "../domain/catalog.js"
import { ProductNotFound } from "../domain/errors.js"
import { ProductRepo } from "../services/ProductRepo.js"

export const categoryNavigation = (): Effect.Effect<
  ReadonlyArray<CategoryTree>,
  never,
  ProductRepo
> =>
  Effect.gen(function* () {
    const repo = yield* ProductRepo
    const categories = yield* repo.listCategories()
    return buildCategoryTree(categories) // pure
  }).pipe(Effect.withSpan("Catalog.categoryNavigation"))

export interface BrowseQuery {
  readonly search: Option.Option<string>
  readonly categorySlug: Option.Option<string>
}

export const browseProducts = (
  query: BrowseQuery
): Effect.Effect<ReadonlyArray<Product>, never, ProductRepo> =>
  Effect.gen(function* () {
    const repo = yield* ProductRepo
    // Unknown category slug → empty result, not an error: browsing is forgiving.
    const categoryId = yield* Option.match(query.categorySlug, {
      onNone: () => Effect.succeed(Option.none()),
      onSome: (slug) =>
        repo.findCategoryBySlug(slug).pipe(Effect.map(Option.map((c) => c.id))),
    })
    if (Option.isSome(query.categorySlug) && Option.isNone(categoryId)) {
      return []
    }
    return yield* repo.list({ search: query.search, categoryId })
  }).pipe(Effect.withSpan("Catalog.browseProducts"))

export const getProduct = (
  id: ProductId
): Effect.Effect<Product, ProductNotFound, ProductRepo> =>
  Effect.gen(function* () {
    const repo = yield* ProductRepo
    return yield* repo.findById(id).pipe(
      Effect.flatMap(
        Option.match({
          onNone: () => new ProductNotFound({ productId: id }),
          onSome: Effect.succeed,
        })
      )
    )
  }).pipe(Effect.withSpan("Catalog.getProduct"))
