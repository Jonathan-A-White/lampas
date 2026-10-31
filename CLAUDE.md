# CLAUDE.md

<!-- toc: none -->

Development guide for AI assistants (Builders) working on Lampas: a licence-gated PWA for
reading the Bible in Koine Greek and Hebrew. Served at https://lampas.allmymind.org from the VPS (Vite `base` is `/`;
the Laptop's after_landing builds `dist/` and rsyncs it). There is no GitHub Pages workflow; do not
add one, and do not change `.github/workflows/` unless a story says so. Never bump `package.json`'s version.

VISION.md is the Governor's vision for this app: a change that would cross one of its lines stops and says so.

## Gate command

```bash
npm ci --no-audit --no-fund && TZ=UTC npm test && npm run typecheck && npm run lint && npm run build
```

All must pass clean before a story is done. A fresh worktree has no `node_modules`: `npm ci` first (Node 20+).

## Read first

Read `docs/overview.md` before the rest of this file.
`docs/pwa-best-practices.md` is the owner's standing rules for his phone apps (zoom, scroll, keyboard,
update flow, visibility, speech). A screen that breaks one of its rules is not done. The Governor's
principle for every screen: "make this app easy to use correctly and hard to use incorrectly". He reads
on a phone, one-handed; Greek type must be large and clear.

## Quick reference

```bash
npm run dev          # dev server
npm run build        # tsc -b + vite build -> dist/ (self-contained)
npm run preview      # serve dist/ locally
npm run typecheck    # tsc -b --noEmit, strict
npm run lint         # eslint (no explicit any)
npm test             # vitest run: unit tests and feature specs
npm run test:bdd     # vitest run, features/steps only
npm run shots        # Playwright at 390x844 against `vite preview` of dist/ (build first, or `npm run gate:shots`); writes shots/<name>.png
npm run icons        # re-render public/icon-192.png and icon-512.png from public/icon.svg
npm run seed:build   # rebuild src/data/seed-words.ts (docs/example-words.md) and seed-words-hbo.ts (plain node, 22.18+)
npm run check:licence -- <pubkey>  # live testnet licence check, opt-in, not in the gate
npx playwright test  # (npm run test:e2e) all e2e (use --workers=2; `npm run build` first): projects 'chromium' and 'shots' (docs/commands.md)
npm run e2e:live     # the live tests against the DEPLOYED app; not in the gate (docs/commands.md)
npm run grind:build  # after adding a setting to the registry; a second run changes nothing (docs/commands.md)
npm run ladder:docs  # writes the ladder table of docs/grammar.md and the rows of docs/card-audit.md (docs/commands.md)
npm run logos:catalogue -- <csv>  # writes src/resources/catalogue/ from a Logos export; logos:fit prints what is left (docs/commands.md)
npm run data:build   # also check:step, greek:edition, ladder, fixture:chapter: data tools, not in the gate (docs/commands.md)
```

## Adding a grammar idea

`src/data/grammar/ladder.ts` is the one source: add the entry (its `needs` must be ideas below it, a DAG), add its card in `src/data/grammar/teach/<tier>.ts`, then run `npm run ladder:docs && npm run grind:build` and judge the new row in `docs/card-audit.md`. `tests/unit/ladder-single-source.test.ts` fails, naming the idea and the file, on anything stale.

## Grinds and their examples

Each grind (`grinds/<kind>.json`) has examples, an input schema and, for bible-talk, instructions in one part per section: read docs/grinds.md before you touch `grinds/`.

**When you change a grind's behaviour (its instructions, schemas, or what the app sends), update or add its examples in the same story. A new grind ships with an input schema and at least one example.**

## Tests

- Test-first: write the failing test or scenario before the code that makes it pass.
- Every behaviour is a Gherkin scenario under `features/*.feature` with steps in
  `features/steps/*.steps.ts(x)` (@amiceli/vitest-cucumber), run inside `npm test`. Import
  `@testing-library/react/dont-cleanup-after-each` before React Testing Library in a step file.
