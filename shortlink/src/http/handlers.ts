import { Duration, Effect, Option } from "effect"
import { HttpApiBuilder } from "effect/http-api"
import type { LinkRepo } from "../services/LinkRepo.js"
import { createLink, resolveLink } from "../workflows/links.js"
import { Api } from "./api.js"

// Handlers are thin: shape the decoded payload into a command, call the workflow.
// The compiler enforces that every declared endpoint is handled and every error the
// workflow can produce is declared on the endpoint.
//
// Capabilities are captured once, when the group Layer is built, and provided to each
// request. (A requirement left in a handler would become a per-request
// `HttpRouter.Request<"Requires", _>` that Layer.provide cannot satisfy.)
export const LinksLive = HttpApiBuilder.group(
  Api,
  "links",
  Effect.fn(function* (handlers) {
    const capabilities = yield* Effect.context<LinkRepo>()
    return handlers
      .handle("createLink", ({ payload }) =>
        createLink({
          target: payload.url,
          slug: payload.slug,
          ttl: Option.map(payload.ttlSeconds, Duration.seconds),
        }).pipe(Effect.provideContext(capabilities))
      )
      .handle("resolveLink", ({ params }) =>
        resolveLink(params.slug).pipe(Effect.provideContext(capabilities))
      )
  })
)
