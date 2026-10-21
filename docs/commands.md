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
                     #   <!-- ladder:begin --> / <!-- audit:begin --> markers; the audit's verdict and note columns are by hand, kept by idea id (a new idea gets a default row to judge); adding an idea
                     #   is its entry, its card, then `npm run ladder:docs && npm run grind:build`; tests/unit/ladder-single-source.test.ts fails, naming the idea and the file, on a missing card,
                     #   a stale table or audit row, a grind built before the ladder changed, an unknown need or a cycle; a second run changes nothing
npm run check:step   # asks STEPBible what each Strong's link finds (G1722, G3361, G2424 and Romans 8's 20 commonest lemmas; `-- G25 ...` or `-- --all`); network, not in the gate; docs/resources.md
npm run greek:edition # compares the MSB table's Greek with Robinson-Pierpont 2018 and 2005 (byztxt/byzantine-majority-text on GitHub) and rewrites docs/greek-edition.md (the verdict, counts by kind, examples; network; not in the gate; the Preface's edition line, src/preface.ts PREFACE_EDITION_LINE, is held to its verdict by tests/unit/greek-edition.test.ts)
npm run ladder       # scripts/ladder-el.ts scores every verse for how hard it is to PRONOUNCE and writes public/data/ladder/el.json, easiest first; scripts/ladder-en.ts does the same for the English as the Reader shows it (en.json, its own list) (docs/reading-ladder.md; the output is committed, a second run changes nothing, data:build leaves ladder/ alone; its weights are a first guess)
npm run data:build   # data/raw (git-ignored, downloaded if absent) -> public/data/<book>/<chapter>.json + index.json + lexicon.json + frequency.json;
                     #   the output is committed and a second run changes nothing (docs/data.md)
```
