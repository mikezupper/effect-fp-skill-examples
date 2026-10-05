import { Effect, Option } from "effect"
import { CartView, makeCartView, Quantity } from "../domain/cart.js"
import { ProductId } from "../domain/catalog.js"
import { ProductNotFound } from "../domain/errors.js"
import { UserId } from "../domain/user.js"
import { CartRepo } from "../services/CartRepo.js"
import { ProductRepo } from "../services/ProductRepo.js"

export const getCart = Effect.fn("Cart.getCart")(function* (
  userId: UserId
): Effect.fn.Return<CartView, never, CartRepo> {
  const carts = yield* CartRepo
  const items = yield* carts.items(userId)
  return makeCartView(items) // pure pricing
})

export const setCartItem = Effect.fn("Cart.setCartItem")(function* (
  userId: UserId,
  productId: ProductId,
  quantity: Quantity
): Effect.fn.Return<CartView, ProductNotFound, CartRepo | ProductRepo> {
  const products = yield* ProductRepo
  const carts = yield* CartRepo
  const product = yield* products.findById(productId)
  if (Option.isNone(product)) {
    return yield* new ProductNotFound({ productId })
  }
  yield* carts.setItem(userId, productId, quantity)
  return yield* getCart(userId)
})

export const removeCartItem = Effect.fn("Cart.removeCartItem")(function* (
  userId: UserId,
  productId: ProductId
): Effect.fn.Return<CartView, never, CartRepo> {
  const carts = yield* CartRepo
  yield* carts.removeItem(userId, productId)
  return yield* getCart(userId)
})
