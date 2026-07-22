import { computed, signal } from "@lit-labs/signals"
import { api, ApiError } from "../services/api.js"
import type { CartViewDto, OrderDto } from "../services/types.js"
import { session } from "./session.js"

export const cart = signal<CartViewDto | null>(null)
export const cartOpen = signal(false)
export const cartCount = computed(() =>
  (cart.get()?.lines ?? []).reduce((sum, line) => sum + line.quantity, 0)
)

// Mutations return the fresh CartView from the backend — the signal is always
// the server's truth, never an optimistic local copy.

export async function refreshCart(): Promise<void> {
  const s = session.get()
  cart.set(s === null ? null : await api.cart(s.token))
}

export async function setItem(productId: string, quantity: number): Promise<void> {
  const s = session.get()
  if (s === null) return
  cart.set(await api.setCartItem(s.token, productId, quantity))
}

export async function addToCart(productId: string, quantity = 1): Promise<void> {
  const existing = cart.get()?.lines.find((l) => l.product.id === productId)
  await setItem(productId, Math.min(99, (existing?.quantity ?? 0) + quantity))
}

export async function removeItem(productId: string): Promise<void> {
  const s = session.get()
  if (s === null) return
  cart.set(await api.removeCartItem(s.token, productId))
}

export type CheckoutResult =
  | { readonly kind: "placed"; readonly order: OrderDto }
  | { readonly kind: "failed"; readonly reason: string }

export async function checkout(): Promise<CheckoutResult> {
  const s = session.get()
  if (s === null) return { kind: "failed", reason: "Sign in to check out." }
  try {
    const order = await api.checkout(s.token)
    await refreshCart()
    return { kind: "placed", order }
  } catch (error) {
    if (error instanceof ApiError && error.tag === "InsufficientStock") {
      const body = error.body as { requested: number; available: number }
      return {
        kind: "failed",
        reason: `Not enough stock: wanted ${body.requested}, only ${body.available} left.`,
      }
    }
    if (error instanceof ApiError && error.tag === "CartEmpty") {
      return { kind: "failed", reason: "Your cart is empty." }
    }
    throw error
  }
}
