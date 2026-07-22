import { Schema } from "effect"

export const UserId = Schema.String.pipe(Schema.brand("UserId"))
export type UserId = typeof UserId.Type

export const Email = Schema.String.pipe(
  Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
  Schema.brand("Email")
)
export type Email = typeof Email.Type

// Plaintext passwords are Redacted end-to-end — they cannot be logged or interpolated.
export const Password = Schema.Redacted(Schema.String.pipe(Schema.minLength(8)))
export type Password = typeof Password.Type

export const PasswordHash = Schema.String.pipe(Schema.brand("PasswordHash"))
export type PasswordHash = typeof PasswordHash.Type

export class User extends Schema.Class<User>("User")({
  id: UserId,
  email: Email,
  passwordHash: PasswordHash,
  createdAt: Schema.DateTimeUtc,
}) {}
