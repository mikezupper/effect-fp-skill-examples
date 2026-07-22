import { Array as Arr, DateTime, Duration, Effect, Option, Random, Schema } from "effect"
import { LinkExpired, LinkNotFound, SlugTaken } from "../domain/errors.js"
import { ShortLink, Slug, TargetUrl, isExpired } from "../domain/link.js"
import { LinkRepo } from "../services/LinkRepo.js"

// Unambiguous alphabet (no 0/O, 1/l/I) — a strict subset of the Slug pattern.
const SLUG_ALPHABET = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"

// Random via the Random service — deterministic under TestContext, never Math.random().
const randomSlug: Effect.Effect<Slug> = Effect.gen(function* () {
  const chars = yield* Effect.forEach(Arr.range(1, 8), () =>
    Effect.map(Random.nextIntBetween(0, SLUG_ALPHABET.length), (i) =>
      SLUG_ALPHABET.charAt(i)
    )
  )
  // orDie: 8 chars drawn from SLUG_ALPHABET always satisfy the Slug pattern — proven invariant.
  return yield* Schema.decode(Slug)(Arr.join(chars, "")).pipe(Effect.orDie)
})

export interface CreateLinkCommand {
  readonly target: TargetUrl
  readonly slug: Option.Option<Slug>
  readonly ttl: Option.Option<Duration.Duration>
}

export const createLink = (
  command: CreateLinkCommand
): Effect.Effect<ShortLink, SlugTaken, LinkRepo> =>
  Effect.gen(function* () {
    const repo = yield* LinkRepo
    const slug = yield* Option.match(command.slug, {
      onNone: () => randomSlug,
      onSome: Effect.succeed,
    })
    const now = yield* DateTime.now
    const link = new ShortLink({
      slug,
      target: command.target,
      createdAt: now,
      expiresAt: Option.map(command.ttl, (ttl) => DateTime.addDuration(now, ttl)),
    })
    const inserted = yield* repo.insertIfAbsent(link)
    if (!inserted) {
      return yield* new SlugTaken({ slug })
    }
    yield* Effect.logInfo("link created").pipe(
      Effect.annotateLogs({ slug: link.slug })
    )
    return link
  }).pipe(Effect.withSpan("Links.createLink"))

export const resolveLink = (
  slug: Slug
): Effect.Effect<ShortLink, LinkNotFound | LinkExpired, LinkRepo> =>
  Effect.gen(function* () {
    const repo = yield* LinkRepo
    const link = yield* repo.find(slug).pipe(
      Effect.flatMap(
        Option.match({
          onNone: () => new LinkNotFound({ slug }),
          onSome: Effect.succeed,
        })
      )
    )
    const now = yield* DateTime.now
    if (isExpired(link, now)) {
      return yield* new LinkExpired({ slug })
    }
    return link
  }).pipe(Effect.withSpan("Links.resolveLink"))
