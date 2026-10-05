import { DateTime, Option, Schema } from "effect"

// Branded primitives — a Slug is not a string; passing one where the other goes must not compile.
export const Slug = Schema.String.pipe(
  Schema.check(Schema.isPattern(/^[A-Za-z0-9_-]{4,32}$/)),
  Schema.brand("Slug")
)
export type Slug = typeof Slug.Type

// Case-insensitive scheme spelled out as character classes, not the `i` flag:
// the schema-derived Arbitrary cannot generate from flagged RegExps.
export const TargetUrl = Schema.String.pipe(
  Schema.check(Schema.isPattern(/^[Hh][Tt][Tt][Pp][Ss]?:\/\/\S+$/)),
  Schema.brand("TargetUrl")
)
export type TargetUrl = typeof TargetUrl.Type

// Domain record: Option in the domain, null on the wire; DateTime, not Date/string.
export class ShortLink extends Schema.Class<ShortLink>("ShortLink")({
  slug: Slug,
  target: TargetUrl,
  createdAt: Schema.DateTimeUtc,
  expiresAt: Schema.OptionFromNullOr(Schema.DateTimeUtc),
}) {}

// Pure domain decision — takes `now` as a value so it stays clock-free and trivially testable.
export const isExpired = (link: ShortLink, now: DateTime.Utc): boolean =>
  Option.match(link.expiresAt, {
    onNone: () => false,
    onSome: (expiresAt) => DateTime.isLessThanOrEqualTo(expiresAt, now),
  })
