# CLAUDE.md

Development guide for AI assistants (Builders) working on Lampas: a licence-gated PWA for reading the
New Testament in Koine Greek. Served at https://lampas.allmymind.org from the VPS (Vite `base` is `/`;
the Laptop's after_landing builds `dist/` and rsyncs it). There is no GitHub Pages workflow; do not
add one, and do not change `.github/workflows/` unless a story says so. Never bump `package.json`'s version.

## Gate command

```bash
npm ci --no-audit --no-fund && TZ=UTC npm test && npm run typecheck && npm run lint && npm run build
```

All must pass clean before a story is done. A fresh worktree has no `node_modules`: `npm ci` first (Node 20+).

## Read first

`docs/pwa-best-practices.md` is the owner's standing rules for his phone apps (zoom, scroll, keyboard,
update flow, visibility, speech). A screen that breaks one of its rules is not done. The Governor's
principle for every screen: "make this app easy to use correctly and hard to use incorrectly". He reads
on a phone, one-handed; Greek type must be large and clear.

## Quick reference

```bash
npm run dev          # dev server
npm run build        # tsc -b + vite build -> dist/ (self-contained, root-absolute /assets/...)
npm run preview      # serve dist/ locally
npm run typecheck    # tsc -b --noEmit, strict
npm run lint         # eslint (no explicit any)
npm test             # vitest run: unit tests and feature specs
npm run test:bdd     # vitest run, features/steps only
npm run shots        # Playwright at 390x844 against `vite preview` of dist/ (run `npm run build` first,
                     #   or use `npm run gate:shots`); writes shots/<name>.png
npm run icons        # re-render public/icon-192.png and icon-512.png from public/icon.svg
npm run seed:build   # rebuild src/data/seed-words.ts from docs/example-words.md (plain node, 22.18+)
```

## Tests

- Test-first: write the failing test or scenario before the code that makes it pass.
- Every behaviour is a Gherkin scenario under `features/*.feature` with steps in
  `features/steps/*.steps.ts(x)` (@amiceli/vitest-cucumber), run inside `npm test`. Import
  `@testing-library/react/dont-cleanup-after-each` before React Testing Library in a step file.
- Unit tests live in `tests/unit/`; shared fakes in `tests/support/` (`fake-registration.ts` fakes a
  service worker registration). Tests run in jsdom with `fake-indexeddb`, in `TZ=UTC`.
- jsdom has no layout: a layout claim is proven only by a Playwright spec in `tests/e2e/` at 390x844,
  which ends with `shot(page, name)`. Service workers are blocked in e2e.
- esbuild refuses to run inside the jsdom environment: a test that needs a real build runs
  `node node_modules/vite/bin/vite.js build --outDir <tmp>` in a child process (see `features/steps/install.steps.tsx`).
- Playwright is pinned to 1.63.0 to match the Chromium build installed on the Laptop.

## Layout

```
index.html           # viewport (zoom locked), theme colour, iOS meta, PNG touch icon
pwa-manifest.ts      # the manifest as one plain object (vite.config.ts and the tests import it)
pwa-precache.ts      # injectManifest options (precache size limit raised)
build-version.ts     # '<version> · <UTC time> · <commit>' stamp shown on the home screen
vite.config.ts       # react, tailwind 4, vite-plugin-pwa (injectManifest, registerType 'prompt')
src/main.tsx         # scroll guard first, then render, then register the worker
src/App.tsx          # the shell (data-shell); picks the screen by hash route (src/nav/route.ts); seeds words on first open
src/Home.tsx WordsScreen.tsx ImportScreen.tsx  # the three screens (#/ , #/words, #/import)
src/UpdateBanner.tsx # 'Update ready, tap to reload'; the tap posts SKIP_WAITING
src/sw.ts            # the worker: precache, precache guard, SKIP_WAITING, claim on activate
src/precacheGuard.ts # never serve a .js/.css whose Content-Type does not fit
src/services/appUpdate.ts  # watches the registration, tap -> SKIP_WAITING -> reload once, periodic update check
src/ui/              # scrollGuard.ts (page never scrolls), focus.ts (focus with preventScroll)
src/data/db.ts       # Dexie, version 2: words {lemma key, lemmas, gloss, lesson, state, since} and meta
src/data/repositories/  # the only way UI reaches Dexie (words.ts: seed on first open, list, set state, import)
src/data/lemma.ts    # BMA lemma -> headword (the key) + TBESG lexicon lemmas (εἶπεν -> λέγω, εἶπον ...)
src/data/importWords.ts  # parses pasted 'lemma — gloss' lines and rows of the example table
src/data/seed-words.ts   # GENERATED from docs/example-words.md by scripts/seed-build.ts: 63 words
public/              # icon.svg (lamp glyph), icon-192.png, icon-512.png
features/ tests/     # BDD features + steps; unit tests; e2e + shots; support fakes
docs/pwa-best-practices.md   # copied verbatim from the vault; the law for every screen
docs/example-words.md        # the owner's own BMA word list (public, an example template); the seed's source
```

## Conventions

- TypeScript strict; no explicit `any`. Tailwind 4 utilities with the tokens in `src/index.css`.
- Dexie: never edit an old `version()`; repeat the whole stores map on each bump with a `// vN:` comment.
  UI code goes through `src/data/repositories`, never Dexie tables directly.
- Page never scrolls: html, body and `#root` are `overflow: clip` at `100dvh`; screens scroll in their own
  `.screen` box. Focus with `focusQuietly` (preventScroll); no `autoFocus`.
- Raw text downloads (`data/raw`) stay out of git; the generated JSON per chapter is committed.
  `ATTRIBUTION.md` names every text and licence.
