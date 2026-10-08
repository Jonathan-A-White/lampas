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
npm run check:licence -- <pubkey>  # live testnet licence check, opt-in, not in the gate
npm run e2e:live     # the live tests (tests/e2e/*-live.spec.ts: tutor-live asks the tutor about Romans 8:28, talk-live asks the Bible talk; Playwright project 'live'): drives the DEPLOYED app
                     #   (LAMPAS_LIVE_URL, default https://lampas.allmymind.org; no build, no preview server; Postern's CORS allows
                     #   only that origin) and asks the real Postern tutor about Romans 8:28 with LAMPAS_TEST_KEY (or
                     #   ~/.config/mw/lampas-test.env); so it proves a landing only after the deploy; skips, never passes, with
                     #   no key or no backend; spends a grind of fuel per question; not in the gate or `npm run shots`; tests/e2e/live.ts holds the key lookup they share
npm run data:build   # data/raw (git-ignored, downloaded if absent) -> public/data/<book>/<chapter>.json + index.json;
                     #   the output is committed and a second run changes nothing (docs/data.md)
```

## Tests

- Test-first: write the failing test or scenario before the code that makes it pass.
- Every behaviour is a Gherkin scenario under `features/*.feature` with steps in
  `features/steps/*.steps.ts(x)` (@amiceli/vitest-cucumber), run inside `npm test`. Import
  `@testing-library/react/dont-cleanup-after-each` before React Testing Library in a step file.
- Unit tests live in `tests/unit/`; shared fakes in `tests/support/` (`fake-registration.ts` fakes a
  service worker registration; `fake-postern.ts` is a Postern backend with a mill that opens the grist and answers it,
  used by features/tutor.feature and, through `playwright-postern.ts`, by tests/e2e/tutor.spec.ts). Tests run in jsdom with `fake-indexeddb`, in `TZ=UTC`.
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
build-version.ts     # '<version> · <UTC time> · <commit>' stamp (the commit is read from git at build time); src/BuildVersion.tsx shows it as 'v…' on Home and Unlock
vite.config.ts       # react, tailwind 4, vite-plugin-pwa (injectManifest, registerType 'prompt')
src/main.tsx         # scroll guard first, then render, then register the worker
src/App.tsx          # the shell (data-shell); picks the screen by hash route (src/nav/route.ts); seeds words on first open
src/Reader.tsx WordsScreen.tsx ImportScreen.tsx QuizScreen.tsx About.tsx SettingsScreen.tsx  # the screens (#/ , #/words, #/import, #/test, #/about, #/settings); the Reader is Romans 8, English | Greek, header = title, English | Greek, the gear;
                     #   Settings (opened by the gear) holds the Appearance (Theme Phone | Light | Dark, Text size Small | Normal | Large | Largest), the Layout (Verse by verse | Paragraph), Section headings (On | Off), the Weave, the English and Greek voice pickers, the English and Greek speed sliders, the Greek pronunciation list, and links to Words and About;
                     #   About is built from ATTRIBUTION.md (src/attribution.ts), opened by the About button under the chapter
src/Ask.tsx          # the Ask box under the selected verse (field, Sending / Waiting, No licence, Could not reach + Retry) and the kept answer cards
src/useAsks.ts       # the questions in flight by verse; a question keeps waiting when he selects another verse; the answer is stored when it comes
src/services/tutor.ts  # askGrind (bsv-kit door + grist.sendGrist + grist.awaitAnswer, for any grind kind) and askTutor, the verse-ask kind on it; the request and answer shapes, isVerseAnswer, tutorTimings (poll 3 s, 180 s deadline), FAILURE_TITLES
src/Talk.tsx useTalk.ts services/talk.ts  # Bible talk: the Talk bar pinned under the reader and the bottom sheet it opens ('Talk about Romans 8' or 'Romans 8:28' when a verse is selected);
                     #   push-to-talk (src/useVoice.ts over src/services/listen.ts, a trimmed port of Postern's listen.ts; src/ui/holdPress.ts is the tap-or-hold button: 500 ms, 60 px slide-away drops): hold the Talk bar or a verse number, or the mic button beside Send, and his words show live in the sheet and go on release; tests fake the recogniser with tests/support/fake-recognizer.ts;
                     #   useTalk keeps the messages in flight per conversation (a message keeps waiting when the sheet closes; an answer that comes while its sheet is open is read aloud);
                     #   services/talk.ts is the bible-talk kind: the request (reference, greek, english of the verse or of the chapter's first 3 verses, question <= 600, history = the last 10 turns {q, a}, solid_words),
                     #   fitHistory (cuts old answers, then old turns, to fit the grist's 10 KiB record), REFUSAL (the one sentence for anything outside the Bible), isTalkAnswer; data/answerWord.ts finds an answer's Greek word in the chapter for the word sheet
grinds/              # the mill's grinds for lampas: verse-ask and bible-talk, each .json + instructions + answer schema (same keys as SpellForge's tutor-turn.json; the mill must allow each kind)
src/events/bus.ts   # the typed event bus screens talk through: publish, subscribe, latest, useEvent, useLatest; docs/events.md lists every kind, who publishes, who listens
src/nav/             # route.ts: the hash address (screen, and in the reader '?c=8&view=greek&weave=off&v=28'), navigate, replaceHash, useAddress;
                     #   lastRoute.ts: reopen where he left it (localStorage lampas.lastRoute, lampas.trail = last 20 addresses, lampas.scrolls; history.state.i;
                     #   a bare open lands on the newest and rebuilds history so Back walks the trail, past the oldest on Home; an open that names a place wins);
                     #   readerAddress.ts: bus events -> address (replaceState); scrollMemory.ts: scroll per address, restored with a ResizeObserver up to 2.5 s
src/data/roundKeep.ts  # a half-done Quick test round in localStorage (lampas.round); the test screen offers 'Round left unfinished: Resume | New round'
src/layout/layouts.ts # the reading layouts as a list (Verse by verse, Paragraph): each says where a block of verses starts (a verse with a heading always does); blocksOf cuts a chapter; a new layout is one more entry + how the Reader draws it
src/WordSheet.tsx    # the bottom sheet a tapped word opens (tap outside, swipe down on the handle, Done or Escape closes it)
src/appearance/     # themes.ts (Theme list, THEME_COLORS = the browser bar's colour per palette), textSizes.ts (the sizes list, 85 to 160 %), appearanceSync.ts
                     #   (bus -> html[data-theme], html --lp-scale and the theme-color meta, kept in localStorage too so main.tsx's restoreAppearance() paints before React;
                     #   'phone' follows prefers-color-scheme live). The palettes are CSS variables in src/index.css (the light one is written twice: tests/unit/themes.test.ts
                     #   holds the copies equal). Text size scales the root font size; --spacing and --lp-tap are divided by --lp-scale so a thumb stays 44 px; the header
                     #   keeps the phone's own size (chrome-title / chrome-text / chrome-small utilities)
src/speech/          # languages.ts: the registry of spoken languages (english, greek) and their speeds (RATE_MIN 0.5 to RATE_MAX 1.5, default 1; a new language is one entry);
                     #   pronunciation.ts: the registry of Greek pronunciations (only 'modern', el-GR; each has respell(greekWord), the word sheet's 'hree-STO' under the Greek; a scheme is one file in schemes/ plus a line in SCHEMES; docs/pronunciation.md); settingsSync.ts: saved voices, speeds and pronunciation -> bus -> greek.ts; greek.ts: speak(text, key, onFail?, language = 'greek') with speechSynthesis, lang el-GR (en-US for English), the language's own rate and voice, the phone's Greek voice, no server; a second tap on the same key stops it; hasGreekVoice() true/false/'unknown'; SpeakButton.tsx: the speaker on a word (aria-label 'Hear it') with the one-line no-Greek-voice help;
                     #   readAloud.ts: read aloud what is shown (runsOf: English chunks en-US, Greek words el-GR, a woven verse in runs of one language; startReading / pauseReading / resumeReading / stopReading, one epoch so a late utterance starts nothing, verse-reading on the bus per verse, Pause keeps the verse and Resume re-reads it); greek.ts speakPart is its one engine call; startAnswer / stopAnswer read a Bible talk answer through the same engine (answerRuns.ts cuts it into English and Greek runs; reading.answer is its id, so the reader's highlight and bar stay out of it); speakWord(text, language) says one word now (a long press on a word of the Reader, src/Reader.tsx Tap: 500 ms, under 10 px of movement, vibrate(10), word-spoken on the bus; words are select-none and swallow the contextmenu);
                     #   ReadControls.tsx: Read from the top / Read from here (header), the play button on a verse ('Hear the verse'), the Pause | Stop bar; wakeLock.ts: the screen stays on while reading (re-asked on visibilitychange)
src/fonts/           # Gentium Plus (Greek + Greek Extended, 400 and 700 woff2) and its OFL licence; @font-face is in src/index.css
src/config.ts        # issuer (default the Governor's key; VITE_LAMPAS_ISSUER overrides), collection 'lampas', chain, Postern door, the device key's storage name
src/gate/            # Gate (wraps App in main.tsx): Unlock until the phone's key holds a lampas licence; 24 h offline grace
src/services/deviceKey.ts licenceCheck.ts licenceCache.ts  # the key in localStorage; chain lookup (bsv-kit licenceStatus with { issuer }: issuer-signed mint, issuer's revoke); the held memory
src/UpdateBanner.tsx # 'Update ready, tap to reload'; the tap posts SKIP_WAITING
src/sw.ts            # the worker: precache, precache guard, SKIP_WAITING, claim on activate
src/precacheGuard.ts # never serve a .js/.css whose Content-Type does not fit
src/services/appUpdate.ts  # watches the registration, tap -> SKIP_WAITING -> reload once, periodic update check
src/ui/              # scrollGuard.ts (page never scrolls), focus.ts (focus with preventScroll)
src/data/db.ts       # Dexie, version 6: words {lemma key, lemmas, gloss, lesson, state, since}, meta and settings {key, value}, results {lemma, when, right}, answers {ref 'rom.8.28', question, answer, words, when}, talks {ref 'rom.8' or 'rom.8.28', q, a, words, when}
src/data/repositories/  # the only way UI reaches Dexie (words.ts: seed on first open, list, set state, import, and list the solid lemmas; settings.ts: the reader's English | Greek view, Weave Off | Solid words, the English and Greek voice (voiceURI) and the Greek pronunciation; results.ts: recordAnswer; answers.ts: the tutor's answers per verse; talks.ts: the Bible talk's turns per chapter or verse)
src/data/quiz.ts     # Quick test, pure: nextState (the two-in-a-row rule), drawWords, buildOptions, buildQuestion; the random source is injected (mulberry32 in tests; App's newRandom prop)
src/data/lemma.ts    # BMA lemma -> headword (the key) + TBESG lexicon lemmas (εἶπεν -> λέγω, εἶπον ...)
src/data/importWords.ts  # parses pasted 'lemma — gloss' lines and rows of the example table
src/data/pictures.ts  # memory pictures: headword -> public/pictures/<name>.svg (52 of the 63 seed words); src/WordPicture.tsx shows one on a Words card and beside the Quick test's word; docs/pictures.md
src/data/seed-words.ts   # GENERATED from docs/example-words.md by scripts/seed-build.ts: 63 words
src/data/chapter.ts  # chapter types, loadChapter(book, n), wordLemma/wordGloss/wordParse: screens never read the raw keys
src/data/weave.ts    # the diglot weave: weaveVerse(verse, solidLemmas) -> per English chunk the Greek words shown in its place, or null
src/data/parseCode.ts # RP parsing code -> plain words (shared by the data build and the app)
scripts/data-build.ts # the New Testament data build (npx tsx); tests/fixtures/data/ holds small source slices
public/              # icon.svg (lamp glyph), icon-192.png, icon-512.png
public/pictures/     # the hand-drawn memory pictures, one SVG each (docs/pictures.md says how to add one)
public/data/         # generated NT JSON, committed (~30 MB); only index.json and rom/8.json are precached
features/ tests/     # BDD features + steps; unit tests; e2e + shots; support fakes
docs/pwa-best-practices.md   # copied verbatim from the vault; the law for every screen
docs/example-words.md        # the owner's own BMA word list (public, an example template); the seed's source
docs/testing.md      # the gate's test seam: where the device key lives and how a test seeds it
docs/events.md       # every event kind on the bus, its payload, who publishes and who listens
docs/pronunciation.md # the respelling schemes: Modern Greek's rules and how to add Erasmian
docs/pictures.md     # the memory pictures: the rules for one, how to add one, which seed words have none
docs/data.md         # the data's JSON shape, its two sources and licences, and what the build changes
```

## Conventions

- TypeScript strict; no explicit `any`. Tailwind 4 utilities with the tokens in `src/index.css`.
- Dexie: never edit an old `version()`; repeat the whole stores map on each bump with a `// vN:` comment.
  UI code goes through `src/data/repositories`, never Dexie tables directly.
- Page never scrolls: html, body and `#root` are `overflow: clip` at `100dvh`; screens scroll in their own
  `.screen` box. Focus with `focusQuietly` (preventScroll); no `autoFocus`.
- Bottom insets: never write `env(safe-area-inset-bottom)` in a component. A pinned bar or sheet pads with `var(--lp-bar-inset)`
  and the end of a scroll box with `var(--lp-end-inset)` (src/index.css: the phone's inset with a 24 px / 48 px floor, because
  Android Chrome does not always report the navigation bar). tests/e2e/bottom-reach.spec.ts holds the proof.
- Raw text downloads (`data/raw`) stay out of git; the generated JSON per chapter is committed.
  `ATTRIBUTION.md` names every text and licence.
