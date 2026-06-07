<!--
Thanks for contributing to HireLoom! Keep PRs focused. See CONTRIBUTING.md for the ground rules.
-->

## What & why

<!-- What does this change, and why? Link any related issue: "Closes #123". -->

## How I verified

<!-- Steps you took to confirm it works (browser/OS, AI engine if relevant, screenshots/GIFs for UI). -->

## Checklist

- [ ] `pnpm typecheck` · `pnpm lint` · `pnpm test` · `pnpm build` all pass
- [ ] Tests added/updated for logic changes
- [ ] Stays **local-first** — no new backend calls, accounts, or telemetry that sends user content anywhere
- [ ] No regressions to the canvas ⇆ export round-trip (`decompose`/`recompose`) for resume-data changes
- [ ] UI changes match the existing design language (and work in light + dark)
