# Lampas overview

Read this first (CLAUDE.md is the law, this is the map). Update it only when a story changes what it says. `tests/unit/overview-doc.test.ts` holds it: under 6,000 bytes, and every backticked path must exist.

<!-- toc -->

- [What Lampas is](#what-lampas-is)
- [Gate command](#gate-command)
- [Where things live](#where-things-live)
- [The five rules](#the-five-rules)

<!-- /toc -->

## What Lampas is

Lampas is a licence-gated PWA for reading the Bible in Koine Greek and Biblical Hebrew, for readers of any mother tongue, with a tutor on the verse; for a reader who never learns the languages it is a good plain-English Bible with the Greek or Hebrew one tap away. It is free to read and a licence unlocks only the AI; the Governor's lines are in `VISION.md`, and a change that crosses one stops and says so.

## Gate command

```bash
npm ci --no-audit --no-fund && TZ=UTC npm test && npm run typecheck && npm run lint && npm run build
```

`npm test` is long: run it as `TZ=UTC npx vitest run --shard N/6` six times. Layout is proved only by Playwright (`npm run build` first, then `npx playwright test --workers=2`).

## Where things live

- `src/data/grammar` the ladder: ideas, needs, placement, questions, teaching cards. Single source `src/data/grammar/ladder.ts`. Docs `docs/grammar.md`, `docs/paradigms.md`.
- `src/review` the Review round: item kinds, drawing and grading. Docs `docs/layout/words.md`, `docs/module-map.md`.
- `src/speech` voices, pronunciation schemes, read aloud, Tap to hear. Docs `docs/layout/speech.md`, `docs/pronunciation.md`.
- `src/settings` the settings registry and the one list of Settings rows. Docs `docs/layout/settings.md`.
- `src/tutor` what the tutor is told (`src/tutor/knows.ts`) and the screen it is on. Docs `docs/layout/tutor.md`, `docs/ask-tutor.md`.
- `grinds/` the tutor's instructions, schemas and examples, one per kind. Docs `docs/grinds.md`.
- `scripts/` the build and data tools, and `scripts/check-claude-md.mjs`. Docs `docs/commands.md`.
- `features/` Gherkin scenarios, steps in `features/steps`. Docs `docs/testing.md`.
- `tests/unit` unit tests, shared fakes in `tests/support`. Docs `docs/testing.md`, `docs/module-map.md`.
- `tests/e2e` Playwright at 390x844, each ends with `shot(page, name)`. Docs `docs/pwa-best-practices.md`, `docs/testing.md`.

Every other screen and module: `docs/module-map.md` section 1, and `docs/layout/` by area (listed in CLAUDE.md "Read by need").

## The five rules

1. Test first: write the failing scenario or test, then the code. See CLAUDE.md "Tests".
2. UI reaches Dexie only through `src/data/repositories`; never edit an old `version()`. See CLAUDE.md "Conventions".
3. The page never scrolls, and a pinned bar pads with `var(--lp-bar-inset)`, never `env(safe-area-inset-bottom)`. See CLAUDE.md "Conventions" and `docs/pwa-best-practices.md`.
4. Credit what you build on in `ATTRIBUTION.md`, and a change to a text or source updates About and `src/preface.ts` (the Preface holds only what we chose), and a change to what the app does updates About and its page of Help (`src/help.ts`), in the same story. See CLAUDE.md "Conventions".
5. A new setting is classified in `src/tutor/knows.ts` and the grinds are rebuilt (`npm run grind:build`). See CLAUDE.md "What the tutor is told".
