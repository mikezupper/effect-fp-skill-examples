import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer, Option, Redacted, Schema } from "effect"
import { Quantity } from "../src/domain/cart.js"
import { ProductId } from "../src/domain/catalog.js"
import { Email } from "../src/domain/user.js"
import { login, register } from "../src/workflows/auth.js"
import { getCart, setCartItem } from "../src/workflows/cart.js"
import { browseProducts, categoryNavigation } from "../src/workflows/catalog.js"
import { checkout, getOrder, orderHistory } from "../src/workflows/orders.js"
import { CartRepo } from "../src/services/CartRepo.js"
import { MigrationsLive, sqlTransforms } from "../src/services/Database.js"
import { IdGen } from "../src/services/IdGen.js"
import { OrderRepo } from "../src/services/OrderRepo.js"
import { PasswordHasher } from "../src/services/PasswordHasher.js"
import { ProductRepo } from "../src/services/ProductRepo.js"
import { SessionRepo } from "../src/services/SessionRepo.js"
import { UserRepo } from "../src/services/UserRepo.js"
import { SqliteClient } from "@effect/sql-sqlite-node"

// Fresh in-memory database per test — same repos, different SqlClient layer. No mocks.
const TestLayer = Layer.mergeAll(
  UserRepo.Default,
  SessionRepo.Default,
  ProductRepo.Default,
  CartRepo.Default,
  OrderRepo.Default,
  PasswordHasher.Default,
  IdGen.Default
).pipe(
  Layer.provideMerge(MigrationsLive),
  Layer.provideMerge(SqliteClient.layer({ filename: ":memory:", ...sqlTransforms }))
)

const email = Schema.decodeSync(Email)("shopper@example.com")
const password = Redacted.make("correct horse battery staple")
const laptopPro = ProductId.make("p-laptop-pro") // seeded with stock 5
const headphones = ProductId.make("p-headphones") // seeded with stock 3
const qty = (n: number) => Schema.decodeSync(Quantity)(n)

describe("auth", () => {
  it.effect("register then login round-trips", () =>
    Effect.gen(function* () {
      yield* register(email, password)
      const session = yield* login(email, password)
      assert.strictEqual(session.email, email)
      assert.isString(session.token)
    }).pipe(Effect.provide(TestLayer))
  )

  it.effect("duplicate registration fails with EmailTaken", () =>
    Effect.gen(function* () {
      yield* register(email, password)
      const failure = yield* register(email, password).pipe(Effect.flip)
      assert.strictEqual(failure._tag, "EmailTaken")
    }).pipe(Effect.provide(TestLayer))
  )

  it.effect("wrong password and unknown email both fail with InvalidCredentials", () =>
    Effect.gen(function* () {
      yield* register(email, password)
      const wrongPassword = yield* login(email, Redacted.make("wrong password!")).pipe(Effect.flip)
      const unknownEmail = yield* login(
        Schema.decodeSync(Email)("nobody@example.com"),
        password
      ).pipe(Effect.flip)
      assert.strictEqual(wrongPassword._tag, "InvalidCredentials")
      assert.strictEqual(unknownEmail._tag, "InvalidCredentials")
    }).pipe(Effect.provide(TestLayer))
  )
})

describe("catalog", () => {
  it.effect("category navigation nests children under parents", () =>
    Effect.gen(function* () {
      const tree = yield* categoryNavigation()
      const electronics = tree.find((n) => n.slug === "electronics")
      assert.isDefined(electronics)
      assert.sameMembers(
        electronics.children.map((c) => c.slug),
        ["laptops", "audio"]
      )
    }).pipe(Effect.provide(TestLayer))
  )

  it.effect("search and category filters compose", () =>
    Effect.gen(function* () {
      const laptops = yield* browseProducts({
        search: Option.some("Pro"),
        categorySlug: Option.some("laptops"),
      })
      assert.strictEqual(laptops.length, 1)
      assert.strictEqual(laptops[0]?.id, laptopPro)
      const unknownCategory = yield* browseProducts({
        search: Option.none(),
        categorySlug: Option.some("no-such-category"),
      })
      assert.strictEqual(unknownCategory.length, 0)
    }).pipe(Effect.provide(TestLayer))
  )
})

describe("cart and checkout", () => {
  const registeredUser = register(email, password).pipe(Effect.map((s) => s.userId))

  it.effect("checkout converts the cart into an order and clears it", () =>
    Effect.gen(function* () {
      const userId = yield* registeredUser
      yield* setCartItem(userId, laptopPro, qty(2))
      yield* setCartItem(userId, headphones, qty(1))

      const order = yield* checkout(userId)
      assert.strictEqual(order.totalCents, 2 * 199900 + 34900)
      assert.strictEqual(order.lines.length, 2)

      // cart cleared, stock decremented, order in history
      const cart = yield* getCart(userId)
      assert.strictEqual(cart.lines.length, 0)
      const products = yield* ProductRepo
      const laptop = yield* products.findById(laptopPro)
      assert.strictEqual(Option.getOrThrow(laptop).stock, 3)
      const history = yield* orderHistory(userId)
      assert.strictEqual(history.length, 1)
      const fetched = yield* getOrder(userId, order.id)
      assert.strictEqual(fetched.id, order.id)
    }).pipe(Effect.provide(TestLayer))
  )

  it.effect("checkout of an empty cart fails with CartEmpty", () =>
    Effect.gen(function* () {
      const userId = yield* registeredUser
      const failure = yield* checkout(userId).pipe(Effect.flip)
      assert.strictEqual(failure._tag, "CartEmpty")
    }).pipe(Effect.provide(TestLayer))
  )

  it.effect("insufficient stock rolls back the whole checkout atomically", () =>
    Effect.gen(function* () {
      const userId = yield* registeredUser
      yield* setCartItem(userId, laptopPro, qty(2)) // in stock (5)
      yield* setCartItem(userId, headphones, qty(50)) // NOT in stock (3)

      const failure = yield* checkout(userId).pipe(Effect.flip)
      assert.strictEqual(failure._tag, "InsufficientStock")
      if (failure._tag === "InsufficientStock") {
        assert.strictEqual(failure.available, 3)
        assert.strictEqual(failure.requested, 50)
      }

      // THE atomicity assertion: the laptop decrement that succeeded mid-transaction
      // was rolled back; cart untouched; no order written.
      const products = yield* ProductRepo
      const laptop = yield* products.findById(laptopPro)
      assert.strictEqual(Option.getOrThrow(laptop).stock, 5)
      const cart = yield* getCart(userId)
      assert.strictEqual(cart.lines.length, 2)
      const history = yield* orderHistory(userId)
      assert.strictEqual(history.length, 0)
    }).pipe(Effect.provide(TestLayer))
  )

  it.effect("adding an unknown product fails with ProductNotFound", () =>
    Effect.gen(function* () {
      const userId = yield* registeredUser
      const failure = yield* setCartItem(userId, ProductId.make("p-nope"), qty(1)).pipe(
        Effect.flip
      )
      assert.strictEqual(failure._tag, "ProductNotFound")
    }).pipe(Effect.provide(TestLayer))
  )
})
