# CLAUDE.md

Development guide for AI assistants (Builders) working on Lampas: a licence-gated PWA for reading the
New Testament in Koine Greek. Served at https://lampas.allmymind.org from the VPS (Vite `base` is `/`;
the Laptop's after_landing builds `dist/` and rsyncs it). There is no GitHub Pages workflow; do not
add one, and do not change `.github/workflows/` unless a story says so. Never bump `package.json`'s version.

VISION.md is the Governor's vision for this app: a change that would cross one of its lines stops and says so.

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
npm run check:licence -- <pubkey>  # live testnet licence check, opt-in, not in the gate
npx playwright test  # all e2e (use --workers=2; `npm run build` first): projects 'chromium' and 'shots' (docs/commands.md)
npm run e2e:live     # the live tests against the DEPLOYED app; not in the gate (docs/commands.md)
npm run grind:build  # after adding a setting to the registry; a second run changes nothing (docs/commands.md)
npm run data:build   # also check:step, greek:edition, ladder: data tools, network or slow, not in the gate (docs/commands.md)
```

## Grinds and their examples

Each grind (`grinds/<kind>.json`) has examples, an input schema and, for bible-talk and verse-ask, instructions in one part per section: read docs/grinds.md before you touch `grinds/`.

**When you change a grind's behaviour (its instructions, schemas, or what the app sends), update or add its examples in the same story. A new grind ships with an input schema and at least one example.**

## Tests

- Test-first: write the failing test or scenario before the code that makes it pass.
- Every behaviour is a Gherkin scenario under `features/*.feature` with steps in
  `features/steps/*.steps.ts(x)` (@amiceli/vitest-cucumber), run inside `npm test`. Import
  `@testing-library/react/dont-cleanup-after-each` before React Testing Library in a step file.
- Speech and the microphone are never faked by hand (mw-it6qk5.3): they are bsv-kit's honest fakes (`bsv-kit/testing/speech` and `/mic`: an utterance
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

src/TapToHear.tsx   # the 'Tap to hear' bar under the Quick test word (src/QuizScreen.tsx), a flashcard and a grammar question (mw-5r3p30.278: hearing is always a tap, even one word, 12-speech-and-audio.md; the old hold bar is gone), src/ui/TapBar.tsx (the look of src/ui/HoldBar.tsx: h-24, rounded-3xl, speaker icon over the label, barClass shared): one tap says the Greek word with speakWord (the long press's engine; speakLetter for a letter drill), the icon turns to a stop square while its word is being said, whoever said it (greek.ts useWordSaid: the text last handed to speakWord / speakLetter, so the Quick test's answer, which says the word by itself, shows it too; mw-5r3p30.324) and a tap then stops it (stopSpeaking); a long press on a reader word likewise plays to its end after release. Only TALKING stays a hold (Talk, Hold to read: HoldBar)
src/IdeaSheet.tsx data/grammar/ideaSheet.ts  # the idea sheet (mw-hqd5bz.7, docs/grammar.md 'The idea sheet'), opened by Learn this idea on a Grammar sheet (WordSheet holds it over the Grammar sheet; ladder.ts ideaOfTerm): the idea's title, its examples (first, under the title: three drawn and the rest under 'Show N more', so every row is in view on opening, upright and sideways, where the slider and buttons are a column at the right; mw-5r3p30.369, tests/e2e/sheet-rows-in-view.spec.ts), then its teaching for a total beginner (mw-5r3p30.234, data in src/data/grammar/teach/<tier>.ts, teachOf; docs/card-audit.md): What it is, How to spot it (with the card's table where the idea is a set of endings or forms), How it sounds (sound ideas only, the scheme's lesson), a Worked example (one NT word taken apart, from his verse when it holds one, workedFor, with its respelling); tests/unit/teach-cards.test.ts holds every card to no term before the card that teaches it; the examples are up to three the card can explain (ideaExamples/cardExplains: parsed with the idea, a part of speech taught at or below it, in its table; exampleGloss one sense, exampleNote its parsing in the card's terms; from the goal's passage, else the open chapter; ideaPassage reads the saved goal text, getSavedGoalText, repositories/goalSaved.ts), a speaker on each, the level SLIDER 'Your level' (mw-i7xe0n.3: Not yet · Learning · I know it, a native range with a 44 px thumb, arrow keys; Learning/Not yet = repositories/grammarLevels.ts teachIdea: level + the schedule row + 'idea-taught' on the bus; I know it opens Drill it, src/DrillItScreen.tsx, and only a pass makes it solid, how 'drill', the pill 'Proved by drill'; recordDrill keeps the run), 'Mark known without a drill' (teachIdea known), a Drill it button, 'This builds on <title>. Prove it first.' + 'Go to <title>' and a 'Go to <title> first?' question when an idea it needs (unmetNeed) is not solid, and Ask the tutor; an example from another chapter opens its word sheet over that chapter (WordSheet `elsewhere`); an idea of spelling (alphabet, letters, pairs, breathings, accents, iota subscript, syllables, punctuation: ideaSheet.ts isSpellingIdea) gets up to 12 examples, one per form, found by spelling (inference.ts foundationSpans) with the letters it is about marked in `parts` (IdeaSheet draws [data-marked]); a LETTER or SOUND sheet (isSoundIdea) shows only words where the chosen scheme reads the marked stretch as the letter alone or the one pair (`Pronunciation.spellings`, `SoundLesson.sounds`; mw-5r3p30.351, docs/grammar.md), four easy ones, widening verse > pericope > chapter > book, with a 'In a pair it sounds different' line; an idea of the letters, sounds and marks tiers also shows its items as tiles above the text (mw-5r3p30.232, src/TeachTiles.tsx, data/grammar/teachTiles.ts teachTiles(idea, scheme): the alphabet's 24 letters with name and the scheme's sound, a tap says the letter, the name opens that letter's own sheet over this one; pairs and breathings with an example word and its play button; every sound is the chosen pronunciation's)
                     #   push-to-talk (src/useVoice.ts over bsv-kit/composer's startListening, the one listen in Lampas, which Ask's browserSpeech uses too: no local copy, mw-5r3p30.426; a language-not-supported walks every route once (on-device and cloud en-US, then cloud default) and names them when all fail; src/ui/holdPress.ts is the tap-or-hold button: 500 ms, 60 px slide-away drops; src/ui/HoldBar.tsx is Postern's hold-to-talk bar (h-24 = 96 px, w-full max-w-xl, rounded-3xl, mic over the label, bg-bad while listening), the ONE hold-to-talk control: the Talk sheet's foot (last control, under the field and Send), the reader's Talk bar, and the Verse view's one bar at its foot): hold the Talk bar or a verse number, or the sheet's own bar at its foot, and his words show live in the sheet and go on release; tests fake the recogniser with tests/support/fake-recognizer.ts (`android` plays Android Chrome's on-device check, answered by answerChecks());
Which file holds what is in `docs/layout/`, one file per area (listed under Read by need). **A new layout note goes in the docs/layout/ file for its area, never in CLAUDE.md**, which stays under 16,000 bytes (`tests/unit/claude-md.test.ts`).
grinds/              # the mill's grinds for lampas: verse-ask, bible-talk, verse-read, find-refs (one shared picture in, its Bible references out, src/share/findRefs.ts), drill-items (mw-hqd5bz.36, no picture: after a Review round the 1-3 ideas he missed most and verses of his passage that use them go in, short drill items in the shapes GrammarCard draws come out; src/review/moreItems.ts asks in the background, src/data/grammar/fetchedItems.ts builds the request and checks every item against the verses sent, src/data/repositories/fetchedItems.ts keeps them, Review serves them first; docs/grammar.md 'More items from the mill') and feedback (the last is a forwarding grind, "forward": "mayor": no model, no instructions or answer schema; the mill mails it to the Mayor with up to four images and answers {"status":"sent"}; its input schema is grinds/feedback.input.schema.json), each other one .json + instructions + answer schema (same keys as SpellForge's tutor-turn.json; the mill must allow each kind;
src/ChapterPicker.tsx # the chapter picker (mw-5r3p30.60), opened by the Reader's title: a bottom sheet (useSheetBack) with the 39 Old Testament books (src/data/otBooks.ts, rows [data-ot-book] marked 'Opens in Logos'; a chapter is a button that opens no app and never a Lampas chapter (mw-5r3p30.496): a panel [data-ot-choice] kept in view under the grid (src/resources/oldTestamentChoices.ts) has 'Read in Logos' (src/resources/logosBible.ts chapterLink in his Bible in Logos, setting 'logosBible', default LSB) and 'Listen in Audible' (audioBible.ts audibleListen, remade at the tap), each only while its setting is on; with Logos off it says so and 'Turn on Logos' switches it on, and with the Audio Bible off too it names that setting; mw-5r3p30.71) then the 27 books in canonical order (src/data/books.ts, searchable, in a box of its own) then a 4-column grid of the book's chapters (counts from loadIndex, data/index.json); a chapter opens through openReader({book, chapter}) as a new Back step (the Reader is a ReaderBody keyed by book/chapter, so everything starts afresh); a chapter that cannot be fetched says 'is not on this phone yet, and you are offline' with Try again and Choose another chapter

## What the tutor is told

VISION.md 'The tutor': the tutor is told, on every ask, each app setting and each part of his progress that could change its answer. `src/tutor/knows.ts` is the table of what each grind (bible-talk, verse-ask, verse-read, tips) is sent, with a written reason for each thing it is not; a new setting is classified in its `BEARS_ON` and `tests/unit/tutor-knows.test.ts` fails until it is sent or has a reason (docs/ask-tutor.md 'The tutor knows what bears on its answer').

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
- Credit everything we build on (mw-vtjxh4.1): `ATTRIBUTION.md` is the About screen's source and the README's Credits point at it; a new dependency, text, font, icon, service or borrowed idea gets an entry in the same commit (`[Name](url)` as the link text, never a raw URL; use, licence with a link, `Changes:`); `tests/unit/credits.test.ts` fails on a `package.json` dependency with no entry naming its package in backticks. The tutor on About is told each credit as a short `{name, use, licence, link}` (`src/tutor/credits.ts` CREDITS, docs/ask-tutor.md): a new bullet needs its credit there too, and `tests/unit/credits-for-tutor.test.tsx` fails until it has one.

## Read by need

One line per file under `docs/`: open the ones your story touches. `tests/unit/claude-md.test.ts` fails when a docs/ file is missing here.

```
docs/layout/app.md           # Layout: the shell, build, manifest, worker, updates and What's new, the bus, appearance, src/ui/, public/
docs/layout/reader.md        # Layout: the Reader: chapter picker and nav, swipe, src/nav/ and links in, chips, Immersive, word sheet, weave
docs/layout/verse-and-reading.md # Layout: the Verse view (Listen, Quiz me, passages) and Read it aloud, the Reading ladder and drill
docs/layout/tutor.md         # Layout: asking the tutor: the round button, Ask, services/tutor.ts, grinds/, tips, links, Markdown, Hebrew
docs/layout/talk.md          # Layout: the Bible talk: Talk bar and sheet, services/talk.ts, Add to my words, pictures, the bridge, study way
docs/layout/learner.md       # Layout: what the tutor knows of him: About you, Memory, the welcome, learner and learner_grammar
docs/layout/settings.md      # Layout: src/settings/ (registry, rows, search, defineSetting) and src/resources/ (study resources)
docs/layout/speech.md        # Layout: src/speech/: voices, pronunciation schemes, accents, the speaking bar, read aloud; Tap to hear
docs/layout/words.md         # Layout: Words, Quick test, Review, the schedule, Parsing drill, glosses, pictures, frontier, pace, New words
docs/layout/grammar.md       # Layout: grammar terms, the ladder, inference, Drill it, letter drill, idea sheet, placement, Goal, Paradigms
docs/layout/data.md          # Layout: Dexie and its versions, the repositories, books, chapters, parsing codes, the data build
docs/layout/licence.md       # Layout: the licence gate, the one gated mill client, the device key
docs/layout/share.md         # Layout: Share to Lampas, Your requests, Ask for another approach and feedback
docs/commands.md             # the long notes of the Quick reference: Playwright projects, e2e:live, grind:build, the data tools
docs/grinds.md               # grinds' examples and the bible-talk / verse-ask instruction parts: how to change one
docs/pwa-best-practices.md   # copied verbatim from the vault; the law for every screen
docs/example-words.md        # the owner's own BMA word list (public, an example template); the seed's source
docs/testing.md      # the gate's test seam: where the device key lives and how a test seeds it
docs/events.md       # every event kind on the bus, its payload, who publishes and who listens
docs/pronunciation.md # the respelling schemes: Modern Greek's rules and how to add Erasmian
docs/resources.md    # the study resources: what ships, where each URL form is documented, how to add one
docs/pictures.md     # the memory pictures: the rules for one, how to add one, which seed words have none
docs/links.md        # every link form Lampas takes in, with an example; where web+lampas: does not work
docs/data.md         # the data's JSON shape, its two sources and licences, and what the build changes
docs/hebrew.md       # Hebrew in the tutor: the depth setting, the font, how a Hebrew word is drawn
docs/ask-tutor.md            # the tutor: what it is told, offers, the bridge, profile, memory, welcome, pictures, sharing, requests, timings
docs/verse-view.md           # the Verse view: its actions, passages, Listen as a player, Quiz me, study way, quiz goal
docs/read-aloud.md           # read aloud: the span, the speaking bar, the tutor's responses, pages of prose
docs/reading-ladder.md       # the reading ladder: verses scored by how hard they are to pronounce, the drills
docs/grammar.md              # the grammar ladder, placement, Drill it, the idea sheet, the Goal screen (PROVISIONAL)
docs/frontier.md             # the frontier picker, the pace and the teach sheet for new words
docs/paradigms.md            # the Paradigms tables and when a form is available
docs/tips.md                 # the tips grind and the one-time tips written in the app
docs/module-map.md           # the module map (2026-10-09): modules, collisions, proposed refactors, rule breaks, library candidates
docs/greek-edition.md        # GENERATED by npm run greek:edition: which Robinson-Pierpont edition the Greek follows
docs/card-audit.md           # the audit of every teaching card for a total beginner
docs/path-gaps.md            # what the ladder lacks against BMA Tutor and the grammar book, and where it would go (PROVISIONAL)
docs/best-practices-audit.md # the 2026-10-10 audit of Lampas against the PWA best practices
docs/demo-free-ai-licensed.md   # demo: free to read, a licence unlocks the AI (mw-8m9dyu.4)
docs/demo-lampas-share.md       # demo: share or paste a screenshot into a tutor talk (mw-y3qno5.3)
docs/demo-module-splits.md      # demo: the Reader and Settings splits (mw-lwvndc.6)
docs/demo-shared-composer.md    # demo: Postern's composer shared with Lampas (mw-jtzpw0.6)
docs/demo-shared-speech.md      # demo: one read-aloud bar in Postern, Lampas and SpellForge (mw-m7v5kc.5)
docs/research/audible-addon-seek.md      # research: an add-on that seeks his Audible Bible to the passage
docs/research/greek-speech-libraries.md  # research: open-source libraries for Greek sound
docs/research/kjv-tr.md                  # research: the KJV and the Greek behind it as a text pair
docs/research/letter-sounds.md           # research: lone vowels and letter sounds in a voice like the phone's
```
