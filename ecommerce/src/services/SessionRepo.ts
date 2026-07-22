import { SqlClient, SqlSchema } from "@effect/sql"
import { DateTime, Effect, Option, Schema } from "effect"
import { User, UserId } from "../domain/user.js"

export const SessionToken = Schema.String.pipe(Schema.brand("SessionToken"))
export type SessionToken = typeof SessionToken.Type

export class SessionRepo extends Effect.Service<SessionRepo>()("app/SessionRepo", {
  effect: Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient

    const findUser = SqlSchema.findOne({
      Request: SessionToken,
      Result: User,
      execute: (token) => sql`
        SELECT u.* FROM users u
        JOIN sessions s ON s.user_id = u.id
        WHERE s.token = ${token}`,
    })

    return {
      create: (token: SessionToken, userId: UserId): Effect.Effect<void> =>
        Effect.gen(function* () {
          const now = yield* DateTime.now
          yield* sql`INSERT INTO sessions (token, user_id, created_at)
                     VALUES (${token}, ${userId}, ${DateTime.formatIso(now)})`
        }).pipe(Effect.orDie),

      findUser: (token: SessionToken): Effect.Effect<Option.Option<User>> =>
        findUser(token).pipe(Effect.orDie),
    } as const
  }),
}) {}
