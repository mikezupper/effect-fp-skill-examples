import { Effect, Option } from "effect"
import { CartView, makeCartView, Quantity } from "../domain/cart.js"
import { ProductId } from "../domain/catalog.js"
import { ProductNotFound } from "../domain/errors.js"
import { UserId } from "../domain/user.js"
import { CartRepo } from "../services/CartRepo.js"
import { ProductRepo } from "../services/ProductRepo.js"

export const getCart = (userId: UserId): Effect.Effect<CartView, never, CartRepo> =>
  Effect.gen(function* () {
    const carts = yield* CartRepo
    const items = yield* carts.items(userId)
    return makeCartView(items) // pure pricing
  }).pipe(Effect.withSpan("Cart.getCart"))

export const setCartItem = (
  userId: UserId,
  productId: ProductId,
  quantity: Quantity
): Effect.Effect<CartView, ProductNotFound, CartRepo | ProductRepo> =>
  Effect.gen(function* () {
    const products = yield* ProductRepo
    const carts = yield* CartRepo
    const product = yield* products.findById(productId)
    if (Option.isNone(product)) {
      return yield* new ProductNotFound({ productId })
    }
    yield* carts.setItem(userId, productId, quantity)
    return yield* getCart(userId)
  }).pipe(Effect.withSpan("Cart.setCartItem"))

export const removeCartItem = (
  userId: UserId,
  productId: ProductId
): Effect.Effect<CartView, never, CartRepo> =>
  Effect.gen(function* () {
    const carts = yield* CartRepo
    yield* carts.removeItem(userId, productId)
    return yield* getCart(userId)
  }).pipe(Effect.withSpan("Cart.removeCartItem"))