- Speech and the microphone are never faked by hand (mw-it6qk5.3): they are voice-kit's honest fakes (`voice-kit/testing/speech` and `/mic`: an utterance
  takes `150 + 60 x words` ms and fires start, boundaries and end, `cancel()` interrupts the one being spoken, a recogniser sends interim words as a clip
  plays). Feature steps use `tests/support/fake-speech.ts` (`stubSpeech`: `finish()`, `finishAll()`, `advance(ms)`, `calls`, `spoken`, on a manual clock,
  `tests/support/manual-clock.ts`) and `tests/support/fake-mic.ts` (`stubMic()`, `advance(ms)`); Playwright specs use `tests/support/honest-fakes.ts`
  (`honestSpeech(page, {langs, msPerWord})`, `spoken(page)`, `honestMic(page)`). A screen that holds on a verse being spoken or a clip being recorded needs a slow reader
  (`msPerWord`) or a long hold; `tests/e2e/fake-media.ts` also fakes playing a clip (and gives the recorded PCM a WAV header). `tests/support/fake-recognizer.ts` stays for unit tests that drive a recogniser result by result.
- Every jsdom `findBy*`/`waitFor` waits `ASYNC_WAIT_MS` (`tests/support/timeouts.ts`, 10 s, set in `tests/setup.ts`; a loaded host outruns the library's 1 s): never pass a shorter `timeout:` and give `vi.waitFor` one (`tests/unit/async-wait.test.ts` greps for both).
- A step that checks what the bus heard waits for it (`tests/support/published.ts`: `expectPublished(() => list, expected)` for a list a step file fills, `expectLatest(kind, check)` for the newest event of a kind): a screen writes, publishes, awaits and publishes again, so the write a step waited for can come before the event (mw-5r3p30.389; `tests/unit/published-wait.test.ts` fails on an `expect(list)` or `expect(latest(...))` with no wait).
- Unit tests live in `tests/unit/`; shared fakes in `tests/support/` (`fake-registration.ts` fakes a
  service worker registration; `fake-postern.ts` is a Postern backend with a mill that opens the grist and answers it,
  used by features/tutor.feature and, through `playwright-postern.ts`, by tests/e2e/tutor.spec.ts). Tests run in jsdom with `fake-indexeddb`, in `TZ=UTC`.
- jsdom has no layout: a layout claim is proven only by a Playwright spec in `tests/e2e/` at 390x844,
  which ends with `shot(page, name)`. Service workers are blocked in e2e (tests/e2e/share-target.spec.ts lets the built worker run, to POST a share).
- esbuild refuses to run inside the jsdom environment: a test that needs a real build runs
  `node node_modules/vite/bin/vite.js build --outDir <tmp>` in a child process (see `features/steps/install.steps.tsx`).
- Playwright is pinned to 1.63.0 to match the Chromium build installed on the Laptop.

## Layout

Which file holds what is in `docs/layout/`, one file per area (listed under Read by need). **A new layout note goes in the docs/layout/ file for its area, never in CLAUDE.md**, which stays under 16,000 bytes (`tests/unit/claude-md.test.ts`).

## What the tutor is told

VISION.md 'The tutor': the tutor is told, on every ask, each app setting and each part of his progress that could change its answer. `src/tutor/knows.ts` is the table of what each grind (bible-talk, verse-read, tips) is sent, with a written reason for each thing it is not; a new setting is classified in its `BEARS_ON` and `tests/unit/tutor-knows.test.ts` fails until it is sent or has a reason (docs/ask-tutor.md 'The tutor knows what bears on its answer').

## Conventions

- TypeScript strict; no explicit `any`. Tailwind 4 utilities with the tokens in `src/index.css`.
- Dexie: never edit an old `version()`; repeat the whole stores map on each bump with a `// vN:` comment.
  UI code goes through `src/data/repositories`, never Dexie tables directly.
- Page never scrolls: html, body and `#root` are `overflow: clip` at `100dvh`; screens scroll in their own
  `.screen` box. Focus with `focusQuietly` (preventScroll); no `autoFocus`.
- Bottom insets: never write `env(safe-area-inset-bottom)` in a component. A pinned bar or sheet pads with `var(--lp-bar-inset)`
  and the end of a scroll box with `var(--lp-end-inset)` (src/index.css: the phone's inset with a 48 px floor (a three-button bar), because
  Android Chrome does not always report the navigation bar). tests/e2e/bottom-reach.spec.ts holds the proof.
- Raw text downloads (`data/raw`) stay out of git; the generated JSON per chapter is committed.
  `ATTRIBUTION.md` names every text and licence.
- Credit everything we build on (mw-vtjxh4.1): `ATTRIBUTION.md` is the About screen's source and the README's Credits point at it; a new dependency, text, font, icon, service or borrowed idea gets an entry in the same commit (`[Name](url)` as the link text, never a raw URL; use, licence with a link, `Changes:`); `tests/unit/credits.test.ts` fails on a `package.json` dependency with no entry naming its package in backticks, on a package named in backticks in the Libraries section that is no longer a dependency (credits follow removals), and on a font file (`src/fonts`) or data file (`public/data`, `public/pictures`) with no credit; a new bundled dir needs a rule in `tests/support/credits.ts`.
- The tutor on About is told each credit as a short `{name, use, licence, link}` (`src/tutor/credits.ts` CREDITS, docs/ask-tutor.md): a new bullet needs its credit there too, and `tests/unit/credits-for-tutor.test.tsx` fails until it has one.

## Read by need

One line per file under `docs/`: open the ones your story touches. `tests/unit/claude-md.test.ts` fails when a docs/ file is missing here.

```
docs/layout/app.md # Layout: the shell, build, manifest, worker, updates and What's new, bus, appearance, src/ui/, public/
docs/layout/reader.md # Layout: the Reader: nav, swipe, src/nav/ and links in, chips, Immersive, weave, Old Testament
docs/layout/word-sheet.md # Layout: the word sheet, Greek and Hebrew, and a word by link
docs/layout/chapter-picker.md # Layout: the chapter picker, 66 books
docs/layout/verse-and-reading.md # Layout: the Verse view (Listen, Quiz me, passages), Read it aloud, the Reading ladder and drill
docs/layout/tutor.md # Layout: asking the tutor: round button, Ask, services/tutor.ts, grinds/, tips, links, Markdown, Hebrew
docs/layout/talk.md # Layout: Bible talk: Talk bar and sheet, services/talk.ts, Add to my words, pictures, bridge, study way
docs/layout/learner.md # Layout: what the tutor knows of him: About you, Memory, welcome, learner and learner_grammar
docs/layout/settings.md # Layout: src/settings/ (registry, rows, search, defineSetting), src/resources/ (study resources)
docs/layout/speech.md # Layout: src/speech/: voices, pronunciation schemes, accents, speaking bar, read aloud; Tap to hear
docs/layout/words.md # Layout: Words, Quick test, Review, schedule, Parsing drill, glosses, pictures, frontier, pace, New words
docs/layout/diagram.md # Layout: sentence diagram, src/diagram/ (Reed-Kellogg)
docs/layout/memorize.md # Layout: Memorize: src/memorize/, the text a verse is learned in (English, Greek, the weave)
docs/layout/grammar.md # Layout: grammar terms, ladder, inference, Drill it, letter drill, idea sheet, placement, Goal, Paradigms
docs/layout/data.md # Layout: Dexie and its versions, repositories, books, chapters, parsing codes, the data build
docs/layout/licence.md # Layout: the licence gate, the one gated mill client, the device key
docs/layout/share.md # Layout: Share to Lampas, Your requests, Ask for another approach, Ask for more and feedback
docs/overview.md # the one-screen overview
docs/PREFACE.md # the Preface rule: the texts, not the app
docs/accessibility.md # the axe check over the eight main screens, what a screen must meet, rules left out
docs/commands.md # long notes of the Quick reference: Playwright projects, e2e:live, grind:build, the data tools
docs/grinds.md # grinds' examples and the bible-talk instruction parts: how to change one
docs/pwa-best-practices.md # copied verbatim from the vault; the law for every screen
docs/example-words.md # the owner's own BMA word list (public, an example template); the seed's source
docs/testing.md # the gate's test seam: where the device key lives and how a test seeds it
docs/events.md # every event kind on the bus, its payload, who publishes and who listens
docs/pronunciation.md # the respelling schemes: Modern Greek's rules and how to add Erasmian
docs/resources.md # the study resources: what ships, where each URL form is documented, how to add one
docs/pictures.md # the memory pictures: the rules for one, how to add one, which seed words have none
docs/links.md # every link form Lampas takes in, with an example; where web+lampas: does not work
docs/data.md # the data's JSON shape, its two sources and licences, and what the build changes
docs/maps.md # the maps: src/maps/, Bible Mapper's data and terms, adding an atlas
docs/hebrew.md # Hebrew in the tutor: the depth setting, the font, how a Hebrew word is drawn
docs/ask-tutor.md # the tutor: what it is told, offers, bridge, profile, memory, welcome, pictures, sharing, requests, timings
docs/verse-view.md # the Verse view: actions, passages, Listen as a player, Quiz me, study way, quiz goal
docs/read-aloud.md # read aloud: the span, speaking bar, the tutor's responses, pages of prose
docs/reading-ladder.md # the reading ladder: verses scored by how hard they are to pronounce, drills
docs/grammar.md # the grammar ladder, placement, Drill it, the idea sheet, the Goal screen (PROVISIONAL)
docs/frontier.md # the frontier picker, the pace and the teach sheet for new words
docs/paradigms.md # the Paradigms tables and when a form is available
docs/paradigm-components.md # the paradigm epic's shared parts and what mw-irpgqi.3 and .4 reuse
docs/tips.md # the tips grind and the one-time tips written in the app
docs/module-map.md # the module map (2026-10-09): modules, collisions, refactors, rule breaks
docs/greek-edition.md # GENERATED by npm run greek:edition: which Robinson-Pierpont edition the Greek follows
docs/card-audit.md # the audit of every teaching card for a beginner
docs/path-gaps.md # what the ladder lacks against BMA Tutor and the grammar book (PROVISIONAL)
docs/best-practices-audit.md # the 2026-10-10 audit of Lampas against the PWA best practices
docs/demo-free-ai-licensed.md # free to read, a licence unlocks the AI (mw-8m9dyu.4)
docs/demo-lampas-share.md # share or paste a screenshot into a tutor talk (mw-y3qno5.3)
docs/demo-module-splits.md # the Reader and Settings splits
docs/demo-shared-composer.md # Postern composer shared with Lampas (mw-jtzpw0.6)
docs/demo-shared-speech.md # one read-aloud bar in Postern, Lampas, SpellForge (mw-m7v5kc.5)
docs/demo-reading-plan.md # the listening plan in the Bible view (mw-umv8sp.6)
docs/demo-english-first-memory.md # English first, the welcome, Greek offer, Memory
docs/demo-library-at-scale.md # Logos library at scale: Import to Your requests
docs/research/audible-addon-seek.md # an add-on that seeks his Audible Bible to a passage
docs/research/greek-speech-libraries.md # open-source libraries for Greek sound
docs/research/kjv-tr.md # the KJV and the Greek behind it as a text pair
docs/research/logos-section-refs.md # grammar sections by a book's own Logos data type
docs/research/logos-morph-charts.md # Logos's Morphology Charts at a lemma from a link
docs/research/logos-factbook.md # Factbook at a proper name from a word sheet: link form, source, how a name is known
docs/research/logos-exegetical-guide.md # the Exegetical Guide at a verse: link form, source, the door, a sweep of guides
docs/research/letter-sounds.md # lone vowels and letter sounds in a voice like the phone's
docs/sources/latin-bible.md # Latin Bible sources: licences, word data, versification, audio
docs/sources/public-domain-works.md # Spurgeon and other public-domain works: sources, terms, coverage
docs/design/library-at-scale.md # the Logos library at scale, mockups, build plan
docs/design/bible-talk-trim-map.md # the bible-talk rules before the 100,000-byte trim, where each lives
docs/sources/septuagint-and-webster.md # Septuagint and Webster 1828 sources: licences, word data, versification
```
