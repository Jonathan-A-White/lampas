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
| About | no facts; `screen.credits` instead (mw-vtjxh4.2): every credit of ATTRIBUTION.md as `{ name, use, licence, link }` (`TBESG`, `STEPBible (Tyndale House): each word's lemma, gloss and definition`, `CC BY 4.0`, `https://www.stepbible.org`), at most 40, from `src/tutor/credits.ts` (the short form of the bullets; `tests/unit/credits-for-tutor.test.tsx` fails when it drifts from ATTRIBUTION.md: a bullet with no credit, or a credit whose name, link or licence the bullet lacks; it weighs at most `MAX_CREDITS_BYTES` 4100). The credits take most of the 6500-byte record, so on a talk with credits `buildTalkRequest` sends no `solid_words` and no `learner_grammar`. The instructions' "Talk from About" say how to explain a source: what it is, who made it, what it gives this reader, what its licence lets us do, and why we credit (Newton's line). A new credit is a bullet in ATTRIBUTION.md and an entry in CREDITS |
| the rest | the name |

A request also carries `resources` (mw-5r3p30.123): the study resources he has switched on, so the tutor links one only when it truly helps (docs/resources.md "The tutor's links").
A New Testament verse the tutor names in an answer ('Hebrews 7:2') is a link to that verse's Verse view, in the Talk sheet and in the Ask box alike.

## Suggested questions

`suggestionsFor(name)` (`src/tutor/screen.ts`): two or three per screen, shown by the sheet as buttons while the talk has no turn and nothing is
on its way (`TalkSheet`'s `suggestions`, `[data-suggestion]`); a tap sends one. Goal's first is the Governor's own: "What's the simplest verse in the
New Testament for me to learn first, given where I am?" The Reader's chapter talk has `READER_SUGGESTIONS`.
Once the talk has a turn (or the first question failed) the ones not yet asked stay under the last answer, headed 'Ask something else'
(mw-vtjxh4.43). 'New talk' in the sheet's header (shown with a turn and nothing in flight) forgets the kept talk (`deleteTurns`, with its
pictures) and brings the empty state with all of them back, also after a reload.

## Kept

A screen talk is kept in the `talks` table under `screen.<slug of the name>` (`screen.goal`, `screen.my-study-way`; `scopeRef`, `screenRef` in
`data/repositories/talks.ts`), not under a verse or a chapter, and shows again on return. The sheet is titled `Ask the tutor: Goal`.

## An ask Lampas cannot meet

