# Accessibility check

`tests/e2e/accessibility.spec.ts` (mw-cwf538.2, the epic 'Lampas for every age and every ability') runs axe (`@axe-core/playwright`) with the WCAG 2.1 A and AA
rules over the eight main screens, each opened as a thumb opens it at 390x844: the Reader, the Immersive reader (On), Quick test, Read it aloud (with its
marks), the Talk sheet, Settings, an idea sheet and Placement. Each screen is checked in the phone's light theme and again in its dark theme. The spec fails on any
violation: a missing accessible name or role, a label that is not in the name, colour contrast. It names the eight screens in a list of its own (the first
test) and ends with a canary: a button that loses its accessible name must make the check fail, or the check looks at nothing.

`npm run test:e2e` runs the whole e2e suite (`playwright test`; `npm run build` first). `npx playwright test tests/e2e/accessibility.spec.ts` runs this spec alone.

## What a new screen or control must do

- A control has an accessible name that contains its visible text (a chip that reads `New 3` is named `New 3 words`, not `New words: 3`).
- Text is 4.5:1 against what it sits on, in the Light, Dark and Sepia themes (large text 3:1). The tokens of `src/index.css` are chosen for it, including text over
  a tint (`bg-accent/10`, `bg-bad/15`); a dimmed text (opacity) is dimmed only as far as it keeps 4.5:1 (the Immersive reader's verse numbers: 0.75).
- A new screen is added to `SCREENS` in the spec, with the steps that open it.

## Rules left out of the check

An axe rule left out is listed here with its reason, and by id in `tests/support/axe-excluded.ts`; `tests/unit/accessibility-doc.test.ts` fails when the two lists differ.

- `meta-viewport`: pinch zoom is locked on purpose (`maximum-scale=1, user-scalable=no` in `index.html`, with `touch-action: manipulation` on html), because a fast double
  tap zoomed the app and a page that scrolls and zooms breaks the one-handed reading screens (docs/pwa-best-practices.md 'Decide pinch zoom per app'; the decision is
  row C4 of docs/best-practices-audit.md). Larger text is the Text size setting (Small to Largest, 85 to 160 percent, `src/appearance/textSizes.ts`). Unlocking zoom is the
  Governor's decision, not a small fix; the epic's other stories on larger text may reopen it.
