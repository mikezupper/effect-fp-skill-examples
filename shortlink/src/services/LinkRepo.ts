import { Context, Effect, HashMap, Layer, Option, Ref } from "effect"
import type { ShortLink, Slug } from "../domain/link.js"

// The capability, declared as an interface — swapping to effect/sql later is a Layer change.
// Repo returns Option (absence is normal here); workflows decide whether absence is an error.
export class LinkRepo extends Context.Service<LinkRepo, {
  find(slug: Slug): Effect.Effect<Option.Option<ShortLink>>
  // Atomic check-and-insert: succeeds with false when the slug is already taken.
  insertIfAbsent(link: ShortLink): Effect.Effect<boolean>
}>()("shortlink/services/LinkRepo") {
  // In-memory implementation: a Ref over an immutable HashMap.
  static readonly layerMemory = Layer.effect(
    LinkRepo,
    Effect.gen(function* () {
      const store = yield* Ref.make(HashMap.empty<Slug, ShortLink>())
      return LinkRepo.of({
        find: (slug) => Ref.get(store).pipe(Effect.map(HashMap.get(slug))),
        insertIfAbsent: (link) =>
          Ref.modify(store, (map) =>
            HashMap.has(map, link.slug)
              ? [false, map]
              : [true, HashMap.set(map, link.slug, link)]
          ),
      })
    })
  )
}
