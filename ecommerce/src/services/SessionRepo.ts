import { Context, DateTime, Effect, Layer, Option, Schema } from "effect"
import { SqlClient, SqlSchema } from "effect/sql"
import { User, UserId } from "../domain/user.js"

export const SessionToken = Schema.String.pipe(Schema.brand("SessionToken"))
export type SessionToken = typeof SessionToken.Type

export class SessionRepo extends Context.Service<
  SessionRepo,
  {
    readonly create: (token: SessionToken, userId: UserId) => Effect.Effect<void>
    readonly findUser: (token: SessionToken) => Effect.Effect<Option.Option<User>>
  }
>()("app/SessionRepo") {
  static readonly layer = Layer.effect(
    SessionRepo,
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient

      const findUser = SqlSchema.findOneOption({
        Request: SessionToken,
        Result: User,
        execute: (token) => sql`
          SELECT u.* FROM users u
          JOIN sessions s ON s.user_id = u.id
          WHERE s.token = ${token}`,
      })

      const create = Effect.fn("SessionRepo.create")(
        function* (token: SessionToken, userId: UserId) {
          const now = yield* DateTime.now
          yield* sql`INSERT INTO sessions (token, user_id, created_at)
                     VALUES (${token}, ${userId}, ${DateTime.formatIso(now)})`
        },
        Effect.orDie
      )

      return SessionRepo.of({
        create,
        findUser: (token) => findUser(token).pipe(Effect.orDie),
      })
    })
  )
}
