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
`{ label, value }` (at most 12; label 40 and value 400 characters, `fitScreen`). `buildTalkRequest` sends it as the request's `screen`;
`reference` is the screen's name and `greek` and `english` are left out (the talk is not about a text). The input schema
(`grinds/bible-talk.input.schema.json`) has `screen` and no longer requires `greek` and `english`; the instructions' "Talk from a screen" says how to
use it. `learner`, `learner_grammar` and `solid_words` ride as in every talk (`solid_words` is his 50 newest solid words and `solid_count` how many he has in all, src/services/solidWords.ts: the request does not grow with the learner; verse-ask is fitted to `MAX_REQUEST_BYTES` by `fitAsk` as the talk is by `fitHistory`).

A screen leaves its facts with `useReportScreen({ name, facts })` (or `<ReportScreen>`), kept in `src/tutor/screenContext.ts`; the control reads them
live. A screen that reports nothing sends its name alone. A screen may draw an Ask the tutor button of its own: it calls `askTheTutor(first?)` (`src/tutor/askNow.ts`) and the
control opens its sheet, sending `first` (a question and a focus) only when the talk has no turn yet. A screen whose talk is its own reports `kept` with its facts (the key the talk
is kept under, never sent): each paradigm table is `screen.paradigms.<id>` (mw-irpgqi.3, docs/paradigms.md 'Ask the tutor').

