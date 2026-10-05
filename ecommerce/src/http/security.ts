import { Context, Effect, Layer, Option, Redacted, Schema } from "effect"
import { HttpApiMiddleware, HttpApiSecurity } from "effect/http-api"
import type { Email, UserId } from "../domain/user.js"
import { SessionRepo, SessionToken } from "../services/SessionRepo.js"

// HTTP-specific error (401 baked into the schema) — lives in the adapter, not the domain.
export class Unauthorized extends Schema.TaggedError<Unauthorized>()(
  "Unauthorized",
  {},
  { httpApiStatus: 401 }
) {}

export class CurrentUser extends Context.Service<
  CurrentUser,
  { readonly userId: UserId; readonly email: Email }
>()("http/CurrentUser") {}

// Endpoints tagged with this middleware cannot be wired without an auth implementation,
// and their handlers get CurrentUser in context — enforced at compile time.
export class Authorization extends HttpApiMiddleware.Service<
  Authorization,
  { provides: CurrentUser }
>()("http/Authorization", {
  error: Unauthorized,
  security: { bearer: HttpApiSecurity.bearer },
}) {}

export const AuthorizationLive = Layer.effect(
  Authorization,
  Effect.gen(function* () {
    const sessions = yield* SessionRepo
    return Authorization.of({
      // The middleware wraps the endpoint effect: authenticate, then provide CurrentUser.
      bearer: Effect.fn("Authorization.bearer")(function* (httpEffect, { credential }) {
        const user = yield* sessions.findUser(SessionToken.make(Redacted.value(credential)))
        if (Option.isNone(user)) {
          return yield* new Unauthorized()
        }
        return yield* Effect.provideService(httpEffect, CurrentUser, {
          userId: user.value.id,
          email: user.value.email,
        })
      }),
    })
  })
)
