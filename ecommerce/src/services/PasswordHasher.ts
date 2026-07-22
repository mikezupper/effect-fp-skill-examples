import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto"
import { Effect, Redacted } from "effect"
import { PasswordHash, type Password } from "../domain/user.js"

// Interop edge: node:crypto wrapped once, behind a tag. scryptSync only throws on
// programmer error (bad params) — a defect, so Effect.sync is correct here.
export class PasswordHasher extends Effect.Service<PasswordHasher>()("app/PasswordHasher", {
  succeed: {
    hash: (password: Password): Effect.Effect<PasswordHash> =>
      Effect.sync(() => {
        const salt = randomBytes(16).toString("hex")
        const hash = scryptSync(Redacted.value(password), salt, 32).toString("hex")
        return PasswordHash.make(`${salt}:${hash}`)
      }),

    verify: (password: Password, stored: PasswordHash): Effect.Effect<boolean> =>
      Effect.sync(() => {
        const [salt, expected] = stored.split(":")
        if (salt === undefined || expected === undefined) return false
        const actual = scryptSync(Redacted.value(password), salt, 32).toString("hex")
        return (
          actual.length === expected.length &&
          timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected, "hex"))
        )
      }),
  },
}) {}
