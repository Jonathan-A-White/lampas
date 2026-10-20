# The Verse view (mw-5r3p30.79)

The Governor, Postern general: "I just don't like the uix of how these two elements come together. It should maybe be its own view for the
verse?" His answer: a Verse view. Tapping a verse number opens the verse on a full screen; Back returns to the Reader. (With Turn pages a tap in the text's outer thirds turns the page,
number or not, mw-5r3p30.609: a number opens its verse there only from the middle third (Paragraph), by Enter, or with no licence by a long press.)

```
‹ Reader     Romans 8:11            ‹   ›      header: close, the reference, the verse before and after
And if the Spirit of Him who ...              the verse, big, woven as the Reader weaves it (words tappable)
[Listen] [Read it aloud] [Ask the tutor] [Quiz me] [Copy link]     one row; the chosen one is filled
  what the action shows                       Listen: a line; Read it aloud: the reading check; Ask the tutor: answers, the Ask box
[ Play verse 11 ]                             ONE control at the foot: Listen's Play button, or the hold bar (Postern's) of the other actions
```

The row is one line while each label has room for two lines of its own (a container query in rem, so a larger text size wraps sooner); narrower, it is three buttons to a row over two rows. A phone with Share draws a sixth button and wraps sooner. No label is ever past two lines and every button is at least 44 px (tests/e2e/verse-actions.spec.ts at 360 and 412 px).

| Action | What it shows | The bar | A hold does |
| --- | --- | --- | --- |
| Listen | one line of help: `Tap Play to hear verse 11.` | the button `Play verse 11` (not a hold; `Play again` after it ran to its end) | a tap reads this verse aloud and it stops at its end by itself (the Read aloud span does not apply); see *Listen is a player* below |
| Read it aloud | the reading check (`ReadCheckPanel`, region 'Reading check'): status, the result with its words to fix, the walk | `Hold to read verse 11`, then `Hold to read the whole verse again` at the end of the walk, `Release to send` while held | records him, sends the verse-read grist on release |
| Ask the tutor | the kept answers (Markdown), what the last question is doing, `Talk about verse 11` (the Bible talk sheet) | the shared composer (`voice-kit/composer`, `Ask.tsx` `AskComposer`): the big `Hold to ask` bar, `Type a question` quietly under it; no attach or camera (the tutor takes no file or photo); the setting `Ask by` (Settings > Asking the tutor, `Speaking` default | `Typing`, `settings/definitions/askBy.ts`) turns it type-first (the text box and Send, a small mic `Ask by speaking`), and the tutor switches it when he asks in words: the verse-ask answer's `settings_changes` (`askBy` only) is applied by `useAsks` and the card says `Changed: Ask by: Typing`; the app reads whatever change arrives (`services/tutor.ts` `askByChange`: the first entry that sets `askBy` to speaking or typing in any case, wherever it stands in the list, mw-5r3p30.191) and ignores the rest, so a refused change never costs the answer, and a change to the value already set shows no card | hold-to-talk: his words show as he speaks in the composer above the bar (`Listening…` until the first word), and on release go to the tutor about this verse exactly as a typed question (`Type a question`, the words, Send); his question then stays shown as his message above `Waiting for the tutor…` until the answer card arrives (`ui/PendingQuestion`, the Talk sheet's look); a failed send puts the question back in the composer's field, with Retry above it; sliding off the bar before letting go keeps the words unsent in the field (the composer's own rule) |
| Quiz me | one line of help | the button `Start the quiz` (`Continue the quiz` once the quiz has a turn), the size and place of the bar but not a hold | opens the Talk sheet in quiz mode, `Quiz on Romans 8:11` or `Quiz on Romans 8:1-11`, and on the first press sends `Quiz me on Romans 8:1-11.` (see *Quiz me* below) |
| Copy link | `Link copied` (Share beside it where the phone has it; the link by hand when the clipboard is refused) | none: a button in the row | |

