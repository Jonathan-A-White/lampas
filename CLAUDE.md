# CLAUDE.md

<!-- toc: none -->

Guide for Builders working on Lampas: a licence-gated PWA for
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
npm run shots        # Playwright at 390x844 on `vite preview` of dist/ (build first, or `npm run gate:shots`); writes shots/
npm run icons        # re-render the public/ icons from icon.svg
npm run seed:build   # rebuild src/data/seed-words.ts and seed-words-hbo.ts from docs/example-words.md (node 22.18+)
npm run check:licence -- <pubkey>  # live testnet licence check
npx playwright test  # (npm run test:e2e) all e2e (--workers=2; `npm run build` first): projects 'chromium' and 'shots' (docs/commands.md)
npm run e2e:live     # live tests against the DEPLOYED app; not in the gate (docs/commands.md)
npm run grind:build  # after adding a setting to the registry; a second run changes nothing (docs/commands.md)
npm run ladder:docs  # writes the ladder table of docs/grammar.md, rows of docs/card-audit.md
npm run logos:catalogue -- <csv>  # writes src/resources/catalogue/ from a Logos export; logos:fit prints the rest (docs/commands.md)
npm run numerals:sweep  # writes docs/numeral-sweep.md: each numeral phrase's sum against its English
npm run split:sweep  # writes docs/split-pairing-sweep.md: Septuagint verses unpaired
npm run greek-lines:sweep  # lists New Testament poetry verses with a stranded small word in a Greek line (0; docs/data.md)
npm run offline:sizes  # Keep on this phone: each chip's MB against a real dist/ (after lxx:ship; docs/data.md)
npm run data:build   # also check:step, greek:edition, ladder, fixture:chapter: data tools, not in the gate
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
- Speech and the microphone are never faked by hand (mw-it6qk5.3): use voice-kit's honest fakes through `tests/support/` (docs/testing.md 'Speech and the microphone fakes').
- Waits (docs/testing.md 'Waits'): a jsdom `findBy*`/`waitFor` waits `ASYNC_WAIT_MS`, so never pass a shorter `timeout:` and give `vi.waitFor` one; a step that checks what the bus heard waits for it through `tests/support/published.ts`.
- Unit tests live in `tests/unit/`; shared fakes in `tests/support/` (docs/testing.md 'The shared fakes'). Tests run in jsdom, `fake-indexeddb`, `TZ=UTC`.
- jsdom has no layout: a layout claim is proven only by a Playwright spec in `tests/e2e/` at 390x844,
  which ends with `shot(page, name)`. Service workers are blocked in e2e (tests/e2e/share-target.spec.ts lets the built worker run, to POST a share).
