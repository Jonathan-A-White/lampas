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

## Tests

`features/frontier.feature` (steps in `features/steps/frontier.steps.ts`) and `tests/unit/frontier.test.ts` run on a made-up
chapter, `tests/fixtures/frontier.ts`, whose word counts are invented so that every rule is proved and nothing changes when the
data does. Both also run on Romans 8 with his seed (lessons 1 to 9 solid, the rest learning): the list is not empty and its first
word is not a name.