* **The Reading ladder** (mw-neuq78.4, `docs/reading-ladder.md` 'The Reading ladder on the phone'): the Read it aloud panel of a verse has a `Reading ladder` button (the language of the view he reads in); on a ladder verse the panel says `Number N of M on the ladder` and, under the result, `Next verse` (after Well read) or `Try again` / `Skip for now`. A passage has no ladder.
* **With the weave on** (mw-5r3p30.410): the mill scores a reading in one language, and the verse-read grist is the verse's whole English. While the weave shows some of the verse in Greek, the panel says `In weave mode I can check English only: read the whole verse in English, or turn weave off to read the Greek`, and an answer is kept without the words shown in Greek (`services/reading.ts` `wovenPlaces`, `outsideWeave`, in `useReadChecks`): none is marked, listed in Words to fix, walked by Read these again, offered as the next word or counted towards Drill these words. A check that hears both languages is a story of its own.
* **PROVISIONAL, the Governor to confirm:** what each action's hold does (above), Listen as the first action and the one a new phone starts on, the
  bar names, and that Share sits beside Copy link.
* Sideways (a window under 500 px tall, `src/index.css` at the end) the Ask composer is one row: a 56 px `Hold to ask` bar with `Type a question` beside it, and no hint line, so an answer
  has a scrolling box tall enough to read in under the speaking bar (mw-5r3p30.188, `tests/e2e/ask-fit.spec.ts`).
* The chosen action is kept (`localStorage` `lampas.verseAction`), so the next verse opens on it. An arrow goes to the next verse of the chapter, and past
  a chapter's last verse to the first of the next (Romans 8:39, 9:1); there is none before Matthew 1:1 or after Revelation 22:21.
* Back: `nav/route.ts` `openVerse` pushes a history entry (state `{verseView: true}`), so the phone's Back closes the view and the Reader is where it was
  (its scroll box stays mounted underneath, `inert`). The arrows replace that entry. A link or a reopen at a verse opens the view with no step to go back
  to: the close button then only takes `v` out of the address.
* The Reader's Talk bar is not drawn while the view is open (two stacked yellow bars were what he disliked); the Bible talk about the verse is
  `Talk about verse N` under Ask the tutor, and a long press on a verse number still talks about it.
* The view is under the sheets (z-5): the word sheet, the Grammar sheet and the Talk sheet open over it.

## Listen is a player (mw-5r3p30.130)

The Governor, Postern general (2026-10-09): holding a bar to listen to a long passage "doesn't feel right"; push to talk is fine, push to listen is not. Listen is
now a tap-to-play player; the hold bars stay for talking (Read it aloud, Ask the tutor), and a long press on a word still says that word.

* **Play** is a button at the foot the size and place of the hold bars (`Play verses 1-11`, `Play verse 11`); sideways (a short window) it and the Quiz bar are the 56 px row of `SHORT_BAR` (`src/ui/barClass.ts`) and the help line is not drawn while the Audio Bible row shows, so the `Listen in Audible` link ends above the bar (mw-5r3p30.468, `tests/e2e/audio-bible-landscape.spec.ts`). In Greek view the Audio Bible row and its credit are not drawn at all, and the help line is not hidden for it: an English audio is not offered over Greek text (mw-5r3p30.653, `tests/e2e/audio-bible-greek.spec.ts`, features/audio-bible.feature). A tap starts the reading (`Reader.tsx` `listenTo` /
  `listenVerse`, `startReading` with `listen: listenKeyOf(book, chapter, unitId)`); it runs on to the end of the verse or passage by itself and stops, and the button then says `Play again`.
* While it plays or waits, the foot is empty and the one speaking bar above it (`voice-kit/speech/react`, `docs/read-aloud.md`) has **Pause** / **Resume**, **Restart** and **Stop**.
  Restart on a Listen goes back to the first verse of the passage (`SpeakingBarSlot.tsx` catches the click, `readAloud.ts` `restartListen`); Stop ends it and the foot says `Play verses 1-11` again.
* The verse being read is lit (`data-reading`, `READING_CLASS`) in the passage and its box scrolls to keep it in view (`Reader.tsx` `PassageText`).
* **An interruption from inside the app pauses a Listen and it goes on by itself when the interruption ends** (`readAloud.ts` `interruptListen`, `holdListen`): a word said alone
  (a long press, a speaker: `greek.ts` `speakBeside` marks the word `interrupted`), the Hold to ask bar (`speech/askTranscriber.ts`: the Listen is paused while he holds and goes on when the words are in, or the hold is dropped), the reading check's
  recording (`useReadChecks.press` until let go), and a tutor's answer read aloud (`startReading` with an `answer` keeps the Listen's options and verse in `suspended`; the Listen starts again from
  that verse when the answer has been read to its end, not when Stop ends it). A Listen he paused himself stays paused; a hidden page keeps it paused.
