import { Array as Arr, Option, Schema } from "effect"

// ---------- Branded primitives ----------

export const ProductId = Schema.String.pipe(Schema.brand("ProductId"))
export type ProductId = typeof ProductId.Type

export const CategoryId = Schema.String.pipe(Schema.brand("CategoryId"))
export type CategoryId = typeof CategoryId.Type

export const Sku = Schema.String.pipe(Schema.brand("Sku"))
export type Sku = typeof Sku.Type

// Money as integer minor units — never floats for currency.
export const Cents = Schema.Int.pipe(Schema.nonNegative(), Schema.brand("Cents"))
export type Cents = typeof Cents.Type

// ---------- Domain records ----------

export class Category extends Schema.Class<Category>("Category")({
  id: CategoryId,
  name: Schema.NonEmptyTrimmedString,
  slug: Schema.NonEmptyTrimmedString,
  parentId: Schema.OptionFromNullOr(CategoryId),
}) {}

export class Product extends Schema.Class<Product>("Product")({
  id: ProductId,
  sku: Sku,
  name: Schema.NonEmptyTrimmedString,
  description: Schema.String,
  priceCents: Cents,
  categoryId: CategoryId,
  stock: Schema.Int.pipe(Schema.nonNegative()),
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
export const CategoryTree: Schema.Schema<CategoryTree> = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  slug: Schema.String,
  children: Schema.Array(Schema.suspend(() => CategoryTree)),
}).annotations({ identifier: "CategoryTree" }) // required for OpenAPI generation of recursive schemas

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
          ? Option.some(build(child))
          : Option.none()
      ),
    }
  }
  const isRoot = (c: Category): boolean =>
    Option.match(c.parentId, {
      onNone: () => true,
      onSome: (parent) => parent === c.id || !ids.has(parent),
    })
  const roots = Arr.filterMap(categories, (c) =>
    isRoot(c) ? Option.some(build(c)) : Option.none()
  )
  // Anything unreached is part of a cycle — graft it as a root.
  const grafted = Arr.filterMap(categories, (c) =>
    visited.has(c.id) ? Option.none() : Option.some(build(c))
  )
  return [...roots, ...grafted]
}