- esbuild will not run in jsdom: a test that needs a real build runs
  `node node_modules/vite/bin/vite.js build --outDir <tmp>` in a child process (see `features/steps/build.steps.ts`, in the gate's build part: `tests/support/build-part.ts`).
- Playwright is pinned to 1.63.0 (the Laptop's Chromium).
- After a `while setting up` timeout read the gate log's `page-setup-watch:` line first (`tests/support/page-setup-watch.ts`).

## Layout

Which file holds what is in `docs/layout/`, one file per area. **A new layout note goes in the docs/layout/ file for its area, never in CLAUDE.md**, which stays under 16,000 bytes (`tests/unit/claude-md.test.ts`).

## What the tutor is told

VISION.md 'The tutor': the tutor is told, on every ask, each app setting and each part of his progress that could change its answer. `src/tutor/knows.ts` is the table of what each grind (bible-talk, verse-read, tips) is sent, with a written reason for each thing it is not; a new setting is classified in its `BEARS_ON` and `tests/unit/tutor-knows.test.ts` fails until it is sent or has a reason (docs/ask-tutor.md 'The tutor knows what bears on its answer').

## Conventions

- TypeScript strict; no explicit `any`. Tailwind 4 utilities with the tokens in `src/index.css`.
- Dexie: never edit an old `version()`; repeat the whole stores map on each bump with a `// vN:` comment.
  UI code goes through `src/data/repositories`, never Dexie tables directly.
- Page never scrolls: html, body and `#root` are `overflow: clip` at `100dvh`; screens scroll in their own
  `.screen` box. Focus with `focusQuietly` (preventScroll); no `autoFocus`.
- Bottom insets: never write `env(safe-area-inset-bottom)` in a component. A pinned bar or sheet pads with `var(--lp-bar-inset)`
  and the end of a scroll box with `var(--lp-end-inset)` (src/index.css: the phone's inset, with a 48 px floor (a three-button bar) only in the installed app, src/layout/barFloor.ts, because
  Android Chrome does not always report the navigation bar; a browser tab has none). tests/e2e/bottom-reach.spec.ts holds the proof.
- Raw text downloads (`data/raw`) stay out of git; the generated JSON per chapter is committed.
  `ATTRIBUTION.md` names every text and licence.
- Credit everything we build on (mw-vtjxh4.1): `ATTRIBUTION.md` is the About screen's source and the README's Credits point at it; a new dependency, text, font, icon, service or borrowed idea gets an entry in the same commit (`[Name](url)` as the link text, never a raw URL; use, licence, `Changes:`); `tests/unit/credits.test.ts` fails on a `package.json` dependency with no entry naming its package in backticks, on a Libraries entry whose package is no longer a dependency, and on a font file (`src/fonts`) or data file (`public/data`, `public/pictures`) with no credit; a new bundled dir needs a rule in `tests/support/credits.ts`.
- The tutor on About is told each credit as a short `{name, use, licence, link}` (`src/tutor/credits.ts` CREDITS, docs/ask-tutor.md): a new bullet needs its credit there too, and `tests/unit/credits-for-tutor.test.tsx` fails until it has one.

## Read by need

One line per file under `docs/`: open the ones your story touches. `tests/unit/claude-md.test.ts` fails when a docs/ file is missing here.

```
docs/layout/app.md # the shell, build, manifest, worker, updates, What's new, bus, look, src/ui/, public/
docs/layout/reader.md # the Reader: nav, swipe, src/nav/, links in, chips, Immersive, weave, Old Testament
docs/layout/word-sheet.md # the word sheet, Greek and Hebrew, and a word by link
docs/layout/chapter-picker.md # the chapter picker, 66 books
docs/layout/verse-and-reading.md # the Verse view (Listen, Quiz me, passages), Read it aloud, Reading ladder, drill
docs/layout/tutor.md # asking the tutor: round button, Ask, services/tutor.ts, grinds/, tips, links, Hebrew
docs/layout/talk.md # Bible talk: Talk bar and sheet, services/talk.ts, Add to my words, pictures, bridge
docs/layout/learner.md # what the tutor knows of him: About you, Memory, welcome, learner, learner_grammar
docs/layout/settings.md # src/settings/ (registry, rows, search, defineSetting), src/resources/
docs/layout/speech.md # src/speech/: voices, pronunciation, accents, speaking bar, read aloud, Tap to hear
docs/layout/words.md # Words, Quick test, Review, schedule, Parsing drill, glosses, pictures, frontier, pace
docs/layout/diagram.md # sentence diagram, src/diagram/ (Reed-Kellogg)
docs/layout/memorize.md # Memorize: src/memorize/, the text a verse is learned in (English, Greek, weave)
docs/layout/grammar.md # grammar terms, ladder, inference, Drill it, idea sheet, placement, Goal, Paradigms
docs/layout/data.md # Dexie and its versions, repositories, books, chapters, parsing codes, the data build
docs/layout/licence.md # the licence gate, the one gated mill client, the device key
docs/layout/share.md # Share to Lampas, Your requests, Ask for another approach, Ask for more and feedback
docs/overview.md # the one-screen overview
docs/PREFACE.md # the Preface rule: texts, not the app
docs/accessibility.md # the axe check over the eight main screens, what a screen must meet
docs/commands.md # long notes of the Quick reference: Playwright projects, e2e:live, grind:build, data tools
docs/grinds.md # grinds' examples and the bible-talk instruction parts: how to change one
docs/pwa-best-practices.md # copied verbatim from the vault; the law for every screen
docs/example-words.md # the owner's own BMA word list (public, an example); the seed's source
docs/testing.md # the gate's test seam: where the device key lives, how a test seeds it
docs/events.md # every event kind on the bus, its payload, who publishes and who listens
docs/pronunciation.md # the respelling schemes: Modern Greek's rules and how to add Erasmian
docs/resources.md # the study resources: what ships, each URL form's docs, how to add one
docs/pictures.md # the memory pictures: the rules, how to add one, which seed words have none
docs/links.md # every link form Lampas takes in, with an example; where web+lampas: fails
docs/data.md # the data's JSON shape, its two sources and licences, build changes
docs/maps.md # the maps: src/maps/, Bible Mapper's data and terms, adding an atlas
docs/timeline.md # the timeline's data: Theographic, the corrections file, upstream
docs/sermons.md # the sermon index: build, files, sources
docs/audio-judge.md # David's cuts judged
docs/audio-run.md # one command a book, a fresh box, the Bible's cost
docs/hebrew.md # Hebrew in the tutor: the depth setting, the font, how a Hebrew word is drawn
docs/language-parity.md # the golden use cases per language, the Hebrew gaps, what a new language plugs in
docs/ask-tutor.md # the tutor: what it is told, offers, bridge, profile, memory, welcome, pictures
docs/verse-view.md # the Verse view: actions, passages, Listen, Quiz me, study way
docs/tutor-doors.md # every in-page tutor button audited against the floating ?: what each sends
docs/read-aloud.md # read aloud: the span, speaking bar, the tutor's responses, pages of prose
docs/audio-player-margin.md # David's player margin
docs/reading-ladder.md # verses scored by pronunciation difficulty, drills
docs/grammar.md # the grammar ladder, placement, Drill it, idea sheet, Goal screen
docs/frontier.md # the frontier picker, the pace and the teach sheet for new words
docs/paradigms.md # the Paradigms tables and when a form is available
docs/paradigm-components.md # the paradigm epic's shared parts
docs/learning-workflow.md # design: the practice screens as one workflow
docs/tips.md # the tips grind and the one-time tips written in the app
docs/module-map.md # the module map: modules, collisions, refactors
docs/greek-edition.md # GENERATED by greek:edition: which Robinson-Pierpont edition the Greek is
docs/card-audit.md # the audit of every teaching card for a beginner
docs/path-gaps.md # what the ladder lacks against BMA Tutor and the grammar book
docs/best-practices-audit.md # the 2026-10-10 PWA audit
docs/demo-free-ai-licensed.md # free to read, a licence for the AI
docs/demo-lampas-share.md # share a screenshot into a tutor talk
docs/demo-module-splits.md # the Reader and Settings splits
docs/demo-shared-composer.md # Postern composer shared with Lampas
docs/demo-shared-speech.md # one read-aloud bar in three apps
docs/demo-reading-plan.md # the listening plan
docs/demo-english-first-memory.md # English first, welcome
docs/demo-library-at-scale.md # Logos library at scale, Import
docs/research/audible-addon-seek.md # an add-on that seeks his Audible Bible
docs/research/greek-speech-libraries.md # libraries for Greek sound
docs/research/kjv-tr.md # the KJV and the Greek behind it as a text pair
docs/research/logos-section-refs.md # grammar sections by a book's own Logos data type
docs/research/logos-morph-charts.md # Logos Morphology Charts
docs/research/logos-factbook.md # Factbook at a proper name: link form, source
docs/research/logos-exegetical-guide.md # the Exegetical Guide
docs/research/letter-sounds.md # lone vowels and letter sounds on the phone
docs/sources/latin-bible.md # Latin Bible sources: licences, word data, versification, audio
docs/sources/tagnt.md # STEPBible's TAGNT: variant words' Strong's numbers and the guess
docs/sources/msb-chunk-pairs.md # MSB '. . .' rows, the chunks
docs/sources/public-domain-works.md # Spurgeon and other public-domain works: sources
docs/sources/sermon-index.md # a sermon index: Henry, Logos, preachers, themes
docs/design/library-at-scale.md # the Logos library at scale
docs/design/bible-talk-trim-map.md # bible-talk rules before the 100,000-byte trim
docs/design/reader-split.md # the Reader split: design, mockups
docs/design/sermon-sources.md # the one Sermons list
docs/sources/septuagint-and-webster.md # Septuagint and Webster 1828 sources and licences
docs/sources/lxx-derivation-probe.md # the LXX derivation probe
docs/sources/lxx-morph-probe.md # lxx-morph: verdict
docs/sources/lxx-settled-audit.md # LXX settled words: hand audit
docs/lxx-derivation.md # the LXX derivation: layers, files, the bar
docs/lxx-report.md # GENERATED by lxx:report: where each book stands
docs/lxx-align.md # Brenton's English aligned to Swete's Greek; A pairing pass ends with lxx:align-expect
docs/lxx-grammar-gaps.md # GENERATED by lxx:grammar-gaps: what the Greek tables lack
docs/numeral-sweep.md # GENERATED by numerals:sweep: every numeral phrase's sum against its English
docs/split-pairing-sweep.md # GENERATED by split:sweep: Septuagint verses unpaired, both ways
```
