import { Effect, HashMap, Option, Ref } from "effect"
import type { ShortLink, Slug } from "../domain/link.js"

// In-memory implementation behind a tag — swapping to @effect/sql later is a Layer change.
// Repo returns Option (absence is normal here); workflows decide whether absence is an error.
export class LinkRepo extends Effect.Service<LinkRepo>()("app/LinkRepo", {
  effect: Effect.gen(function* () {
    const store = yield* Ref.make(HashMap.empty<Slug, ShortLink>())
    return {
      find: (slug: Slug): Effect.Effect<Option.Option<ShortLink>> =>
        Ref.get(store).pipe(Effect.map(HashMap.get(slug))),

      // Atomic check-and-insert: returns false when the slug is already taken.
      insertIfAbsent: (link: ShortLink): Effect.Effect<boolean> =>
        Ref.modify(store, (map) =>
          HashMap.has(map, link.slug)
            ? [false, map]
            : [true, HashMap.set(map, link.slug, link)]
        ),
    }
  }),
}) {}
