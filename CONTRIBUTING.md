# Contributing to HireLoom

Thanks for your interest! HireLoom is a privacy-first, local-first CV builder, and contributions are welcome.

## Ground rules

- **Privacy is the product.** No telemetry, no network calls with user data, no backend. The only egress is the opt-in, bring-your-own-key cloud AI provider — and that goes browser→provider directly, never through a server we control. PRs that break this won't be merged.
- **Everything runs client-side.** Résumé data lives in IndexedDB. Treat the user's data as never leaving their device by default.

## Getting started

```bash
pnpm install
pnpm dev
```

Before opening a PR:

```bash
pnpm lint     # must pass
pnpm test     # must pass
pnpm build    # must succeed
```

`pnpm format` runs Prettier + `eslint --fix`. CI runs lint, test, and build on every PR.

## Project layout

See [ARCHITECTURE.md](./ARCHITECTURE.md). In short:

- `src/lib/resume` — the JSON Resume schema (Zod) and helpers. The canonical data model.
- `src/lib/blocks` — the declarative block/section registry (the editor's content model).
- `src/lib/ai` — the pluggable AI engine + providers + résumé-specific prompts.
- `src/lib/templates` — layouts, tokens, presets.
- `src/components/blocks` — the live editing canvas.
- `src/components/editor` — the editor workspace, sidebar panels, dialogs.

## Adding things

- **A new section type** — add a `defineBlock(...)` in `src/lib/blocks/defs/` and register it. No editor changes needed.
- **A new AI provider** (e.g. Anthropic) — implement the `AiProvider` interface in `src/lib/ai/providers/`, register it in `src/lib/ai/engine.ts`, and extend `AiConfig`. The whole suite picks it up.
- **A new template/layout** — add to `src/lib/templates/presets.ts`.

## Style

- TypeScript, no `any` where avoidable; the Zod schema is the source of truth for résumé types.
- Keep comments about the *why*, not the *what*.
- Match the surrounding code's conventions.

## License

By contributing, you agree your contributions are licensed under [AGPL-3.0-only](./LICENSE).
