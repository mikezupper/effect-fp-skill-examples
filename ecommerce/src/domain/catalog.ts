import { Array as Arr, Option, Result, Schema } from "effect"

// ---------- Branded primitives ----------

export const ProductId = Schema.String.pipe(Schema.brand("ProductId"))
export type ProductId = typeof ProductId.Type

export const CategoryId = Schema.String.pipe(Schema.brand("CategoryId"))
export type CategoryId = typeof CategoryId.Type

export const Sku = Schema.String.pipe(Schema.brand("Sku"))
export type Sku = typeof Sku.Type

// Money as integer minor units — never floats for currency.
export const Cents = Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)).pipe(Schema.brand("Cents"))
export type Cents = typeof Cents.Type

// Display text: non-empty with no surrounding whitespace (a check, not a transform —
// untrimmed input is rejected, never silently rewritten).
export const NonEmptyTrimmedString = Schema.Trimmed.check(Schema.isNonEmpty())

// ---------- Domain records ----------

export class Category extends Schema.Class<Category>("Category")({
  id: CategoryId,
  name: NonEmptyTrimmedString,
  slug: NonEmptyTrimmedString,
  parentId: Schema.OptionFromNullOr(CategoryId),
}) {}

export class Product extends Schema.Class<Product>("Product")({
  id: ProductId,
  sku: Sku,
  name: NonEmptyTrimmedString,
  description: Schema.String,
  priceCents: Cents,
  categoryId: CategoryId,
  stock: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
}) {}

// ---------- Category navigation (pure) ----------

// Wire/response shape: recursive tree. Plain strings here — this is the encoded
// boundary type, so recursion stays simple (Type = Encoded).
export interface CategoryTree {
  readonly id: string
  readonly name: string
  readonly slug: string
  readonly children: ReadonlyArray<CategoryTree>
}
export const CategoryTree: Schema.Codec<CategoryTree> = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  slug: Schema.String,
  children: Schema.Array(Schema.suspend(() => CategoryTree)),
}).annotate({ identifier: "CategoryTree" }) // required for OpenAPI generation of recursive schemas

// Pure and TOTAL: flat category list -> forest. Every input category appears exactly
// once. Missing parents make roots; cycle participants (self-parent, a↔b) are grafted
// as roots rather than silently dropped — found by property test, kept honest by it.
export const buildCategoryTree = (
  categories: ReadonlyArray<Category>
): ReadonlyArray<CategoryTree> => {
  const ids = new Set(categories.map((c) => c.id))
  const visited = new Set<string>() // contained local mutation for cycle breaking
  const build = (c: Category): CategoryTree => {
    visited.add(c.id)
    return {
      id: c.id,
      name: c.name,
      slug: c.slug,
      children: Arr.filterMap(categories, (child) =>
        !visited.has(child.id) &&
        Option.isSome(child.parentId) &&
        Option.getOrThrow(child.parentId) === c.id
          ? Result.succeed(build(child))
          : Result.failVoid
      ),
    }
  }
  const isRoot = (c: Category): boolean =>
    Option.match(c.parentId, {
      onNone: () => true,
      onSome: (parent) => parent === c.id || !ids.has(parent),
    })
  const roots = Arr.filterMap(categories, (c) =>
    isRoot(c) ? Result.succeed(build(c)) : Result.failVoid
  )
  // Anything unreached is part of a cycle — graft it as a root.
  const grafted = Arr.filterMap(categories, (c) =>
    visited.has(c.id) ? Result.failVoid : Result.succeed(build(c))
  )
  return [...roots, ...grafted]
}
