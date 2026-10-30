# Commands in full

The long notes of CLAUDE.md's Quick reference, moved word for word (mw-gq6.485): Playwright's projects, the live tests, the grind build and the data tools. CLAUDE.md keeps the everyday commands; a command's long note goes here.

```bash
npx playwright test  # all e2e, no flags (use --workers=2): the 'chromium' project (1280 wide) and 'shots' (390x844); chromium leaves out the specs that only pass at a phone's width
                     #   (tests/support/e2e-projects.ts PHONE_WIDTH_SPECS: add a spec there only if it cannot set its own viewport (the list is empty today: a spec that asserts a 390x844 bound does test.use({ viewport })); tests/unit/playwright-live-config.test.ts holds the list
                     #   to the config); the 'live' project is in the config only for `npm run e2e:live` (LAMPAS_E2E=live), so a plain run is green on a clean main; playwright.config.ts also gives the specs the
                     #   __APP_SEMVER__ global that src/config.ts needs (Vite defines it, Playwright does not)
npm run e2e:live     # the live tests (tests/e2e/*-live.spec.ts: tutor-live asks the tutor about Romans 8:28, talk-live asks the Bible talk, read-live reads 8:28 aloud to the mill through Chromium's fake microphone playing tests/fixtures/read-8-28.wav, and its Greek case plays read-8-28-el.wav; Playwright project 'live'): drives the DEPLOYED app
                     #   (LAMPAS_LIVE_URL, default https://lampas.allmymind.org; no build, no preview server; Postern's CORS allows
                     #   only that origin) and asks the real Postern tutor about Romans 8:28 with LAMPAS_TEST_KEY (or
                     #   ~/.config/mw/lampas-test.env); so it proves a landing only after the deploy; skips, never passes, with
                     #   no key or no backend; spends a grind of fuel per question; not in the gate or `npm run shots`; tests/e2e/live.ts holds the key lookup they share
npm run grind:build  # writes the settings the bible-talk grind may change (settings_changes in its answer schema, the list in its instructions) from src/settings/registry.ts;
                     #   run it after adding a setting to the registry; tests/unit/bible-talk-grind.test.ts fails when grinds/ is behind it; the list is in the one part that holds
                     #   its markers (grinds/bible-talk.instructions/330-changing-the-apps-settings.md); a second run changes nothing
npm run ladder:docs  # scripts/ladder-docs.ts writes the ladder table of docs/grammar.md and the id and title columns of docs/card-audit.md from LADDER (src/data/grammar/ladder.ts), between their
                     #   <!-- ladder:begin --> / <!-- audit:begin --> markers, and the Hebrew ladder's (src/data/grammar/hebrew/ladder.ts) between the <!-- ladder-hbo:begin --> / <!-- audit-hbo:begin --> ones after them; the audit's verdict and note columns are by hand, kept by idea id (a new idea gets a default row to judge); adding an idea
                     #   is its entry, its card, then `npm run ladder:docs && npm run grind:build`; tests/unit/ladder-single-source.test.ts fails, naming the idea and the file, on a missing card,
                     #   a stale table or audit row, a grind built before the ladder changed, an unknown need or a cycle; a second run changes nothing
npm run logos:catalogue -- <export.csv>  # scripts/logos-catalogue.ts writes src/resources/catalogue/<kind>.json (the seven kinds) from data/logos/catalogue-rules.json and a Logos library export (Library > Save as Spreadsheet);
                     #   `--out <dir>` writes elsewhere; deterministic, a second run changes nothing; prints a note naming each rule (id, type, series) that matches no row of the export; not in the gate; docs/resources.md 'The catalogue'
npm run logos:fit -- <export.csv>  # scripts/logos-fit.ts prints the rows of an export the catalogue's rules do not take, by kind, with their Logos types and the data types of their ReferenceSupersets, and counts the rest
                     #   by type; writes nothing; the Mayor's reading of a list a reader sent
npm run check:step   # asks STEPBible what each Strong's link finds (G1722, G3361, G2424 and Romans 8's 20 commonest lemmas; `-- G25 ...` or `-- --all`); network, not in the gate; docs/resources.md
npm run greek:edition # compares the MSB table's Greek with Robinson-Pierpont 2018 and 2005 (byztxt/byzantine-majority-text on GitHub) and rewrites docs/greek-edition.md (the verdict, counts by kind, examples; network; not in the gate; the Preface's edition line, src/preface.ts PREFACE_EDITION_LINE, is held to its verdict by tests/unit/greek-edition.test.ts)
npm run ladder       # scripts/ladder-el.ts scores every verse for how hard it is to PRONOUNCE and writes public/data/ladder/el.json, easiest first; scripts/ladder-en.ts does the same for the English as the Reader shows it (en.json, its own list); scripts/ladder-he.ts scores every Old Testament verse from its words' syllabified transliteration (he.json, 23,144 verses; it prints the verses it could not syllabify) (docs/reading-ladder.md; the output is committed, a second run changes nothing, data:build leaves ladder/ alone; its weights are a first guess)
npm run forms:build  # public/lemma-forms/<lemma>.json from the chapters (docs/data.md); git-ignored, `npm run build` makes it first, a dev server needs it once for a table's This word
npm run fixture:chapter -- <book> <n>   # node scripts/fixture-chapter.mjs: copies a built chapter, byte for byte, from public/data/<book>/<n>.json to tests/fixtures/data/<book>/<n>.json (tests/support/chapter-fetch.ts serves a fixture before the built file; jon 1 is features/old-testament.feature's chapter); never retype a fixture
npm run data:build   # data/raw (git-ignored, downloaded if absent) -> public/data/<book>/<chapter>.json + index.json + lexicon.json + frequency.json,
                     #   with the RP 2018 apparatus and the RP 2026 changes laid on the Greek (the changes are written to data/rp2026-overlay.json, docs/data.md);
                     #   the output is committed and a second run changes nothing (docs/data.md)
npm run variants:english  # scripts/variants-english.ts: the English of each variant unit the MSB footnotes do not speak for, made by the tutor's model (sonnet, through `claude -p` on the home host) into data/variant-english.json; renders only the units without an entry (--raw <dir>, --limit N, --batch N, --parallel N); data:build stops on a unit with no English (docs/data.md 'Variant English')
npm run variants:align  # scripts/variants-align.ts: pairs the English of each variant reading with its Greek word by word (`english.align`, scripts/data/variantAlign.ts, no model); `-- --write` lays it on public/data and re-stamps the fingerprints; prints the count fully/partly/unpaired by source (docs/data.md 'Variant English')
```

