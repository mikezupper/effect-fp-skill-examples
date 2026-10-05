import { randomUUID } from "node:crypto"
import { Context, Effect, Layer } from "effect"

// ID generation is nondeterministic → behind a service, like Clock/Random.
export class IdGen extends Context.Service<
  IdGen,
  { readonly next: Effect.Effect<string> }
>()("app/IdGen") {
  static readonly layer = Layer.succeed(IdGen, IdGen.of({ next: Effect.sync(() => randomUUID()) }))
}
