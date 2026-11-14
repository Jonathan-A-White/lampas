# The learning workflow: how the practice screens fit together

**A design, PROVISIONAL, the Governor to confirm** (mw-indx1x6.11, story D3 of three; D1 is mw-indx1x6.9, the tuned Parsing drill, D2 is mw-indx1x6.10, its links). It changes no code. It maps what Lampas's practice screens do today (read from the code and docs of main at 3d155a24, 2026-11-12), names where they fail to meet, proposes one workflow, and ends with the stories that would build it, one line each, for the Mayor to file. Nothing here is built until a story says so.

<!-- toc -->

- [His words](#his-words)
- [What "tuned to settings, state and goals" means here](#what-tuned-to-settings-state-and-goals-means-here)
  - [Settings](#settings)
  - [State](#state)
  - [Goals](#goals)
- [Today's practice screens](#todays-practice-screens)
  - [Goal, Learning now and Learn next](#goal-learning-now-and-learn-next)
  - [A lesson (the idea sheet)](#a-lesson-the-idea-sheet)
  - [Try it on a verse](#try-it-on-a-verse)
  - [Drill it and Prove it](#drill-it-and-prove-it)
  - [The short drill (Your drill plan)](#the-short-drill-your-drill-plan)
  - [The letter drill](#the-letter-drill)
  - [Paradigms: Learn and Drill](#paradigms-learn-and-drill)
  - [The Parsing drill](#the-parsing-drill)
  - [The Quick test](#the-quick-test)
  - [The Quiz (Practise, Quiz me)](#the-quiz-practise-quiz-me)
  - [Review](#review)
  - [The Reading ladder](#the-reading-ladder)
  - [The Reading drill](#the-reading-drill)
  - [Placement, and a passage lesson's Check](#placement-and-a-passage-lessons-check)
  - [The map in one table](#the-map-in-one-table)
- [Gaps](#gaps)
- [Overlaps](#overlaps)
- [One workflow](#one-workflow)
  - [The idea in one paragraph](#the-idea-in-one-paragraph)
  - [The spine](#the-spine)
  - [After a miss](#after-a-miss)
  - [After a round](#after-a-round)
  - [After a goal](#after-a-goal)
  - [Slipping: a gap that used to be solid](#slipping-a-gap-that-used-to-be-solid)
  - [Where the Parsing dojo sits](#where-the-parsing-dojo-sits)
  - [One practice extent](#one-practice-extent)
  - [The licensed loop, and how its gains reach everyone](#the-licensed-loop-and-how-its-gains-reach-everyone)
  - [A shared library](#a-shared-library)
- [Decisions for the Governor](#decisions-for-the-governor)
- [Proposed stories](#proposed-stories)

<!-- /toc -->

## His words

The Governor, Postern, 2026-11-12 (the two posts on the story):

> Just like there is a reading ladder, could there also be a parsing I don't know, dojo? It could be tuned to the settings (solid, frontier, any...) words and solid, frontier grammar. Wrong answers should (likewise to the review/drill pending change) link to the relevant resources/tools to help. Maybe there is a shared library possibility here. Not sure. There should be a well thought out workflow between general drills, paradigms, lessons, and parsing. Unless you think this is a duplicate to what is already in drill. Thoughts?

> Tuned to settings and state and goals

And his wants of the same day on the epic mw-indx1x6: "The drill should reinforce and expose gaps (even gaps which used to be solid). If licensed, drill should improve via async grinds. This should improve drills for unlicenced users to where relevant." and, of the end-of-session Study list, "Licenced should async work with grind to improve this report and the benefits should go to non licenced users."

The short answer to "is it a duplicate": no. The Parsing drill exists, but it is tuned to nothing except the open chapter and his word list, its answers move nothing, and no other screen leads to it or from it. The rest of this file is the long answer.

## What "tuned to settings, state and goals" means here

Every proposal below reads these three and nothing else. All of them exist today; the fault is that each screen reads a different part.

### Settings

| Setting | Where he sets it | Values | Who reads it today |
| --- | --- | --- | --- |
| `weave` (the Weave's words) | the Weave's dials | Off, Solid, + Learning | the Reader's weave |
| `weaveGrammar` (the Weave's Grammar dial) | the Weave's dials | Any, Solid, + Frontier | the Reader's weave |
| `pickerGrammar` (New words at) | Settings > New words | Solid grammar, Frontier grammar | the frontier picker; Review's graded verses (`gradedVersesOf`) |
| `grammarMove` (Move it) | Settings > New words | Ask, Auto, Off | Review's end card, which moves `pickerGrammar` up at 85 percent right and down under 60 |
| `paradigmExtent` (How much of a table) | Settings > Paradigms and each table's header | Any, Solid and frontier, Solid only | the Paradigms tables |
| `newWordsADay` (the pace) | Settings > New words | Off, 3, 5, 10 | the New words chip and teach sheet |
| `goal` | Settings > Goal | a book, a chapter or a verse | the Goal screen, the idea sheet's examples, every grammar question's passage |
| `quizGoal` and My study way | Settings > My study way | his own words | the tutor's Quiz only |
| the Greek and Hebrew dials | Settings | how much of each language | which doors are drawn at all (`depthFrom`) |

The three extent settings share one rule, `withinExtent(level, extent)` in `src/data/grammar/extent.ts`, and one table, `EXTENT_SETTINGS` in `src/settings/definitions/grammarExtent.ts`. That rule is the "solid, frontier, any" of his words.

### State

- **Words**: each word of his list is solid, learning or dropped (`words`); two rights in a row make a learning word solid and two misses in a row make a solid word learning (`quiz.ts` `nextState`).
- **Grammar levels**: each idea of the ladder is solid, frontier or not yet (`grammarLevels`), with how it got there (for example placement, drill, sheet, inferred, next). One idea is at the frontier at a time: Learning now.
- **The schedule**: one row for each thing that comes back (`reviews`), of a kind: `word`, `grammar` (an idea), `paradigm` (a table), `sound`, `drill-plan` (a step of a plan) and `lesson` (a passage lesson). Two rights in a row move up a step (1, 3, 7, 14, 30, 60 days, then a rare check every 90); one wrong drops two steps and is due tomorrow.
- **Evidence of letters and sounds** (`grammarEvidence`): three right uses and no miss make a letter, a pair or a mark solid without asking.
- **Drill runs and plans** (`drillRuns`, `drillPlan.<idea>`): the weak facets of the latest Drill it run, and the short drills that answer them.
- **Seen, kept and to confirm** (`seenItems.<idea>`, `fetchedItems.<idea>`, `toConfirm`, `drillMissed`): the questions he has been asked, the mill's questions waiting to be asked, and the ideas he missed and then got right, which count as known only on a fresh question.
- **Reading**: the reading history and the Reading ladder's place for each language (`readings`, `ladder`), and the passage lessons read and passed (`passageLessons`).
- **Tables opened** (`paradigmsOpened`): an ending is asked in Review only once its table has been opened.
- **The Parsing drill's steps** (`drills`): one row for each step answered. Nothing reads them but the count of what he has practised.

### Goals

- **The goal** is a passage. What it needs (`passageNeeds`) is a list of words and a list of ideas, and the Goal screen's two bars are his state against those lists.
- **Learning now** is the one idea at the frontier. **Learn next** is the earliest idea the goal needs that is not yet, the exact gaps (single letters, pairs, breathings) first, and a passage lesson when its ideas are all met. **Next words** are the three commonest needed words he has no state for.
- **The quiz goal** is why he wants the tutor's quiz, in his own words.

## Today's practice screens

Each screen below is given the same four lines: where it opens, what it draws from, what it writes, and where it sends him after. "After" is the fact that matters most to a workflow, and it is the thinnest line of most screens.

### Goal, Learning now and Learn next

- **Opens from**: the Reader's Goal chip; Settings > Goal. `src/GoalScreen.tsx`, `#/goal`.
- **Draws from**: the goal's needs against his words and levels (`useGoalProgress`), the approach's order (`learnNext`, `learningNow`), the open drill plans.
- **Writes**: nothing itself. Next words adds a word as learning.
- **After**: it is the hub. Learning now and Learn next open an idea's lesson (the idea sheet) or a passage lesson's range; 'Drill plan: N to go' opens the idea's sheet; Place me opens the placement; Read it opens the Reader on the goal; See the whole path opens the ladder as a graph; 'Reading ladder: Greek' and 'Reading ladder: English' open the Reading ladder. No practice screen returns here by itself.

### A lesson (the idea sheet)

- **Opens from**: Learning now, Learn next, the path, a Grammar sheet's Learn this idea, a lesson strip's chips, a locked table cell's Go to. `src/IdeaSheet.tsx`.
- **Draws from**: the idea's teaching card, its examples from the goal's passage (widening to the pericope, chapter and book), its tables (`paradigmsOf`), the grammars on his Logos shelf.
- **Writes**: the level slider. Learning makes the idea the frontier, due tomorrow; I know it opens Prove it; Mark known without a drill writes solid.
- **After**: Drill it; Try it on a verse; 'Table: <name>'; Ask the tutor; on the alphabet, the letter drill. This is the best-connected screen in the app: every other screen should lead back to it, and today almost none does.

### Try it on a verse

- **Opens from**: the idea sheet. `src/TryItSheet.tsx`.
- **Draws from**: the easiest verse at his level that has a form of the idea (`easiestWith` over `gradedVerses`), three questions: what a chunk says, the form, a parsing.
- **Writes**: each answer is a grammar answer on the idea (`recordGrammarAnswer`); a parsing step also goes to `drills`.
- **After**: 'You got 2 of 3', then Read it (the Verse view on that verse) or Done (the idea sheet).

### Drill it and Prove it

- **Opens from**: the idea sheet's Drill it button (practice mode); the slider's I know it, a plan's last step in Review, or the result's plan (prove mode). `src/DrillItScreen.tsx`, engine `src/data/grammar/drillIt.ts` over `learn-kit/drill`.
- **Draws from**: one idea's questions in steps of rising difficulty, built from the goal's passage (the whole passage, not graded: it is finding his edge), each tagged with a facet. A kept question from the mill is served in place of one built question. Prove it counts only questions he has not been asked.
- **Writes**: the run (`drillRuns`); a proof makes the idea solid ('Proved by drill') and moves the frontier on; a failed prove run puts it on the frontier; a failed practice run changes no level. A miss is noted as a miss before (`noteDrillMiss`), so a later right answer marks the idea to confirm.
- **After**: 'Proved', or 'You reached step N of M' with Strong and Weak by facet and, when there are weak facets, Your drill plan with Start the first drill. Done returns to the idea sheet. When too few unseen questions are left it says 'More questions are on their way' and proves nothing.

### The short drill (Your drill plan)

- **Opens from**: the Drill it result's Start the first drill; a due step's card in Review. (The Goal screen lists 'Drill plan: N to go', which opens the idea's sheet.) `src/PlanDrillScreen.tsx`, `src/data/grammar/drillPlan.ts`.
- **Draws from**: 4 to 6 questions of one weak facet at the run's edge step and the one below.
- **Writes**: the plan's step, done with one miss allowed; a missed step comes back tomorrow as a `drill-plan` row. Prove it gets its row only when the last short drill is done.
- **After**: 'N of M right' and Done. The next step arrives in Review a day later; nothing on the end card says so.

### The letter drill

- **Opens from**: sliding The Greek alphabet to Learning. `src/LetterDrillScreen.tsx`.
- **Draws from**: the 24 letters in both forms, by ear or by name, in rounds of 8, the missed first; Say it and Write it where the phone allows.
- **Writes**: evidence for each letter, capped one short of solid: a sitting never proves a letter.
- **After**: Another round or Done (the idea sheet).

### Paradigms: Learn and Drill

- **Opens from**: Tools > Paradigms; the idea sheet's Table button; the word sheet's Paradigm row (at the word's own cell, This word | The pattern); Review's See the table after an ending; the tutor's Table chip. `src/ParadigmsScreen.tsx`.
- **Draws from**: the table's cells, each open, not yet, outside or locked by his levels and `paradigmExtent`; This word lays the lemma's own forms from the text.
- **Writes**: opening a table is kept (`paradigmsOpened`), which lets Review ask its endings. In Drill a cell is self-graded Had it or Missed; a run's first Missed writes one wrong answer to the table's `paradigm` row and makes it due now; Had it writes nothing. 'Drill this table' puts the table on the schedule.
- **After**: 'N of M' and Drill the missed again. A locked or not-yet cell offers Go to its idea's lesson; an open cell he missed offers no lesson. Back returns to the sheet or round he came from.

### The Parsing drill

- **Opens from**: one place, three taps deep: Tools > Words > Test > 'Parsing drill: <chapter>'. `src/DrillScreen.tsx`, `src/data/drill.ts`.
- **Draws from**: up to ten places in the chapter the Reader has open (not the goal's passage) of words on his list, learning first and then solid (`drawDrill`), each parsed step by step (`buildSteps`: part of speech, then tense, case and so on, four choices a step). His grammar levels, the extent settings and his goal are not read.
- **Writes**: each step to the `drills` table. No level, no schedule row, no evidence, no miss before. A whole verb parsed right credits nothing.
- **After**: 'N of M', the Missed words with their parsing and a link to each verse, then Done (the Reader) or Another round. Ask the tutor and Talk about it on each question open the Reader on the verse.

### The Quick test

- **Opens from**: Tools > Words > Test. `src/QuizScreen.tsx`, `src/data/quiz.ts`.
- **Draws from**: ten of his solid and learning words, five learning when he has them (`drawWords`), each a dictionary form with four meanings. The goal's needed words get no preference.
- **Writes**: each answer through `recordAnswer`: the word's state by the two-in-a-row rule, its schedule row, and the letters of a word read right.
- **After**: the score and Another round; the Parsing drill's button; Ask the tutor after an answer (needs a licence).

### The Quiz (Practise, Quiz me)

- **Opens from**: the Verse view's Practise door on a verse or a passage; Check's Quiz me. Needs a licence.
- **Draws from**: the passage's Greek and English, his solid words, `learner` and `learner_grammar` (his levels, weak facets, next lesson), the quiz goal and My study way. It is a conversation with the tutor (the bible-talk grind in quiz mode), not a round.
- **Writes**: words he adds from the talk, a line he keeps for My study way, the quiz goal. No answer moves a level or the schedule.
- **After**: the talk goes on as long as he does; nothing closes it and nothing follows it.

### Review

- **Opens from**: Today's Review row ('N due'); Tools > Review; Welcome back's Refresh; the tutor's offers. `src/ReviewScreen.tsx`, `src/review/`.
- **Draws from**: the exact gaps Learn next names (four at most), then ideas with kept questions from the mill, then what is due by kind (drill-plan steps, ideas, tables, sounds, words), then words as the Quick test draws them, up to ten. A grammar question is built from the goal's passage on verses graded to him (`gradedVersesOf`, at the `pickerGrammar` level), rotating ending, tap the form, what does this say, who does what, and for a solid idea a full parsing. A due passage lesson is a button, not an item.
- **Writes**: the schedule row of each item; the idea's level by its step (never a second frontier); the confirm mark; the pace; the picker's level move. It is the only screen that writes everything.
- **After**: the score, 'N come back tomorrow, M later', the move offer, then Back to reading or Another round. In the background, with a licence, the mill is asked for fresh questions on the ideas he missed (`askForMoreItems`), and the next round serves them. After a wrong ending, See the table; after a missed word, the Heart of the word.

### The Reading ladder

- **Opens from**: the Goal screen's 'Reading ladder: Greek' and 'Reading ladder: English'; the Verse view's Read it aloud panel. `src/ReadingLadder.tsx`, `src/ReadCheck.tsx`.
- **Draws from**: every verse of the New Testament ordered by how hard it is to say aloud (`public/data/ladder/`), a score that says nothing of grammar or meaning. Reading a verse aloud is judged by the verse-read grind (needs a licence).
- **Writes**: the reading history; the place is the first verse with no reading that was well read, so it is never stored twice.
- **After**: 'Number N of M on the ladder'; Well read offers Next verse; otherwise Try again or Skip for now. Two readings that miss the same sound offer Drill this sound.

### The Reading drill

- **Opens from**: the reading panel's Drill this sound or Drill these words. `src/ReadingDrill.tsx`.
- **Draws from**: the miss tally of his last five readings: the sound he keeps missing, its rule from the sounds tier, and five dictionary words that hold it, easiest first.
- **Writes**: at Finish, a `sound` row on the schedule (`el:diphthong-ou`), due in a day. The readings in the drill are not kept.
- **After**: Back to the ladder. The sound comes back in Review as a hear-and-pick.

### Placement, and a passage lesson's Check

Two tests stand beside the practice screens and already behave as the workflow below wants, so they are models rather than gaps.

- **The placement** (Place me) walks the goal's needed ideas, two questions each, stepping down on a miss to the letters the missed forms use, and ends on 'Where you are' with the gaps to work on, which Learn next and Review then name in the same order.
- **Check** (a passage lesson's range in the Verse view) asks up to eight questions on the passage's own verses. At 75 percent it writes the lesson passed and Learn next moves on; under it, it names the weak ideas and offers Try again tomorrow (a `lesson` row in Review) or Quiz me.

### The map in one table

| Screen | Tuned to his levels | Tuned to his goal | Moves a level or the schedule | Says where to go next |
| --- | --- | --- | --- | --- |
| Goal, Learn next | yes | yes | no (it is the hub) | yes |
| Lesson (idea sheet) | yes | yes (examples) | yes (slider) | yes |
| Try it on a verse | yes (graded verse) | yes | yes | Read it |
| Drill it, Prove it | its own edge | passage only | yes | the plan, when it fails |
| Short drill | the run's edge | passage only | the plan's step | no |
| Paradigms Learn, Drill | yes (`paradigmExtent`) | no | the table's row, on a miss only | no |
| Parsing drill | no | no (open chapter) | no | no |
| Quick test | words only | no | yes (words) | no |
| The Quiz (tutor) | told to the tutor | the quiz goal | no | no |
| Review | yes (`pickerGrammar`) | yes (passage, gaps) | yes | no |
| Reading ladder | its own place | no (by design) | reading history | Next verse |
| Reading drill | the miss tally | no | a `sound` row | Back to the ladder |
| Placement | finds them | yes | yes | Learn next |
| Check | the passage as it is | yes (the lesson) | yes | Try again tomorrow, Quiz me |

## Gaps

1. **The Parsing drill is tuned to nothing.** It reads the open chapter and his word list. With a goal of 1 John 1 and Romans 8 open it drills Romans; with every verb idea not yet it still asks the mood of a verb. (mw-indx1x6.9, in flight, tunes it to an extent and his words and puts the goal's ideas first.)
2. **The Parsing drill's answers go nowhere.** A missed tense step does not count against the tense, does not mark the idea missed before, and feeds no ask to the mill. The same steps asked inside Review, Try it and Check are written to the idea. Ten rounds of the drill leave his state exactly as it was.
3. **The Parsing drill has no door.** It is a button under the Quick test, which is a button in the header of Words. Neither the Goal, nor Today, nor a lesson, nor a table, nor Review leads to it.
4. **A round ends in a dead end.** Review, the Quick test, the Parsing drill, the short drill, the Paradigms Drill and the Reading drill all end on a score and a choice between the same thing again and leaving. Only the Goal screen knows what is next, and no end card asks it.
5. **A miss does not lead to what teaches it.** Today only three misses show anything that teaches: a wrong ending in Review (See the table), a missed word in Review (the Heart of the word), a misread sound rule in Drill it (the rule's line). (mw-indx1x6.6, in flight, adds the Study this row to Review, Drill it, the short drill and Prove it; mw-indx1x6.10 adds it to the Parsing drill; mw-indx1x6.8 adds the Study list at the end.) Still uncovered after those three: the Quick test, the Paradigms Drill, Try it and Check.
6. **Lessons lead to practice, but practice does not lead to lessons.** The idea sheet offers Drill it, Try it and the table. A table leads back to a lesson only from a locked or not-yet cell; a drill leads back only by Done.
7. **A gap that used to be solid is seen only by the tutor.** A solid idea missed in Review stays solid (Review never makes a second frontier); missed in a practice-mode Drill it, the Parsing drill or a table's Drill, nothing at all is written to it. The phone already works out what is rusty (`src/data/rusty.ts`: a wrong answer among the last three, or seven days overdue), but it tells only the tutor, which needs a licence, and Welcome back after a break. The Goal screen's bars show such an idea as plain Solid.
8. **The settings are read unevenly.** Review grades verses by `pickerGrammar`; the tables by `paradigmExtent`; the Reader by `weaveGrammar`; the Parsing drill by none, and after mw-indx1x6.9 by whichever it lands on. Three dials answer "how much grammar" and no line says which one practice follows.
9. **The goal steers lessons but not practice.** Learn next, Next words and every grammar question's passage follow the goal. Review's fill, the Quick test's words, the Paradigms list and the Parsing drill do not: the idea he is learning now gets no more practice than any other.
10. **There is no ladder for parsing.** The Reading ladder keeps a place and always offers the next verse. Parsing has only rounds of ten from one chapter; the verses graded to him (`gradedVerses`, easiest first) are used inside questions and never walked.
11. **The mill's fresh questions reach one phone.** The drill-items grind writes two kinds of question (tap the form, what does this say), only for ideas missed in Review or a Drill it screen, and what it writes stays on the phone that asked. A reader without a licence gets none, so his Prove it runs out of unseen questions and says 'More questions are on their way' about questions that will never come. (Fixed on Drill it, mw-indx1x6.16: with no licence, offline or with no key it says which, and promises none.)
12. **The tutor's Quiz finds things and keeps none.** It is told his levels and weak facets, but a point he misses in the quiz comes back to the phone only as a word he chooses to add.

## Overlaps

1. **Four doors ask a parsing with the same steps**: the Parsing drill, Review's `parse` question, Try it and Check all use `buildSteps`. The builder is rightly shared; the recording is not (gap 2).
2. **Four doors ask an ending**: Review's ending question (the idea's row), Drill it's ending facet (the run), the Paradigms Drill (self-graded, the table's row on a miss) and Drill this table in Review (multiple choice, the table's row). One missed ending is written to three different places depending on the door.
3. **The Quick test is Review with nothing due.** Review's fill draws words as the Quick test does, on the same card, through the same `recordAnswer`. The Quick test lacks only the flashcard, the three grades and the end card's counts.
4. **A sound has two rows.** The Reading drill schedules `el:diphthong-ou` as a `sound`; the ladder's own item `diphthong-ou` is a `grammar` row and a gap Learn next may name. Review asks both the same way, and a right answer to one does not credit the other.
5. **Try it, Check and Review's rotation are one set of builders** (what does this say, the form, a parsing) over one verse, a lesson's range and the goal. This is the right kind of overlap: keep it, and give the Parsing dojo the same builders.
6. **Eight things are called a drill**: the Parsing drill, Drill it, the short drill, the letter drill, the Paradigms Drill, Drill this table, the Reading drill, and the tutor's 'Open today's drill', which opens Today. His question "is this a duplicate to what is already in drill" is partly this: the names do not say which is which.
7. **Two ladders, soon three**: the grammar ladder (the path of ideas) and the Reading ladder (verses by how hard they are to say); a parsing ladder would be a third. What Learn calls the ladder is already his open question (mw-fnvjof.16).

## One workflow

### The idea in one paragraph

There is one state and there are four acts. He **learns** a thing (a lesson, a table in Learn, a new word's teach sheet), **practises** it (the drills), **proves** it (Prove it, Check, the placement) and **keeps** it (Review); all the while he **reads**, which is what the other four are for. Every practice screen is one of those acts on the same state, so each must do three things it does unevenly today: draw from his settings, state and goal by the same rules; write what it learned about him to the same places; and end by saying the one next thing, asked of one rule. The Goal screen already is that rule's face. The workflow below makes every round's end a small Goal screen.

### The spine

```text
Goal ──> Learning now (one idea)
            │
            ├─ learn:     the lesson ──> its table (Learn) ──> Try it on a verse
            ├─ practise:  Drill it ──> short drills of the weak facets ──> the Parsing dojo (every idea he has, together)
            ├─ prove:     Prove it (fresh questions only) ──> solid, and the frontier moves on
            └─ read:      the passage lesson, then Check ──> Read it
                                   │
Every day: Today ──> Review (keeps what is solid, catches what slips) ──> the same Next
```

Three ladders run beside each other over the same verses, each with a place of its own: **say it** (the Reading ladder, by pronunciation), **parse it** (the Parsing dojo, by his grammar and words), **read it** (the passage lessons and Check, by meaning). The dojo is the missing middle one, and that is why it is not a duplicate of Drill it: Drill it proves one idea alone, finding its edge; the dojo exercises every idea he already has, together, on real words of his goal, which nothing else does outside Review's single `parse` question.

### After a miss

The rule (mw-indx1x6.6's Study this row, extended to every screen that asks): **a wrong answer shows what teaches it, on the spot, and nothing else changes pace.** What a miss links to depends on what was missed, in this order, the first that exists:

| What he missed | Links to |
| --- | --- |
| an ending, or a table's cell | the table at that cell (This word when the question has a lemma), then the idea's lesson |
| a step of a parsing (tense, case, mood ...) | the lesson of the right value's idea; when his pick is its near miss (aorist for imperfect), that idea's lesson too; the table at the word's own cell |
| a form in a verse (tap the form, who does what) | the idea's lesson; the verse in the Reader |
| a word's meaning | the word's card (Heart of the word, an English cousin, its picture), a verse that uses it (mw-indx1x6.12) |
| a sound | the sound's lesson and its rule; the Reading drill for it |
| a use in a sentence (ἵνα, a genitive absolute) | the idea's lesson; the sentence diagram of the verse |
| anything with none of these | Ask the tutor, opened already knowing the question, his answer, the right one and the idea (needs a licence; without one, the idea's lesson is the floor: every idea has a card) |

What a miss **writes** is one rule too, wherever it happens (PROVISIONAL):

- A miss on a question that names an idea is noted as a miss before on that idea (`noteDrillMiss`, today only Drill it and the short drill), so his next right answer marks it to confirm and the following ask is a fresh question. This is how practice exposes a gap without punishing practice.
- Practice never lowers a level by itself. Only Review, a failed Prove it and the placement move levels, as today.
- A miss on an idea that is **solid** also counts toward the rusty rule the phone already has, and the idea shows as **Slipping** (below).

### After a round

Every round, on every screen, ends on the same card, in this order:

1. **The score**, as today.
2. **The Study list** (mw-indx1x6.8): everything this session's misses linked to, one row each, the most-missed first. No misses, no list.
3. **Next**: one button, the first thing that applies from the list below, with a line saying why ('Due today: 3 ideas', 'Your drill plan: its ending', 'Learning now: The neuter gender').
4. The quiet choices the screen has today (Another round, Back to reading, Done).

The **Next** rule is one pure function over his goal and state (proposed `src/data/next.ts`, `nextStep`), read by every end card, by the Goal screen (which already draws most of it), by Today and by the tutor's `learner_grammar.next_lesson`, so they never disagree. Its order, PROVISIONAL:

1. What is due today in Review, when this round was not Review.
2. A drill plan's next step that is due.
3. Learning now, by where he stands on it: the lesson if he has not opened it; Try it on a verse; Drill it; when it is marked to confirm or has a plan finished, Prove it.
4. An idea that is Slipping: Prove it again.
5. The Parsing dojo, when Learning now has been drilled today and the dojo has forms of it.
6. Learn next (the exact gaps first, then the next idea, then a passage lesson).
7. Next words of the goal.
8. Read it: the goal in the Reader, or the next verse of a ladder he has started.

In the background, never waited on, the round's end also feeds the mill (the licensed loop, below).

### After a goal

When both bars are full the Goal screen says so and today stops there. Proposed: it then offers **Read it** first (the reason he set the goal), a **Check** on the goal's passage when it is a lesson's range, and **Choose the next goal** with one suggestion: the next section heading of the same book for a verse or pericope goal, the next chapter for a chapter goal. Review goes on keeping what the old goal taught; nothing is reset.

### Slipping: a gap that used to be solid

His words: "expose gaps (even gaps which used to be solid)". The phone already decides this (`src/data/rusty.ts`) and tells only the tutor. Proposed: a solid word or idea with a wrong answer among its last three, from any screen that asks about it, is shown as **Slipping** wherever Solid is shown (the Goal's bars and lists, the idea sheet's chip, the path), stays solid in the weave and the tables so nothing he reads suddenly locks, comes first in Review's draw and in the mill's ask, and is cleared by a right fresh answer or a Prove it. No licence is needed for any of it; the tutor's offer to move a rusty idea back to Frontier stays as it is.

### Where the Parsing dojo sits

- **What it is for**: integration. Every idea he has, together, on real forms.
- **Draws from** (mw-indx1x6.9, then the stories below): the goal's passage, the open chapter when there is no goal; forms whose every idea is within the practice extent and whose word is within the word setting; the forms of Learning now first, then the frontier, then Slipping, then solid.
- **As a ladder**: beside rounds from a chapter, a walk of the goal's verses easiest first for him (`gradedVerses`), with the place kept as the Reading ladder keeps its own: the first verse he has not parsed every word of. 'Number N of M' and Next verse, in the Reading ladder's words.
- **Writes**: each step as today, and the idea a wrong step names as a miss before; a word parsed wholly right credits its letters, as Review's `parse` question does.
- **After a miss**: Study this (mw-indx1x6.10). **After a round**: the common end card.
- **Its doors**: the Goal screen (beside the Reading ladder, since he asked for it "just like" that), the Next rule, and where it is today.

### One practice extent

His "solid, frontier, any" is three settings today. Proposed, PROVISIONAL and his to choose: **practice follows one dial**, and the candidate is `pickerGrammar` widened to the three extents, because it is the one that already moves with him (Move it: up at 85 percent right, down under 60), which is his "dial up and down". The Reader's Weave dials stay the Reader's and the tables keep their header switch. Drill it, Prove it and the placement stay outside any extent on purpose: they find or prove an edge. If mw-indx1x6.9 lands on the Weave's dials instead, the story below moves the dojo and Review onto one dial, whichever he picks.

### The licensed loop, and how its gains reach everyone

Today, with a licence, the loop is: he misses an idea, the mill is asked in the background for fresh questions on it (at a Review round's end, at a right answer after a miss, and ahead when the kept questions run low), the answer is checked on the phone and not believed (`checkedItems`), the questions are kept and served once, and an idea he missed counts as known only when a fresh one is right. Nothing ever waits on the mill.

His want adds three things. Each sits at the same place in the workflow, the end of a round, in the background:

1. **Every practice screen feeds it.** One hook at the common end card hands the session's missed ideas to `askForMoreItems`, whichever screen he was on (the dojo and the tables' Drill too), Slipping ideas first.
2. **The Study list improves.** A second small grind (proposed `study-list`, shaped like the nightly `tutor-weights` grind, which already tunes a list in the background with nobody waiting): it is sent the session's misses and the links the phone's own mapping found for them, and answers with their order and one line for each on why it helps this miss. As with drill-items the answer is not believed: it may reorder and annotate only links the phone made, never add one. The next session's list uses the order.
3. **The gains reach readers without a licence through a release, never through the network.** A question or an ordering that has proved itself on licensed phones (served, answered, not reported) is harvested, reviewed, and committed as built data; the next release ships it; a phone without a licence then serves a shipped question exactly as a kept one. Its Prove it has fresh questions, its confirm loop closes, and its Study list has the better order, with no call to the mill.

The third is the grilling the Mayor parked as mw-indx1x6.4 and it needs the Governor before any code: it decides what leaves a licensed phone (proposed: the question and how often it was right, never who answered or what else he knows), who reviews a harvest before it ships, and how it is credited. It stays inside VISION.md's line as drafted (free to read, a licence unlocks only the AI: a shipped question is data, not a call), but it is a new kind of thing leaving the phone, so it is his to say.

### A shared library

His "maybe there is a shared library possibility here": partly it already is one. `learn-kit` (shared with Kestrel) holds the schedule and the levels graph (`learn-kit/graph`), the Drill it walk and the placement's rule (`learn-kit/drill`), and the seen-question ledger, the confirm rule and the ask-ahead stock (`learn-kit/fresh`). Three more pieces of this design are app-neutral and would sit beside them, each built first in Lampas as a pure module with no Lampas import and lifted when a second app needs it (docs/module-map.md section 5, the second copy is the signal):

- **The Study list's rule**: collect a session's misses, dedupe their links, rank by how many misses point at each. The mapping from an idea to its resources stays Lampas's data.
- **The Next rule**: an ordered list of doors over a graph, a schedule and open plans.
- **The tuned draw**: pick items within an extent of a levels graph, a named set first (the goal's), then frontier, then solid.

Which app goes first is the Mayor's cross-app call, as on the epic.

## Decisions for the Governor

Each is PROVISIONAL in the text above; a story that depends on one names it.

1. **One practice extent, and which dial** ('One practice extent').
2. **Slipping**: the word, and that a slipping idea stays solid in the weave and the tables.
3. **The order of Next** ('After a round').
4. **A parsing ladder beside the rounds**, with its door on the Goal screen under the Reading ladder.
5. **Practice never lowers a level**; it only marks a miss before.
6. **The harvest** (mw-indx1x6.4): whether good questions and Study list orders ship to everyone in a release, what may leave a licensed phone, and who reviews it.
7. **The names**: eight things are called a drill; whether the dojo is 'Parsing dojo', 'Parsing ladder' or stays 'Parsing drill'.

## Proposed stories

For the Mayor to file. Each is one line; the order is the order they unlock each other. Stories already filed are not repeated: mw-indx1x6.6 (Study this), .8 (the Study list), .9 (the tuned Parsing drill), .10 (its links), .12 (a word's example verse), .14 (Today's Review progress).

1. Lampas Parsing drill draws from the goal's passage, and from the open chapter only when no goal is set, as Review's grammar questions do (after mw-indx1x6.9).
2. Lampas Parsing drill writes what it learns: a wrong step is a miss before on the idea that step names (so the idea is confirmed on a fresh question), and a word parsed wholly right credits its letters, as Review's parse question does.
3. Lampas: one pure rule for what is next (`nextStep` over his goal, levels, schedule, plans and marks), with the Goal screen and the tutor's next lesson reading it; no change he can see, a test for each rung of the order.
4. Lampas: every round's end card (Review, Quick test, Parsing drill, Drill it, short drill, Paradigms Drill, Reading drill, Try it, Check) shows one Next button from that rule with a line saying why, above the choices it has today.
5. Lampas: Study this on the screens mw-indx1x6.6 and .10 leave out (Quick test, Paradigms Drill on Missed, Try it, Check), through the same mapping.
6. Lampas Paradigms: a table names the lessons of its ideas ('Lesson: <idea>') in its header and under a cell he marked Missed, and a Missed cell is a miss before on that cell's ideas.
7. Lampas: a solid word or idea with a wrong answer among its last three is shown as Slipping on the Goal screen, the idea sheet and the path, comes first in Review, and is cleared by a right fresh answer or Prove it; no licence needed.
8. Lampas Parsing ladder: walk the goal's verses easiest first for him, keeping the place by what he has parsed, 'Number N of M' and Next verse as the Reading ladder says them, with a door on the Goal screen.
9. Lampas: Review's fill and the Quick test ask the goal's needed words first, then the rest of his words.
10. Lampas: practice follows one grammar extent (Review's graded verses, the Parsing drill and the Parsing ladder read the same dial); held until the Governor picks the dial.
11. Lampas: the Goal screen, when both bars are full, offers Read it, a Check where the goal is a lesson's range, and Choose the next goal with the next section or chapter suggested.
12. Lampas: a sound drilled from the Reading ladder and the same sound as a ladder item share one schedule row, so a right answer to either credits both.
13. Lampas: every practice screen's end hands its missed ideas to the mill's background ask (one hook at the end card), Slipping ideas first; nothing asked offline, with no key or no licence, as today.
14. Lampas: a `study-list` grind orders and annotates the session's Study list in the background; the answer may only reorder links the phone made; the next session's list uses it; an input schema and examples ship with it (after mw-indx1x6.8).
15. Grilling (un-park mw-indx1x6.4): do the mill's proven questions and Study list orders ship in a release for every reader, what may leave a licensed phone, and who reviews a harvest.
16. Lampas: shipped questions are served to a phone without a licence as fresh ones, so Prove it and the confirm loop work with no call to the mill (after story 15's yes).
17. Lampas: the tutor's Quiz reports the ideas he missed back to the phone as misses before, so the quiz's findings are confirmed like any other (needs a licence; the bible-talk answer schema and its examples change).
18. Grilling: the names of the eight drills and of the dojo, with what Learn calls the ladder (mw-fnvjof.16).
19. learn-kit: lift the Study list's rule, the Next rule and the tuned draw once Lampas has them as pure modules (the Mayor's cross-app call).
20. Lampas Help: a page 'How practice fits together' once the Governor has confirmed the workflow, and About's line for anything the harvest credits.