When he asks for something Lampas does not do ('can this work with Olive Tree?', a new setting, a change), the answer carries `feedback_offer`
`{summary}` (one line, at most 200 characters; `grinds/bible-talk.instructions.md` "Asks the app cannot meet": say it plainly, never promise the
change). The turn then shows the summary and **Send this to the makers** (`FeedbackOffer` in `src/Talk.tsx`, on every Talk sheet, the Reader's too).
Nothing is sent without the tap. The tap is `submitFeedback` (`src/services/feedback.ts`, the one feedback sender Ask for another approach uses too):
a `feedback` grist of kind `tutor-ask` with his words, the summary, the screen's name (`Reader` for a talk about the text), the talk's reference and the
screen's facts (the last facts give way when the request is over `MAX_ASK_BYTES`); the mill forwards it to the Mayor and answers `{"status":"sent"}`.
The turn (`TalkTurn.feedbackOffer`, `feedbackSent`, no table change) then reads **Sent** and "The answer will come back."; a failure shows the usual
title and Retry. The bus hears `feedback-sent` with `feedback: 'tutor-ask'`.

## What he said, cleaned up

He often speaks his question, so the words that reach the grist can have no punctuation, an "um", a repeat or a dropped start. Both tutor grinds
that take a question (`bible-talk` and `verse-ask`) give it back as the answer's `question` (their instructions' "Cleaning up what he said"): his
words with capitals and punctuation, the fillers, repeats and false starts taken out, the meaning unchanged. The Talk sheet's turn
(`TalkTurn.cleanQ`) and the Verse view's answer card (`TutorAnswer.cleanQuestion`, `[data-answer-question]`) show that in place of the raw
transcript; the raw words stay kept as `q` / `question` (and `q` is what goes in the next request's history). An answer with no `question`, such as
one kept before this, shows the raw words. While the answer is on its way the raw words show, as before. No table change (the fields are not indexed).
Checks: `tests/unit/cleaned-question.test.ts`, `grinds/examples/*/cleaned-question.json`, and the scenarios "What he said is shown back cleaned up"
in `features/bible-talk.feature` and "What he asked is shown above the answer cleaned up" in `features/tutor.feature`.

## Let the tutor help me fill this in (mw-5r3p30.117)

A form must never scare him off, so a form can offer a button at its top, `Let the tutor help me fill this in`. The first is Ask for another
approach (Settings > Grammar approach). It opens a panel (region `The tutor is helping with this form`, above the form's fields) where the tutor
asks ONE question at a time in plain words (`What approach would you like to suggest, and how does it teach?`), he answers in the panel's field and
`Reply`, and the matching field of the form fills and is ringed and scrolled into view, so he sees it fill. When the tutor asks for a photo the panel
offers `Choose a photo` (the form's own file picker, opened in that tap) and `No photo`; a photo he adds meanwhile is told to the tutor. When every
required field holds something and the tutor has nothing more to ask, the panel says `Everything required is filled in` and the form scrolls to its
top for him to read. The tutor never sends: Send is the form's and his. `Stop helping` closes the panel and leaves the form as it is.

It is one reusable piece in `src/formHelper/`. A form describes itself as a `FormSpec` (`formHelper.ts`: name, and per field its `name`, `label`, `hint`,
`required`, `kind` text | link | pictures, `maxLength`; the approach form is `approachForm.ts`) and adds the button with one element:
`<FormHelper form={SPEC} values={{ field: 'what it holds now' }} onFill={(field, value) => ...} onPicker={(field) => ...} onReady={...} />`.

The tutor is the `bible-talk` grind in a talk from a screen named for the form (`screen` {name, facts: []}, no verse text), so the mill needs no new
kind. The request adds `form` {name, fields [{name, label, hint?, required, kind, value}]} (`buildFormRequest`; a value is cut at 600 characters); the
answer adds `form_values` [{field, value}] (the whole new value of each field) and `form_ask` (the field the question is about, a pictures field when
it asks for a photo; left out when there is nothing more to ask). `isTalkAnswer` believes both; `applyFormValues` fills only fields the form has,
never a pictures field, trimmed and cut to the field's `maxLength`. The method is the grind's `## Helping him fill in a form`. The model now and then asks its question and keeps talking, so the panel shows the answer cut after its first question (`oneQuestion`, mw-5r3p30.158). The conversation is
kept in the panel only (no table): closing the sheet ends it.

Checks: `features/form-helper.feature`, `tests/unit/form-helper.test.ts`, `tests/unit/form-helper-grind.test.ts`, the scenarios
`grinds/examples/bible-talk/form-approach-*.json`, and `tests/e2e/form-helper.spec.ts` (412 px; shots `form-helper-button`, `form-helper-filling`,
`form-helper-finished`).

## Copy an exchange

Each answer card of the Verse view and each turn of the Talk sheet ends with a **Copy** (`src/share/CopyExchange.tsx`, aria-label "Copy this
exchange", 44 px). It puts that one exchange on the clipboard as Markdown (`src/share/exchange.ts`, pure) and says **Copied** for a moment:

```
[Romans 8:28](https://lampas.allmymind.org/#/?ref=Rom.8.28)

**Q:** Why are there italic words? What does it mean for the words to be italic?

<the tutor's answer, as written>
```

The reference comes from the key the exchange is kept under (`exchangeReference`: a verse, a passage `Rom.8.1-11`, a chapter, a quiz key is its passage;
a talk from a screen has no text, so it links the app itself as "Lampas: goal"). The question is the one shown (the cleaned one when there is one).
A phone that refuses the clipboard shows the Markdown in a field, selected, to copy by hand. The tap does not stop an answer being read aloud.
Checks: `tests/unit/exchange.test.ts`, "Copy on an answer card ..." and "With several answers ..." in `features/tutor.feature`, "Copy on a turn ...",
"A talk about the chapter ..." and "With several turns ..." in `features/bible-talk.feature`, and `tests/e2e/tutor.spec.ts`.

## Pictures in a talk

The Talk sheet takes pictures (mw-y3qno5.1, `features/talk-pictures.feature`): a screenshot of a lexicon entry, a page, a note. Above the field are
**Attach a picture** and **Take a photo** (48 px; the labels of bsv-kit's Composer, which the Verse view's Ask uses; the Talk sheet keeps its own field and
hold bar, so the buttons are its own, `src/talk/PictureControls.tsx`) and a **paste** anywhere in the sheet of a copied picture (`pastedPictures`, a
clipboard that holds files) is an attachment too; pasted text pastes as before.

- At most **four** pictures a message, JPEG, PNG or WebP (the grind's `attachments`, `grinds/bible-talk.json`: max 4, `maxBytes` 1 MiB). A fifth gets the line
  "Four pictures at most. The rest were left out."; another kind of file, "Only JPEG, PNG or WebP pictures can be sent."
- Each is cut down **on the phone** as it is added (`src/talk/pictures.ts`, `shrinkImage` with `{maxEdge: 1600, maxBytes: 1 MiB}`: a JPEG, quality then size
  lowered until it fits), so Send waits for nothing but the last one ("Getting the picture ready…").
- A waiting picture is a 56 px thumbnail with a 44 px remove x (`src/talk/usePictureBox.ts`). Send, or words he holds to say (`src/talk/outbox.ts`: the open
  sheet's waiting pictures go with the Reader's and the screens' hold-to-talk message), sends them as the grist's `attachments` (`picture-N.jpg`) and the request
  has `pictures: N`. Pictures with no words ask "Read the picture and tell me about it." (`PICTURE_ONLY_QUESTION`; the grind knows it).
- The turn keeps them in Dexie (`talkPictures`, v14: `{turnId, place, bytes, mime, name}`, written with the turn by `addTurn`; `listTurnPictures`), so a reopened
  talk shows them. His turn draws them as 64 px thumbnails (`src/talk/TurnPictures.tsx`); a tap opens the picture full screen (a Back step of its own,
  `useSheetBack`; Close, Back or Escape closes it). While the answer is awaited the thumbnails stand above his question. A message sent again unchanged
  (Retry) sends the same pictures; a different message does not.
- The grind (`## Pictures he sends`) tells the tutor to read the text in each picture (Greek, Hebrew, English), say what it is, and **quote every Greek or
  Hebrew word it discusses as plain text, never only describe it**. Every Greek stretch of an answer is a word to tap (`src/script/GreekWord.tsx`: the Greek
  voice, `speakWord`, the same engine as a long press; Hebrew was already one), so the quoted words are there to hear. Scenario:
  `grinds/examples/bible-talk/lexicon-entry-picture.json` (its picture is an invented sample entry).
- Checks: `features/talk-pictures.feature`, `tests/unit/talk-pictures.test.ts`, `tests/unit/db.test.ts`, and `tests/e2e/talk-pictures.spec.ts` (390 px; shots
  `talk-pictures-composer`, `talk-pictures-turn`, `talk-pictures-full-screen`).

## Tests

`features/ask-tutor.feature` (the control, the request, the questions, what is kept), `tests/unit/ask-tutor.test.ts`, the `screen` blocks of
`tests/unit/talk-request.test.ts` and `bible-talk-grind.test.ts`, and `tests/e2e/ask-tutor.spec.ts` (place, size and clearance at 390 px; the shots
`ask-tutor-goal`, `ask-tutor-reader`, `ask-tutor-sheet`); the offer: `features/feedback-offer.feature`, `tests/unit/feedback-shared.test.ts`,
`tests/e2e/feedback-offer.spec.ts` (shots `feedback-offer`, `feedback-offer-sent`).
