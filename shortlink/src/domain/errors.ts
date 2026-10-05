import { Schema } from "effect"
import { Slug } from "./link.js"

// Schema.TaggedError (not Data.TaggedError) because these cross the HTTP boundary.
// Each carries the data a handler needs — the slug in question, not just a message.
// HTTP statuses are NOT declared here: the domain knows nothing about HTTP.
// The adapter (http/api.ts) attaches them with HttpApiSchema.status.

export class SlugTaken extends Schema.TaggedError<SlugTaken>()("SlugTaken", { slug: Slug }) {}

export class LinkNotFound extends Schema.TaggedError<LinkNotFound>()("LinkNotFound", { slug: Slug }) {}

export class LinkExpired extends Schema.TaggedError<LinkExpired>()("LinkExpired", { slug: Slug }) {}
