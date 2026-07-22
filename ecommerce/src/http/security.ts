import { HttpApiMiddleware, HttpApiSchema, HttpApiSecurity } from "@effect/platform"
import { Context, Effect, Layer, Option, Redacted, Schema } from "effect"
import type { Email, UserId } from "../domain/user.js"
import { SessionRepo, SessionToken } from "../services/SessionRepo.js"

// HTTP-specific error (401 baked into the schema) — lives in the adapter, not the domain.
export class Unauthorized extends Schema.TaggedError<Unauthorized>()(
  "Unauthorized",
  {},
  HttpApiSchema.annotations({ status: 401 })
) {}

export class CurrentUser extends Context.Tag("http/CurrentUser")<
  CurrentUser,
  { readonly userId: UserId; readonly email: Email }
>() {}

// Endpoints tagged with this middleware cannot be wired without an auth implementation,
// and their handlers get CurrentUser in context — enforced at compile time.
export class Authorization extends HttpApiMiddleware.Tag<Authorization>()(
  "http/Authorization",
  {
    failure: Unauthorized,
    provides: CurrentUser,
    security: { bearer: HttpApiSecurity.bearer },
  }
) {}

export const AuthorizationLive = Layer.effect(
  Authorization,
  Effect.gen(function* () {
    const sessions = yield* SessionRepo
    return {
      bearer: (token: Redacted.Redacted<string>) =>
        sessions.findUser(SessionToken.make(Redacted.value(token))).pipe(
          Effect.flatMap(
            Option.match({
              onNone: () => new Unauthorized(),
              onSome: (user) =>
                Effect.succeed({ userId: user.id, email: user.email }),
            })
          )
        ),
    }
  })
)
