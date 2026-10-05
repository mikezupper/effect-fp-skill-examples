import { describe, it } from "@effect/vitest"
import { DateTime, Equal, Option, Schema } from "effect"
import { ShortLink, isExpired } from "../src/domain/link.js"

const encode = Schema.encodeSync(ShortLink)
const decode = Schema.decodeSync(ShortLink)

describe("ShortLink schema", () => {
  // Round-trip property — the schema IS the generator (Arbitrary derived from it).
  it.prop("decode ∘ encode = identity", [ShortLink], ([link]) => {
    return Equal.equals(decode(encode(link)), link)
  })
})

describe("isExpired", () => {
  it.prop("a link without expiry never expires", [ShortLink], ([link]) => {
    const eternal = new ShortLink({ ...link, expiresAt: Option.none() })
    const endOfTime = DateTime.makeUnsafe(8.64e15) // max representable Date instant
    return isExpired(eternal, endOfTime) === false
  })

  it.prop("a link is expired exactly when now >= expiresAt", [ShortLink], ([link]) => {
    return Option.match(link.expiresAt, {
      onNone: () => true, // vacuous — covered above
      onSome: (expiresAt) =>
        isExpired(link, expiresAt) === true &&
        isExpired(link, DateTime.subtract(expiresAt, { milliseconds: 1 })) === false,
    })
  })
})
