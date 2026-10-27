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
| Settings | no facts; `screen.settings` instead (mw-5r3p30.107): every setting and study-resource switch, as `{ name, value, help }` (`Logos`, `Off`, the hint shown under it), at most 40, from `src/settings/tutorSettings.ts`. A setting that is Off is listed though its details are hidden, so he can ask what it would give. The longer help of a registry setting is in the grind's instructions |
| About | no facts; `screen.credits` instead (mw-vtjxh4.2): every credit of ATTRIBUTION.md as `{ name, use, licence, link }` (`TBESG`, `STEPBible (Tyndale House): each word's lemma, gloss and definition`, `CC BY 4.0`, `https://www.stepbible.org`), at most 40, from `src/tutor/credits.ts` (the short form of the bullets; `tests/unit/credits-for-tutor.test.tsx` fails when it drifts from ATTRIBUTION.md: a bullet with no credit, or a credit whose name, link or licence the bullet lacks; it weighs at most `MAX_CREDITS_BYTES` 5200). The credits take most of the 8000-byte record, so on a talk with credits `buildTalkRequest` sends no `solid_words` and no `learner_grammar`. The instructions' "Talk from About" say how to explain a source: what it is, who made it, what it gives this reader, what its licence lets us do, and why we credit (Newton's line). A new credit is a bullet in ATTRIBUTION.md and an entry in CREDITS |
| Drill it (the results of a drill, mw-5r3p30.649) | `Idea`, `Result` (`Proved`, `You reached step 2 of 4`, `Short drill on <facet>: 3 of 5 right`), `Questions` (`3 asked, 2 right, 1 wrong`), `Strong` and `Weak` when the run has them; and `screen.drill` instead of text: every question in the order asked as `{ idea, asked, answer, right_answer, right, hinted? }` (at most 14; `idea` is the facet's label, cut to 60, `asked` the prompt with the Greek it is about, 100, `answer` and `right_answer` 40; `hinted` is true on a right a Hint helped with). Built by `src/tutor/drillTalk.ts` `drillScreen`, cut by `fitScreen`; `fitHistory` drops right answers first, oldest first, when the record is over `MAX_REQUEST_BYTES`. Drawn by `DialogAskTutor` (`src/AskTutor.tsx`) inside `DrillItScreen` and `PlanDrillScreen` once the run is over: the round button in the foot's right end beside Done (`FootBar beside`), the sheet over the dialog, kept under its own key for each drill (`screen.drill-it.<ms>`, `TalkScope.kept`; `placeOf` names it 'Ask the tutor: Drill it'). Suggestions: `drillSuggestions`, the first 'Why did I get these wrong?' when any were wrong, else 'What should I practise next?'. The instructions' 'Talk from a drill's results'; examples `drill-results-wrong` and `drill-results-all-right`; `tests/unit/drill-talk.test.ts`, `tests/e2e/drill-ask-tutor.spec.ts` |
| the rest | the name |

A request also carries `resources` (mw-5r3p30.123): the study resources he has switched on, so the tutor links one only when it truly helps (docs/resources.md "The tutor's links"). It carries `works` (mw-5r3p30.675, mw-rfjjzd.10) when any commentary, grammar, Greek text, interlinear or book of his Logos shelf is on: a digest chosen by the place he is on (the pinned books, the commentaries that cover the chapter, grammars and Greek texts for a question about a form or a reading, a `more` count), at most 1,200 bytes, to the Verse view ask as well, so the tutor links a work only when it is listed (docs/resources.md "Works he holds in Logos"). `knows.ts` classifies it as `works`: sent by place to the Bible talk and the Verse view ask, a written reason for the verdict on a reading and the tips.
A New Testament verse the tutor names in an answer ('Hebrews 7:2') is a link to that verse's Verse view, in the Talk sheet and in the Ask box alike.
A request in the Bible talk also carries `maps` (mw-zbjgn3r.4): the maps of the chapter of the passage it holds, and the answer's `links` take `{kind: 'map', map: <id>}`, drawn as the chip `Map: <title>` that opens that map in the app (docs/maps.md 'The tutor brings up maps').
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
(the one it was sent and the fold, in one; the part opens with that rule in bold, the contract lists `summary` "with `fold`, always" and "How to answer" ends with a check of it: the smoke example summary-folds-fallen-turns missed 2 of 3 on 2026-10-25 when the rule stood once, mid-part); `useTalk` saves it with `covered` + the fold's length, never when the answer lacks it or the request had no fold, so a missed one is simply sent again. `fitHistory` keeps the `summary` over every other optional part (it goes only after the newest
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
About); `fitHistory` drops the oldest of them before a verse of the talk's own text or a turn. New talk forgets them with the turns. The instructions' part 220 says a passage already in `held_passages` or `verses` is never fetched again, only verses held in neither (mw-shkz42: the smoke example held-passage-answers-from-it once fetched Revelation 2:8-11 again). Checks: tests/unit/talk-fetch.test.ts,
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
| FormHelper (Let the tutor do it) | none: its turns live in the component, not in Dexie, so there is no first-turn time | no (a name would be made per opening of the helper; a story of its own) |
| Reading check, Reading drill, Tips, find-refs, audible-position, drill-items, feedback | none: one request each | no |

Other apps, listed only: where the same `talk` field would go. SpellForge: the `tutor-turn` grists (`src/features/tutor/tutor-flow.ts`) take the id of the tutor session `tutorRepo.createSession` makes for a problem, which already groups the turns that `session_history` carries; `parent-ask` is one question and names none. Legend: `legend-ask` (`src/services/ask.ts`) takes the item's or country's id and the time of the first question kept about it, as `<item id>@<when>`.

Other apps, listed only (read in their rigs, nothing changed there): SpellForge's `tutor-turn` sends `session_history`, the earlier turns compacted by the app to what has been tried, and its `parent-ask` is a single question: neither has a running summary.
Legend's `legend-ask` sends `history`, up to three earlier questions with their answers, no summary; its coin-from-photos, coin-rarity and item-value grinds are one request each.

## An ask Lampas cannot meet

When he asks for something Lampas does not do ('can I read the ESV beside the Greek?', a new setting, a change), the answer carries `feedback_offer`
`{summary}` (one line, at most 200 characters; `grinds/bible-talk.instructions/` "Asks the app cannot meet": say it plainly, never promise the
change). The turn then shows the summary and **Send this to the makers** (`FeedbackOffer` in `src/Talk.tsx`, on every Talk sheet, the Reader's too).
Nothing is sent without the tap. The tap is `submitFeedback` (`src/services/feedback.ts`, the one feedback sender Ask for another approach uses too; a tutor-ask is filed through pwa-kit/requests' `fileFromTalk`, with no count of requests a day, and the kit's `send` is the grist below):
a `feedback` grist of kind `tutor-ask` with his words, the summary, the screen's name (`Reader` for a talk about the text), the talk's reference and the
screen's facts (the last facts give way when the request is over `MAX_ASK_BYTES`); the mill forwards it to the Mayor and answers `{"status":"sent"}`.
The pictures he attached to that turn go with it as the grist's files (`sendMakersOffer` reads `listTurnPictures`; the `requests` row keeps their count as `pictures` and Your requests says "1 picture"; mw-5r3p30.759). The turn (`TalkTurn.feedbackOffer`, `feedbackSent`, no table change) then reads **Sent** and "The answer will come back." with a **Your requests** button under it (closes the sheet and opens #/requests, where the makers' answer appears; mw-5r3p30.677); a failure shows the usual
title and Retry. The bus hears `feedback-sent` with `feedback: 'tutor-ask'`.
Every send, of either kind, also keeps a row in Dexie `requests` (v16: `{txid, kind, summary?, text?, app_version, sentAt, status}`, key `txid` = the
grist's id, status `'sent'`; `src/data/repositories/requests.ts` `keepRequest`, `listRequests`), written as soon as the grist is out (askGrind's `onSent(txid)`),
so a status that comes back can be matched to it. A tutor-ask keeps the tutor's `summary` and his `words`, a grammar approach his `text`; a Retry is a new grist and a new row.
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
(or his words), what kind it was and one status line (`src/RequestsScreen.tsx`) that says what became of the ask and when (mw-5r3p30.796, wording table below; a link to the
record's `url`, new tab, for **Adopted**). The backend pushes nothing for a grist (Postern protocol section 9 item 6), so the
screen pulls `GET /api/messages?since=` when it opens, every `requestTimings.pollMs` (20 s) while it is up and at once when the page is shown again (mw-5r3p30.220), never overlapping and not while the page is hidden
(`src/services/requestStatus.ts` `pullStatuses`). The cursor is the backend's `next`, kept in the settings store (`requestsCursor`, no table;
`getRequestsCursor` / `setRequestsCursor`, it never goes back), so a record is read once. A record counts only when it is a `grist` record from the mill
to this key, signed (when the backend says who) and sealed by the mill, whose plaintext is a `request-status` (§19) for a request the phone holds
(`applyRequestStatus`); anything else is skipped and the cursor passes it. A row takes a record only when its `ts` is newer than the one it already took
(`statusAt`), so the newest by `ts` shows whatever order they arrive in. The row keeps `bead`, and `version`/`commit`/`url`, `reason` or `setting` for the status that carries them
(optional fields, no Dexie version). A failed pull shows 'Could not check for news just now' and leaves the list as it was.

