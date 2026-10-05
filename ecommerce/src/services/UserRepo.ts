import { Context, Effect, Layer, Option } from "effect"
import { SqlClient, SqlSchema } from "effect/sql"
import { Email, User, UserId } from "../domain/user.js"

// Repos: rows decoded by Schema at the DB boundary; SQL/decode failures are defects
// (schema and DDL are owned together — a mismatch is a bug, not a domain outcome).
// Repos return Option for absence; workflows decide whether absence is an error.
// Repos NEVER open transactions — workflows own that boundary.
export class UserRepo extends Context.Service<
  UserRepo,
  {
    readonly findByEmail: (email: Email) => Effect.Effect<Option.Option<User>>
    readonly findById: (id: UserId) => Effect.Effect<Option.Option<User>>
    readonly insert: (user: User) => Effect.Effect<void>
  }
>()("app/UserRepo") {
  static readonly layer = Layer.effect(
    UserRepo,
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient

      const findByEmail = SqlSchema.findOneOption({
        Request: Email,
        Result: User,
        execute: (email) => sql`SELECT * FROM users WHERE email = ${email}`,
      })

      const findById = SqlSchema.findOneOption({
        Request: UserId,
        Result: User,
        execute: (id) => sql`SELECT * FROM users WHERE id = ${id}`,
      })

      const insert = SqlSchema.void({
        Request: User,
        execute: (user) => sql`INSERT INTO users ${sql.insert(user)}`,
      })

      return UserRepo.of({
        findByEmail: (email) => findByEmail(email).pipe(Effect.orDie),
        findById: (id) => findById(id).pipe(Effect.orDie),
        insert: (user) => insert(user).pipe(Effect.orDie),
      })
    })
  )
}