* **Leaving pauses it, and Resume is on the bar**: closing the view, moving to another verse or passage with the arrows (`Reader.tsx`, an effect on the view's key), opening another screen
  (`ReaderBody` leaving) and the page going hidden (the package) all pause it at the verse it was reading.
* A reading that is not a Listen (the header's Play, a verse's play button) is unchanged: an interruption pauses it and the bar offers Resume.
* **PROVISIONAL, the Governor to confirm:** the button's names (`Play …`, `Play again`), the empty foot while the bar has the controls, and that the tutor's answer is read in front of a Listen.
* Not done here: an interruption from outside the app (a call, another app's audio), which is a later story; only the page going hidden is covered.

## A passage (mw-5r3p30.73)

The Governor, Postern general: "I should be able to click on a heading and interact with it like a verse (tutor, audio, read to the tutor...)."
A tap on a section heading in the Reader (the whole heading is one button, 44 px tall, and looks as it did) opens this same view for the passage
under it: from the heading's verse to the verse before the next heading, or the chapter's end (`src/data/passage.ts`; the same span as *Passage* in
Settings > Read aloud). One view engine: the view is handed the passage as one `Verse` (`n` its first verse, `to` its last, `h` the heading, every
verse's words in order), so every action works on it as it works on a verse.

| | A verse | A passage |
| --- | --- | --- |
| Title | `Romans 8:11` | the heading, with the range under it: `Walking by the Spirit` / `Romans 8:1-11` (accessible name `Walking by the Spirit, Romans 8:1-11`) |
| Address | `#/?c=8&v=11` | `#/?c=8&p=1`, `p` the passage's first verse (`nav/route.ts` openPassage / movePassage); `v` wins when both are there |
| Text | the verse big | the verses one after another with a small number before each, in the Reader's own blocks (`blocksOf` of his Layout: a paragraph to a `[data-passage-text]` in Paragraph, a verse to one in Verse by verse; mw-5r3p30.499) set exactly as the Reader sets its text (`[data-passage-text]`: the Reader's face, size and leading from his settings and, with Immersive on, its book look, the one set of rules in `src/index.css`; the reading check's marked passage and walk too; mw-5r3p30.319), in a box of its own with no border or rounded corners, so it sits on the page like the Reader's text (at most 40% of the screen, scrolls; mw-5r3p30.501) so the row of actions stays in reach; the verse being read is highlighted and followed |
| Arrows | the verse before / after, across chapters | `Previous passage` / `Next passage`; at a chapter's first or last passage they go into the last passage of the chapter before or the first of the chapter after, across books (`reader/steps.ts` `stepOf`; the other chapter is fetched, mw-5r3p30.129); off only at Matthew 1's first and Revelation 22's last |
| Listen | `Play verse 11` | `Play verses 1-11`: reads the passage's verses only, to the passage's end, whatever the Read aloud span says, and stops there |
| Read it aloud | `Hold to read verse 11` | `Hold to read verses 1-11`: the reading check on the whole passage (`reference` 'Romans 8:1-11', `target_text` every verse's text; the result is kept under `rom.8.1-11`, `rom.8.1-11:el`) |
| Ask the tutor | `Hold to ask`, `Type a question` | the same; the grist's `reference` is 'Romans 8:1-11' and its `greek` / `english` the whole passage; the answers are kept under `rom.8.1-11` |
| Copy link | `…/#/?ref=Rom.8.11` | `…/#/?ref=Rom.8.1-11` (a verse range; Lampas opens the Verse view on the range, mw-z370x5.2) |
| Talk about verse N | opens the Bible talk sheet | not offered: the Talk sheet is about a verse or a chapter |

* **Carried over from V:** Listen, Read it aloud, Ask the tutor, Copy link, the one hold bar, the kept chosen action, Back as a step of its own, the
  weave and tappable words in the text. **Not carried over:** *Talk about verse N* (no passage scope in the Talk sheet).
* **PROVISIONAL, the Governor to confirm:** the title (heading over range), the 40% box, and that Listen on a passage always stops at its end.
* **Limits worth knowing:** the reading check records at most 60 seconds, so a long passage read aloud is scored as a partial reading (graded as far as it went); a grist record is capped at
  10 KiB, so a very long passage asked about may be refused with 'Could not send the question'.

## A lesson's range (mw-z370x5.2)

Any run of verses of a chapter opens the same passage view: `src/data/passage.ts` `rangeOf(verses, from, to, heading)`, the address `#/?b=1jn&c=1&p=1&pt=4` (`pt` the last verse, read only with `p`; `openVerseRange`; `openPassage`, `movePassage` and `openVerse` drop `pt`). The heading is the lesson's title when the range is a passage lesson of the chosen approach, else the heading of the first verse, else the reference; a heading equal to the range is said once ('1 John 1:1-4', not twice). The arrows step from the section passage the range starts in. When the range is exactly a lesson (`lessonForRange`), a **Lesson strip** sits under the heading and its Check passes the lesson: docs/grammar.md 'Passage lessons: the Lesson strip and Check'. Opening the view marks nothing. A link with a range ('Heb 7:1-3', `#/?ref=1John.1.1-4`) opens the Verse view on it (`links.ts` `Reference.to`, `LinkOpener`).

## Quiz me (mw-5r3p30.74)

The Governor, Postern general (2026-10-08): his Bible-reading method (read, quiz, map) as the tutor's, tailored to the reader. Reading is the Listen and
Read aloud actions; Quiz me is the other two parts. It works on a verse or on a passage (the same view engine), so on Romans 8:1-11 the tutor is given
the whole passage.

* **It is the bible-talk grind** (`grinds/bible-talk.*`) with an optional request field `mode: 'quiz'`, not a new kind: no new kind for the mill to
  allow, and the Talk sheet, its history, answers, word cards and `words_to_add` all work. The quiz is a conversation of its own, kept under
  `rom.8.1-11:quiz` (or `rom.8.11:quiz`) beside the ordinary talk about the same verses, so a quiz and a question never mix their history; every message
  sent from that sheet carries `mode: 'quiz'`.
* **The request** holds the whole verse or passage's Greek and English (the app's own Byzantine text and MSB, never the web, never Logos), the
  reference (`Romans 8:1-11`), `solid_words`, `learner` and `learner_grammar`, which the instructions use to pitch the questions.
* **The instructions** (`## Quiz mode` in `grinds/bible-talk.instructions/`) carry the method for any reader: questions in the order of the passage,
  one idea at a time; confirm what is right before correcting; nudge rather than tell when close; follow up vague answers; engage a tangent briefly and
  always land it by restating the next question; note a rabbit hole and pivot back; then build a structural map through the reader's own answers (the
  Genesis 1 days as the model). The map is Markdown text in the Talk sheet; a diagram is offered only as that text structure.
* **PROVISIONAL, the Governor to confirm:** the button's names (`Start the quiz`, `Continue the quiz`), that Quiz me has no hold bar (the answers are
  given in the Talk sheet, which has one), the sheet's title `Quiz on …`, the opening message `Quiz me on …`, and the short turns (about 60 words) the
  instructions ask for.
* **Limits worth knowing:** a request is capped at `MAX_REQUEST_BYTES` (6500) and only the history is trimmed to fit, so a very long passage may be refused
  with 'Could not send the question'; Romans 8:1-11 fits. There is no way to start the same quiz over except to say so in the sheet. Links to study
  resources come with the words the tutor cites (each opens its word sheet and Study row).

## My study way (mw-5r3p30.76)

The Governor, Postern general (2026-10-08): "The user should be able to work with the tutor to personalize this in a durable way." The reader shapes the
quiz method by talking with the tutor, and the phone keeps it for every later quiz.

* **The tutor proposes, the reader keeps.** In a quiz the answer may carry `study_way_line` (answer schema, one line of at most 100 characters). The Talk
  sheet shows it under the answer, 'For your study way', with **Keep this**; nothing is saved until the tap, then it reads **Kept**. With 12 lines kept it
  says 'Your study way is full: delete a line in Settings > My study way.' and offers no button. A wish for today ('no tangents today') is not a line: the
  instructions say so.
* **Where it lives:** the settings store, key `studyWay`, a JSON list (`src/data/repositories/studyWay.ts`), chosen over a table because it is a short
  free-text list like the Logos ticks and `paceRounds`: no Dexie version, nothing to migrate. It is outside the settings registry, so the tutor's
  `settings_changes` can never write it. At most `STUDY_WAY_MAX` (12) lines of at most `STUDY_WAY_LINE_MAX` (100) characters; a line is kept once.
* **The page:** Settings > My study way (`#/studyway`, `src/StudyWayScreen.tsx`) lists the lines, each with Edit (a field, Save | Cancel) and Delete.
  It adds none: lines come only from Keep this.
* **In every quiz request:** `study_way` (input schema, at most 12 lines), sent only in quiz mode and only when lines are kept; `fitHistory` never cuts
  it. `## My study way` in `grinds/bible-talk.instructions/` says the reader's lines override the default method where they conflict. They leave the
  phone only inside a tutor request.
* **PROVISIONAL, the Governor to confirm:** the page's name 'My study way', 'For your study way', 'Keep this' / 'Kept', the limits of 12 lines and 100
  characters, and that the lines go in quiz requests only (not in an ordinary talk).

## Quiz goal (mw-5r3p30.185)

The Governor, through the tutor (2026-10-11): some readers use Lampas to learn Greek, some to learn English, some to read the Bible and understand it, and
others for reasons nobody listed; the quiz should begin by talking with him about why he wants it, then offer to keep that as his default.

* **The tutor asks, not the app.** The quiz request carries `quiz_goal` (input schema; a string of at most 80 characters, or `null` when none is kept) in
  quiz mode only. With `null`, no `quiz_goal_once` and an empty history, `### His quiz goal` in `grinds/bible-talk.instructions/` makes the tutor open by
  asking why he wants the quiz in one short plain question with no list of options, ask at most one follow-up, then quiz to match (understanding: plain
  English, no Greek unless he asks; Greek; English; reading the Bible; anything else in his words). There is no list in the app either.
* **The offer.** In that turn the answer carries `quiz_goal_offer` (at most 80
  characters). The Talk sheet shows it under the answer, with the app's own line 'Is this how you want me to quiz you from now on?' above the buttons
  (not drawn when the answer already asks it, mw-5r3p30.196; the box scrolls so the line and both buttons are in view, and again whenever the box changes height while they wait: the phone turned, the keyboard, the microphone line, mw-5r3p30.211), 'Your quiz goal', with **Yes, from now on** (keeps it as the setting `quizGoal`) and **Just this
  time** (keeps nothing); the turn then reads 'Kept as your quiz goal' or 'Just this time' (`TalkTurn.quizGoalChoice`). After Just this time the later
  requests of that quiz carry `quiz_goal_once` (the offer's text, found in the quiz's own turns) so the tutor does not ask or offer again. With a goal kept the tutor makes no `quiz_goal_offer` in any turn, and the app drops one that names the kept goal or the Just this time goal (`src/talk/quizGoalOffer.ts`, mw-5r3p30.681).
* **Where it lives:** the settings store, key `quizGoal`, plain text ('' = none), a registry setting (section My study way, label **Quiz goal**: a visible label, a status line 'Kept: <his goal>' or 'No goal kept' (the words Quiz goal appear once, as the label), and a field with
  Save (off while the field is empty or only spaces: only Clear drops a kept goal) and Clear, `src/settings/controls/quizGoal.tsx`), so he can change or clear it in Settings and the tutor may change it in a talk outside a quiz. Words typed and not saved are kept as a draft (localStorage `lampas.quizGoalDraft`, written 500 ms after the last keystroke and on leaving Settings, `pagehide` or hidden; restored on open, dropped by Save or Clear; pwa-best-practices section 16). With a
  goal kept, Quiz me skips the opening question and every quiz request carries it; 'Change my quiz goal' said in a quiz makes the tutor ask again.
* **PROVISIONAL, the Governor to confirm:** the names 'Quiz goal', 'Your quiz goal', 'Yes, from now on' / 'Just this time', the 80-character limit, and that
  the goal goes in quiz requests only.
