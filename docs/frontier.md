# The frontier

The Governor asked for "low-hanging fruit as I'm doing well" and for "something new ... in context ... I see the new thing a lot
of help around me". The frontier is the answer: as he reads a chapter, the few new words worth learning next, and for each the
verse where it stands among the most words he already knows.

Code: `src/data/frontier.ts`. It is pure: no store, no network and no screen yet. The caller hands it the chapter, the lemmas he
has in each state and the word counts (`loadFrequency`).

## Which words are new

`pickFrontier(chapter, known, frequency, n)` returns up to `n` candidates, each `{ strongs, lemma, gloss, count, verses }`.

- A word is new when its lemma (the NFC dictionary form, `wordLemma`) is in none of `known.solid`, `known.learning` and
  `known.dropped`. A word he has, is learning, or has put aside is never offered. `listSolidLemmas` and `listLearningLemmas` give
  the first two sets; a word he dropped is one he said he does not want, so it stays out too.
- `count` is how often the New Testament uses the word (`frequency.json`). The commonest comes first: the word he will meet most
  often is the best to learn next.
- Names (`proper` in the table: people, places, peoples) come after every other word, however often the New Testament uses them. A
  name is not one to learn from a list.
- Two words with the same count: the one that stands more often in this chapter first, then the one whose first verse is earlier.
- A word the table lacks counts 0 (so it comes last among the ordinary words) and is not a name.
- `verses` are the verse numbers of the chapter the word stands in, in order.

## Where to meet it

`easiestVerse(candidate, chapter, solid)` is the verse number, among the candidate's verses, with the highest share of solid
Greek words (solid words over all the Greek words of the verse). So the new word stands with a lot of help around it. On a tie
the verse with the fewest Greek words wins, and on a further tie the earlier verse. It is `null` when the chapter has none of
the candidate's verses.

## Held to his grammar level

`pickFrontier(chapter, known, frequency, n, formPasses?)` and `easiestVerse(candidate, chapter, solid, formPasses?)` take an optional test
of one form (`FormTest`, a `GreekWord` in, a boolean out); the caller builds it with `pickerPasses(levels, level)`
(`src/data/grammar/formLevel.ts`: `formPasses` on the word's RP parsing, at `solid` for Solid grammar and `solid+frontier` for Frontier
grammar; `levels` is `listLevels()`). With no test the picker is as it was.

- A word is offered only when at least one of its forms in the chapter passes. `n` counts the words that are kept. `verses` still lists
  every verse the word stands in.
- `easiestVerse` puts a verse where a form of the word passes before one where none does, and among those a verse whose Greek words
  all pass first; then the solid share, the fewest words and the earlier verse, as before.
- The level is the setting `pickerGrammar` (Settings > New words, **New words at**: Solid grammar | Frontier grammar, default
  Frontier grammar). A fresh install has no idea at a level yet, so at either level nothing passes until the placement or the idea sheet
  gives some; the picker has no screen yet.

### Moving the level

`moveFor(level, answers)` (`src/data/grammar/move.ts`, pure; PROVISIONAL, the Governor to confirm) looks at his last 20 grammar answers in
Review (`pushGrammarAnswer`, `getGrammarAnswers`: a string of 1 and 0 in the settings store under `grammarAnswers`, no table; the
placement's answers do not count): `up` from Solid grammar when 85 percent or more of them are right, `down` from Frontier grammar when
under 60 percent are, else `none`; fewer than 20 answers is always `none`. The setting `grammarMove` (**Move it**: Ask | Auto | Off,
default Ask) says what Review's end card does after a round that asked a grammar idea (`src/review/pickerMove.ts`): Ask shows
"Move new words to frontier grammar?" with Yes and Not now, Auto moves it and says "Moved new words to solid grammar", Off does
nothing. A move forgets the ring, so the answers given at the old level do not judge the new one, and publishes `picker-level-moved`.

## Tests

`features/frontier.feature` (steps in `features/steps/frontier.steps.ts`) and `tests/unit/frontier.test.ts` run on a made-up
chapter, `tests/fixtures/frontier.ts`, whose word counts are invented so that every rule is proved and nothing changes when the
data does. `features/picker-grammar.feature`, `tests/unit/move.test.ts` and `tests/unit/grammar-answers.test.ts` cover the level and the move. Both also run on Romans 8 with his seed (lessons 1 to 9 solid, the rest learning): the list is not empty and its first
word is not a name.

## The teach sheet (mw-bsf54t.4)

The Reader shows the frontier as a strip under its header, `New words: N` (`src/NewWordsStrip.tsx`, like `Due: N`; not drawn at 0).
`N` is the number of candidates `pickFrontier` gives for the open chapter without the words he said Not now to today, at most
the pace (see 'The pace' below). `src/useNewWords.ts` is the one hook.

A tap opens the teach sheet (`src/TeachSheet.tsx`, dialog 'New word') on the first candidate:

- the lemma large with a speaker, its respelling (`testid teach-translit`), its meaning, the picture if it has one, and the parsing of its
  first occurrence in plain words;
- its easiest verse (`easiestVerse`), woven by `weaveForTeaching` (`src/data/weave.ts`): his solid words and the new word in Greek, the new
  word's chunk marked (`[data-new]`) with its English in small grey beneath (`[data-hint]`); the verse number ('Romans 8:9') scrolls the
  Reader to that verse and closes the sheet;
- **Got it**: `teachWord(lemma, gloss, 'got-it')` puts the word on the list as learning, lesson 0, `source: 'frontier'`, on the schedule at
  step 0 and due now; **I know this**: the same word solid, at the 30-day step; **Not now**: skipped for today only (`src/data/skipped.ts`, in
  memory, forgotten at midnight, nothing in Dexie); **Ask the tutor**: the Talk sheet on the verse, with `newWordQuestion` sent.
- Each answer shows the next candidate; the sheet closes when none is left. `frontier-taught` {lemma, outcome} goes on the bus (docs/events.md).

Words lists the words taken here under 'From my reading' (`source: 'frontier'`, lesson 0).

## The pace (mw-bsf54t.7)

Settings > New words > `New words a day` (registry key `newWordsADay`: Off, 3, 5, 10; stored as '0', '3', '5', '10'; 3 until chosen)
is how many new words the strip offers at a time. `src/data/pace.ts` is pure: `paceFor(setting, dueCount, lastRoundScore, cleanDays)`
gives `{count, reason}`: 0 with reason `'back'` when more than 20 words are due or the last Review round scored under 60 percent
(`'Dialled back: clear your reviews first'` under the Settings control), the setting with `'normal'`, and the next notch (never
above 10) with `'up'` once `cleanDays` reaches 7 (`'Dialled up: a clean week'`). Off stays Off. The thresholds (20, 60 percent,
a week) are PROVISIONAL.

`src/usePace.ts` is the one hook (the setting, `countDue`, and the kept rounds); `useNewWords` takes its `count`. The last round and
the start of the clean run are kept by `recordRound` (Review's end card) in the settings store under `paceRounds` as JSON, no table:
a round under 60 percent, or one more than a week after the last, starts the clean run again, and a week with no round is no clean week.
It is a pace of how many are offered at a time, not a count of the words taught today.
