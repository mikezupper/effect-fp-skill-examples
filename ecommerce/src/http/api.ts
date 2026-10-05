import { Schema } from "effect"
import { HttpApi, HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from "effect/http-api"
import { CartView, Quantity } from "../domain/cart.js"
import { CategoryTree, Product, ProductId } from "../domain/catalog.js"
import {
  CartEmpty,
  EmailTaken,
  InsufficientStock,
  InvalidCredentials,
  OrderNotFound,
  ProductNotFound,
} from "../domain/errors.js"
import { Order, OrderId } from "../domain/order.js"
import { Email, Password } from "../domain/user.js"
import { AuthSession } from "../workflows/auth.js"
import { Authorization } from "./security.js"

// Status codes are an HTTP concern, so they are attached HERE (HttpApiSchema.status),
// not on the domain error classes.
const Credentials = Schema.Struct({ email: Email, password: Password })

const AuthGroup = HttpApiGroup.make("auth").add(
  HttpApiEndpoint.post("register", "/auth/register", {
    payload: Credentials,
    success: AuthSession.pipe(HttpApiSchema.status(201)),
    error: EmailTaken.pipe(HttpApiSchema.status(409)),
  }),
  HttpApiEndpoint.post("login", "/auth/login", {
    payload: Credentials,
    success: AuthSession,
    error: InvalidCredentials.pipe(HttpApiSchema.status(401)),
  })
)

const CatalogGroup = HttpApiGroup.make("catalog").add(
  HttpApiEndpoint.get("categories", "/catalog/categories", {
    success: Schema.Array(CategoryTree),
  }),
  HttpApiEndpoint.get("products", "/catalog/products", {
    query: {
      search: Schema.OptionFromOptionalKey(Schema.String),
      category: Schema.OptionFromOptionalKey(Schema.String),
    },
    success: Schema.Array(Product),
  }),
  HttpApiEndpoint.get("product", "/catalog/products/:id", {
    params: { id: ProductId },
    success: Product,
    error: ProductNotFound.pipe(HttpApiSchema.status(404)),
  })
)

const CartGroup = HttpApiGroup.make("cart")
  .add(
    HttpApiEndpoint.get("getCart", "/cart", { success: CartView }),
    HttpApiEndpoint.put("setItem", "/cart/items", {
      payload: Schema.Struct({ productId: ProductId, quantity: Quantity }),
      success: CartView,
      error: ProductNotFound.pipe(HttpApiSchema.status(404)),
    }),
    HttpApiEndpoint.delete("removeItem", "/cart/items/:productId", {
      params: { productId: ProductId },
      success: CartView,
    })
  )
  .middleware(Authorization)

const OrdersGroup = HttpApiGroup.make("orders")
  .add(
    HttpApiEndpoint.post("checkout", "/orders", {
      success: Order.pipe(HttpApiSchema.status(201)),
      error: [
        CartEmpty.pipe(HttpApiSchema.status(409)),
        InsufficientStock.pipe(HttpApiSchema.status(409)),
      ],
    }),
    HttpApiEndpoint.get("history", "/orders", { success: Schema.Array(Order) }),
    HttpApiEndpoint.get("getOrder", "/orders/:id", {
      params: { id: OrderId },
      success: Order,
      error: OrderNotFound.pipe(HttpApiSchema.status(404)),
    })
  )
  .middleware(Authorization)

export class Api extends HttpApi.make("ecommerce")
  .add(AuthGroup)
  .add(CatalogGroup)
  .add(CartGroup)
  .add(OrdersGroup) {}
