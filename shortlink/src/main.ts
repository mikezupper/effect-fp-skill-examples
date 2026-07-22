import { createServer } from "node:http"
import { HttpApiBuilder, HttpApiSwagger } from "@effect/platform"
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
import { Effect, Layer } from "effect"
import { AppConfig } from "./config.js"
import { Api } from "./http/api.js"
import { LinksLive } from "./http/handlers.js"
import { LinkRepo } from "./services/LinkRepo.js"

// The ONLY place that knows concrete implementations — and the only run* site.
const ApiLive = HttpApiBuilder.api(Api).pipe(
  Layer.provide(LinksLive),
  Layer.provide(LinkRepo.Default)
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
