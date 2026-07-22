import { HttpApiBuilder } from "@effect/platform"
import { Duration, Option } from "effect"
import { createLink, resolveLink } from "../workflows/links.js"
import { Api } from "./api.js"

// Handlers are thin: shape the decoded payload into a command, call the workflow.
// The compiler enforces that every declared endpoint is handled and every declared
// error is actually producible by the workflow's error channel.
export const LinksLive = HttpApiBuilder.group(Api, "links", (handlers) =>
  handlers
    .handle("createLink", ({ payload }) =>
      createLink({
        target: payload.url,
        slug: payload.slug,
        ttl: Option.map(payload.ttlSeconds, Duration.seconds),
      })
    )
    .handle("resolveLink", ({ path }) => resolveLink(path.slug))
)