## Timing tests (MW_TIMING)

A test that needs the real clock is listed in the rig's `timing_tests` (millwright's `rigs/lampas.toml`, `docs/timing-tests.md`) and carries a `covers:` line saying what the real clock proves. `vitest.config.ts` (`timingFilter`) and each gate project of `playwright.config.ts` (`playwrightTimingFilter`, from `pwa-kit/test-preset`) read `MW_TIMING` and `MW_TIMING_TESTS` (comma-joined globs): `MW_TIMING=skip` leaves those files out (what the gates set), `MW_TIMING=only` runs just them (the nightly timing job; vitest then passes with no file when the timing tests are all Playwright specs), unset runs everything. The `live` project is in neither. `tests/unit/timing-filter-config.test.ts` holds it. Today the one timing test is `tests/e2e/turn-pages-trace.spec.ts`.

Playwright's waits come from `pwa-kit/test-preset`'s `playwrightTimeouts` (a test 60 s, `expect()` and `expect.poll` 20 s: Playwright's own 5 s was outrun on a loaded host, mw-5r3p30.713), spread into `playwright.config.ts`; `tests/support/timeouts.ts` re-exports them (with `ASYNC_WAIT_MS` and `HOOK_TIMEOUT_MS`) as the one source, and `tests/unit/playwright-timeouts.test.ts` holds both. A spec waits on its condition (`expect(...)`, `expect.poll`) under that budget and passes no shorter `timeout:`; a real-clock `waitForTimeout` carries a comment saying why.
