# Accessibility check

`tests/e2e/accessibility.spec.ts` (mw-cwf538.2, the epic 'Lampas for every age and every ability') runs axe (`@axe-core/playwright`) with the WCAG 2.1 A and AA
rules over the eight main screens and the two Library screens (mw-rfjjzd.4: Your Logos library, and Library: Lexicons, a kind's page), each opened as a thumb opens it at 390x844: the Reader, the Immersive reader (On), Quick test, Read it aloud (with its
marks), the Talk sheet, Settings, an idea sheet, Placement, Your Logos library and a kind's page. Each screen is checked in the phone's light theme, again in its dark theme and again in High contrast. The spec fails on any
violation: a missing accessible name or role, a label that is not in the name, colour contrast. It names the screens in a list of its own (the first
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

## Gesture-only actions (mw-cwf538.4)

A gesture is never the only way to do something: each action below has a control with an accessible name that a keyboard or TalkBack reaches (TalkBack finds it by swiping to it and
double tapping; a web page has no custom actions menu, so the control is a button). `tests/e2e/no-gesture-only.spec.ts` holds the proof, with no touch and no pointer gesture:
it leaves and enters the Immersive reader, hears a word and turns a page, each by a control found by its name. `tests/unit/gesture-only-doc.test.ts` fails when a control named
here is no longer in `src`. The buttons the Reader adds (`src/ReaderControls.tsx`) are clipped to one pixel high (`.reveal-on-focus`, `src/index.css`) until focus is inside them, and then a
row at the top of the screen, so a sighted reader on a touch screen sees nothing new. They are not reachable under an open sheet (inert), and they sit in a group, `Reading controls`.

| The gesture | Where | The control |
| --- | --- | --- |
| Tap with two fingers: shows the Immersive reader's bars, or puts them away (`src/immersive.ts`) | the Reader's text, Immersive reader On | `Put the bars away` / `Show the bars` (`ReaderControls`; it says the result to the live region) |
| Going into and out of the Immersive reader (the card's own line says Settings > Immersive reader) | the Reader | `Leave immersive reading` / `Start immersive reading` (`ReaderControls`; the same setting as Settings > Immersive reader, which stays) |
| Tap on the outer thirds of the text, or swipe left or right: turns a page (`src/reader/usePages.ts`) | the Reader, Settings > Reading > Turn pages | `Next page` / `Previous page` (`ReaderControls`; `aria-disabled` on the first page of Matthew 1 and the last of Revelation 22 only; elsewhere they open the chapter before or after); the page is said by the place line |
| Swipe left or right: the next or previous chapter (`src/reader/useChapterSwipe.ts`) | the Reader, Scroll | `‹ <chapter>` and `<chapter> ›` in the `Chapters` navigation at the foot of the text (`src/ChapterNav.tsx`), and the title's chapter picker |
| Long press on a word of the Reader: says it (`src/ui/longPress.ts`) | the Reader's Greek and English words | open the word with Enter or a tap, then `Hear it` on the word sheet (`src/WordSheet.tsx`); the verse's `Hear the verse` button reads the whole verse |
| Long press on a word in the Words list | Words | `Hear it` beside each word (`src/WordsScreen.tsx`) |
| Long press on any word of prose (`src/ui/HearAnyWord.tsx`) | the tutor's answers, the sheets, About | a Greek or Hebrew word of an answer is a button that says it (`src/script/GreekWord.tsx`, `HebrewWord.tsx`); English prose is read by the screen reader itself |
| Hold a bar to talk, to ask or to read (voice-kit's `TalkBar` / `HoldToTalkBar`, `src/talk/Bars.tsx`) | the Talk sheet, Hold to ask, the reading check's `Hold to read`, the Reading drill's `Hold to read <word>`, `Hold to say <word>`, the letter drill | Space or Enter held is the hold (the kit's bar takes Space or Enter held itself); the Reader's `Talk` bar opens the sheet on a tap; `Type a question` and the sheet's typed field take no voice |
| Swipe down on a sheet's handle: closes it (`src/ui/sheetDrag.ts`) | every sheet | `Done` (or `Close`), Escape, and the phone's Back |
| Pinch and drag the grammar ladder graph (`src/LadderGraph.tsx`) | The whole path | no buttons cover the graph (mw-5r3p30.650): the graph itself takes focus (a group, Tab reaches it first), and with it focused the arrow keys pan the picture 40% of the graph's box and `+` / `−` zoom it (the mouse wheel zooms too); `Where I am` is the one button, below the picture; every idea is a focusable button, and focusing one that is not wholly in the graph pans it to the middle (`onFocusNode`), so Tab reaches all of them (tests/e2e/ladder-graph.spec.ts) |
| Draw a letter (`src/handwriting/WritingPad.tsx`) | Write it | drawing is the exercise itself; `Skip` takes the card with no cost |
| Double tap | nowhere | Lampas has no double-tap action; a double tap on a control is guarded against (`src/ui/settle.ts`, `heldSpace.tsx`) |

## Rules left out of the check

An axe rule left out is listed here with its reason, and by id in `tests/support/axe-excluded.ts`; `tests/unit/accessibility-doc.test.ts` fails when the two lists differ.

- `meta-viewport`: pinch zoom is locked on purpose (`maximum-scale=1, user-scalable=no` in `index.html`, with `touch-action: manipulation` on html), because a fast double
  tap zoomed the app and a page that scrolls and zooms breaks the one-handed reading screens (docs/pwa-best-practices.md 'Decide pinch zoom per app'; the decision is
  row C4 of docs/best-practices-audit.md). Larger text is the Text size setting (Small to Largest, 85 to 160 percent, `src/appearance/textSizes.ts`). Unlocking zoom is the
  Governor's decision, not a small fix; the epic's other stories on larger text may reopen it.

## Large text (mw-cwf538.5)

`tests/e2e/large-text.spec.ts` sets the browser's default font size to 200% (a Chromium profile with `default_font_size` 32, the preference a phone's Font size changes) and opens
the Reader, Quick test (and after an answer), the Talk sheet (and after a reply), Settings, Placement, the Verse view, Words, the whole path, and the word and Grammar sheets at 390x844: no control, heading or label may be cut off, squeezed to nothing or off the screen, and a shot of each
is attached (`shots/large-text-*.png`). Type is in rem (the Text size setting and the phone's own size both scale it); spacing and the 44 px tap height are px. A row that cannot hold
its items at 200% wraps to a second line rather than clipping. The whole path's labels are SVG text: LadderGraph.tsx draws the picture at the root font size over 16 px (`useTextScale`) so a label and its node follow the phone's size, and the spec checks a label is twice its 100% size and inside its node.

At 200% (mw-cwf538.9) two screens were poor though nothing was clipped, and the spec now checks them: while the tutor's answer is read aloud the Talk sheet's speaking bar is one row of three icons (`src/index.css`, a container query on `.speaking-slot` named `speaking`, narrower than 20 rem of the phone's own text; each button's label stays its accessible name with `font-size: 0`), where three stacked buttons left the conversation 25 px tall; and the Verse view's header (`src/VerseView.tsx`, same 20 rem container measure) gives the title a row of its own under ‹ Reader and the arrows, so a passage's heading is whole and not ended with an ellipsis. A row that truncates what he reads is the same fault: the chapter picker's title and its Old Testament rows ('Opens in Logos ↗') now wrap, and the picker is in the spec. Left on `truncate` or `line-clamp` because they are a tap away from the whole text: the Requests and Share lists' previews. A title or a line of words that is not a tap away from its whole text wraps with the one shared class `title-wrap` (`src/index.css`: `min-width: 0` and `overflow-wrap: anywhere`, never `truncate`) (mw-cwf538.10): the idea titles in the headers of Drill it, the letter drill, the short drill, Write it, the Check sheet and the Try it sheet and the lines of steps under them, the Lesson strip's title, the Goal screen's glosses and drill-plan rows, the Hebrew guide's title and the Ask for another approach sheet's picture lines. `tests/e2e/large-text.spec.ts` opens each at 200% and, on every screen, fails on any text that ends in an ellipsis (`text-overflow: ellipsis` or a line clamp with more behind it). Left on `truncate` and not opened at 200%: Share to Lampas' title and its Choose a talk labels (`src/share/ShareScreen.tsx`), the sounds list's choice line (`src/ipa/IpaCourse.tsx`), the reading bar's label (`src/speech/ReadControls.tsx`) and the Talk sheet's title on a short (landscape) window (`short:truncate`).
