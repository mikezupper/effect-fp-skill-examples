import { DateTime, Effect, Option, Schema } from "effect"
import { EmailTaken, InvalidCredentials } from "../domain/errors.js"
import { Email, Password, User, UserId } from "../domain/user.js"
import { IdGen } from "../services/IdGen.js"
import { PasswordHasher } from "../services/PasswordHasher.js"
import { SessionRepo, SessionToken } from "../services/SessionRepo.js"
import { UserRepo } from "../services/UserRepo.js"

export class AuthSession extends Schema.Class<AuthSession>("AuthSession")({
  token: SessionToken,
  userId: UserId,
  email: Email,
}) {}

const startSession = (user: User) =>
  Effect.gen(function* () {
    const ids = yield* IdGen
    const sessions = yield* SessionRepo
    const token = SessionToken.make(yield* ids.next)
    yield* sessions.create(token, user.id)
    return new AuthSession({ token, userId: user.id, email: user.email })
  })

export const register = (
  email: Email,
  password: Password
): Effect.Effect<AuthSession, EmailTaken, UserRepo | SessionRepo | PasswordHasher | IdGen> =>
  Effect.gen(function* () {
    const users = yield* UserRepo
    const hasher = yield* PasswordHasher
    const ids = yield* IdGen

    const existing = yield* users.findByEmail(email)
    if (Option.isSome(existing)) {
      return yield* new EmailTaken({ email })
    }

    const user = new User({
      id: UserId.make(yield* ids.next),
      email,
      passwordHash: yield* hasher.hash(password),
      createdAt: yield* DateTime.now,
    })
    yield* users.insert(user)
    yield* Effect.logInfo("user registered").pipe(Effect.annotateLogs({ userId: user.id }))
    return yield* startSession(user)
  }).pipe(Effect.withSpan("Auth.register"))

export const login = (
  email: Email,
  password: Password
): Effect.Effect<AuthSession, InvalidCredentials, UserRepo | SessionRepo | PasswordHasher | IdGen> =>
  Effect.gen(function* () {
    const users = yield* UserRepo
    const hasher = yield* PasswordHasher

    const user = yield* users.findByEmail(email).pipe(
      Effect.flatMap(
        Option.match({
          onNone: () => new InvalidCredentials(), // same error as bad password — no enumeration
          onSome: Effect.succeed,
        })
      )
    )
    const valid = yield* hasher.verify(password, user.passwordHash)
    if (!valid) {
      return yield* new InvalidCredentials()
    }
    return yield* startSession(user)
  }).pipe(Effect.withSpan("Auth.login"))
