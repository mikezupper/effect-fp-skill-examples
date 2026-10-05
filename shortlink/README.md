# shortlink

URL shortener with expiring links — the minimal complete demonstration of the [effect-fp-skill](https://github.com/mikezupper/effect-fp-skill): every rule of the skill in ~250 lines.

Built on **Effect 4** (`effect` 4.0.1 — HTTP API modules come from `effect/http-api`, test services from `effect/testing`; no `@effect/platform`), `@effect/platform-node` 4.0.1, `@effect/vitest` 4.0.1 on Vitest 5, TypeScript 7.

## Run

```bash
npm ci
npm run dev            # http://localhost:3000, Swagger UI at /docs, spec at /openapi.json   (PORT to override)
npm test               # 8 tests: property-based round-trips + TestClock expiry
npm run typecheck
```

## Try it

```bash
curl -X POST localhost:3000/links -H 'content-type: application/json' \
  -d '{"url":"https://effect.website/docs","slug":"effect-docs","ttlSeconds":60}'
curl localhost:3000/links/effect-docs          # 200 → the link
sleep 61 && curl localhost:3000/links/effect-docs   # 410 LinkExpired
```

## What it demonstrates

| Skill area | Where |
|---|---|
| Branded types + schema boundary | `src/domain/link.ts` — `Slug`, `TargetUrl`, `ShortLink` |
| Railway errors → HTTP statuses | `src/domain/errors.ts` (HTTP-free) + `src/http/api.ts` (`HttpApiSchema.status` 409/404/410) |
| Capability-based DI | `src/services/LinkRepo.ts` (`Context.Service` + `Ref`-backed `layerMemory`, swappable by Layer) |
| Clock/Random as services | `src/workflows/links.ts` — `Effect.fn` workflows; testable time & slug generation |
| One runtime entry point | `src/main.ts` — `HttpRouter.serve` + `Layer.launch` + `runMain` |
| Property tests from schemas | `test/domain.test.ts` — `it.prop` with arbitraries derived from `ShortLink` |
| Virtual time | `test/workflows.test.ts` — 61 minutes of TTL in ~10ms via `TestClock` (`effect/testing`) |
