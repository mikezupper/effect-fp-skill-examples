import { Schema } from "effect"
import { HttpApi, HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from "effect/http-api"
import { LinkExpired, LinkNotFound, SlugTaken } from "../domain/errors.js"
import { ShortLink, Slug, TargetUrl } from "../domain/link.js"

// Wire schema for the request body — Option in the decoded type, absent key on the wire.
export const CreateLinkPayload = Schema.Struct({
  url: TargetUrl,
  slug: Schema.OptionFromOptionalKey(Slug),
  ttlSeconds: Schema.OptionFromOptionalKey(
    Schema.Int.pipe(Schema.check(Schema.isGreaterThan(0)))
  ),
})

// Status codes are an HTTP concern, so they are attached HERE (HttpApiSchema.status),
// never on the domain error classes.
export class LinksGroup extends HttpApiGroup.make("links").add(
  HttpApiEndpoint.post("createLink", "/links", {
    payload: CreateLinkPayload,
    success: ShortLink.pipe(HttpApiSchema.status(201)),
    error: SlugTaken.pipe(HttpApiSchema.status(409)),
  }),
  HttpApiEndpoint.get("resolveLink", "/links/:slug", {
    params: { slug: Slug },
    success: ShortLink,
    error: [LinkNotFound.pipe(HttpApiSchema.status(404)), LinkExpired.pipe(HttpApiSchema.status(410))],
  })
) {}

export class Api extends HttpApi.make("shortlink").add(LinksGroup) {}
