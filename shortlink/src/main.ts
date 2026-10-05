import { createServer } from "node:http"
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
import { Effect, Layer } from "effect"
import { HttpRouter } from "effect/http"
import { HttpApiBuilder, HttpApiSwagger } from "effect/http-api"
import { AppConfig } from "./config.js"
import { Api } from "./http/api.js"
import { LinksLive } from "./http/handlers.js"
import { LinkRepo } from "./services/LinkRepo.js"

// The ONLY place that knows concrete implementations — and the only run* site.
const ApiRoutes = HttpApiBuilder.layer(Api, { openapiPath: "/openapi.json" }).pipe(
  Layer.provide(LinksLive),
  Layer.provide(LinkRepo.layerMemory)
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
