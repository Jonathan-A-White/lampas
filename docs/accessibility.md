# Accessibility check

`tests/e2e/accessibility.spec.ts` (mw-cwf538.2, the epic 'Lampas for every age and every ability') runs axe (`@axe-core/playwright`) with the WCAG 2.1 A and AA
rules over the eight main screens, each opened as a thumb opens it at 390x844: the Reader, the Immersive reader (On), Quick test, Read it aloud (with its
marks), the Talk sheet, Settings, an idea sheet and Placement. Each screen is checked in the phone's light theme, again in its dark theme and again in High contrast. The spec fails on any
violation: a missing accessible name or role, a label that is not in the name, colour contrast. It names the eight screens in a list of its own (the first
test) and ends with a canary: a button that loses its accessible name must make the check fail, or the check looks at nothing.

`npm run test:e2e` runs the whole e2e suite (`playwright test`; `npm run build` first). `npx playwright test tests/e2e/accessibility.spec.ts` runs this spec alone.

## What a new screen or control must do

- A control has an accessible name that contains its visible text (a chip that reads `New 3` is named `New 3 words`, not `New words: 3`).
- Text is 4.5:1 against what it sits on, in the Light, Dark and Sepia themes (large text 3:1), and 7:1 in High contrast (pure white on black, `tests/unit/themes.test.ts`). The tokens of `src/index.css` are chosen for it, including text over
  a tint (`bg-accent/10`, `bg-bad/15`); a dimmed text (opacity) is dimmed only as far as it keeps 4.5:1 (the Immersive reader's verse numbers: 0.75).
- A new screen is added to `SCREENS` in the spec, with the steps that open it.

## Under TalkBack (mw-cwf538.3)

`tests/e2e/talkback-reading.spec.ts` holds the proof; the rules a new screen keeps:

- **Greek is `lang="el"`, with `data-lang="grc"`.** Android's text to speech has a Greek voice under `el` and none under `grc`, so a span tagged `grc` is read in the phone's
  own language. A Greek span spreads `GREEK_LANG` (`src/script/greekLang.ts`; `greekLang(bool)` and `langOf(bool)` for text that is Greek only sometimes); English text carries
  no `lang` on its words. `tests/unit/greek-lang.test.ts` fails on a `lang="grc"` written by hand. A CSS rule or a test that selects Greek selects `[lang='el']`. (The tag could
  not be tried on a real TalkBack from the Laptop; the choice is the Android voice list's.)
- **What happens without a control is announced, once.** The app has one polite live region (`LiveRegion`, `role="status"`, `aria-live="polite"`, out of sight, mounted in
  `App.tsx`) and `announce(text)` (`src/ui/live.ts`) says into it: the tutor's answer when it arrives (`Talk.tsx`), a Quick test or Review answer's result (`WordQuestion.tsx`) and
  a Read-it-aloud verdict with its marked words (`ReadCheck.tsx`). Call it from an effect that runs once for the event, never from a render; a screen that draws again says
  nothing. A line that only repeats the announcement is not a second `role="status"`. The region is a `role="status"` on every screen, so a test that wants a screen's own status
  line takes it with `tests/support/status.ts` (jsdom) or `[role="status"]:not([data-live-region])` (Playwright).
- **Focus goes with a sheet.** `useSheetBack` (`src/ui/sheetBack.ts`, called by every sheet) moves focus to the sheet's first heading (h1 to h3 of the newest dialog) when it opens
  and back to what had focus when it closed, if nothing else has taken focus. A sheet needs a heading in its dialog (the word sheet's Greek word, or the English he tapped); a
  Done button of such a sheet does not take focus on mount (`focusOnMount`): the heading does.

## Rules left out of the check

An axe rule left out is listed here with its reason, and by id in `tests/support/axe-excluded.ts`; `tests/unit/accessibility-doc.test.ts` fails when the two lists differ.

- `meta-viewport`: pinch zoom is locked on purpose (`maximum-scale=1, user-scalable=no` in `index.html`, with `touch-action: manipulation` on html), because a fast double
  tap zoomed the app and a page that scrolls and zooms breaks the one-handed reading screens (docs/pwa-best-practices.md 'Decide pinch zoom per app'; the decision is
  row C4 of docs/best-practices-audit.md). Larger text is the Text size setting (Small to Largest, 85 to 160 percent, `src/appearance/textSizes.ts`). Unlocking zoom is the
  Governor's decision, not a small fix; the epic's other stories on larger text may reopen it.

## Large text (mw-cwf538.5)

`tests/e2e/large-text.spec.ts` sets the browser's default font size to 200% (a Chromium profile with `default_font_size` 32, the preference a phone's Font size changes) and opens
the Reader, Quick test, the Talk sheet, Settings and Placement at 390x844: no control, heading or label may be cut off, squeezed to nothing or off the screen, and a shot of each
is attached (`shots/large-text-*.png`). Type is in rem (the Text size setting and the phone's own size both scale it); spacing and the 44 px tap height are px. A row that cannot hold
its items at 200% wraps to a second line rather than clipping.
