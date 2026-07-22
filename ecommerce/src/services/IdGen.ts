import { randomUUID } from "node:crypto"
import { Effect } from "effect"

// ID generation is nondeterministic → behind a tag, like Clock/Random.
export class IdGen extends Effect.Service<IdGen>()("app/IdGen", {
  succeed: {
    next: Effect.sync(() => randomUUID() as string),
  },
}) {}