| Screen | Facts |
| --- | --- |
| Goal | Goal (`Read 1 John 1:1`), Words and Grammar ideas (`Solid 1 · Frontier 2 · Not yet 27`, the bars' legends), Placed (`On 9 Oct` or `Not yet`), Learn next (the button's text), Next words (`ὅς (which), ἀπό (away from), …`) |
| Review | the due line at the start; in a round the question, the item in hand and, once he has answered, what he chose and the right answer; the score at the end |
| Words | his words by state (`6 solid, 3 learning`) |
| Settings | no facts; `screen.settings` instead (mw-5r3p30.107): every setting and study-resource switch, as `{ name, value, help }` (`Accordance`, `Off`, the hint shown under it), at most 40, from `src/settings/tutorSettings.ts`. A setting that is Off is listed though its details are hidden, so he can ask what it would give. The longer help of a registry setting is in the grind's instructions |
| About | no facts; `screen.credits` instead (mw-vtjxh4.2): every credit of ATTRIBUTION.md as `{ name, use, licence, link }` (`TBESG`, `STEPBible (Tyndale House): each word's lemma, gloss and definition`, `CC BY 4.0`, `https://www.stepbible.org`), at most 40, from `src/tutor/credits.ts` (the short form of the bullets; `tests/unit/credits-for-tutor.test.tsx` fails when it drifts from ATTRIBUTION.md: a bullet with no credit, or a credit whose name, link or licence the bullet lacks; it weighs at most `MAX_CREDITS_BYTES` 5200). The credits take most of the 8000-byte record, so on a talk with credits `buildTalkRequest` sends no `solid_words` and no `learner_grammar`. The instructions' "Talk from About" say how to explain a source: what it is, who made it, what it gives this reader, what its licence lets us do, and why we credit (Newton's line). A new credit is a bullet in ATTRIBUTION.md and an entry in CREDITS |
| Drill it (the results of a drill, mw-5r3p30.649) | `Idea`, `Result` (`Proved`, `You reached step 2 of 4`, `Short drill on <facet>: 3 of 5 right`), `Questions` (`3 asked, 2 right, 1 wrong`), `Strong` and `Weak` when the run has them; and `screen.drill` instead of text: every question in the order asked as `{ idea, asked, answer, right_answer, right, hinted? }` (at most 14; `idea` is the facet's label, cut to 60, `asked` the prompt with the Greek it is about, 100, `answer` and `right_answer` 40; `hinted` is true on a right a Hint helped with). Built by `src/tutor/drillTalk.ts` `drillScreen`, cut by `fitScreen`; `fitHistory` drops right answers first, oldest first, when the record is over `MAX_REQUEST_BYTES`. Drawn by `DialogAskTutor` (`src/AskTutor.tsx`) inside `DrillItScreen` and `PlanDrillScreen` once the run is over: the round button in the foot's right end beside Done (`FootBar beside`), the sheet over the dialog, kept under its own key for each drill (`screen.drill-it.<ms>`, `TalkScope.kept`; `placeOf` names it 'Ask the tutor: Drill it'). Suggestions: `drillSuggestions`, the first 'Why did I get these wrong?' when any were wrong, else 'What should I practise next?'. The instructions' 'Talk from a drill's results'; examples `drill-results-wrong` and `drill-results-all-right`; `tests/unit/drill-talk.test.ts`, `tests/e2e/drill-ask-tutor.spec.ts` |
| the rest | the name |

A request also carries `resources` (mw-5r3p30.123): the study resources he has switched on, so the tutor links one only when it truly helps (docs/resources.md "The tutor's links"). It carries `works` (mw-5r3p30.675) when he has ticked any: the commentaries and books of his Logos library (Settings > Study resources > Works), so the tutor links a work only when it is listed (docs/resources.md "Works he holds in Logos").
A New Testament verse the tutor names in an answer ('Hebrews 7:2') is a link to that verse's Verse view, in the Talk sheet and in the Ask box alike.
The answer's `links` (at most three, `MAX_LINKS`) take a third kind (mw-5r3p30.502): `{kind: 'setting', key}`, `key` one of the registry's setting keys (the schema's enum is made from the registry by `npm run grind:build`; the instructions' "Links to a setting" say when to use it and list the keys under "Changing the app's settings"). `TutorLinks.tsx` draws it as one chip, `Open <setting's name> in Settings`, which closes the sheet and opens `#/settings?setting=<key>` (docs/links.md); it needs no study resource, and a key the registry lacks draws no chip and no empty group (the phone still takes the answer: `isTalkAnswer` checks the shape only). It changes nothing: a change is still `settings_changes` or `setting_offer`.

## The tutor knows what bears on its answer (mw-5r3p30.242)

His rule (VISION.md, 'The tutor'): the tutor is told, on every ask, each app setting and each part of his progress that could change its answer.
`src/tutor/knows.ts` is the table: for each grind (bible-talk, verse-ask, verse-read, tips) the settings and the parts of his progress its request carries,
and the written reason for each one it does not. Every registry setting has an entry in `BEARS_ON` (speech, language, level, quiz goal, study way, or `screen` for
one that only changes how the app looks); `tests/unit/tutor-knows.test.ts` fails when one that bears on an answer is in no grind's request without a reason, when a new
setting has no entry, when a field a row names is not in the grind's input schema, and when a builder does not send what its row says.
The Greek pronunciation (`pronunciation`, its id) reaches bible-talk, verse-ask and verse-read; verse-ask's `settings` carries the settings the table puts there
(`settingsSentTo('verse-ask')`). A new setting is classified in `BEARS_ON` and, if it bears on an answer, added to each grind's request or given a reason.

## The heart of the word (mw-bsf54t.14)

A word that has a note in `src/data/wordHeart.ts` shows it to him (word sheet, teach sheet, a Review miss: `src/HeartOfWord.tsx`), and the tutor is told the same note, so its answer
agrees with it: `focus.heart` on a word (Help with this word, Ask the tutor on the sheet) or a Quick test question (`withHeart` in `buildTalkRequest`, at most 400 characters; a Hebrew word and a
grammar term carry none), and on Review's Ask the tutor a screen fact, 'Heart of the word', once the answer is in (it explains the answer, so it waits for it as 'Right answer' does). The input
schema's description of `heart` tells the tutor to agree with it and build on it. A word with no note carries nothing. `tests/unit/word-heart-tutor.test.ts`.

## Suggested questions

`suggestionsFor(name)` (`src/tutor/screen.ts`): two or three per screen, shown by the sheet as buttons while the talk has no turn and nothing is
on its way (`TalkSheet`'s `suggestions`, `[data-suggestion]`); a tap sends one. Goal's first is the Governor's own: "What's the simplest verse in the
New Testament for me to learn first, given where I am?" The Reader's chapter talk has `READER_SUGGESTIONS`.
Today (mw-1fwagb.7, the grilling mw-6ww.126 Q5) reports the local date, what is On and `Opened today`, the pieces whose link he tapped on that date, by name
(`src/today/tutorFacts.ts` `openedTitles`, `todayFacts`; dailyStore.ts keeps the opened list per date, so yesterday's never comes); the bible-talk instructions
('Talk from Today') say to open by naming them and to invite a screenshot. Its suggestions are 'Talk about what I read' and `SEND_A_SCREENSHOT`: the second
sends no words, it opens the picture picker (`TalkSheet` `ask`, which clicks the Composer's Attach a picture button); the attach and camera buttons are on the composer from the first turn.
`suggestionsFor` also finds a screen by its lower-case name ('today').
Once the talk has a turn (or the first question failed) the ones not yet asked stay under the last answer, headed 'Ask something else'
(mw-vtjxh4.43). 'New talk' in the sheet's header (shown with a turn and nothing in flight) forgets the kept talk (`deleteTurns`, with its
pictures) and brings the empty state with all of them back, also after a reload.

## Kept

A screen talk is kept in the `talks` table under `screen.<slug of the name>` (`screen.goal`, `screen.my-study-way`; `scopeRef`, `screenRef` in
`data/repositories/talks.ts`), not under a verse or a chapter, and shows again on return. The sheet is titled `Ask the tutor: Goal`.

## A long talk remembers (mw-5r3p30.700, PROVISIONAL)

His ask: 'it wanders'. Every talk (the `talks` table, by `talkRef`) keeps a running summary on the phone: Dexie `talkSummaries` (v25: `{ref, summary, covered, when}`, `getTalkSummary` / `keepTalkSummary` in `data/repositories/talks.ts`;
`covered` is how many of the talk's oldest turns the summary holds; `deleteTurns`, New talk, forgets it with the turns). The bible-talk request still carries the last 10 turns as `history` and adds
`summary` (the kept text, at most TALK_SUMMARY_MAX 1000 characters) and, for the turns older than the window that the summary does not hold yet, `fold`: at most FOLD_MAX_TURNS (3), oldest first, each cut to FOLD_Q_CHARS / FOLD_A_CHARS
(`foldedTurn`), with `unfolded` (a count) when more wait behind them (a talk that was long before this shipped is worked off three at a time). The grind (instructions part `015-the-conversation-so-far.md`) answers a request with `fold` with a new `summary`
(the one it was sent and the fold, in one); `useTalk` saves it with `covered` + the fold's length, never when the answer lacks it or the request had no fold, so a missed one is simply sent again. `fitHistory` keeps the `summary` over every other optional part (it goes only after the newest
turn); a turn it drops from `history` for room moves to `fold` cut short (not while `unfolded` says older ones wait: the summary would skip them) and the fold is shed before the word list, his requests and his notes. The mill's side (one resumed Claude session per
talk, key points at its cap) is 'A talk names itself to the mill' below. Checks: tests/unit/talk-summary.test.ts, tests/e2e/talk-summary.spec.ts, grinds/examples/bible-talk/summary-folds-fallen-turns.json and answers-from-summary.json.

Which tutor conversations keep history and get the summary (the sweep of mw-5r3p30.700):

| Conversation | Grind | Keeps history | Gets the summary |
| --- | --- | --- | --- |
| Talk sheet (chapter, verse, passage), its quiz (Quiz me), a word's Help, a grammar term's, a paradigm table's, a Quick test question's Ask the tutor | bible-talk | yes, last 10 turns | yes |
| The round Ask the tutor on a screen (`screen.<slug>`), a drill's results (`screen.drill-it.<ms>`), a shared talk (`talk.<ms>`), Ask for more | bible-talk | yes | yes |
| The welcome interview | bible-talk (mode welcome) | yes (a few turns, never past the window) | yes in code, none kept in practice |
| The Verse view's Ask the tutor (a verse's answers, `answers` table) | verse-ask | no: each ask is one question and its answer, no `history` in its input schema | no (a conversation there would need its own story) |
| Reading check, Reading drill | verse-read | no | no |
| Tips, find-refs (a shared picture), audible-position, drill-items (more questions), feedback | tips, find-refs, audible-position, drill-items, feedback | no, one request each | no |

## The tutor fetches the text it needs (mw-5r3p30.734, PROVISIONAL)

His ask (2026-10-23): the tutor should ask for the text it sees the talk heading toward, "the Greek ... the English ... very specific to the version I'm using", without
interrupting the flow. PROVISIONAL, the Governor to confirm: no sub-agents (the text is on the phone and the read is immediate) and the passages reach the tutor on the next
turn, not as a second answer. A bible-talk answer may carry `fetch` (1 to MAX_FETCH 4 references, `Revelation 2:8-11`, FETCH_MAX_VERSES 30 in all: a passage that goes over
is cut, those after it are not read; the instructions' part `220-other-passages.md`). After the answer is kept, `useTalk` reads them in the background
(`src/services/talkFetch.ts` `fetchPassages`: New Testament only, from the app's chapter data through `loadChapter`, the Greek and the English the Reader shows, the MSB with
supplied words marked; a passage over HELD_PASSAGES_BYTES 3000 keeps its first verses and its reference says which) and keeps them on the turn (`TalkTurn.fetched`,
`keepFetched`); the turn draws one muted line under the answer, 'Tutor fetched Rev 2:8-11' (`fetchedLine`, `[data-talk-fetched]`), and nothing else on the sheet changes.
Every later request of the talk carries `held_passages` (`heldPassagesOf`: the newest turn's first, each reference once, at most 8 and HELD_PASSAGES_BYTES in all; none in
About); `fitHistory` drops the oldest of them before a verse of the talk's own text or a turn. New talk forgets them with the turns. Checks: tests/unit/talk-fetch.test.ts,
features/bible-talk.feature (the Revelation 2:8-11 scenario), grinds/examples/bible-talk/fetch-where-the-talk-heads.json and held-passage-answers-from-it.json.

## A talk names itself to the mill

The mill keeps one Claude session per talk (epic mw-pxji7y: the first turn runs cold, every later turn resumes it with the request's `history` left out, the one-hour cache warm; at its context cap it writes the talk's key points and the next turn starts a fresh session from them). The phone only has to *name* the talk and keep what the mill says back (mw-pxji7y.3):

- **The name** is the grist header's `talk` beside `app`, `kind` and `v` (`src/services/mill.ts` `scriptOf`; left out when none, so the bytes of today's envelope are unchanged): `<ref>@<when of the talk's first turn>`, `rom.8.28@1790000000000`, from `talkNameOf(ref, turns, now)` in `src/services/talk.ts` (at most `TALK_NAME_MAX` 80 bytes: a longer ref is cut, the time stays). A talk with no turns yet is named from the time he asked (`startedAt`) and that very time is the `when` its first turn is stored with (`useTalk`), so every later turn finds the same name from `listTurns(ref)[0].when`. New talk (`deleteTurns`) therefore makes a new name by itself; a quiz (`:quiz` ref), a screen talk and a shared or free talk each have a ref and so a name of their own. `AskOptions.talk` carries it, and `askGrind` sends it only for the kinds in `TALK_KINDS` (`gristKinds.ts`: bible-talk), so verse-ask names none. `fitHistory(request, held, talk)` counts the name's bytes against `MAX_REQUEST_BYTES`.
- **The history is still sent every turn.** The mill strips it on a resume; it is the fallback when the mill starts a session afresh. The grind's contract (`010-the-contract.md`) says the turns above in the session are its history on a resumed turn.
- **The answer's `talk` block** (`session` fresh | resumed | refreshed, `reason`, `turns`, `context_tokens`, `key_points` once) comes to `AskOptions.onTalk` (`talkSessionOf` in `mill.ts` reads it; one in a shape this app does not read is no block, as an older mill sends none). On `refreshed` with `key_points` `useTalk` replaces the talk's running summary with them (`summaryOfKeyPoints`: cut to `TALK_SUMMARY_MAX`, since the mill writes up to 1500 characters; `covered` = every turn kept so far) and keeps the full text on the answering turn (`TalkTurn.keyPoints`), which draws one grey line under its answer, 'The tutor wrote down the key points of this talk so far' (`src/talk/KeyPointsLine.tsx`); a tap shows the key points in a sheet. `fresh` and `resumed` show nothing. A first turn that is waited for again after a reload is named by the `startedAt` kept with it; a Retry of a first turn whose grist went and was lost on the link is sent again with its first name but stored with the new time, so the next turn names a new talk (the mill starts afresh from the history).
- Checks: tests/unit/talk-id.test.ts, tests/unit/mill-envelope.test.ts, tests/e2e/talk-session.spec.ts.

Which tutor conversations name a talk (the sweep of mw-pxji7y.3):

| Conversation | Ref rule | Names a talk |
| --- | --- | --- |
| Talk sheet on a chapter, a verse or a passage; a word's, a grammar term's, a paradigm table's, a Quick test question's Ask the tutor | `rom.8`, `rom.8.28`, `rom.8.1-11` (`talkRef`) | yes: `<ref>@<first turn's when>` |
| Quiz me | `<ref>:quiz` | yes, its own talk beside the talk about the same verses |
| The round Ask the tutor on a screen | `screen.<slug>` (`screenRef`) | yes |
| A drill's results | `screen.drill-it.<ms>`, one talk for each drill | yes |
| A shared talk, Ask for more | `talk.<ms>` (free) | yes |
| The welcome interview | `screen.welcome` | yes in code (the interview is a few turns) |
| The Verse view's Ask the tutor (verse-ask) | none: one question and its answer in `answers` | no: `TALK_KINDS` leaves verse-ask out |
| FormHelper (Let the tutor help me fill this in) | none: its turns live in the component, not in Dexie, so there is no first-turn time | no (a name would be made per opening of the helper; a story of its own) |
| Reading check, Reading drill, Tips, find-refs, audible-position, drill-items, feedback | none: one request each | no |

Other apps, listed only: where the same `talk` field would go. SpellForge: the `tutor-turn` grists (`src/features/tutor/tutor-flow.ts`) take the id of the tutor session `tutorRepo.createSession` makes for a problem, which already groups the turns that `session_history` carries; `parent-ask` is one question and names none. Legend: `legend-ask` (`src/services/ask.ts`) takes the item's or country's id and the time of the first question kept about it, as `<item id>@<when>`.

Other apps, listed only (read in their rigs, nothing changed there): SpellForge's `tutor-turn` sends `session_history`, the earlier turns compacted by the app to what has been tried, and its `parent-ask` is a single question: neither has a running summary.
Legend's `legend-ask` sends `history`, up to three earlier questions with their answers, no summary; its coin-from-photos, coin-rarity and item-value grinds are one request each.

## An ask Lampas cannot meet

When he asks for something Lampas does not do ('can this work with Olive Tree?', a new setting, a change), the answer carries `feedback_offer`
`{summary}` (one line, at most 200 characters; `grinds/bible-talk.instructions/` "Asks the app cannot meet": say it plainly, never promise the
change). The turn then shows the summary and **Send this to the makers** (`FeedbackOffer` in `src/Talk.tsx`, on every Talk sheet, the Reader's too).
Nothing is sent without the tap. The tap is `submitFeedback` (`src/services/feedback.ts`, the one feedback sender Ask for another approach uses too; a tutor-ask is filed through pwa-kit/requests' `fileFromTalk`, with no count of requests a day, and the kit's `send` is the grist below):
a `feedback` grist of kind `tutor-ask` with his words, the summary, the screen's name (`Reader` for a talk about the text), the talk's reference and the
screen's facts (the last facts give way when the request is over `MAX_ASK_BYTES`); the mill forwards it to the Mayor and answers `{"status":"sent"}`.
The turn (`TalkTurn.feedbackOffer`, `feedbackSent`, no table change) then reads **Sent** and "The answer will come back." with a **Your requests** button under it (closes the sheet and opens #/requests, where the makers' answer appears; mw-5r3p30.677); a failure shows the usual
title and Retry. The bus hears `feedback-sent` with `feedback: 'tutor-ask'`.
Every send, of either kind, also keeps a row in Dexie `requests` (v16: `{txid, kind, summary?, text?, app_version, sentAt, status}`, key `txid` = the
grist's id, status `'sent'`; `src/data/repositories/requests.ts` `keepRequest`, `listRequests`), written as soon as the grist is out (askGrind's `onSent(txid)`),
so a status that comes back can be matched to it. A tutor-ask keeps the tutor's `summary`, a grammar approach his `text`; a Retry is a new grist and a new row.
Settings > Ask for more (mw-hqd5bz.37, `src/settings/AskMoreScreen.tsx`, #/askmore) leads him here for asks that would grow the app (an approach or programme, a study
resource, a text, a translation): its first button, **Ask the tutor**, opens the talk of the screen 'Ask for more' with "I'd like Lampas to have " in the composer
(TalkHost's `shared`, not sent), and the instructions' part 270 has the tutor offer `feedback_offer` for such an ask. Under it, **Or fill in a form**: one short
form for an approach or programme, a text and a translation, whose Send is a `feedback` grist of kind `approach`, `text` or `translation` (`buildMoreRequest`: `name`, `text?` (why), `url?`);
its request row keeps `name: why` as its `text`. **A study resource** between them has no form of its own: it opens Ask for a book (below).

### Ask for a book (mw-rfjjzd.14, PROVISIONAL; docs/design/library-at-scale.md section 6)

One sheet, `src/library/AskForBook.tsx` (a `useSheetBack` dialog, drawn in the body), replaced the four boxes that asked for a book (Settings > Grammar books > Ask for another book, Settings > Daily > Request
a devotional, Ask for more's study-resource form). It opens from the Library card (**Ask for a book**), the idea sheet (**Ask for a grammar ›**, with Logos On: kind Grammar), Settings > Daily (**Ask for a devotional**, the
row `request.devotional`, a door not a setting: kind Devotional) and Ask for more (**A study resource**): the place presets the **Kind of book** select (`KINDS`; Any kind for the rest). None of them is drawn without a licence.
With a Logos list kept (Dexie `exportRows`, `unmatchedRows()`: the rows the catalogue did not list) a search over their title, series and Resource ID shows at most 30; a pick fills the request with the row's Resource ID, Type, Series
and ReferenceSupersets; without one, or by "or type a title", the title is typed (at most `MAX_BOOK_CHARS` 200). **Why would it help?** is optional (`MAX_FEEDBACK_CHARS`, counted not cut). One line (`ask-sends`) says what is sent.

**Send** is a `book` request `{kind, title, resource?, type?, series?, refs?, kindWanted?, why?, app_version}` (`buildBookRequest`; the input schema's `book` branch, `grinds/examples/feedback/ask-for-book.json`
and `ask-for-book-from-list.json`; `refs` is cut at a whole token to `MAX_REFS` 600), through `submitFeedback`, the one sender. It replaced the `grammar-book`, `devotional` and `study-resource` kinds (a phone that sent one
keeps its row, which Your requests still names). The row in `requests` keeps the title as `text` and the Resource ID as `resource`. Before it goes, `bookRefusal` (`src/services/bookRequests.ts`) refuses a book the
catalogue already lists (by Resource ID, or by title, short name or 'author, title': **Lampas opens this one: turn it On**) and a book already asked (a `book`, `grammar-book` or `devotional` row, or one still waiting; by
Resource ID when both have one, else by the title with case, marks and spaces ignored: **You asked for this on 21 Oct. Your requests follows it.**), and sends nothing.

The request is kept on the phone first (settings store 'bookRequestsWaiting', `data/repositories/bookRequests.ts`; an entry the old box kept, with its title as `text`, is still read), then sent by `src/services/bookRequests.ts`: offline
(`navigator.onLine === false`) or with the mill unreachable it stays and the sheet says **Waiting to send: <title>** (with 'It goes when you are back online.', or the failure title and **Try again**); it goes by itself on
the window's `online` event (`startBookRequests`, called from `main.tsx` and from the sheet) and on Try again, one send at a time and in the order asked. A request is forgotten when its grist is out (`onSent`), so a receipt that
never comes does not send it twice. Note that Talk and Ask for another approach do NOT wait offline (they show the failure and Retry); only a book queues. `features/ask-for-book.feature`.

**The whole list, once.** The import's result screen (`src/library/ImportLibrary.tsx`) has **Ask the makers about these** while the list holds usable books and the phone is licensed. It sends one `library` request
`{kind, books, usable, counts, catalogue_version, app_version}` (`buildLibraryRequest`; `counts` is every unmatched row by Logos type, the 40 largest) with one attachment, `library.csv` (`text/csv`: ResourceId, Type, Title, Series,
ReferenceSupersets, under 200 KB, `libraryCsv` in `src/library/usableRows.ts`) holding only the usable rows: commentaries on the New Testament, Greek lexicons and grammars, Greek texts, interlinears of the New Testament and
devotionals (`usableKind`); never manuscripts, English Bibles, Old Testament books or tools. `feedback.json` takes `text/csv` beside the pictures, bsv-kit's `GRIST_FILE_TYPES` carries it and `src/services/mill.ts` checks it. Flood
control (`askAboutLibrary`, `libraryRefusal`): a second one is refused until the catalogue version has changed or 30 days have passed; the note (meta `libraryAsked`: when, version, books) shows as **Asked on 21 Oct: 412 books. The
makers add what fits with each update.** on the result screen in place of the button and on the Library card. Nothing is sent until he taps. Both kinds are kept in `requests` and Your requests names them **Book** and **Your Logos
library**.

### Today's devotional (mw-5r3p30.680, PROVISIONAL)

"Pick a different devotional" while Which devotional is Random must not turn Random into a fixed choice, so the registry has `todaysDevotional` (declared in `src/settings/definitions/daily.ts`, its entry in `src/settings/registry.ts`, its row `TodaysDevotionalControl`): the devotional Today shows on the phone's date, read as its Logos id. The tutor writes `"another"` (or a Logos id for today alone); the write ends in `dailyStore.ts` `pickAnotherDevotional` / `setDevotionalPick`, the one function the Another button on Today also taps, and writes nothing to Which devotional. While a devotional is named the entry writes nothing and its row is not drawn: a different one is then a change of Which devotional (the bible-talk instructions say which to use; `grinds/examples/bible-talk/devotional-another-*.json`). `tests/unit/todays-devotional.test.tsx`, `tests/e2e/today.spec.ts`.

### Your requests

`#/requests` (route `requests`, kept; Settings > More > Your requests and a button on About) lists the rows of `requests`, newest first, each with its summary
(or his words), what kind it was and one status line (`src/RequestsScreen.tsx`): **Sent**, **Filed**, **Being built**, **Adopted in 0.1.86** (a link to the
record's `url`, new tab), **Declined: <reason>**, **Now a setting: <name>**. The backend pushes nothing for a grist (Postern protocol section 9 item 6), so the
screen pulls `GET /api/messages?since=` when it opens, every `requestTimings.pollMs` (20 s) while it is up and at once when the page is shown again (mw-5r3p30.220), never overlapping and not while the page is hidden
(`src/services/requestStatus.ts` `pullStatuses`). The cursor is the backend's `next`, kept in the settings store (`requestsCursor`, no table;
`getRequestsCursor` / `setRequestsCursor`, it never goes back), so a record is read once. A record counts only when it is a `grist` record from the mill
to this key, signed (when the backend says who) and sealed by the mill, whose plaintext is a `request-status` (§19) for a request the phone holds
(`applyRequestStatus`); anything else is skipped and the cursor passes it. A row takes a record only when its `ts` is newer than the one it already took
(`statusAt`), so the newest by `ts` shows whatever order they arrive in. The row keeps `bead`, and `version`/`commit`/`url`, `reason` or `setting` for the status that carries them
(optional fields, no Dexie version). A failed pull shows 'Could not check for news just now' and leaves the list as it was.

#### The tutor knows his requests (mw-vy3ghg.6)

Every verse-ask and bible-talk request carries `requests`: the 10 newest rows, newest first, each `{summary, status, version?, setting?, reason?}`
(`src/data/requestsForTutor.ts` `requestsForTutor` / `requestsOf`; the status is `sent` or a record's `filed`, `building`, `landed`, `declined`,
`adopted-as-setting`, and a line holds only the field its status carries; a grammar approach is named by his words; texts are cut to 120/80/40
characters so ten lines stay a few KB). Both input schemas take it (`maxItems` 10), it is missing when he has sent none and in About (whose request is the
credits), and `fitHistory` drops the oldest lines when nothing is left of the history to cut. Both grinds' instructions have '## His requests': answer
'what happened to my idea' from it, status by status, never inventing one. For `adopted-as-setting` the Talk puts the change in `setting_offer` (his tap
or his yes makes it; `settings_changes` only when he asks in words); verse-ask can change only Ask by, so for any other setting it says where Settings has it.
Scenarios: `features/tutor-requests.feature`, `grinds/examples/{bible-talk,verse-ask}/request-<status>.json`.

The whole loop is walked at 390x844 by `tests/e2e/feedback-loop-demo.spec.ts` (mw-vy3ghg.7: three requests sent, the fake mill's filed, building, landed with its link, declined and adopted-as-setting, then 'What happened to my idea?'; shots `your-requests-demo-1-sent` to `-6-tutor`). Live: he sends from the tutor, the Mayor runs `mw grist request <bead> <txid>`, and Your requests moves on its own.

## Answering an offer by voice (mw-5r3p30.186)

The tutor leaves three kinds of offer for a tap: **Send this to the makers** (`feedback_offer`), a setting change (`setting_offer` `{key, value}`, checked by
`offeredChange` in `src/settings/registry.ts`; the button reads 'Change Theme: Dark') and the quiz goal (`quiz_goal_offer`, Yes, from now on | Just this time).
He may say yes, no or 'read it back' instead, in Talk, spoken or typed. `src/talk/offers.ts` `pendingOfferOf(turns)` finds the newest turn of the talk with an
offer nobody has settled; `useTalk.say` sends it with his next turn as `pending_offer` `{kind: 'feedback' | 'setting' | 'quiz-goal' | 'bridge' | 'greek' | 'rusty', text}` (the exact text it would
send or do). The bible-talk grind, not a word list in the app, decides from his words and answers `offer_reply`: `confirm`, `decline` or `read_back`
(`grinds/bible-talk.instructions/` "Answering an offer by voice"; five examples under `grinds/examples/bible-talk/offer-*.json`). `settleOffer` first reads the turn again from the store (`stillOffered`): an offer his tap has settled since the words were sent is left alone, so a late yes does not apply a setting twice or show a second Changed row, and a late no does not withdraw what he took (mw-5r3p30.328). It then does it:
confirm does exactly what the tap does (feedback: `sendMakersOffer`, the one function the button calls too; a tap and a yes for the same turn share the one send in flight, so the makers get one grist, and the button is off while either is sending, `useOfferSending`; setting: `takeSettingOffer`, the change lands on the
answer's turn with its Undo; quiz goal: keeps it), decline withdraws it (**Not sent**, **Not changed**, **Not kept**; nothing is sent), read_back changes nothing and the
answer, which the app reads aloud like any answer, holds the text word for word. No `offer_reply`, or no offer waiting, is an ordinary question: the offer and its
button stay and ride with the next turn. A step that fails on a yes (the mill is down) is said under the answer and the button is still there.

## The bridge: a question he is not ready for (mw-1vuvq6.5, PROVISIONAL)

His words (12 Oct 2026): when he asks about something he does not have the foundation for, the tutor should say which foundation, offer to take him there, and the app should take him. The tutor still answers
briefly at his level first, so he is never refused.

- **What the device works out** (`src/data/grammar/bridge.ts`, pure): `askedIdeas(question, term)` finds the ladder ideas his question is about by the grammar words in it (an idea's `terms` plus a few aliases such as
  'diphthong'; at most three, the highest on the ladder) and `missingFoundations(question, levels, term)` walks `ideasBelow` them (LADDER `needs`, however far down) and keeps the ideas whose level is not yet or not at all (a
  frontier idea is being learned, so it is met; a letter, a pair or a breathing is named by its group idea, `alphabet`...). The request carries it as `missing_foundations` `{topic, total, ideas}`, the lowest on the ladder
  first (at most eight; `total` counts all; `direct` marks what the topic itself names as a need). `ideas[0]` is the next step. No topic named, or nothing missing under it: no field, and no bridge.
- **What the tutor answers**: an optional `bridge` `{missing, next, why}` in the bible-talk and verse-ask answers: one to three ids (an enum generated from `LADDER` by `npm run grind:build`, so the schema refuses an idea the ladder
  lacks; `isTalkAnswer` and `isVerseAnswer` refuse too), most important first, `next`, and one plain line why. More than three missing: the answer says 'you are missing quite a bit' and lists exactly three. The instructions
  ('When he is not ready for the question') tell it to pick from `missing_foundations` only.
- **What the app does with it** (`resolveBridge`): without the device's list the bridge is dropped (the model does not guess); the ideas shown are the tutor's that the device listed (three at most, else the first three of the
  device's list); the idea 'Take me there' opens is `missing_foundations.ideas[0]` whatever the model said. The turn keeps it (`TalkTurn.bridge`; a verse answer's `TutorAnswer.bridge`) and `src/talk/BridgeOffer.tsx` draws
  the ideas, the why and **Take me there: <title>**. The block shows the bridge as it stands now (`liveBridge`, with his levels): an idea he has taken up since (Learning or solid) is no longer listed, the button moves on to the lowest idea still lacking, and when none is left the block is gone (mw-1vuvq6.11); a spoken yes carries the same text (`pendingOfferOf(turns, levels)`). A tap, or a spoken yes (`pending_offer` of kind `bridge`, `settleOffer` -> `takeBridgeOffer`, the same function the button calls), opens that idea's sheet
  (`src/IdeaSheet.tsx`) over the talk (`openBridgeIdea`, module state, so a tap and a yes for the same turn leave one sheet open). Done or the phone's Back closes it and the talk is there as it was; the
  button stays to open it again, and a yes to it on the talk's newest turn still carries `pending_offer` and opens it (`takenOfferOf` in `offers.ts`, the same for a taken Greek or rust offer; mw-1vuvq6.8). The talk is not a quiz (no bridge in Quiz me). The bridged idea becomes his frontier only if he starts it there (Got it).
- Tests: `features/talk-bridge.feature`, `tests/unit/bridge.test.ts`, examples `grinds/examples/bible-talk/bridge-*.json` and `grinds/examples/verse-ask/bridge-quite-a-bit.json`.

## Rust: he comes back and is rusty (mw-1vuvq6.6, PROVISIONAL)

His words (12 Oct 2026): a person is not always going forward; he takes a break, comes back and is rusty, and the tutor should recognise that, say which words or ideas were solid before, and offer to move them to Frontier and practise.

- **What the device works out** (`src/data/rusty.ts`, pure; `src/data/learnerRusty.ts` reads the store): a SOLID word or idea is **rusty** when a wrong answer is among its last 3 answers (`Review.recent`, kept beside the schedule by
  `writeReview`; a row from before has none), or when it is 7 or more days past its due date (a 30-day step is meant to be rare, so only an overdue item counts). The request carries up to 8 as `rusty` `[{kind: 'word' | 'idea', id, title, why}]`,
  worst first (most slips, then the longest unseen); `why` is plain: 'slipped twice this week', 'slipped lately', 'not seen for 3 weeks'. Missing when nothing is rusty, and in a quiz. It goes in the bible-talk and verse-ask requests
  (`tests/unit/tutor-knows.test.ts`: verse-read and tips have a written reason they are not sent it). The thresholds are constants at the top of `src/data/rusty.ts`; all PROVISIONAL.
- **What the tutor says** (`grinds/bible-talk.instructions/` 'When he has gone rusty'): when it fits the talk, once, plainly ('You're rusty on X and Y: they were solid before'), and leaves ONE `rusty_offer` `{items: [{kind, id}]}`.
  The verse-ask tutor may mention it in its answer; it leaves no button (the Talk is where the app offers).
- **What the app does with it** (`src/talk/rustyOffer.ts`): `rustyOfferOf` keeps only the items the request itself listed, in its order, with its titles, once a talk, none after his no or in a quiz; the turn keeps it (`TalkTurn.rustyOffer`)
  and `src/talk/RustyOffer.tsx` draws the titles and **Move back to Frontier and practise**. A tap, or a spoken yes (`pending_offer` of kind `rusty`, `settleOffer` -> `takeRustyOffer`, the function the button calls), moves the items
  that are still solid to Frontier (`moveToFrontier` in `src/data/repositories/rusty.ts`: a word becomes learning, an idea frontier with how 'tutor', both back at step 0 and due now), closes the sheet and opens Review on a round of just those items
  (`src/review/practise.ts`, `drawReviewRound`'s `chosen`). Nothing moves without the tap or the yes. The one-frontier rule (mw-i7xe0n.6) has not landed: when it does, only the worst item moves and the next is offered after it; Drill it has
  no screen yet, so the practice is a Review round.
- **Welcome back** (`src/WelcomeBack.tsx`): opening the app when the latest day before today with any use (`lastUsageDayBefore`, the usage log) is 7 or more days ago, and some solid item is past its due date, draws a strip with the
  most overdue (`overdueOf`, at most 5), **Refresh** (a Review round of just those) and **Not now** (put away for the day, localStorage `lampas.welcomeBackDay`; Refresh puts it away too). The strip is in the shell's flow and `relative z-60`, so the Verse view and the sheets do not cover it (`tests/e2e/shell-bars-over-views.spec.ts`).
- Tests: `features/tutor-rust.feature`, `features/welcome-back.feature`, `tests/unit/rusty.test.ts`, `tests/unit/rusty-store.test.ts`, examples `grinds/examples/bible-talk/rusty-*.json` and `grinds/examples/verse-ask/rusty-mentioned.json`.

## Today: the tutor sees the day's list (mw-5r3p30.731, PROVISIONAL)

His words (22 Oct 2026, Postern general): everything in the app should be an API, a tutor client in the app should let the tutor fetch what it needs and do what he wants done. This is the first slice of that (the general client is the grilling mw-6ww.127; this does not pre-empt its shape): one fact read, one thing done. On 3 John 1 he asked "do you know the words that they are on my drill for today, drill me on them" and the tutor said it could not see his drill plan.

- **The field** (`src/data/learnerToday.ts` `todayNow`, read like `rustyNow`): the request's `today` is the items behind the Reader's chip 'Today · N of M', in the order Today draws them (`todayPieces`): `[{kind: 'review' | 'plan' | 'psalm' | 'proverb' | 'devotional', title, done?}]`, with titles 'Review: 17 due' ('Review: nothing due'), 'Reading plan: 3 John 1' ('Reading plan' with none started), 'Psalm 5', 'Proverbs 5' and the devotional's title. `done` is whether he ticked it today; it is left out of every item while Settings > Daily > Tick boxes is Off (nothing can be ticked, so 'not done' would be a guess). At most `TODAY_MAX` (12; Today holds nine at most). Missing when Today holds nothing, and in a quiz and the welcome. It goes in the bible-talk request only (`tests/unit/tutor-knows.test.ts`: verse-ask, verse-read and tips have a written reason they are not sent it). The name `today` and the cap are PROVISIONAL.
- **What the tutor says** (`grinds/bible-talk.instructions/` 'The day's list'): asked what is on today's drill or what is left, it names the items by `title`, those not done first, never "I can't see your drill plan", and leaves `today_offer: true` beside it, once a talk.
- **What the app does with it** (`src/talk/todayOffer.ts`): `todayOfferOf` keeps the offer only when the request listed items, once a talk, none after his no or in a quiz; the turn keeps it (`TalkTurn.todayOffer`, `todayChoice`) and `src/talk/TodayOffer.tsx` draws **Open today's drill**. A tap, or a spoken yes (`pending_offer` of kind `today`, `settleOffer` -> `takeTodayOffer`, the function the button calls), closes the Talk sheet and opens Today (`navigate('today')`); his no marks it declined. Nothing opens without the tap or the yes.
- Tests: `tests/unit/tutor-today.test.ts`, example `grinds/examples/bible-talk/today-drill.json`.

## Greek words he says aloud (mw-5r3p30.244)

Hold to talk and Hold to ask use the phone's recogniser in en-US, so a Greek word he says arrives as English sound-alikes ('Tech N9ne' for
τεκνίον). The words the recogniser handed over are remembered (src/speech/spoken.ts, noted by speech/askTranscriber.ts, the transcriber of every hold: the Ask composer's, the Talk sheet's composer and, through talk/useTalkHold.ts, the Talk bar, Welcome and the letter drill); a question whose text is those words goes to bible-talk and verse-ask with `spoken: true` (buildTalkRequest, buildRequest), and a
typed one, or one he edited after speaking, has no such field. `wasSpoken` is asked once, as the message is sent (`useTalk.say`, `useAsks.ask`), and forgets the words, so the same words typed after are his typing (mw-5r3p30.333); Retry sends the same text and so stays marked (the failed line in `pendingAsks` keeps `spoken`). Both grinds' instructions
('## Greek words said in English speech') tell the tutor to match the sound-alike to the passage's Greek words and lemmas, answer about the best
match and say in one line which word it took ('I took "Tech N9ne" as τεκνίον.') rather than ask first (PROVISIONAL). Scenario:
grinds/examples/{bible-talk,verse-ask}/spoken-greek-word.json.

## What he said, cleaned up

He often speaks his question, so the words that reach the grist can have no punctuation, an "um", a repeat or a dropped start. Both tutor grinds
that take a question (`bible-talk` and `verse-ask`) give it back as the answer's `question` (their instructions' "Cleaning up what he said"): his
words with capitals and punctuation, the fillers, repeats and false starts taken out, the meaning unchanged. The Talk sheet's turn
(`TalkTurn.cleanQ`) and the Verse view's answer card (`TutorAnswer.cleanQuestion`, `[data-answer-question]`) show that in place of the raw
transcript; the raw words stay kept as `q` / `question` (and `q` is what goes in the next request's history). An answer with no `question`, such as
one kept before this, shows the raw words. While the answer is on its way the raw words show, as before. No table change (the fields are not indexed).
A question he SPOKE (`wasSpoken` when it was sent, kept as `spoken` on the turn or the answer) whose cleaned question differs from his words also shows them under it as a
muted `You said: ...` line (`src/ui/YouSaid.tsx`, `[data-you-said]`, mw-5r3p30.308), so the answer's 'I took "technia" as Τεκνία' has something to read against; a typed question never shows it.
The model sometimes keeps a lone um, uh or er in the Verse view's cleaned question, so `src/services/fillers.ts` `withoutFillers` strips them (and the commas
around them) before it is kept (mw-5r3p30.193; `umbrella` and `Uh-oh` are not touched); the Bible talk's `cleanQ` has no such guard yet.
Checks: `tests/unit/fillers.test.ts`, `tests/unit/cleaned-question.test.ts`, `grinds/examples/*/cleaned-question.json`, and the scenarios "What he said is shown back cleaned up"
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

## Taking him to a chapter (mw-5r3p30.172)

Asked in the Talk sheet to switch to, open, go to or take him to a chapter ('can you switch to Colossians 1'), the tutor puts `go` {book, chapter} in its answer (the book's name from the app's own list, `src/data/books.ts`, a chapter in range; `grinds/bible-talk.instructions/` 'Taking him to a chapter') and says where it is taking him. The app reads `go` itself, never the text: `src/talk/go.ts` `readGo`. `isTalkAnswer` lets any `go` through, so a shape the app refuses never costs him the answer.

- A `go` the app can take, while that talk's sheet is open (`useTalk`'s `GoTo.allowed`): the turn is kept with `opened` ('Colossians 1', shown under the answer as `Opened Colossians 1`), the sheet closes and `nav/readerRequest.ts` `openedByTutor` opens the Reader there as a new Back step, which shows the notice `Opened Colossians 1` under the header. The phone's Back returns to the chapter he was on. The answer is not read aloud (the Reader that would read it is gone).
- The same from the round Ask button of any other screen (mw-5r3p30.198, `src/AskTutor.tsx`, `tests/e2e/ask-tutor-go.spec.ts`): the screen's sheet is the talk whose sheet must be open; the Reader opens on the chapter with `Opened Colossians 1` and the phone's Back returns to the screen he asked from. Share links (`ShareTalk.tsx`) keep not opening a go.
- A `go` to the chapter he is already on (mw-5r3p30.199, `GoTo.here`): nothing moves (the sheet stays, the address keeps its view and weave, no Back step) and the turn says `Already on Romans 8` (`TalkTurn.stayed`).
- A `go` that arrives after he closed the sheet (pressed Done): nothing moves, the answer is shown, and the turn says `You closed Talk before this came, so John 3 was not opened` with a button `Open John 3` (`TalkTurn.unopened`, kept with the turn): the tap closes the sheet and opens the chapter as `Opened John 3` does. The tap then turns the turn into `Opened John 3` (`markUnopenedOpened`: `unopened` becomes `opened`), so reopening Talk shows no stale line and no button.
- A `go` the app cannot take (no such book, a chapter the book lacks, a shape it refuses), or any go in a talk that has no door to the Reader (Share links): nothing moves, the answer is shown, and the turn says `Could not open <x>`, so the tutor's text never claims a move that did not happen.
- The Reader's header shows the whole chapter title at 360 px and up (`src/reader/ReaderHeader.tsx`): the book's name is never cut, its type shrinks (18 px down to 11 px) to the room the title has, and the chapter number may drop to a second line (`tests/e2e/tutor-go-details.spec.ts`).

## Pictures in a talk

The Talk sheet takes pictures (mw-y3qno5.1, `features/talk-pictures.feature`): a screenshot of a lexicon entry, a page, a note. Above the field are
**Attach a picture** and **Take a photo** (the Composer's own buttons, mw-06ggew.15: the sheet's input is voice-kit's Composer, as Ask the tutor's and Postern's is, with
`attach` and `camera` on and `refuseFile` letting only JPEG, PNG and WebP in), and a **paste** into the field of a copied picture is an attachment too; pasted text pastes as before.
The Composer holds the waiting pictures itself (a row 'Pictures to send', each with a remove x named for its file); a share's pictures are its `incomingFiles`.

- At most **four** pictures a message, JPEG, PNG or WebP (the grind's `attachments`, `grinds/bible-talk.json`: max 4, `maxBytes` 1 MiB). A fifth gets the line
  nothing is cut: Send says "Four pictures at most. Take one out and send again; nothing has been cut."; another kind of file is refused when it is added, "Only JPEG, PNG or WebP pictures can be sent."
- Each is cut down **on the phone** as Send is pressed (`src/talk/pictures.ts` `preparePictures`, `shrinkImage` with `{maxEdge: 1600, maxBytes: 1 MiB}`: a JPEG, quality then size
  lowered until it fits); a picture that cannot be used keeps the message in the composer with a line saying so.
- A waiting picture is the Composer's thumbnail with its remove x. Send (the Composer's, or words he holds to say in its bar) sends them as the grist's `attachments` (`picture-N.jpg`) and the request
  has `pictures: N`. Pictures with no words ask "Read the picture and tell me about it." (`PICTURE_ONLY_QUESTION`; the grind knows it).
- The turn keeps them in Dexie (`talkPictures`, v14: `{turnId, place, bytes, mime, name}`, written with the turn by `addTurn`; `listTurnPictures`), so a reopened
  talk shows them. His turn draws them as 64 px thumbnails (`src/talk/TurnPictures.tsx`); a tap opens the picture full screen in pwa-kit's shared viewer
  (`pwa-kit/picture-viewer`: a modal `<dialog>` on the browser's top layer, so no screen's z-index covers it, Drill it's z-40 included; pinch, drag and double tap zoom;
  a Back step of its own, `useSheetBack`; Close, Back or Escape closes it). While the answer is awaited the thumbnails stand above his question. A message sent again unchanged
  (Retry) sends the same pictures; a different message does not.
- The grind (`## Pictures he sends`) tells the tutor to read the text in each picture (Greek, Hebrew, English), say what it is, and **quote every Greek or
  Hebrew word it discusses as plain text, never only describe it**. Every Greek stretch of an answer is a word to tap (`src/script/GreekWord.tsx`: the Greek
  voice, `speakWord`, the same engine as a long press; Hebrew was already one), so the quoted words are there to hear. Scenario:
  `grinds/examples/bible-talk/lexicon-entry-picture.json` (its picture is an invented sample entry).
- Checks: `features/talk-pictures.feature`, `tests/unit/talk-pictures.test.ts`, `tests/unit/db.test.ts`, and `tests/e2e/talk-pictures.spec.ts` (390 px; shots
  `talk-pictures-composer`, `talk-pictures-turn`, `talk-pictures-full-screen`) and `tests/e2e/talk-picture-viewer.spec.ts` (the viewer is what the viewport's centre hits, from the Reader and from Drill it; the Hebrew guide opens over Drill it).

## Conversations

Every talk with the tutor is kept on the phone per conversation (`repositories/talks.ts`: a verse, chapter or passage `rom.8.28`, a quiz `rom.8.1-11:quiz`, a screen
`screen.goal`, a talk of its own `talk.<ms>`). The **Conversations** screen (mw-5r3p30.696; `#/conversations`, route `conversations`, in `KEPT_PATHS`, reached by
**Conversations** under Settings > Account > More; `src/Conversations.tsx`) is the list of them:

- **The list** is `listConversations()`: one row per conversation, the one with the newest last turn first, each drawn by `src/share/TalkRow.tsx` (the row Share to
  Lampas > **Choose a talk** draws too, so the two lists never drift): its place in words (`talkPlace.ts` `talkLabel`: "Romans 8:28", "Quiz on Romans 8:1-11", "Ask
  the tutor: Goal"), the date of its last turn and the first line of its last question (as the tutor cleaned it up when it did). A key this app does not make is not listed.
- **The search** (one box, "Search conversations") is `searchConversations(query)`: a turn matches when every word typed is in its question or its answer, any case,
  and the conversation is listed with the line of its newest matching turn that holds the first word (cut to 120 characters around it). It runs on the phone over
  the turns already kept (a phone's few thousand are filtered in memory; no index, no new database version, no grist).
- **A tap** opens the conversation to carry on: the Talk sheet over a scope made from its key (`talkScope.ts` `useTalkScope`, `ShareTalk.tsx` `TalkHost`, as Share to
  Lampas opens one) with its turns shown and its composer ready for the next question. A Bible chapter that is not on the phone and cannot be fetched says so, with Try again.
  **Done** closes the sheet and the list is as he left it (his search too).
- It is read only: no delete and no rename here (the Talk sheet's own **New talk** still forgets the one conversation it is on).
- Checks: `tests/unit/conversations.test.ts`, `tests/e2e/conversations.spec.ts` (390 px; shots `conversations`, `conversations-search`, `conversations-resumed`).

## Share to Lampas

Lampas is in the phone's share sheet (mw-y3qno5.2, `features/share-target.feature`): Share > Lampas from the Photos app, Logos or any app that shares a picture,
words or a link opens Lampas on **Share to Lampas**, which asks which talk they go to. Chrome lists an installed web app in the share sheet from its manifest, so
a phone that installed Lampas before this version may need it removed and installed again from Chrome before **Lampas** appears in the list.

- **The manifest** (`pwa-manifest.ts`) has `share_target`: action `/share-target`, POST, `multipart/form-data`, `title`, `text`, `url` and `files` (`image/*`, `text/csv`, `.csv`: a shared CSV is his Logos list and opens the library import at `#/library?import=<id>`, not this sheet; docs/resources.md).
  `tests/unit/manifest.test.ts` holds it to `src/share/target.ts`.
- **The worker** (`src/sw.ts`, `src/share/target.ts` `receiveShare`) answers the POST: it reads the files and words, keeps them in Dexie (`shares`, v15,
  `{id, createdAt, text?, files}`; one share waits, a new one replaces it; `src/data/repositories/shares.ts`) and redirects (303) to `/#/share?s=<id>`. A GET to
  `/share-target` is not answered (it is a page load). A share with nothing in it opens Home. The worker reaches Dexie through `src/data/db.ts`, so that file
  imports no screen or registry (`src/settings/applied.ts` holds the one type it needed): `tsconfig.sw.json` would otherwise pull the whole app in.
  `tests/unit/sw-share.test.ts` runs the worker's listener with a fake POST (a stand-in request: Node's Request cannot parse a jsdom File).
- **The screen** (`#/share`, route `share`, in `KEPT_PATHS`; `src/share/ShareScreen.tsx`) is behind the licence gate like every screen. The sheet **Share to
  Lampas** (`useSheetBack`) says what is waiting ("2 pictures and some words from another app") and offers, in this order: **Continue: <the newest talk> ·
  <when>** (the default, the focused one; only when a talk was ever had), **New talk**, **Choose a talk** (the recent talks, newest first, at most 20, each with its
  name, its date and its first question; `repositories/talks.ts` `listConversations(20)`, drawn by `src/share/TalkRow.tsx`, the row **Conversations** draws too) and **Cancel**.
  The sheet is drawn once the talks are read, so a tap never lands on a button that moved.
  Only JPEG, PNG or WebP files are counted as pictures (mw-s1dc0n.14: `shareText.ts` `describeShare`); any other (a GIF) gets the line "1 picture left out: Lampas reads only JPEG, PNG or WebP." (`leftOutLine`), is not read for references and stays out of the talk's composer. A share with nothing readable (no words, no such picture: `hasReadable`) offers only Cancel, with no New talk, Choose a talk or Continue (mw-5r3p30.665).
- **A pick** takes the share off the phone's store and opens the talk in the Talk sheet over its own scope (`src/share/talkScope.ts`, `ShareTalk.tsx`): the
  address becomes `#/share?talk=<key>` (kept, so after leaving the app and coming back he is in that talk, with its turns; the pictures and words were
  placed once and are not kept). The pictures wait in the composer (`TalkSheet`'s `shared` prop: the Composer's `incomingFiles`, cut down like any picture when sent) and the words
  in its field, **not sent**; the sheet opens scrolled to the talk's end. A talk about a chapter, verse or passage, or a quiz on one, is the Talk sheet over
  the chapter (fetched; offline and never read says so, with Try again), with Help with this word and a grammar term asking the tutor in that talk; a talk from a
  screen (`screen.<name>`) is the Ask the tutor sheet's scope; **New talk** is a talk of its own (`talk.<ms>`, `TalkScope.free`, titled **Talk with the
  tutor**, a `screen` {name 'A talk with the tutor'} so the tutor knows it is about no text and no screen). `src/share/talkPlace.ts` reads a key (`placeOf`) and
  names it (`talkLabel`, `timeAgo`).
- **Bible references** (mw-s1dc0n.1, `features/share-references.feature`): shared words are searched for references (`src/nav/refsInText.ts` `findReferences`, over
  `links.ts` `parseCanonReference`: no second table of names; a full name or an abbreviation with or without a dot, `1 John`, `Ps 23`, `Rom 8:28-30`, `Rom 8:28, 31` as one
  reference each; a translation tag such as ESV is left out; a word that is also English, such as `Mark my words`, needs a chapter and verse or a capital) and the sheet shows
  **Bible references (N)** above the choice (`src/share/ShareReferences.tsx`): each reference as printed, a link whose href is `links.ts` `referenceUrl` (a range at its
  first verse, an Old Testament book by its OSIS code `OT_OSIS`; the href is what a long press or a new tab has). **A tap opens the usual pop-up over the list** (mw-5r3p30.697: the
  tutor's reference card, `src/markdown/ReferenceCard.tsx` `ReferenceLink`), and the list stays under it: so he can read just those verses one after another without leaving it. The pop-up
  shows the verses in the mode he reads in now, as the Reader draws them (`MarkedPassage`: English, the Weave with his weave settings, or Greek; the footer names the Majority Standard Bible or
  the Robinson-Pierpont Greek), for every place the card is used (the tutor's answers, a Review question, this list). A reference to the Old Testament, which Lampas does not hold, opens the card
  that says **Not in Lampas yet**, with **Open in Logos** when Logos is on. The card's **Open** goes to the Reader on the verse's chapter with the verse brought to the top and the rest of the
  chapter above and below it (`readerRequest.ts` `openAtVerse`, the request `useBringVerse` meets; no verse is selected, so never the one-verse Verse view); from this list it takes the place of
  the list's own history entry (`route.ts` `replaceReader`, `ReferenceLink`'s `replacing`), so Back from the Reader returns to the list, which draws its sheet afresh. Checks:
  `tests/unit/reference-card-mode.test.tsx`, `tests/e2e/share-refs-popup.spec.ts`, `tests/e2e/share-verse-back.spec.ts`. **Page order** (the default) keeps the order of the text, a reference named twice at its first place
  with **×2**; **Bible order** groups them under each book. The choice is kept on the phone (localStorage `lampas.shareRefsOrder`). With words and no reference it says **No Bible
  references found**.
- **Bible references in a picture** (mw-s1dc0n.2, `features/share-references.feature`): a shared picture (a screenshot of a book's page) is read by the mill's `find-refs`
  grind (`grinds/find-refs.json`: sonnet, low effort, PROVISIONAL; one picture, `{language}` in, `{references: [{printed, ref}]}` out, `ref` in the OSIS form `links.ts` writes) while
  the sheet says **Finding Bible references...**, and what it finds joins the same **Bible references (N)** list as the words' (one rendering: `ShareReferences`; with words and a picture
  the words' are listed from the first moment, while the picture is read and when it fails (mw-s1dc0n.9), with the reading's line under the list; the section is drawn under Cancel, because it appears when the grist answers and nothing he may be about to tap may move). `src/share/findRefs.ts` cuts each picture as a talk's is (`talk/pictures.ts` `preparePicture`, `filesOf`), sends it with `askGrind` and
  does not believe the answer: `checkedReferences` reads each `ref` again with `parseCanonReference` and the book's chapter count and drops a book that is not one of the Bible's 66, a chapter
  past the book's end or a verse 0; a range in `printed` keeps its last verse. A failed grist says **Could not find Bible references in the picture.** with **Try again**; a phone that is offline (or a mill that cannot be reached) says so in the tutor's own words instead (`failedLine`, mw-s1dc0n.13); several pictures are read one grist each and one that fails keeps the references of the others (`settledRefs`, mw-s1dc0n.9). **The answer is kept by the picture's fingerprint** (mw-5r3p30.695): `findRefsInPicture` hashes the picture's bytes (SHA-256, `crypto.subtle`; `repositories/pictureRefs.ts` `fingerprintOf`) and looks them up in the Dexie `pictureRefs` table (v24, `{hash, at, found}`, on the phone only, the newest 200 pictures), so coming back to the share for the next verse, or sharing the same picture again (whatever its name), shows its references at once and spends no grist. Only a picture read without error is kept (a page with no reference is kept as an answer); a failure, an offline phone or a bad answer keeps nothing, so **Try again** reads it. A phone that cannot read or write the table reads the picture as before. Checks: `tests/unit/find-refs-cache.test.ts`, `tests/e2e/share-refs-cache.spec.ts`. A phone with no
  licence is not offered the grist (`useAiAllowed`; `features/ai-needs-licence.feature`). The smoke scenario is `grinds/examples/find-refs/kindle-gen-1-28.json` (a Kindle page quoting Gen. 1:28).
- **Nothing moves under his thumb** (mw-s1dc0n.6, `tests/e2e/share-steady.spec.ts`): the sheet is its full height (85dvh) from the start, so what **Bible order** or
  **Choose a talk** adds goes below the control he tapped instead of lifting the sheet (a double tap on **Bible order** used to land on the **Gen. 1:28** link), and its
  content never gets shorter while it is up (`src/ui/neverShrink.ts` `useNeverShrink`), so closing a list at the end of a scrolled sheet slides nothing down onto the control.
- **Cancel**, the phone's Back, Escape and a swipe down drop the share (`dropShares`) and open Home; Done or Back on the talk opens Home.
- Pictures only JPEG, PNG or WebP join the composer (`image/*` from the share sheet may bring a GIF or HEIC: the composer says "Only JPEG, PNG or WebP pictures can
  be sent." as it does for an attach); at most four.
- Checks: `features/share-target.feature`, `tests/unit/sw-share.test.ts`, `tests/unit/share-talks.test.ts`, `tests/unit/manifest.test.ts`, and
  `tests/e2e/share-target.spec.ts` (390 px, through the built worker, which that spec lets run; shots `share-target-sheet`, `share-target-talk`).

## Memory (mw-yrmkdf.1)

Lampas keeps notes about the reader on his phone and tells them to the tutor (mw-yrmkdf.2, below). Settings > Memory (`#/memory`)
shows an index he writes (up to 1000 characters; the app adds under it one line per note, the note's name and the first line of it, so the tutor
reads at most 1500) and the named notes: `book:<Book>`, `word:<lemma>` (NFC) or `topic:<slug>`, each up to 2000 characters, at most 40, with when
each was changed and by whom (you or the tutor). He can edit the index and any note, delete a note (it asks once more) and Export everything as one
file (`lampas-memory-<date>.json`, no date inside, so an import exports back to the same bytes). Import reads a file, says what it holds ("The
file holds the index and 2 notes: ...") and replaces what is kept only on "Replace my memory"; a file that is not a Lampas memory changes nothing.

It is kept in the settings store (`src/data/repositories/memory.ts`), outside the registry so the tutor cannot change it by `settings_changes`; the
tutor's only write is an append (`appendToNote`, `appendToIndex`). `selectNotes(reference, focusLemma, screen)` is what a request carries: the
index with the book note of the reference, the word note of the focus word and the topic note named for the screen.

### The tutor reads and writes it (mw-yrmkdf.2)

Every tutor grist (bible-talk, verse-ask, verse-read, tips) carries `memory` `{index, notes: [{name, text}]}` (`src/data/learnerMemory.ts`
`learnerMemory`, over `selectNotes`; the Bible talk passes the talk's reference, the focus word's lemma and the screen's name, verse-ask and
verse-read the verse's reference, tips only the index; missing when nothing is kept; not in About's credits request). The tutor is never asked which
notes it wants: the app chooses by name. The grinds' instructions say to read the index first and use it quietly, as `learner_profile` is used, and never
to repeat it back. When the record is too big `fitHistory` drops the notes from the end of the list, after the history, the word list and his requests;
the index stays.

The bible-talk answer may carry `memory_update` (at most 4 entries `{name | 'index', append | replace | remove, directed?}`) and `wished_notes` (at most 5
names). `src/talk/memoryUpdate.ts applyMemoryFromAnswer`, called by `useTalk`, appends by 'tutor' (a note that is not there is made); a `replace` or
`remove` is applied ONLY with `directed: true`, which the grind's instructions allow only when he asked for exactly that in his words of this turn; the
app cannot hear his words, so an undirected one is refused and logged (`console.warn`) and the note is unchanged. `wished_notes` (names in the naming
scheme) are counted and the last 20 names kept (`keepWishedNotes`, settings store key `memoryWished`); About shows 'Notes the tutor wished he had: N' with
the names under it, and nothing else is sent for them. Examples: `grinds/examples/bible-talk/memory-update-wished.json`, `verse-ask/memory-quiet.json`,
`verse-read/memory-partial-misread.json`, `tips/memory-index.json`; `features/memory-tutor.feature`, `tests/unit/memory-grist.test.ts`.

### The Greek offer (mw-yrmkdf.4)

Lampas opens in English, so the tutor offers the Greek gently, and only as far as the Greek dial (Settings > How much Greek?, `src/settings/definitions/greekInterest.ts`, mw-3ased2)
lets it. The bible-talk request carries `reader_view` (`'english' | 'greek'`: the Reader's English | Greek choice; missing in a talk from a screen) and `greek_interest`
`{level, name, next?: {level, name}}` (the dial's step, its name and the one step above it, built by `greekInterestField` in `src/services/talk.ts` from the settings; missing in a quiz
and a talk from a screen; an unplaced phone reads All in, with no `next`). The grind's `## Offering the Greek` decides: at 0 (Just English) and 1 (Curious) the tutor answers in English
with no Greek words unless he asks; at 0 it makes no `greek_offer` unless he asks about the Greek; on real interest in the original (what a word really means, why translations
differ, what the original says) it leaves ONE `greek_offer` `{kind: 'word' | 'view', text, lemma?}` (a word offer names a lemma of the passage) that offers to raise the dial
ONE step, to `next`, whose name the `text` carries; never more than one step, none at All in. Which kind and when none (mw-5r3p30.715, `tests/unit/greek-offer-when.test.ts`): a question about what one word means is always `word` with its lemma, `view` only when no single word is asked about; none when `reader_view` is `greek` (he already reads the original); none in the answer that sets `greek_asked` (he asked for the Greek after his no). `greekOfferOf` (`src/talk/greekOffer.ts`) stamps the step the offer names, from the level the
request carried, as `to`. `src/talk/GreekOfferButton.tsx` draws it as a button under the answer (after a tap the button stays and a `role=status` line under it says 'The Greek dial is now
Curious.', with 'Opened the Greek word.' after it for a word offer, mw-yrmkdf.10); a tap, or a spoken yes (`pending_offer` of kind `greek`), is `takeGreekOffer`: `raiseGreekInterest(to)`,
the dial's own function, which brings in what the step brings (nothing is set directly); a word offer then asks the Talk sheet (`requestGreekWord`, watched by `TalkSheet`) to open the
Greek word's sheet over the talk. The app keeps to the limits too (`greekOfferOf`): the first offer of a talk only (the history shows it), none while the index holds his no, none at All
in, none for a word the text lacks, none in a quiz or a talk from a screen. A no (`offer_reply` decline) is `settleOffer`: the turn is marked declined and the app appends `said no to the Greek offer <date>` to the
memory index (`noteGreekNo`, once); the tutor does not write it. The line is in `memory.index`, so the next requests carry it and the tutor offers nothing
until he asks for Greek himself: the answer then sets `greek_asked: true` and `applyMemoryFromAnswer` takes the line out (`clearGreekNo`). verse-ask has the
same English default (`## English for a reader not learning the Greek`) and no offer. Examples: `grinds/examples/bible-talk/greek-offer-*.json`, `greek-dial-offer-at-zero.json`,
`verse-ask/english-reader-said-no.json`; `features/greek-offer.feature`, `tests/unit/greek-offer.test.ts`.

### The welcome (mw-yrmkdf.3)

A new reader is met by the tutor. `src/Welcome.tsx` (mounted in `App.tsx`, drawn only inside a `LicenceProvider`, so a screen drawn alone in a test is never welcomed) calls
`startWelcomeIfFirst` (`src/data/repositories/welcome.ts`) when `useLicence()` first says `licensed`. The phone's own flag is localStorage `lampas.welcome`
(`pending` | `done` | `skipped`; null until the phone is looked at). A phone that holds a profile, any setting or any talk is a reader from before: its flag becomes `done` and
nothing else changes (`welcomeStartFor`, `isExistingReader`). A phone with none is put on the English defaults (step 0 of the Greek dial, Just English: the English view, Weave Off, New words a day Off, so the
Reader has no Greek and no New words chip) and the flag becomes `pending`: the welcome Talk opens at once, and again on each later open until the tutor ends it or he taps Skip.
Closing the sheet only puts it off.

The talk is a talk from a screen named Welcome (`TalkScope.welcome`, kept under `screen.welcome`, WELCOME_REF). `buildTalkRequest` sends `mode: 'welcome'` with the
screen and no `greek`, `english` or `greek_words` (and no `rusty`); the app says the hello for him (WELCOME_OPENING) so the tutor's first question is the first thing he
reads. The grind's `## The welcome` asks at most three questions, one at a time, in plain English with no Greek (why he is here: read, study or learn the Greek; what he
wants; one thing about himself), writes each answer to the index with `memory_update` (and to the profile with `profile_update` where a field fits) and ends with a line of
thanks that carries `welcome_done: true`, which `useTalk` turns into `finishWelcome` (`done`); the sheet stays up to be read. A reader who says he is here to learn the Greek
is offered the Greek once: a `greek_offer` of kind `view` (`greekOfferOf` allows it in the welcome and names Dipping a toe, `to: 2`), and its tap, or a spoken yes, calls
`raiseGreekInterest(2)`, which turns the Weave on (Solid) and leaves the Reader's view to him. Skip (a button in the sheet's header while the welcome is `pending`) appends `skipped the welcome` to the index and
sets `skipped`. Settings > Developer (Developer mode On) has Show the welcome again: it forgets the talk, puts the English defaults back and sets `pending` (for the demo).
Examples: `grinds/examples/bible-talk/welcome-*.json`; `features/welcome.feature`, `tests/unit/welcome.test.ts`; an e2e spec past the gate marks the welcome done
(`openUnlocked`, `welcome: true` leaves it due).

## About you (mw-1vuvq6.1)

The tutor meets the student where he is, so it is told who he is as well as what he knows. Settings > About you (`#/aboutyou`) keeps a small
profile on the phone only: age (a number or a band, as he writes it), pace (Quick, Steady or Slow; a second tap clears it), ways of learning
(any of Hearing, Seeing, Reading, Doing), background and why (his words, 200 characters each) and the notes the tutor has learned (each with the
day it was learned, edited or removed on the page). Every field is optional, each saves as he types, and Clear empties the whole page.

It is kept in the settings store under `learnerProfile` (`src/data/repositories/profile.ts`) and goes out only as the request's `learner_profile`
(`src/data/learnerProfile.ts`) on the four tutor grinds: bible-talk (not in About, whose request is the credits), verse-ask, verse-read and tips.
Only filled fields are sent, the notes as the newest six texts; with nothing filled the field is left out. The four input schemas hold the same
bounds (`additionalProperties: false`), and each grind's instructions say how to use it ('Meeting him where he is'): pitch the pace and the
way, never repeat it back, and ask for a missing part at most once a talk, pointing him to Settings > About you.

All four grinds are told the whole student (mw-1vuvq6.2): verse-read (`buildReadingRequest`, sent by `useReadChecks`) and tips (`buildTipRequest`,
sent by `offerTip`) carry `learner` (the words line) and `learner_grammar` (the same object the talk is sent) beside `learner_profile`, built as
`useAsks` builds them and left out when they cannot be read. Each grind's instructions pitch the answer to the three: age sets the wording and the
examples, pace how much comes in one answer, ways of learning the activity offered, background the bridges, and a word or grammar idea he has not
met is never built on without saying so. `grinds/examples/{bible-talk,verse-ask}/profile-*.json` answer one question for a slow, hands-on learner and
a quick reader; `tests/unit/tutor-meets-student.test.ts` holds all of it.

### Detect first, ask last (mw-1vuvq6.3)

The profile is filled mainly by what the phone and the tutor can tell, and a question is the last resort.

- **Pace, from use.** `src/data/observedProfile.ts` `observedPace` works out quick, steady or slow from his saved answers (the Quick test and Review in
  `results`, the Parsing drill in `drills`) over the last 30 days: answers per minute within his sittings (a gap over 5 minutes ends one) and the share
  right; slow under 2.5 a minute or under half right, quick from 6 a minute with 70 percent right, else steady; nothing under 20 answers. All
  PROVISIONAL constants. It rides every grist as `learner_profile.observed_pace` beside the pace he chose.
- **Ways, from what he uses.** `observedWays` turns counts into whole-percent shares: hearing (`verse-reading`, `word-spoken` in the usage log), reading
  (`chapter-opened`, `verse-selected`, `word-tapped`), doing (quiz, review and drill answers and readings aloud) and seeing (pictures sent in a talk); nothing under 50
  uses. It rides as `learner_profile.observed_ways`. Hold to talk is not counted apart yet.
- **Age and background, guessed in talks.** The bible-talk answer may carry `profile_update` (at most three: `field` age, pace, ways, background, why or
  note; a short `value`; `guessed: true` for a judgement of the tutor's, allowed only for age and background; `declined: true` for a no) and
  `profile_question` (the field a question in the answer was about). `useTalk` keeps them with `learnFromTalk` (repositories/profile.ts), in the profile
  row beside his own fields as `learned` (one item per field: value, when, talk, guessed, mine), `removed` and `asked`. It never writes over a field he
  set himself: a learned item for such a field is a suggestion (`isSuggestion`), shown but not sent; a guess never replaces something the tutor was
  told; what he removes is not added again from the same talk; what he changes becomes his words (`mine`).
- **Asking.** The grind may ask one light question per talk, only for a field nothing else fills and only when it would change the answer. The
  app keeps it from nagging: a field asked about is in `learner_profile.do_not_ask` for a day, and for good after `declined`.
- **About you** shows each item ('hands-on, from a talk', 'Lampas guesses: adult (from your talks)', 'Lampas suggests: ...' while the field is his own)
  with Change and Remove, 'What Lampas sees' (pace and ways, counted on the phone), and each note with when and 'from a talk'. Clear empties it all.
  Checks: `features/about-you.feature` (the tutor learns, guesses, never overrides), `tests/unit/profile-learned.test.ts`,
  `tests/unit/observed-profile.test.ts`, `grinds/examples/bible-talk/learn-{volunteered,do-not-ask,declined}.json`.

## How long an answer takes (mw-46z0my.5)

Every tutor answer is timed on the phone (src/services/tutor.ts askGrind, src/services/clientTiming.ts), in milliseconds:
`tap_to_sent` (his tap, or the end of the recording, to the request accepted by the backend, upload included), `delivered_to_seen`
(the backend's `firstSeen` for the answer's record to the poll that saw it; both clocks are read as they are, so a phone's clock that is off
shifts it: a negative result is held at 0, and one longer than the poll's sight less the request accepted is held to that, mw-46z0my.12) and `seen_to_shown` (the poll's sight of it to the answer drawn: the screen that keeps the answer calls
`answerDrawn(txid)`). `network` is the round trips of the calls that sent the grist plus the one poll that saw the answer, and `poll_network` the poll's alone
(it lies inside the other two). The finished timing is kept in localStorage `lampas.lastAnswerTiming` and goes to the mill as `client_timing` (with the
answered grist's txid) beside `input` in the NEXT grist's plaintext (millwright's docs/grist-client-timing.md); the first grist after install, a failed
or abandoned one, and a feedback grist (not a tutor answer) have none to send or leave none. bsv-kit's sendGrist cannot carry the member, so
src/services/mill.ts (the gated client) sends the grist itself, as bsv-kit does. About shows one line from it: `Last tutor answer: 8.6 s (phone 1.3 s, network 0.7 s, waiting to
see it 1.5 s, factory 5.8 s)`: the phone's share is its own work, the factory the rest. Each part is shown to a tenth and the parts add up to the total exactly: a tenth that rounding would lose or add goes to the part with the largest remainder (clientTiming.ts tenthsAddingUp). features/tutor-timing.feature.

## How the phone hears an answer (mw-46z0my.6)

While an answer is awaited the phone listens on the backend's live event stream (`GET /api/events`, Postern's docs/protocol.md section 10), read with
`fetch` because `EventSource` cannot send the signed header (src/services/answerStream.ts, after Postern's src/services/live.ts). The backend names every
record it takes in (`message` {seq}) and says `hello` on connect; the stream carries no answer, so a `message` after the grist's own place, or a hello,
makes the wait page `GET /api/messages` at once (the page `since` the grist's seq, as before). The poll stays as the backstop: every 3 s (`tutorTimings.pollMs`)
while the stream is not up (not yet open, dropped, or a backend without the `events` feature in `GET /api/me`), every 15 s (`backstopMs`) while it is. A drop
polls at once and reconnects with a backoff of 1 s doubling to 30 s; a stream silent for 60 s (the backend pings every 25 s) is read as dropped; the page coming back
to the screen pages at once. The stream is open ONLY while an answer is awaited, not while a talk is open: a talk can sit idle for minutes, and an open stream keeps
the radio awake with a ping every 25 s (Postern's docs/research/battery-and-responsiveness.md), while an answer is waited for for seconds. Waits that are out at once
share one stream; the last to end closes it. features/tutor-live-stream.feature.

The stream is used only when `GET /api/me` lists the `events` feature for the phone's key. At the time of writing Postern lists it only for cockpit keys and answers a
Lampas licence's key 403 on `/api/events` (server/internal/api/handlers.go: `gate(cockpitKeys|mayorKey, ...)`), so the live app still polls every 3 s until Postern admits grist keys to the stream.

## A question is never lost (mw-5r3p30.602)

What each question is doing is kept apart from the screen that asked it (src/pending/pendingAsks.ts, in localStorage), for the Verse view's Ask and for every Bible talk (the Talk sheet, the round Ask button, Welcome, Share). A question that failed keeps its red box and Retry (and in the Ask box the question comes back into the field) when he leaves the page and returns or the page reloads. A question that had gone to the tutor and still waits is waited for again when the page is back and its verse view or talk sheet is opened: the same grist is waited for, none is sent a second time, and its answer is stored under it. A question that had not gone yet comes back as 'The page was closed before the question went' with Retry; the pictures of a talk message in flight are not kept, the question is. When the phone loses its network while a question waits, the box says 'You are offline. Check your connection and try again.' within a moment, with Retry, which waits for the answer to the grist that went. After Send, the Ask box keeps the question and the wait in view above the composer (sideways too), and a long question of his own does not push the first lines of the answer out of view. Tests: `tests/e2e/question-kept.spec.ts`, `tests/e2e/tutor-offline.spec.ts`.

## Tests

`features/tutor-live-stream.feature`, `features/ask-tutor.feature` (the control, the request, the questions, what is kept), `tests/unit/ask-tutor.test.ts`, the `screen` blocks of
`tests/unit/talk-request.test.ts` and `bible-talk-grind.test.ts`, and `tests/e2e/ask-tutor.spec.ts` (place, size and clearance at 390 px; the shots
`ask-tutor-goal`, `ask-tutor-reader`, `ask-tutor-sheet`); the offer: `features/feedback-offer.feature`, `tests/unit/feedback-shared.test.ts`,
`tests/e2e/feedback-offer.spec.ts` (shots `feedback-offer`, `feedback-offer-sent`); answering an offer by voice: `features/voice-offers.feature`, `tests/unit/voice-offers.test.ts`; the bridge: `features/talk-bridge.feature`, `tests/unit/bridge.test.ts`.
