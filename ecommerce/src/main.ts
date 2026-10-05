import { createServer } from "node:http"
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
import { Effect, Layer } from "effect"
import { HttpRouter } from "effect/http"
import { HttpApiBuilder, HttpApiSwagger } from "effect/http-api"
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
  UserRepo.layer,
  SessionRepo.layer,
  ProductRepo.layer,
  CartRepo.layer,
  OrderRepo.layer,
  PasswordHasher.layer,
  IdGen.layer
).pipe(Layer.provideMerge(DatabaseLive)) // exposes SqlClient too (checkout transaction)

const ApiRoutes = HttpApiBuilder.layer(Api, { openapiPath: "/openapi.json" }).pipe(
  Layer.provide([AuthLive, CatalogLive, CartLive, OrdersLive]),
  // Provided to the API layer itself (not just the handler groups): the router resolves
  // the middleware when it builds the routes.
  Layer.provide(AuthorizationLive),
  Layer.provide(AppServices)
)

const DocsRoute = HttpApiSwagger.layer(Api, { path: "/docs" })

const ServerLive = Layer.unwrap(
  Effect.gen(function* () {
    const port = yield* AppConfig.port
    return HttpRouter.serve(Layer.mergeAll(ApiRoutes, DocsRoute)).pipe(
      Layer.provide(NodeHttpServer.layer(createServer, { port }))
    )
  })
)

Layer.launch(ServerLive).pipe(NodeRuntime.runMain)
