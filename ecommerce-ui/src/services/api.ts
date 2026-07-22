import { isServer } from "lit"
import type {
  ApiErrorTag,
  AuthSessionDto,
  CartViewDto,
  CategoryTree,
  OrderDto,
  ProductDto,
} from "./types.js"

// Browser goes through the Vite proxy (/api → :3001); SSR talks to the backend directly.
const base = isServer ? (process.env["API_URL"] ?? "http://localhost:3001") : "/api"

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly tag: ApiErrorTag | "Unknown",
    readonly body: unknown
  ) {
    super(`${tag} (${status})`)
  }
}

interface Options {
  method?: string
  body?: unknown
  token?: string
}

async function request<T>(path: string, options: Options = {}): Promise<T> {
  const res = await fetch(base + path, {
    method: options.method ?? "GET",
    headers: {
      ...(options.body !== undefined && { "content-type": "application/json" }),
      ...(options.token !== undefined && { authorization: `Bearer ${options.token}` }),
    },
    ...(options.body !== undefined && { body: JSON.stringify(options.body) }),
  })
  if (!res.ok) {
    const body: unknown = await res.json().catch(() => null)
    const tag =
      body !== null && typeof body === "object" && "_tag" in body
        ? (body._tag as ApiErrorTag)
        : "Unknown"
    throw new ApiError(res.status, tag, body)
  }
  return res.json() as Promise<T>
}

export const api = {
  categories: () => request<ReadonlyArray<CategoryTree>>("/catalog/categories"),

  products: (query: { search?: string; category?: string }) => {
    const params = new URLSearchParams()
    if (query.search) params.set("search", query.search)
    if (query.category) params.set("category", query.category)
    const qs = params.toString()
    return request<ReadonlyArray<ProductDto>>(`/catalog/products${qs ? `?${qs}` : ""}`)
  },

  product: (id: string) => request<ProductDto>(`/catalog/products/${id}`),

  register: (email: string, password: string) =>
    request<AuthSessionDto>("/auth/register", { method: "POST", body: { email, password } }),

  login: (email: string, password: string) =>
    request<AuthSessionDto>("/auth/login", { method: "POST", body: { email, password } }),

  cart: (token: string) => request<CartViewDto>("/cart", { token }),

  setCartItem: (token: string, productId: string, quantity: number) =>
    request<CartViewDto>("/cart/items", { method: "PUT", body: { productId, quantity }, token }),

  removeCartItem: (token: string, productId: string) =>
    request<CartViewDto>(`/cart/items/${productId}`, { method: "DELETE", token }),

  checkout: (token: string) => request<OrderDto>("/orders", { method: "POST", token }),

  orders: (token: string) => request<ReadonlyArray<OrderDto>>("/orders", { token }),
}
