import { assert, describe, it } from "@effect/vitest"
import { Duration, Effect, Option, Schema } from "effect"
import { TestClock } from "effect/testing"
import { Slug, TargetUrl } from "../src/domain/link.js"
import { LinkRepo } from "../src/services/LinkRepo.js"
import { createLink, resolveLink } from "../src/workflows/links.js"

// Literals we can vouch for — decodeSync is acceptable here.
const slug = Schema.decodeSync(Slug)("my-link")
const target = Schema.decodeSync(TargetUrl)("https://example.com/some/page")

const TestLayer = LinkRepo.layerMemory

describe("createLink / resolveLink", () => {
  it.effect("created links resolve to their target", () =>
    Effect.gen(function* () {
      const created = yield* createLink({
        target,
        slug: Option.some(slug),
        ttl: Option.none(),
      })
      const resolved = yield* resolveLink(created.slug)
      assert.strictEqual(resolved.target, target)
      assert.strictEqual(resolved.slug, slug)
    }).pipe(Effect.provide(TestLayer))
  )

  it.effect("generates a valid random slug when none is given", () =>
    Effect.gen(function* () {
      const created = yield* createLink({ target, slug: Option.none(), ttl: Option.none() })
      // decodes through the brand — proves the generated slug satisfies the pattern
      assert.doesNotThrow(() => Schema.decodeSync(Slug)(created.slug))
      const resolved = yield* resolveLink(created.slug)
      assert.strictEqual(resolved.target, target)
    }).pipe(Effect.provide(TestLayer))
  )

  it.effect("taking an existing slug fails with SlugTaken and changes nothing", () =>
    Effect.gen(function* () {
      const first = yield* createLink({ target, slug: Option.some(slug), ttl: Option.none() })
      const other = Schema.decodeSync(TargetUrl)("https://other.example.com")
      const failure = yield* createLink({
        target: other,
        slug: Option.some(slug),
        ttl: Option.none(),
      }).pipe(Effect.flip)
      assert.strictEqual(failure._tag, "SlugTaken")
      // failure left no partial state: original mapping intact
      const resolved = yield* resolveLink(slug)
      assert.strictEqual(resolved.target, first.target)
    }).pipe(Effect.provide(TestLayer))
  )

  it.effect("unknown slugs fail with LinkNotFound", () =>
    Effect.gen(function* () {
      const failure = yield* resolveLink(slug).pipe(Effect.flip)
      assert.strictEqual(failure._tag, "LinkNotFound")
    }).pipe(Effect.provide(TestLayer))
  )

  it.effect("links expire after their TTL (virtual time)", () =>
    Effect.gen(function* () {
      yield* createLink({
        target,
        slug: Option.some(slug),
        ttl: Option.some(Duration.minutes(60)),
      })

      yield* TestClock.adjust(Duration.minutes(59))
      const stillAlive = yield* resolveLink(slug)
      assert.strictEqual(stillAlive.target, target)

      yield* TestClock.adjust(Duration.minutes(2)) // virtual — test runs in microseconds
      const failure = yield* resolveLink(slug).pipe(Effect.flip)
      assert.strictEqual(failure._tag, "LinkExpired")
    }).pipe(Effect.provide(TestLayer))
  )
})
