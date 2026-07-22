import { SqlClient, SqlSchema } from "@effect/sql"
import { Effect, Option } from "effect"
import { Email, User, UserId } from "../domain/user.js"

// Repos: rows decoded by Schema at the DB boundary; SQL/decode failures are defects
// (schema and DDL are owned together — a mismatch is a bug, not a domain outcome).
// Repos return Option for absence; workflows decide whether absence is an error.
// Repos NEVER open transactions — workflows own that boundary.
export class UserRepo extends Effect.Service<UserRepo>()("app/UserRepo", {
  effect: Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient

    const findByEmail = SqlSchema.findOne({
      Request: Email,
      Result: User,
      execute: (email) => sql`SELECT * FROM users WHERE email = ${email}`,
    })

    const findById = SqlSchema.findOne({
      Request: UserId,
      Result: User,
      execute: (id) => sql`SELECT * FROM users WHERE id = ${id}`,
    })

    const insert = SqlSchema.void({
      Request: User,
      execute: (user) => sql`INSERT INTO users ${sql.insert(user)}`,
    })

    return {
      findByEmail: (email: Email): Effect.Effect<Option.Option<User>> =>
        findByEmail(email).pipe(Effect.orDie),
      findById: (id: UserId): Effect.Effect<Option.Option<User>> =>
        findById(id).pipe(Effect.orDie),
      insert: (user: User): Effect.Effect<void> => insert(user).pipe(Effect.orDie),
    } as const
  }),
}) {}
