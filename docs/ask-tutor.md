# Ask the tutor from any screen

mw-5r3p30.91, from the Governor's /do of 2026-10-09: "Is there a shortcut that would go to the tutor view from any screen with the useful
context going in. And his view could vary depending on context." PROVISIONAL: the place of the button, the questions and the facts.

## The control

One round button, `AskTutorButton` (`src/AskTutor.tsx`), on every full screen: the Reader, Goal, Words, Review, Quick test, Parsing drill,
Paradigms, Placement, Settings, My study way, Import and About.

- 56 px, bottom right (`right-3`), above the phone's bar (`--lp-bar-inset`, 12 px of air). Its accessible name is `Ask the tutor about this
  screen`. Playwright matches a name as a substring: a spec that means the Quick test's or the Verse view's own `Ask the tutor` button passes `exact: true`.
- Where a screen pins a bar of its own the button rises above it (`lift`): the Reader above its Talk bar (`TALK_BAR_LIFT`), Import above its Add bar.
  The right edge is the same everywhere.
- `.screen` (src/index.css) ends 64 px lower than it did, so the last row of any screen scrolls clear of the button; a button floats over a
  list in the middle of a scroll, as any such button does.
- Hidden while a sheet is on screen (`useSheetOpen` in `src/ui/sheetBack.ts`: every sheet calls `useSheetBack`, which counts it) and, on the Reader,
  while the Verse view is up; it comes back when the sheet goes. Words' Drop confirm is not a sheet: its backdrop covers the button. One tap opens the Talk sheet.

The Reader draws the button itself and opens its own chapter talk (`Talk about Romans 8`, kept under 'rom.8', the Talk bar's sheet). Every other
screen gets `<AskTutor route>` from `App.tsx`, which opens the Talk sheet over a screen scope.

## What the tutor is told

`TalkScope.screen` (`src/services/talk.ts`) is the screen's `ScreenContext` (`src/tutor/screen.ts`): its `name` and `facts`, a list of
`{ label, value }` (at most 12; label 40 and value 200 characters, `fitScreen`). `buildTalkRequest` sends it as the request's `screen`;
`reference` is the screen's name and `greek` and `english` are left out (the talk is not about a text). The input schema
(`grinds/bible-talk.input.schema.json`) has `screen` and no longer requires `greek` and `english`; the instructions' "Talk from a screen" says how to
use it. `learner`, `learner_grammar` and `solid_words` ride as in every talk.

A screen leaves its facts with `useReportScreen({ name, facts })` (or `<ReportScreen>`), kept in `src/tutor/screenContext.ts`; the control reads them
live. A screen that reports nothing sends its name alone.

| Screen | Facts |
| --- | --- |
| Goal | Goal (`Read 1 John 1:1`), Words and Grammar ideas (`Solid 1 · Frontier 2 · Not yet 27`, the bars' legends), Placed (`On 9 Oct` or `Not yet`), Learn next (the button's text), Next words (`ὅς (which), ἀπό (away from), …`) |
| Review | the due line at the start; in a round the question, the item in hand and, once he has answered, what he chose and the right answer; the score at the end |
| Words | his words by state (`6 solid, 3 learning`) |
| Settings | no facts; `screen.settings` instead (mw-5r3p30.107): every setting and study-resource switch, as `{ name, value, help }` (`Accordance`, `Off`, the hint shown under it), at most 30, from `src/settings/tutorSettings.ts`. A setting that is Off is listed though its details are hidden, so he can ask what it would give. The longer help of a registry setting is in the grind's instructions |
| the rest | the name |

## Suggested questions

`suggestionsFor(name)` (`src/tutor/screen.ts`): two or three per screen, shown by the sheet as buttons while the talk has no turn and nothing is
on its way (`TalkSheet`'s `suggestions`, `[data-suggestion]`); a tap sends one. Goal's first is the Governor's own: "What's the simplest verse in the
New Testament for me to learn first, given where I am?" The Reader's chapter talk has `READER_SUGGESTIONS`.

## Kept

A screen talk is kept in the `talks` table under `screen.<slug of the name>` (`screen.goal`, `screen.my-study-way`; `scopeRef`, `screenRef` in
`data/repositories/talks.ts`), not under a verse or a chapter, and shows again on return. The sheet is titled `Ask the tutor: Goal`.

## Tests

`features/ask-tutor.feature` (the control, the request, the questions, what is kept), `tests/unit/ask-tutor.test.ts`, the `screen` blocks of
`tests/unit/talk-request.test.ts` and `bible-talk-grind.test.ts`, and `tests/e2e/ask-tutor.spec.ts` (place, size and clearance at 390 px; the shots
`ask-tutor-goal`, `ask-tutor-reader`, `ask-tutor-sheet`).
