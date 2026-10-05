import { Schema } from "effect"

export const UserId = Schema.String.pipe(Schema.brand("UserId"))
export type UserId = typeof UserId.Type

export const Email = Schema.String.check(Schema.isPattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)).pipe(
  Schema.brand("Email")
)
export type Email = typeof Email.Type

// Plaintext passwords are Redacted end-to-end — they cannot be logged or interpolated.
// RedactedFromValue: a plain string on the wire, Redacted<string> once decoded.
export const Password = Schema.RedactedFromValue(Schema.String.check(Schema.isMinLength(8)))
export type Password = typeof Password.Type

export const PasswordHash = Schema.String.pipe(Schema.brand("PasswordHash"))
export type PasswordHash = typeof PasswordHash.Type

export class User extends Schema.Class<User>("User")({
  id: UserId,
  email: Email,
  passwordHash: PasswordHash,
  createdAt: Schema.DateTimeUtcFromString,
}) {}
