import { HttpApi, HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from "@effect/platform"
import { Schema } from "effect"
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

const Credentials = Schema.Struct({ email: Email, password: Password })

const AuthGroup = HttpApiGroup.make("auth")
  .add(
    HttpApiEndpoint.post("register", "/auth/register")
      .setPayload(Credentials)
      .addSuccess(AuthSession, { status: 201 })
      .addError(EmailTaken, { status: 409 })
  )
  .add(
    HttpApiEndpoint.post("login", "/auth/login")
      .setPayload(Credentials)
      .addSuccess(AuthSession)
      .addError(InvalidCredentials, { status: 401 })
  )

const CatalogGroup = HttpApiGroup.make("catalog")
  .add(
    HttpApiEndpoint.get("categories", "/catalog/categories")
      .addSuccess(Schema.Array(CategoryTree))
  )
  .add(
    HttpApiEndpoint.get("products", "/catalog/products")
      .setUrlParams(
        Schema.Struct({
          search: Schema.optionalWith(Schema.String, { as: "Option" }),
          category: Schema.optionalWith(Schema.String, { as: "Option" }),
        })
      )
      .addSuccess(Schema.Array(Product))
  )
  .add(
    HttpApiEndpoint.get("product")`/catalog/products/${HttpApiSchema.param("id", ProductId)}`
      .addSuccess(Product)
      .addError(ProductNotFound, { status: 404 })
  )

const CartGroup = HttpApiGroup.make("cart")
  .add(HttpApiEndpoint.get("getCart", "/cart").addSuccess(CartView))
  .add(
    HttpApiEndpoint.put("setItem", "/cart/items")
      .setPayload(Schema.Struct({ productId: ProductId, quantity: Quantity }))
      .addSuccess(CartView)
      .addError(ProductNotFound, { status: 404 })
  )
  .add(
    HttpApiEndpoint.del("removeItem")`/cart/items/${HttpApiSchema.param("productId", ProductId)}`
      .addSuccess(CartView)
  )
  .middleware(Authorization)

const OrdersGroup = HttpApiGroup.make("orders")
  .add(
    HttpApiEndpoint.post("checkout", "/orders")
      .addSuccess(Order, { status: 201 })
      .addError(CartEmpty, { status: 409 })
      .addError(InsufficientStock, { status: 409 })
  )
  .add(HttpApiEndpoint.get("history", "/orders").addSuccess(Schema.Array(Order)))
  .add(
    HttpApiEndpoint.get("getOrder")`/orders/${HttpApiSchema.param("id", OrderId)}`
      .addSuccess(Order)
      .addError(OrderNotFound, { status: 404 })
  )
  .middleware(Authorization)

export const Api = HttpApi.make("ecommerce")
  .add(AuthGroup)
  .add(CatalogGroup)
  .add(CartGroup)
  .add(OrdersGroup)
