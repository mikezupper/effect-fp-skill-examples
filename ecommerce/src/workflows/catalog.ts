import { Effect, Option } from "effect"
import { buildCategoryTree, type CategoryTree, Product, ProductId } from "../domain/catalog.js"
import { ProductNotFound } from "../domain/errors.js"
import { ProductRepo } from "../services/ProductRepo.js"

export const categoryNavigation = Effect.fn("Catalog.categoryNavigation")(
  function* (): Effect.fn.Return<ReadonlyArray<CategoryTree>, never, ProductRepo> {
    const repo = yield* ProductRepo
    const categories = yield* repo.listCategories
    return buildCategoryTree(categories) // pure
  }
)

export interface BrowseQuery {
  readonly search: Option.Option<string>
  readonly categorySlug: Option.Option<string>
}

export const browseProducts = Effect.fn("Catalog.browseProducts")(function* (
  query: BrowseQuery
): Effect.fn.Return<ReadonlyArray<Product>, never, ProductRepo> {
  const repo = yield* ProductRepo
  // Unknown category slug → empty result, not an error: browsing is forgiving.
  const categoryId = yield* Option.match(query.categorySlug, {
    onNone: () => Effect.succeedNone,
    onSome: (slug) => repo.findCategoryBySlug(slug).pipe(Effect.map(Option.map((c) => c.id))),
  })
  if (Option.isSome(query.categorySlug) && Option.isNone(categoryId)) {
    return []
  }
  return yield* repo.list({ search: query.search, categoryId })
})

export const getProduct = Effect.fn("Catalog.getProduct")(function* (
  id: ProductId
): Effect.fn.Return<Product, ProductNotFound, ProductRepo> {
  const repo = yield* ProductRepo
  const product = yield* repo.findById(id)
  if (Option.isNone(product)) {
    return yield* new ProductNotFound({ productId: id })
  }
  return product.value
})
