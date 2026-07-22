import { HttpApi, HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from "@effect/platform"
import { Schema } from "effect"
import { LinkExpired, LinkNotFound, SlugTaken } from "../domain/errors.js"
import { ShortLink, Slug, TargetUrl } from "../domain/link.js"

// Wire schema for the request body — Option in the decoded type, absent/missing on the wire.
export const CreateLinkPayload = Schema.Struct({
  url: TargetUrl,
  slug: Schema.optionalWith(Slug, { as: "Option" }),
  ttlSeconds: Schema.optionalWith(Schema.Int.pipe(Schema.positive()), { as: "Option" }),
})

export const LinksGroup = HttpApiGroup.make("links")
  .add(
    HttpApiEndpoint.post("createLink", "/links")
      .setPayload(CreateLinkPayload)
      .addSuccess(ShortLink, { status: 201 })
      .addError(SlugTaken, { status: 409 })
  )
  .add(
    HttpApiEndpoint.get("resolveLink")`/links/${HttpApiSchema.param("slug", Slug)}`
      .addSuccess(ShortLink)
      .addError(LinkNotFound, { status: 404 })
      .addError(LinkExpired, { status: 410 })
  )

export const Api = HttpApi.make("shortlink").add(LinksGroup)