**The status line** (mw-5r3p30.796, `src/data/requestWording.ts` `statusWording`, used by the screen; the tutor's lines and the search keep the kit's bare `statusLine`, so a date never matches a search). `<date>` is the day the status was set (`statusAt`; the sent day for Sent), written as the sent date is (`26 Oct 2026` in the phone's locale); a record with no `statusAt` reads without it. A status the wording does not know throws (`tests/unit/request-wording.test.ts`).

| status | line | without a date, version, reason or setting |
| --- | --- | --- |
| `sent` | Sent to the factory · `<date>` | (always has its sent day) |
| `filed` | Filed as a story · `<date>`, waiting its turn | Filed as a story, waiting its turn |
| `building` | Being built · since `<date>` | Being built |
| `landed` | Adopted in `<version>` · `<date>` (the link) | Adopted in `<version>` / Adopted |
| `declined` | Declined · `<date>`: `<reason>` | Declined: `<reason>` / Declined |
| `adopted-as-setting` | Now a setting: `<name>` · `<date>` | Now a setting: `<name>` / Now a setting |

Under a **Filed** line, once the request has waited more than 7 days (`QUEUE_DAYS`, `stillInQueue`: since it was filed, since it was sent when no filing date came), one quiet line reads **Still in the queue** (`data-request-queue`; PROVISIONAL, the Governor to confirm). Proof: `tests/e2e/your-requests.spec.ts` at 390x844 and 844x390, `features/your-requests.feature`.

What a request keeps on the phone (mw-5r3p30.794): a tutor-ask keeps the tutor's one-line `summary` and, since that story, his own `words` (the text he sent; optional, no Dexie version; a row kept before has none and shows its summary; `requestStore.all()` still hands the pwa-kit/requests twin check no words, so the same ask can be sent again), the number of `pictures` that went with it, `app_version` and `sentAt`; every other kind keeps its full text in `text` (a book its title and Resource ID, a library request a line that counts the books, an approach, text or translation the name with why after it). Every row is a button: folded it shows three lines of his words (the summary or text for a row without `words`), the kind and the date sent, and the status line; a tap opens it in place: his words and the tutor's summary when they differ, the date the status was last set (`statusAt`), the bead the factory filed and, when landed, the version (the link stays on the status line); a second tap folds it. The search over twenty rows also looks in his words and in the summary.

**The status filter** (mw-5r3p30.795): above the groups, whenever the screen has a row, the chips **All**, **Waiting** (sent, filed, building), **Adopted** (landed, adopted-as-setting) and **Declined**, each with its count (`All (30)`, `src/data/requestFilter.ts` `FILTERS`, drawn by `src/RequestsScreen.tsx`; `src/ui/Chips.tsx`, group name Status). A chip's rows are the statuses `STATUS_FILTER` maps to it, a `Record` over the kit's `RequestStatus`, so a status added to `pwa-kit/requests` fails the typecheck and `tests/unit/request-filter.test.ts` until it has a chip; a status read from a row that nobody mapped shows under All only. The chosen chip is kept while the screen is open (not saved); the search (shown when the phone holds more than twenty requests) works within the chip, counts the chip's rows and is kept when he changes chip; the group headers count what is shown; a chip with no rows says **Nothing waiting**, **Nothing adopted** or **Nothing declined**. Proof: `tests/e2e/your-requests.spec.ts` at 390x844 and 844x390.

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

## Send to the makers, any time (mw-5r3p30.760)

His words (Lampas feedback grist, 2026-10-25): "requestability of the make from any tutor interaction. And every tutor interaction has files, camera, voice and typing." The tutor's own offer
above is no longer the only way to the makers: the Talk sheet and the Verse view's Ask each have **Send to the makers** (`src/talk/SendToMakers.tsx`, `data-makers-send`), a thumb-sized button
just above the composer, there whether or not the tutor offered anything. In the Ask it is always there; in the Talk sheet it shows once the composer holds something to send (words, or a
picture alone: `SendArrow` tells the sheet what the Composer's own Send knows), because a row of its own cost the answers box 52 px (`feedback-offer-scroll.spec.ts` guards that room), and sideways
(`useShort`) it stands in the header, always, with what it says (Sending, Sent, the note) in the foot. It files what is in the composer as it stands: his words (typed, or a hold's words kept in the box with
Settings > Talk's By button), and the pictures he attached or took (up to four, cut down on the phone like any talk picture). It asks the tutor nothing and adds no turn.

- **One function.** `sendToMakers` (`src/talk/makers.ts`) is `submitFeedback` with a `tutor-ask` request and the pictures as the grist's files. The tutor's offer (`sendMakersOffer`), the Talk
  sheet's action and the Ask's action all call it (`tests/unit/send-to-makers.test.ts` asserts the offer does; `feedback-shared.test.ts` keeps `submitFeedback(` out of every sheet and screen).
- **How the action reaches the composer.** The kit's Composer keeps its words and files inside and hands them on only through its Send, so the action (`useSendToMakers`) presses that Send with a
  mark on it and the Composer's `onSend`, wrapped in `dispatch`, sees the mark and sends to the makers instead of the tutor. With nothing in the composer it sends nothing and says "Say or type what
  the makers should know, or add a picture, then tap Send to the makers."
- **The request.** `text` his words (pictures alone: "See the pictures."); `summary` the talk's kept running summary when it has one (Talk sheet only), else his words on one line (`makersSummary`, at most
  200 characters); `screen` the screen's name (`Reader` for a talk about the text, as the offer's) or `Verse view` for the Ask; `reference` the talk's title ('Romans 8:28') or the passage ('Romans 8:1-11'); `facts` the
  screen's, for a screen's talk. Your requests lists it by that summary with "1 picture" (the `requests` row is the offer's: kind `tutor-ask`, `pictures`).
- **Sent** reads "Sent to the makers. The answer will come back." with **Your requests** (the sheet closes first). A failure shows the usual title and detail in the composer's own line and keeps the words and pictures in it.
- **The Verse view's Ask has Attach a picture and Take a photo** now (the Composer's `attach` and `camera`, `refuseFile` as the Talk sheet's). The verse-ask tutor does not read pictures, so its Send with a picture in the row
  sends nothing and says "The tutor here does not look at pictures. Tap Send to the makers to send them, or take them out and ask again." (a picture is never dropped without his knowing).
- Checks: `features/send-to-makers.feature`, `tests/unit/send-to-makers.test.ts`, `tests/e2e/send-to-makers.spec.ts` (390 x 844; shots `send-to-makers-talk`, `-talk-sent`, `-ask`, `-ask-sent`).

### Every tutor surface: files, camera, voice, typing, a request to the makers (sweep of src/, mw-5r3p30.760)

| Surface | Files and camera | Voice | Typing | A request to the makers |
|---|---|---|---|---|
| Talk sheet (`TalkSheet`, `src/Talk.tsx`: the Reader's Talk bar and verse numbers, the round Ask the tutor button of any other screen (`AskTutor.tsx`, `DialogAskTutor` of the drills), Welcome, Share to Lampas' `ShareTalk`) | yes: Attach a picture, Take a photo, paste | yes: Hold to talk (Tap and By button as Settings > Talk) | yes: Type a message | yes: Send to the makers, and the tutor's offer |
| Verse view's Ask (`AskComposer`, `src/Ask.tsx`) | yes since this story (to the makers only; the verse-ask tutor does not read pictures) | yes: Hold to ask | yes: Type a question | yes: Send to the makers (this story); no tutor offer (the verse-ask grind has no `feedback_offer`) |
| Word help (the word sheet's Grammar, Sound it out, Ask the tutor; `useReaderTutor.ts` helpWithWord / askAboutTerm) | opens the Talk sheet: as the Talk sheet | as the Talk sheet | as the Talk sheet | as the Talk sheet |
| Drill and quiz results (`QuizScreen` Ask the tutor, Drill it, the Plan drill, the Parsing drill's link) | open the Talk sheet (or the Verse view's Ask with the question in the field): as that surface | same | same | same |
| Welcome interview (`Welcome.tsx`) | the Talk sheet's, so yes | yes | yes | yes (the action shows there too) |
| The FormHelper (`src/formHelper/FormHelper.tsx`: Ask for another approach, Ask for more, Ask for a book, Save as list) | no (mw-5r3p30.761, the door epic) | no (mw-5r3p30.761) | yes: its own field | the forms are themselves requests to the makers; the helper itself has no action (mw-5r3p30.761) |
| Reading check (`ReadCheck.tsx`, Read it aloud) and Memorize (`MemorizeSession.tsx`) | no | yes: it records or listens | Memorize: yes (Type it) | no: they are not a talk with the tutor; nothing to say to the makers there |
| Background asks (tips, the Audible position, finding references in a picture, more drill items, the nightly weights) | none: no composer | none | none | none: the app asks, not he |

Gaps this story leaves, not covered by it or mw-5r3p30.761: the verse-ask tutor takes no pictures (so a picture attached in the Ask can go only to the makers); the Welcome interview shows the action although
a request to the makers is out of place there; neither the Talk sheet nor the Ask can send voice notes (`voiceNote` is off in both Composers).

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

- **The field** (`src/data/learnerToday.ts` `todayNow`, read like `rustyNow`): the request's `today` is the items behind the Reader's chip 'Today · N of M', in the order Today draws them (`todayPieces`): `[{kind: 'review' | 'memorize' | 'plan' | 'psalm' | 'proverb' | 'devotional', title, done?}]`, with titles 'Review: 17 due' ('Review: nothing due'), 'Memorize: 2 verses due' ('Memorize: nothing due', 'Memorize: pick verses in a list' while no verse is memorized), 'Reading plan: 3 John 1' ('Reading plan' with none started), 'Psalm 5', 'Proverbs 5' and the devotional's title. `done` is whether he ticked it today; it is left out of every item while Settings > Daily > Tick boxes is Off (nothing can be ticked, so 'not done' would be a guess). At most `TODAY_MAX` (12; Today holds ten at most). Missing when Today holds nothing, and in a quiz and the welcome. It goes in the bible-talk request only (`tests/unit/tutor-knows.test.ts`: verse-ask, verse-read and tips have a written reason they are not sent it). The name `today` and the cap are PROVISIONAL.
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

## Let the tutor do it (mw-5r3p30.117, mw-o7cts8.2, mw-o7cts8.3, mw-o7cts8.4)

A form must never scare him off, so a form can offer a button at its top, `Let the tutor do it` (one label on every form; `src/formHelper/startLabel.ts`;
PROVISIONAL). The forms that have the door, each with the command its Send runs (`name`, a `confirm` command):

| Form | Where | Command | Its FormSpec |
| --- | --- | --- | --- |
| Ask for another approach | Settings > Grammar approach | `ask-for-approach` (`src/services/formCommands.ts` `askForApproachCommand`) | `APPROACH_FORM` (`approachForm.ts`): `approach`, `pictures`, `credit`, `link` |
| An approach or programme, A text, A translation | Settings > More > Ask for more | `ask-for-more` (`askForMoreCommand(kind)`; its args carry `kind`, one of `MORE_KINDS`, beside the fields) | `MORE_FORMS[kind]` (`moreForms.ts`): `name`, `why`, `link` |
| Ask for a book | the Library card, the idea sheet, Settings > Daily, Ask for more | `ask-for-book` (`src/library/bookCommand.ts`) | `BOOK_FORM` (`bookForm.ts`): `title`, `kind`, `why` |
| Save as a list | the Share sheet, under Bible references (N) | `save-as-list` (`src/services/formCommands.ts` `saveAsListCommand(refs, names)`) | `saveListForm(names)` (`src/share/saveListForm.ts`; `SAVE_LIST_FORM` is it with no lists): `where` (a choice: `New list` and the names of his lists, read when the form opens), `name` (at most `LIST_NAME_MAX`, 60) |

(A study resource is asked for as a book.) It opens a panel (region `The tutor is helping with this form`, above the form's fields) where the tutor
asks ONE question at a time in plain words (`What approach would you like to suggest, and how does it teach?`), he answers in the panel's Composer (voice-kit's, the one the Talk sheet and the Verse view's Ask use: the `Hold to answer` bar, `Type an answer`,
`Attach a picture` and `Take a photo`) and `Reply`, and the matching field of the form fills and is ringed and scrolled into view, so he sees it fill. When the tutor asks for a photo the panel
offers `No photo`, and a photo he attaches or takes in the Composer goes to the form as its own picker's would (`onPictures`: shrunk and listed in the form; a form with no pictures field refuses a picture with `This form has no place for a picture.`); a photo he adds meanwhile is told to the tutor. A **choice** field
(Ask for a book's Kind of book) is not drawn in the panel: the tutor answers with one of its options exactly and the form's own select is set and ringed;
an answer that is not one of the options fills nothing.

**The Send rule.** The tutor never sends: Send is his. A form without a command says, when every required field holds something and the tutor has nothing
more to ask, `Everything required is filled in` (and scrolls to its top to be read); he taps the form's own Send. A form with a command (`command` prop:
the voice-kit `Command` its own Send runs) shows instead the command's offer line (`Send: Lenski, Romans, Grammar?`) and a **Send** button in the panel
(the Composer stays, for the optional fields the tutor named). His tap on it runs `command.run(argsOf(form, values))`, the very call the sheet's own
Send makes, so the refusal, the waiting and the sent line are the same from either and the sheet shows them (a refusal is also said in the panel).
A tap is his yes: a share-like send gets a confirm first (tutor-drives Q2) and this is it. The panel offers Send only when the values pass the command's args
schema (a title that is too long does not).

It is one reusable piece in `src/formHelper/`, on voice-kit's `@voice-kit/forms` (`voice-kit/forms`: the types, `requestFields`, `applyValues`,
`requiredFilled`, `oneQuestion`, `argsOf` and `formCommand`, re-exported by `formHelper.ts` under the names Lampas uses; Lampas keeps only
`buildFormRequest`). A form describes itself as a `FormSpec` (name, and per field its `name`, `label`, `hint`, `required`, `kind` text | link | choice | pictures,
`maxLength`, a choice's `options`; the approach form is `approachForm.ts`, Ask for a book's is `src/library/bookForm.ts` `BOOK_FORM`) and adds the door with one
element: `<FormHelper form={SPEC} values={{ field: 'what it holds now' }} onFill={(field, value) => ...} onPicker={(field) => ...} onReady={...} command={COMMAND} commandArgs={{ kind }} />` (`commandArgs`: what the command takes beside the fields).

**Ask for another approach and Ask for more** (mw-o7cts8.3): each form's own Send and the panel's Send are one path, the sheet's `sendWith(args)` (sending, sent, failed with Retry), which
runs the command, and the command posts one `feedback` grist through `submitFeedback` (`buildFeedbackRequest` for `ask-for-approach`, `buildMoreRequest` for `ask-for-more`): what is sent is
what each form sent before. A value over its limit (the args schema's, `checkArgs`) is refused before anything is posted. The pictures are never the tutor's: the approach sheet hands the command
the pictures it holds (`approachCommand({ pictures })`) and the picker stays the form's own. `ask-for-more` takes `kind` beside the fields, so one name serves the three forms; the panel gives it
through `FormHelper`'s `commandArgs`. His memorizing evidence goes with an Ask for more ask only when its switch is On when he taps Send, from either Send. The page keeps its Ask the tutor over
`ASK_BEGUN`, and with no licence draws no form and no door. `submitFeedback(` is called only in `formCommands.ts`, `bookRequests.ts`, `feedback.ts` and `talk/offers.ts` (`tests/unit/feedback-shared.test.ts`).
The panel's offer lines: `Send this approach, credit Anna Example?`, `Send A text: The Septuagint?`. Checks: `tests/unit/form-commands.test.ts`, `features/ask-approach.feature` (the form's Send and the door's post the same body),
`features/ask-for-more.feature` (A text through the door).

**Ask for a book** (`src/library/AskForBook.tsx`): fields `title` (`Which book?`), `kind` (a choice over the kinds' singular names: Lexicon, Grammar, ...) and `why`.
`src/library/bookCommand.ts` is the command `ask-for-book` (`formCommand(BOOK_FORM, ...)`; `askForBook(` is called only there): `bookRefusal`'s line when the
catalogue lists the book or it was asked (nothing kept), else `askForBook`, which keeps it on the phone and sends it. The sheet's own Send calls the same command;
a title that is the one row of his kept Logos list (the row he picked, or the one `matching()` finds for the title the tutor filled, which then shows picked) carries that
row's Resource ID, Type, Series and ReferenceSupersets (PROVISIONAL). The tutor is not given the command to call yet (it is not in `src/tutor/registry.ts`): the panel's Send is his tap.

**Save as a list** (mw-o7cts8.4, PROVISIONAL): the Share sheet's form (`src/share/SaveAsList.tsx`) is `Save to` (`New list` or a list he has) and, for a new list, `List name`, offered from the shared title. Its Save and the panel's Send both run
`save-as-list`, a `confirm` command (`undoable`, with the new list's delete as the undo, is the alternative): `New list` makes a list called `name` with the references showing (`createVerseList`); a list he has takes only the
references it does not hold (`appendToVerseList`) and keeps its own name, so `name` matters only for a new list. The line is `Saved N references to <name>` (or `All N references were already in <name>`) with Open; `createVerseList(` and
`appendToVerseList(` are called only in `formCommands.ts` for this sheet. A `where` that is not `New list` or a list he has, and a name over 60 characters, are refused before anything is written (`Not saved: ...`); a list that went away
since the form opened is refused with `<name> is not there any more`. Two lists with one name: the command takes the newest. The panel's offer lines: `Save 2 references as a new list, Refuge?`, `Add 2 references to Peace?`. Without a
licence the door is not drawn and the form is as it was. Checks: `tests/unit/form-commands.test.ts`, `tests/unit/share-save-list.test.tsx` (the hand), `features/share-references.feature` (Let the tutor do it saves the references as a list).

The tutor is the `bible-talk` grind in a talk from a screen named for the form (`screen` {name, facts: []}, no verse text), so the mill needs no new
kind. The request adds `form` {name, command?, fields [{name, label, hint?, required, kind, value, options?}]} (`buildFormRequest`; a value is cut at 600 characters); the
answer adds `form_values` [{field, value}] (the whole new value of each field) and `form_ask` (the field the question is about, a pictures field when
it asks for a photo; left out when there is nothing more to ask). `isTalkAnswer` believes both; `applyFormValues` fills only fields the form has,
never a pictures field, a choice only with one of its options, trimmed and cut to the field's `maxLength`. The method is the grind's `## Helping him fill in a form` (part 260:
the choice rule and the Send rule are in it; the instructions stay under the 99,500 bytes `tests/unit/bible-talk-grind.test.ts` holds). The model now and then asks its question and keeps talking, so the panel shows the answer cut after its first question (`oneQuestion`, mw-5r3p30.158). The conversation is
kept in the panel only (no table): closing the sheet ends it.

Checks: `features/form-helper.feature` (both forms), `features/ask-for-book.feature` (the hand's Send and the door's post the same fields), `tests/unit/form-helper.test.ts`,
`tests/unit/book-command.test.ts`, `tests/unit/form-commands.test.ts`, `tests/unit/form-helper-grind.test.ts`, the scenarios `grinds/examples/bible-talk/form-approach-*.json` and `form-book-*.json`, and
`tests/e2e/form-helper.spec.ts` (412 px; shots `form-helper-button`, `form-helper-filling`, `form-helper-finished`, `form-helper-book-*`).

## Forms with no door, and why (mw-o7cts8.4)

The Governor's rule (Postern general, 2026-10-23): never make people fill out forms without an option for a tutor to handle the interaction for them. Every form of Lampas that sends or saves several things has `Let the tutor do it`
(above). These do not, and the rule is kept knowingly (PROVISIONAL: he may waive or change any of them):

| Form | File | Why it has no door |
| --- | --- | --- |
| Get a licence | `src/gate/GetLicence.tsx` | Email and phone, then two codes sent to them. Without a licence there is no tutor, so a door cannot exist there; the codes are typed from the phone's own messages. |
| Rename a device | `src/gate/MyDevices.tsx` | One field. |
| Rename a list | `src/lists/VerseListScreen.tsx` | One field. |
| Add a reference | `src/lists/EditRefs.tsx` | One field. |
| The chapter search | `src/ChapterPicker.tsx` | One field. |
| Import words | `src/ImportScreen.tsx` | One field. |
| Typed Bible | `src/library/TypedBible.tsx` | One field. |
| About you | `src/AboutYouScreen.tsx` | A page that saves as he types: there is nothing to send. |
| Memory | `src/MemoryScreen.tsx` | A page that saves as he types: there is nothing to send. |
| My study way | `src/StudyWayScreen.tsx` | A page that saves as he types: there is nothing to send. |

A one-field form is its own question: a helper that asks the one question the field already asks adds a step, not help. A new form with two fields or more that sends or saves gets the door, or a line in this table with its reason.

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

## What the tutor can see (mw-t3xu9a.4, PROVISIONAL)

The Governor's words (2026-10-19 and 2026-10-22): everything in the app is an API; the tutor asks the app for what it needs and has it do what he wants. The first slice is the read side. `src/tutor/registry.ts` is Lampas's registry for voice-kit's tutor client (`@voice-kit/talks` `createTutorClient`, README 'The tutor client'): named FACTS the app reads, and PLACES it opens. The client adds two fields to a request, `facts` (the core facts, and the screen's up-front list once the weights tune one, mw-t3xu9a.8) and `catalogue` (every fact and place with its tell line, sorted), and passes every field the request carried before through untouched (`withTutorFacts` for the Bible talk, `askWithFacts` for the verse ask; `tests/unit/talk-request.test.ts` holds the field names and values equal). The Bible talk's input schema holds `facts`, `catalogue` and, in a follow-up, `asked` (request DATA, never instructions); the instructions teach their use through the kit's part (mw-t3xu9a.5, 'The tutor asks back, does, goes and misses').

| Fact | Core | It reads |
|------|------|----------|
| `where-he-is` | yes | the screen on show (the name it reported, `route`, its reported facts), in the Reader its `reader` address (book, chapter, view, weave, verse, passage), and `sheets`, the headings of the sheets open (`openSheetTitles`) |
| `today-drill` | yes | the items behind the Reader's chip 'Today · N of M' (`todayNow`, mw-5r3p30.731: kind, title, done), the same as the request's `today` |
| `settings` | yes | what every setting holds now (`currentSettings`), the same as the request's `settings` |
| `progress` | no | the learner line (`learnerSummary`) and his grammar (`learnerGrammar`: goal, counts, suggested move) |
| `rusty-words` | no | the solid words and ideas he now slips on (`rustyNow`), worst first |
| `works` | no | the digest of his Logos shelf (`worksForTutor` with no question) |
| `memorizing` | no | his memorized verses (`memorizingNow`, mw-fu7dqf.12): a `summary` line, then each verse with its `heading`, the `lists` that hold it (id and name, for `moveVerse`) and its `langs` (step of 7, `due`, `dueNow`, `last` score, day and missed words) |
| `verseText` | no | the words of each verse he memorizes, by reference and language (`en`, `el`, `weave`), as a session shows them (`verseTextsOf`) |
| `memorizeEvidence` | no | every recall (`memorizingEvidenceNow`): the one-line `summary` and the `evidence` (src/memorize/evidence.ts) |
| `verse-lists` | no | his verse lists as the Verse lists screen shows them, newest first (mw-t3xu9a.10): each list's `id`, `name` and `count` of references, no references (the id is the place `lists`' `id`) |

The verse ask has a smaller set (`askRegistry`): the three core facts, with `settings` the settings that grind is told (`settingsSentTo('verse-ask')`), and no place.

- The client's part gives way before anything of his talk does (`src/tutor/fit.ts`, run first by `fitHistory`): the catalogue's tell lines from its end, then a fact that only repeats a field of the request (`settings`, and `today-drill` when `today` is there), then the catalogue, then the facts that are left, so a request the fit held to `MAX_REQUEST_BYTES` is cut exactly as it was before this story: the cap is kept for his text and turns (a long passage fills it, `features/quiz-me.feature`), and the facts are there when the request has room. `fitAsk` does the same for the verse ask. Making room for them (raising the cap, or letting the old fields give way to the facts) is not done.
- The record of ask-backs and misses is the client's memory store, kept while the page lives. Keeping it across a reload, and the weights that tune the up-front list from it, are mw-t3xu9a.8.
- A new fact is one entry of `FACTS`, with a tell line short enough that the catalogue stays under `tests/unit/tutor-registry.test.ts`'s byte limit; a name is the one way the tutor has to call it, so no fact shares a name with a place.

### ScreenContext facts and registry facts

The screens' own `useReportScreen` facts stay `screen` facts (the screen's name and what it shows, in the `screen` field of a talk from that screen); `where-he-is` repeats the reported name and facts of the screen on show, so the tutor reads them in any talk. What each of the 21 publishers reports is listed on mw-t3xu9a.4's closing comment.

## Where the tutor can take you (mw-t3xu9a.4, PROVISIONAL)

A PLACE is a screen the tutor may take him to. The registry has one for every screen of `src/nav/route.ts` (`ROUTES`: the route table, a new `Route` fails typecheck until it is listed, and `tests/unit/tutor-registry.test.ts` walks it), named by its route: `words`, `review`, `today`, `memorize-screen`, ... the Reader is `reader`, the Settings screen `settings-screen` (`settings` is a fact's name) and Memorize `memorize-screen` (`memorize` is a command's name), and `chapter` takes {book, chapter} (the book by name or code, the chapter in the book's range). `lists` takes an optional `id` (mw-t3xu9a.10): with the id of a list from the fact `verse-lists` it opens that list (`#/lists/<id>`), without one the Verse lists screen, as a tutor go either way so Back returns to the Talk sheet; an id that is no list's is refused and goes nowhere. The tutor matches his loose name ('my Romans list') to a list in the fact and asks which when two fit; the example `go-verse-list` holds it. Sheets open by a tap on something; they are not places yet.

- Every place opens through `navigate` (or `openedByTutor` for a chapter) as a PUSHED history entry marked as a tutor go: `history.state` is `{tutorGo: true}` (`isTutorGo`, `src/nav/route.ts`). Back returns to where he was.
- The Talk sheet comes back with Back. The sheet that asked closes as `GoTo.leave` is called and gives a way to open it again; `leaveSheetForTutor` (`src/ui/sheetBack.ts`) marks the sheet's own history entry, so the Back that comes to that entry opens the sheet again, taking its entry back, instead of stepping over it. The Reader opens its Talk sheet again on what it was about (`reopenTalk` / `pendingReturn` in `src/nav/readerRequest.ts`: the Reader is made afresh for each chapter, so the return is told to a Reader that is open and found by one that opens). The talk is the stored one, as it was; the quiz of a verse reopens as a plain talk on that verse. A round Ask button's sheet (`AskTutor`) closes with the screen it was on and Back steps over it, as it did.
- `src/talk/go.ts` `readTarget` reads an answer's `go`: the answer's {book, chapter} as the chapter place, as ever (`readGo`), or {name, args} naming a place of the registry, taken only when the registry would take those args (`registry.refuses`). The place opens through the client's `takeAnswer`, which also records a refused go as a miss. The grind's answer schema holds the kit's `go` {name, args} (mw-t3xu9a.5): the chapter is `{"name": "chapter", "args": {"book": ..., "chapter": ...}}`; the app still reads the old {book, chapter} from an older mill.

## What the tutor can do (mw-t3xu9a.6, PROVISIONAL)

A COMMAND is something the app does when asked, by name, with args the registry checks first (`src/tutor/registry.ts`; a bad arg is refused with the reason and nothing runs). Its KIND says how it runs: `free` at once, `undoable` at once with an undo the app can offer, `confirm` after his yes. The Governor's rule (Q3): the app's own buttons go through the same named commands the tutor calls, so what a button does the tutor can do by construction; a tap, a spoken yes and a tutor `do` run the one function. Four commands and one more place (the four of memorizing, mw-fu7dqf.12, are in 'The tutor and memorizing' below):

| name | kind | args | what it does | who calls it today |
| --- | --- | --- | --- | --- |
| `set-setting` | undoable | `{name, value}` (`skipUnchanged?`) | writes one setting through the settings registry (`applyChanges`, which checks the value); the undo is the old value (`undoChange`) | an answer's `settings_changes`, the settings offer's tap and spoken yes (`takeSettingOffer`), the verse ask's Ask by, all through `changeSettings` |
| `tick-today` | undoable | `{item, on?}` | ticks (`on: false` unticks) an item of Today, named by its title in `today-drill` or its piece id; only while Tick boxes is On; the undo puts the tick back as it was | a tap on a Today box (`tickToday`) |
| `start-review` | free | `{items?}` | closes an open Talk sheet and opens Review; with `items` ({kind: word or idea, id}, at most 8, from `rusty-words`) the ones still solid move to Frontier and the round is made of just those | the rusty offer's tap and spoken yes (`takeRustyOffer`) |
| `add-word` | undoable | `{word}` | puts the word (its lemma) on his words to learn with the lexicon's gloss; the undo removes it, or drops a word he had dropped again | Add to my words (Talk, the Goal screen) and an answer's `words_to_add`, through `addWord` |
| `open-work` (a PLACE) | - | `{id}` | opens a book of his Logos shelf (an id of the `works` fact) in Logos; refused for a book he did not tick or that Logos has nowhere to open | none yet (a `work` link is a chip he taps) |

- `changeSettings(changes, {skipUnchanged?})`, `tickToday(item, on)` and `addWord(scope, lemma)` are the app's way in; each runs `bibleTalkRegistry().run(name, args)` and hands back what the command returned beyond its `said` line and `undo` (`applied` and `refused`; the headword and how the add ended). `grep -rn 'applyChanges(' src` finds only `src/settings` and `src/tutor/registry.ts`.
- A setting he was refused (`Left out Theme: "plaid" is not a value it allows.`) is the command's `said` line with no undo, not a failure; a write that throws is.
- The turn's `changes` and its Undo button (`Talk.tsx` `ChangeRow`) still keep the `AppliedChange` a `set-setting` made. The undo functions the commands return are drawn as an undo line when the tutor calls them by `do` (mw-t3xu9a.7, 'What you see when the tutor does something').
- Not yet commands: Today's 'Open today's drill' (`takeTodayOffer` is `navigate('today')`, the `today` place), the bridge, the Greek offer and the makers' offer; see the mw-t3xu9a.6 closing comment for each button of the Talk sheet.

## The tutor asks back, does, goes and misses (mw-t3xu9a.5, PROVISIONAL)

The words that teach the tutor the protocol are the kit's (`voice-kit/talks/grind`, `instructionsPart` and `answerFragment`), written into the grind by `npm run grind:build` (`scripts/grind-build.ts`, `scripts/grind-parts.ts`), never typed in Lampas:

- `grinds/bible-talk.instructions/360-the-app-you-can-ask.md` is the kit's instructions part byte for byte, then `<!-- kit:end -->` and the few Lampas lines (the core facts `where-he-is`, `today-drill` and `settings`; what a miss says). Run the build after the kit's pin moves; `tests/unit/bible-talk-grind.test.ts` fails when the part is behind.
- `grinds/bible-talk.answer.schema.json` holds the kit's five fields, each identical to the fragment's: `asks` (names of facts on the catalogue it needs, ask once), `do` (commands in order, `[{name, args}]`), `go` (the place to open, `{name, args}`), `misses` (`[{wanted, why}]` for what the catalogue lacks) and `said` (one plain line on what it did). All are optional.
- The catalogue is request data (input schema fields `facts`, `catalogue` and `asked`), sent by the app's tutor client (`withTutorFacts`); the instructions never carry it. The instructions stay under the 99,500 bytes `tests/unit/bible-talk-ask-first-and-work-place.test.ts` holds (the mill warns at 100,000).
- A setting is changed by `do` of `set-setting` when the catalogue lists it, by `settings_changes` when it does not (330 'Changing the app's settings'); a chapter by `go` of the place `chapter` (310).
- Examples: `ask-back-works` (asks for `works`), `do-setting` ('turn off the Greek hints': `do` of `set-setting` and `said`), `go-review` (`go` of `review`) and `miss-recorded` (a want the catalogue lacks: `misses`).
- Read by the app (mw-t3xu9a.7): `isTalkAnswer` (`src/services/talk.ts`) believes `asks`, `do`, `misses` and `said` as the schema has them; `go` is read as before. What the app does with each is 'What you see when the tutor does something' below.

## How the tutor learns what to carry (mw-t3xu9a.8, PROVISIONAL)

The Governor's words (Talk fd8f425f turn 6): the app keeps the stats, 'once a night ... sends the stats ... to the Grist ... this is how you should adjust your weights ... if nothing's changed in the app then it doesn't have to ask anything'; the run is batch, so 'take an extra turn that the back end then can ask for exactly what it needs'. Five parts:

- **The counts.** Every request the Bible talk builds (`withTutorFacts`, the tutor client's `buildRequest`) notes a turn on the screen he is on, and every ask-back (`askBack`) and every miss (`takeAnswer`, a refused name) notes itself there: the kit's tutor record. It is kept on the phone, in the IndexedDB database `lampas-tutor` (the kit's Dexie store, `src/tutor/registry.ts`), so the counts last from one launch to the next. A screen's up-front list is the core facts, then what the kit counts: a fact asked back twice or more in the screen's last 50 turns (the kit's provisional numbers). A list the nightly run applies replaces the counted one on that screen until a later night changes it.
- **The night.** `src/tutor/NightlyTuning.tsx` is drawn once by `src/main.tsx` for a licensed phone and, ten seconds after the licence is found, calls `startNightlyTuning` (`src/tutor/weightsRun.ts`): at most one try a page life. `tuneTheWeights` does nothing before 03:00 local, nothing when a run is kept for today or a later day (`Tuned`, the settings row `tutorTuned`, `src/data/repositories/tuned.ts`), and nothing offline, with no key or no licence. Then it reads the kit's `WeightsReport` since the last run's `at` through the tutor client on the screen `nightly` (`nightlyClient`). When the report says `changed` is false (no ask-back, miss or applied list is newer than `since`; a turn alone is no change) it stops there: the grist is not asked and nothing is kept, so a quiet night costs nothing. The screen `nightly` itself is left out of the report and of the lists.
- **The grist.** `grinds/tutor-weights.json` (input `grinds/tutor-weights.input.schema.json`, answer `grinds/tutor-weights.answer.schema.json`, instructions `grinds/tutor-weights.instructions.md`; sonnet, no attachments) gets `{report, facts, catalogue, app_version}`: the report with its per-screen counts, up-front list, latest applied list and ask-backs per 100 turns before and after it, and the misses since the last run; the facts and catalogue are the client's own, built for the screen `nightly`. The request is held to 14,000 bytes (`WEIGHTS_MAX_BYTES`): the client cuts tell lines and non-core facts first, then the report gives up its quietest screens. The answer is `{lists: {screen: names[]}, reasons: [...], misses_worth_a_story?: [{title, why, screen, name}], asks?: [...]}`; `isWeightsAnswer` refuses any other shape, and a failure leaves everything as it was, so the next launch tries the same report again.
- **The extra turn.** When the answer has `asks`, the app reads those facts from the registry (`readAsked`: a name that is no fact, or a read that fails, is sent as `{"unavailable": why}`; nothing it reads is recorded, they are not his counts) and sends the request again with `asked`, clipped to the same 14,000 bytes. Whatever the second answer asks for again is not read: one extra turn at most, the second answer stands. The request is self-contained, so the extra turn needs no resumed session.
- **The lists.** Only a screen the report has, and only a fact the registry lists that is not core, can be in a list (the kit's `applyWeights` leaves the rest out). A list that is the one read now is no change and writes no record. The lists that change a screen go in through `applyWeights(lists, 'grist', report.at)`, each with a dated record, and the run is kept: its date, its `at` (the next report is since it), how many lists changed, its reasons and how many misses were forwarded. Settings > About then says `Tutor tuned 2026-10-25: 2 changes` (`1 change`, `0 changes`) and a tap on the line shows the reasons; before the first run there is no line.
- **The forward.** The grind cannot forward itself (the mill's `forward` is a grind that has no model), so a `misses_worth_a_story` entry goes out as its own grist of the `feedback` grind, kind `tutor-misses` (`forwardMisses` in `src/services/feedback.ts`; the mill mails it to the Mayor, who files the stories): `{kind, text, summary, misses: [{title, why, screen, count}], app_version}`. The answer names the report's own `screen` and miss `name`; the app looks the count up in the report, and a miss it cannot find there is dropped. With none, nothing is sent. The forward goes first: if it fails, nothing is applied or kept, and the next launch sends the whole run again with the misses still in the report. It is not kept in Your requests, and no `feedback-sent` is published: he did not ask.
- Examples (`grinds/examples/tutor-weights/`): `adjust` (rusty-words asked back 6 times on the Reader, not up front: `lists.Reader` starts with it, with a reason), `nothing-to-do` (flat counts: `lists` is `{}`) and `ask-first` (works asked back 4 times, its weight unknown: `asks` names it; the second turn, with `asked`, puts it on the list). The story's own example asked for `today-drill`, but that is a core fact in Lampas (always sent), which no list can hold, so the examples use `rusty-words` and `works`.
- Proof: `tests/unit/tutor-weights-schedule.test.ts` (fake clock, fake grist), `tests/unit/tutor-weights-wire.test.ts` (the phone's own wiring against a fake Postern), `tests/unit/about-screen.test.tsx` and `features/ai-needs-licence.feature` (no licence: no grist, no line).

## The tutor and memorizing (mw-fu7dqf.12, PROVISIONAL)

His Q8 A on mw-6ww.137 ('Facts, commands and a place: the tutor knows your verses and progress, can memorize, unmemorize, move a verse and start a session, and can open Memorize') and the Q4 addition ('the app saves the usage data ... the tutor should be able to ask the app, the tutor client, for the usage data that matters'). All of it is in `src/tutor/registry.ts`; the functions are `src/memorize/commands.ts`'s, the ones the buttons call (`tests/unit/tutor-memorize.test.ts` holds that the registry's `run` IS `memorizeVerse`, `unmemorizeVerse`, `moveVerse` and `startSession`, and that no screen writes the schedule itself).

- **Facts** (all asked back, none core; the Memorize piece of `today-drill`, which is core, already says 'Memorize: 2 verses due' up front): `memorizing`, `verseText` and `memorizeEvidence`, read as in the facts table above. The kit's facts take no args and an answer's `asks` is a list of names, so the tutor cannot name a verse: `verseText` reads each verse he memorizes (the one he has a Memorize session open on first), under 3,500 bytes (`VERSE_TEXT_BYTES`); `verseTextOf({ref})` is the one verse's, in English and in each other language he memorizes it in, and the weave is the weave of the moment. `memorizing` is under 5,000 bytes (the summary still counts every verse); the evidence is under `EVIDENCE_BYTES` (6,000) with at most the last 30 recalls of a verse in a language, and when it is over, each verse keeps fewer recalls, then the missed words go, then the verses recalled longest ago.
- **Commands**, the app's own words for each as its line in the talk:

| name | kind | args | what it does |
| --- | --- | --- | --- |
| `memorize` | undoable | `{ref, langs?}` | puts a verse on the schedule ('Memorizing Romans 8:28 in English'); `langs` from `en`, `el`, `weave`, English when none, only the ones his Greek dial allows; an Old Testament reference is skipped and named; the undo takes off the languages it added |
| `unmemorize` | undoable | `{ref, lang?}` | takes one language, or every language, off the schedule ('Stopped memorizing Romans 8:28'); what he recalled stays; the undo puts the rows back at the step they were |
| `moveVerse` | undoable | `{ref, from, to}` | `from` and `to` are the list ids the `memorizing` fact gives; moves the reference between his verse lists (`sendVerseListRef` with move) and the verse stays memorized; refused for a list that is not there, a reference the list does not hold and the same list twice; the undo puts both lists back as they were |
| `startSession` | free | `{ref, lang}` | closes an open Talk sheet and opens `#/memorize/<ref>/<lang>` as a pushed entry marked as a tutor go; refused for a verse not memorized in that language |

- **The place** `memorize-screen` opens Memorize (`#/memorize`); with `{ref, lang}` it opens that verse's session (`#/memorize/<ref>/<lang>`) through the same `startSession`. Its name is not `memorize` because the command is: `placeNameOf` keeps a screen from going by a fact's or a command's name. An answer's `go` to it returns to the Talk sheet with Back as for any place (`features/memorize-tutor.feature`: Open Memorize, Start a session). The command `startSession` in a `do` closes an open Talk sheet and pushes the session as a tutor go too, but the Talk sheet does not come back with Back from it (only a `go` has the way back the sheet gives, `GoTo.leave`): ask for a session by `go`.
- **His evidence** (`src/memorize/evidence.ts`, `src/settings/AskMoreScreen.tsx`, `src/services/feedback.ts`): every recall is kept in the `recalls` table, whether or not the verse is still memorized. Each form of Settings > Ask for more shows 'Include my memorizing evidence' once he has recalled a verse, a switch that is Off every time the form opens (his say-so each time), with the summary line under it ('3 verses, 14 recalls, 11 passed, gaps 1 to 7 days'). Turned On, the ask carries `memorizing: {summary, evidence}` (the input schema's optional field on the approach, text and translation form; `grinds/feedback.input.schema.json`); Off, the request is what it was. The request stays under half the grist's 20 KiB payload with the most he can have recalled (`tests/unit/feedback-evidence.test.ts`, `features/ask-for-more.feature`). The tutor's own ask-back for it is the fact `memorizeEvidence`; nothing is sent to the makers by the tutor on its own.
- **Examples** (`grinds/examples/bible-talk/`): `memorize-verse` ('Help me memorize Romans 8:28': `do` of `memorize` and a `said` line) and `verse-text-ask` (asked to be quizzed on a verse the request does not hold, the answer asks back `verseText`; the answer to the second round, the quiz itself, is not judged by a smoke check). Their catalogues are the registry's own, dumped as the client builds it; the catalogue grew by 1,712 bytes (`tests/unit/tutor-registry.test.ts` holds it under 5,900, and the three sizes of `tests/unit/talk-request.test.ts` moved with it).
- **Not done here**: the grind's instructions are unchanged (the kit's part teaches the protocol from the catalogue), so how well the live tutor picks `memorize` over a settings change is for `mw grist smoke lampas` to say; a list's Memorize switch is not a command of the tutor's (`memorize` takes one verse; the tutor can say it once for each).

## What you see when the tutor does something (mw-t3xu9a.7, PROVISIONAL)

The Governor's Q2 and Q4 (grilling mw-6ww.127): a change the tutor can undo happens on the spot with an undo line; a step that deletes, shares or spends is put to him first; a tutor navigation is a history entry and Back returns to the tutor; the second trip to the tutor is visible and short. On the Talk sheet:

- **Ask-back.** When the answer carries `asks`, the app reads those facts from the registry (`askBack`, which records each as an ask-back, or as a miss for a name that is no fact) and sends the request again, in the same talk (the same `talk` name), with `asked`. While that second request is out, one line under his question reads `Looking at your Logos books` (`lookingLine`: `works` is Logos books, `progress` progress, `rusty-words` rusty words, `today-drill` today's drill, `settings` settings, `where-he-is` place in the app; a fact with no entry goes by its name with spaces; several are joined with commas and 'and'). It is also said through the live region (`announce`), and it goes when the second answer lands. An answer that asked for nothing never shows it: the line is `AskState.looking` (`src/pending/pendingAsks.ts`), set only between the two rounds. A turn has two rounds: what the second answer asks for again is not read and is recorded as a miss (`noteLateAsks`).
- **Do.** The answer's `do` runs through the tutor client's `takeAnswer` (in order, each command's args checked by the registry first; a refused name or args is a miss and a muted line, `Could not tick today: ...`, so the talk never claims something that did not happen). Each command that ran is a line of the turn (`TalkTurn.done`, `src/talk/DoneLine.tsx`): the app's own words for it (`Changed: Theme: Dark`). For kind `undoable` the line has an **Undo** chip: the tap runs the command's undo and the line reads `Put back` (the old line struck through) and is said to a screen reader. A kind `free` command has no chip. The undo is a function and lives only while the page does (`src/talk/doneUndo.ts`): after a reload the line stays, its Undo does not. The answer's `said` is checked and kept out of the sheet: the app's own line for each command is what he reads, and the answer's text is the tutor's.
- **Confirm.** A command of kind `confirm` is not run. The line is the question the command's `offer` puts (its tell line without one) with a button named by the command (`forget-note` is **Forget note**); the command runs only on that tap, through the registry (so its args are checked again), and the line then reads what it said, with an Undo chip if it returned one. The args are kept with the turn, so the button works after a reload. Lampas has no confirm command yet (delete, share and spend come with their stories); `features/tutor-does.feature` adds one to the registry to prove the path.
- **Go.** A `go` closes the sheet and opens the place as a pushed history entry marked as a tutor go; Back returns to the Talk sheet with the same turns (see 'Where the tutor can take you').
- Proof: `features/tutor-does.feature` (ask-back, no ask-back, undo, confirm, back) and `tests/unit/tutor-looking.test.tsx`.

## Taking him to a chapter (mw-5r3p30.172)

Asked in the Talk sheet to switch to, open, go to or take him to a chapter ('can you switch to Colossians 1'), the tutor puts `go` for the place `chapter` in its answer (`{"name": "chapter", "args": {"book": "Colossians", "chapter": 1}}`, the book's name from the app's own list, `src/data/books.ts`, a chapter in range; `grinds/bible-talk.instructions/` 'Taking him to a chapter') and says where it is taking him. The app reads `go` itself, never the text: `src/talk/go.ts` `readGo`. `isTalkAnswer` lets any `go` through, so a shape the app refuses never costs him the answer.

- A `go` the app can take, while that talk's sheet is open (`useTalk`'s `GoTo.allowed`): the turn is kept with `opened` ('Colossians 1', shown under the answer as `Opened Colossians 1`), the sheet closes and `nav/readerRequest.ts` `openedByTutor` opens the Reader there as a new Back step, which shows the notice `Opened Colossians 1` under the header. The phone's Back returns to the chapter he was on, with the Talk sheet open again on the talk as it was (mw-t3xu9a.4: the entry is marked as a tutor go, 'Where the tutor can take you'). The answer is not read aloud (the Reader that would read it is gone).
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

- **The list** is voice-kit's `TalkList` (`voice-kit/talks/react`, mw-o480n1.9) over `bibleTalks` (src/data/repositories/talkReader.ts, a voice-kit `TalkReader` over the kept rows: no new table, no new database version; the kit's styles.css is not imported, the screen gives the classes): `renderRow` is `TalkRow`, `filter` hides a key the app cannot open, `refreshKey` is a live count of the kept rows (`countTurns`) so a turn sent from the opened sheet shows, and `renderNote` keeps `[data-conversations-empty]` and its words. One row per conversation, the one with the newest last turn first, each drawn by `src/share/TalkRow.tsx` (the row Share to
  Lampas > **Choose a talk** draws too, so the two lists never drift): its place in words (`talkPlace.ts` `talkLabel`: "Romans 8:28", "Quiz on Romans 8:1-11", "Ask
  the tutor: Goal"), the date of its last turn and the first line of its last question (as the tutor cleaned it up when it did). A key this app does not make is not listed.
- **The search** (one box, "Search conversations", the kit's own field in a sticky wrapper) is the list's `search={conversationSearch}`, the kit's `searchTalks` over `bibleTalks` with Lampas's places, fold and line (`searchConversations(query)` in talks.ts is the same search as a function): a turn matches when every word typed is in its question or its answer, any case,
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
  content is held at the tallest it has been (`src/ui/neverShrink.ts` `useNeverShrink`), so closing a list at the end of a scrolled sheet slides nothing down onto the control. The hold ends
  (mw-5r3p30.736) once the content has stayed shorter for `SHRINK_HOLD_MS` (1.2 s) with no finger on the box: a hold for good left the sheet scrolled over a blank band, with its buttons out of view
  (`tests/e2e/share-sheet-top.spec.ts`, at 412x892). It is the one user of the hook.
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
app cannot hear his words, so an undirected one is refused and logged (`console.warn`) and the note is unchanged. That rule and the lines it answers with ('Added to X', 'Replaced X', 'Removed X', 'Did not change X: why') run in voice-kit/talks (`applyNoteUpdates`, mw-o480n1.7) over Lampas's `NoteStore` in `src/talk/memoryUpdate.ts` (book:/word:/topic: names through `memoryName`, 'index' to `appendToIndex`/`setIndex`); the answer guard is the kit's `isNoteUpdate` with Lampas's limits. `wished_notes` (names in the naming
scheme) are counted and the last 20 names kept (`keepWishedNotes`, settings store key `memoryWished`); About shows 'Notes the tutor wished he had: N' with
the names under it, and nothing else is sent for them. Examples: `grinds/examples/bible-talk/memory-update-wished.json`, `verse-ask/memory-quiet.json`,
`verse-read/memory-partial-misread.json`, `tips/memory-index.json`; `features/memory-tutor.feature`, `tests/unit/memory-grist.test.ts`.

### The Greek offer (mw-yrmkdf.4)

Lampas opens in English, so the tutor offers the Greek gently, and only as far as the Greek dial (Settings > How much Greek?, `src/settings/definitions/greekInterest.ts`, mw-3ased2)
lets it. The bible-talk request carries `reader_view` (`'english' | 'greek'`: the Reader's English | Greek choice; missing in a talk from a screen) and `greek_interest`
`{level, name, next?: {level, name}}` (the dial's step, its name and the one step above it, built by `greekInterestField` in `src/services/talk.ts` from the settings; missing in a quiz
and a talk from a screen; an unplaced phone reads All in, with no `next`). Beside it goes `hebrew_interest`, the Hebrew dial (Settings > How much Hebrew?) in the same shape (`hebrewInterestField`, both in `src/services/interestField.ts`; an unplaced phone reads Just English), and the Verse view's ask (`buildRequest`, `src/services/tutor.ts`) carries `hebrew_interest` with its `settings` (whose `greekInterest` is the Greek dial) too (mw-gdcyf98.3). The chapter's language picks the dial that matters: `hebrew_interest` in an Old Testament chapter, `greek_interest` in a New Testament one; the tutor's works and resources follow the higher of the two (`higherInterest`). No instruction line says so yet: the input schemas do. The grind's `## Offering the Greek` decides: at 0 (Just English) and 1 (Curious) the tutor answers in English
with no Greek words unless he asks; at 0 it makes no `greek_offer` unless he asks about the Greek; on real interest in the original (what a word really means, why translations
differ, what the original says) it leaves ONE `greek_offer` `{kind: 'word' | 'view', text, lemma?}` (a word offer names a lemma of the passage) that offers to raise the dial
ONE step, to `next`, whose name the `text` carries; never more than one step, none at All in. Which kind and when none (mw-5r3p30.715, `tests/unit/greek-offer-when.test.ts`): a question about what one word means is always `word` with its lemma, `view` only when no single word is asked about; none when `reader_view` is `greek` (he already reads the original); none in the answer that sets `greek_asked` (he asked for the Greek after his no). Since mw-5r3p30.772 whether an answer carries the offer is one numbered list in that part, the first line that fits deciding (a pending `greek` offer, no dial or no `next`, the Greek view, his no, an offer already in the talk, step 0, steps 1 to 4 on real interest, anything else), with a worked answer for 'what does "grace" really mean?' at Curious; the answer schema's `greek_offer` description defers to it and no other part says when (`tests/unit/greek-offer-one-rule.test.ts` maps each greek-offer example to its line). `greekOfferOf` (`src/talk/greekOffer.ts`) stamps the step the offer names, from the level the
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
