import { createServer } from "node:http"
import { HttpApiBuilder, HttpApiSwagger } from "@effect/platform"
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
import { Effect, Layer } from "effect"
import { AppConfig } from "./config.js"
import { Api } from "./http/api.js"
import { AuthLive, CartLive, CatalogLive, OrdersLive } from "./http/handlers.js"
import { AuthorizationLive } from "./http/security.js"
import { CartRepo } from "./services/CartRepo.js"
import { DatabaseLive } from "./services/Database.js"
import { IdGen } from "./services/IdGen.js"
import { OrderRepo } from "./services/OrderRepo.js"
import { PasswordHasher } from "./services/PasswordHasher.js"
import { ProductRepo } from "./services/ProductRepo.js"
import { SessionRepo } from "./services/SessionRepo.js"
import { UserRepo } from "./services/UserRepo.js"

// The ONLY place that knows concrete implementations — and the only run* site.

const AppServices = Layer.mergeAll(
  UserRepo.Default,
  SessionRepo.Default,
  ProductRepo.Default,
  CartRepo.Default,
  OrderRepo.Default,
  PasswordHasher.Default,
  IdGen.Default
).pipe(Layer.provideMerge(DatabaseLive)) // exposes SqlClient too (checkout transaction)

const ApiLive = HttpApiBuilder.api(Api).pipe(
  Layer.provide(Layer.mergeAll(AuthLive, CatalogLive, CartLive, OrdersLive)),
  Layer.provide(AuthorizationLive),
  Layer.provide(AppServices)
)

const ServerLive = Layer.unwrapEffect(
  Effect.gen(function* () {
    const port = yield* AppConfig.port
    return HttpApiBuilder.serve().pipe(
      Layer.provide(HttpApiSwagger.layer()),
      Layer.provide(ApiLive),
      Layer.provide(NodeHttpServer.layer(createServer, { port }))
    )
  })
)

Layer.launch(ServerLive).pipe(NodeRuntime.runMain)
