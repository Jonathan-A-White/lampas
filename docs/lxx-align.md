# The Septuagint's English aligned to its Greek

Story mw-u2w5klk.274.1 (the Governor's word, 2026-11-05: "Do A - I'd like to see true weave mode asap"). PROVISIONAL, Governor to confirm: every choice below.

The Septuagint chapters are Swete's Greek with Brenton's English (LXX2012), and the build gives a verse's English as one chunk holding every Greek word, so the Weave has nothing to put a Greek word over.
`scripts/lxx/align.ts` cuts Brenton's verse into English chunks and pairs each to the Greek word it renders, in the shape the Old Testament's Weave already reads (`EnglishChunk` and `GreekWord.e` in
`src/data/chapter.ts`, `weaveVerse` in `src/data/weave.ts`). It is deterministic and calls no model; a second run on the same inputs writes the same bytes. What it cannot pair it leaves in remainder chunks,
and a Builder's own session cuts and pairs those ([The model pass](#the-model-pass), story mw-u2w5klk.274.2; `scripts/lxx/align-choose.ts`, the files in `data/lxx/align`).

<!-- toc -->

- [The commands](#the-commands)
- [The shape](#the-shape)
- [How a pair is made](#how-a-pair-is-made)
- [The model pass](#the-model-pass)
- [A pairing pass](#a-pairing-pass)
- [The unpaired English](#the-unpaired-english)
- [What reads the chunks](#what-reads-the-chunks)
- [The report](#the-report)
  - [One file a book](#one-file-a-book)

<!-- /toc -->

## The commands

- `npm run lxx:ship -- --out dist/data-lxx` aligns every chapter it ships (the deploy step, which a host runs as `npm run build:live`; docs/lxx-derivation.md 'The commands'). `npm run data:build:lxx` (public/data-lxx) is unchanged: one chunk a verse.
- `npm run lxx:align [-- --out <dir>] [--no-morpheus] [--build <n>]` is that ship into `<dir>` (a temporary directory by default) and writes the aligned share of each chapter shipped into the file of its book, `docs/lxx-align/<code>.txt` ([the report](#the-report)).
- `npm run lxx:align-expect [-- --book <code>] [--no-morpheus] [--force]` is the last step of a pairing pass ([A pairing pass](#a-pairing-pass)): the same ship, then, for each book asked, its sidecar `data/lxx/align/<code>.expect.json` and its file under `docs/lxx-align/`. It writes no file under `tests/`.
  Both read the choices under `data/lxx/choices`, so the chapters are the ones the ship ships, and both apply the model pass's files under `data/lxx/align`.
  Which chapters ship depends on which books have a Morpheus cache (git-ignored; a worktree borrows the Laptop's with `npm run lxx:link`), so each book's file in [the report](#the-report) opens with the line 'Derived without a Morpheus cache: ...'.
  A run on a host whose cache for a book is not the one its file records leaves the file as it was and fails, naming both; `--force` writes it anyway (story mw-u2w5klk.349.24).
- `npm run lxx:unpaired [-- --book <code>] [--no-morpheus]` is the same ship into a temporary directory and a count of the English content words that sit where a tap opens no Greek word, per chapter and book ([The unpaired English](#the-unpaired-english)). It prints, writes nothing and never fails on a gap.
- `npm run lxx:align-choose -- --list --book gen --chapter 1` prints the verses of a chapter that still have a remainder; `npm run lxx:align-choose -- --book gen --chapter 1 --from <file>` checks a model session's file and writes `data/lxx/align/gen-01.tsv`.

## The shape

A verse's `e` is a list of chunks in English order, and a verse's English words are all in it: the chunks, joined by a space, are Brenton's whole verse.

| Chunk | Fields | Meaning |
| --- | --- | --- |
| Aligned | `t`, `g: [i]`, `s?`, `c`, `y: 'align'` | one English word (with its punctuation) that renders Greek word `i`; `c` is the confidence, 0 to 1 with two decimals; `s: [0]` where Brenton's brackets mark the word supplied |
| Remainder | `t`, `g: []`, `s?`, `y: 'align?'` | a run of English words the aligner could not pair; it is left for the model pass. A verse nothing pairs in is one remainder chunk |
| Model | `t`, `g: [i, ...]`, `s?`, `c`, `y: 'model'` | a piece of a remainder cut and paired by the model pass; `g` is empty for English that renders no Greek word (supplied words, 'of' and 'the' that a case ending carries); `c` is 0.8, 0.5 or 0.4 |

Each paired Greek word has `e`, the position of its chunk in `e`. A Greek word with no `e` has no English yet (a Greek article Brenton has no 'the' for, a word the aligner did not find); it is never dropped from `g`.
`c` and `y` are new on `EnglishChunk` and PROVISIONAL, as a word's `c` and `y` are (`GreekWord`).
A shipped book's `index.json` carries the fingerprint of the aligned chapter (the Reader asks for `?v=<fingerprint>` and keeps what it was given), so a phone that holds a chapter from before alignment fetches the aligned one.

## How a pair is made

1. Each English word is cut from the verse, with its punctuation, and stemmed (irregular verbs by a table: 'made' is 'make'). Each Greek word is a name (a lemma that begins with a capital), an article (`T-` parsing), a content word (noun, adjective, verb, adverb) or a function word.
2. The pairs are the heaviest chain that keeps the order of both verses (dynamic programming; the LXX is translated word for word, so Brenton's order mostly follows Swete's). A pair's weight is its confidence, a little less for a pair far from the same place in both verses:
   - a **name** pairs with a capitalised English word whose sound is like its transliteration (`tr`: Iakōb and Jacob, Kain and Cain), at 0.9 times the likeness, 0.7 likeness at least;
   - a **content word** pairs by its lemma's gloss from the shipped lexicon (`lexicon-grc-lxx.json`, TBESG): 0.85 when the stems are the same, 0.65 when the shorter begins the longer, or 0.8 by a short table of common lemmas Brenton renders by words the gloss does not say (ἀνά 'between', εἴδω 'saw');
   - a **function word** (preposition, conjunction, particle, pronoun) pairs by its gloss at 0.7, or by the same table at 0.5; an **article** pairs with a 'the', at 0.55, by its place in the chain.
3. What the chain left unpaired is paired out of order, the likeliest first (Brenton's English order is not always the Greek's: 'And God said' for καὶ εἶπεν ὁ θεός), at 0.05 less (0.2 less for a function word).
4. An article still unpaired goes with the 'the' just before the English of the noun after it (within three words), at 0.5.
5. Between two chained pairs, the same number (one to three) of Greek content words and English content words left over pair by their place, at 0.4, 0.35 or 0.3: 'saw' for εἴδω, where the gloss says 'perceive'.
6. Every English word still unpaired falls into a remainder chunk, one for each run.

A chunk at or above 0.6 is called sure in the report: a gloss, a name or the table matched. Below it the pair is by place or out of order and may be wrong; the model pass is to check it. Nothing reads `c` yet: the Weave shows a chunk's Greek whatever its `c`.

## The model pass

A Builder's own session (the model; no paid API is called) reads each verse that still has a remainder and cuts every remainder into chunks that point at the Greek words no chunk has yet. `npm run lxx:align-choose -- --list --book gen --chapter 2`
prints, for each such verse, the Greek words by position (a `*` marks one with no English yet, then its lemma and parsing), and Brenton's English, each aligned word followed by its Greek position in angle brackets and each remainder as a numbered run `{#1 ...}`.
The session writes one line a run, as the derivation's model sessions do (`scripts/lxx/choose.ts`):

```
Gen.1:5#4 morning, @17 / the first @19          # the run is cut at the slash; each chunk ends with the positions of the Greek words it renders
Gen.1:7#1 @5                                    # a run of one chunk may leave its text out
Gen.1:9#2 which is @7 ?                         # ? marks a chunk the model is unsure of, guess one it is guessing
Gen.1:9 *                                       # every run of this verse with no line of its own renders no Greek word (@-)
```

The runner refuses, naming the run and writing nothing: a position outside the verse's word positions, a Greek word that the aligner already paired (the model re-chooses the remainders, not the aligner's pairs), a Greek word in two chunks,
chunks that, joined, are not the run's English, a run with no line, and a line for a run or a verse that is not there. The file is written as `data/lxx/align/<book>-<chapter>.tsv` (`ref`, `run`, `text`, `g`, `mark`, `confidence`; 0.8 chosen, 0.5 unsure, 0.4 guess),
one file a chapter so two stories never touch the same file; it holds Lampas's own cuts and positions, fragments of Brenton's English (public domain, credited in ATTRIBUTION.md) and none of Swete's Greek.

`lxx:ship` and `lxx:align` apply the rows: each run is replaced by the model's chunks (`y: 'model'`, `c`), each Greek word's `e` is set to the position of its chunk, the aligner's own chunks are untouched, and the supplied words (`s`) go to the chunk they fall in.
A run whose English is no longer what the aligner leaves (the aligner changed since the session), or that has no rows in a chapter that has some, is kept as the aligner left it, and the ship names it in its notes (`the model pass, chapter 1: Gen.1:2#3 is stale`);
`tests/unit/lxx-align-choose-gen.test.ts` fails on any such note for Genesis 1 to 11, so a change to the aligner is followed by a rerun of the session for the chapters it touches.

Two limits belong to the aligner, not to this pass, and show in the chunks: a pair the aligner made out of order or by place can be wrong (Genesis 1:7's 'God' sits on the second θεός), and the pass does not touch a pair; and a few LXX2012 verses carry English that belongs to the next Greek verse (Genesis 8:3 and 8:4), which no pairing can fix.
`--list` and `--from` number and check the runs at the stage `lxx:ship` applies the rows at (`alignRuns` in `scripts/lxx/align.ts`, which `alignChapter` also starts from: the chapter before the rows and before `joinSupplied`; the command asks the ship for it with `runsOnly`), so a verse with supplied words before a verb ('She will' + 'love') lists the supplied words as a run of their own, as the ship has it (mw-u2w5klk.349.16; before it the listing read the chapter after the join and its numbers were not the ship's).
A fix of the aligner's own pair (story mw-u2w5klk.349.32; the Governor's 'removed', Genesis 13:18): the model pass re-chooses remainders and never a pair, but the aligner's gloss match gives a Greek word to the wrong English word of its phrase ('tent,' to ἀποσκηνώσας, 'up' to ἀναβλέψας and ἀνήνεγκεν, κυρίαν to 'Return', 'offering' to ὁλοκάρπωσιν), so the word that renders it had no Greek and a tap on it opened the Verse view or a neighbour's word. A row whose `run` is `fix` in the same file (`Gen.13:18<TAB>fix<TAB>having removed his tent,<TAB>1<TAB><TAB>0.80`) names English words of the verse, as they read in a row of its chunks (after the runs, before `joinSupplied`), and the Greek positions they render: those chunks become ONE model chunk holding those words (`g` `-`: a chunk that renders no Greek), and each Greek word's `e` follows its chunk.
`applyFixes` (`scripts/lxx/align-choose.ts`) applies a verse's fixes together and keeps the verse as the model pass left it, naming it in the ship's notes as stale, when a fix finds its words no longer in the chunks (or in two places), puts a Greek word in two chunks, or leaves a Greek word that had English with none. The words begin and end at chunk boundaries of the verse after the model pass, or inside a chunk that renders no Greek word, whose other words stay as a chunk of their own (a run cut as 'money shall' is cut after 'money' by the fix 'he that is bought with money' of Genesis 17:13, story mw-u2w5klk.349.40; a chunk that renders a Greek word is never cut, and a fix whose words are whole chunks is read as whole chunks first). `lxx:align-choose --from` writes the runs of a session's file and keeps the fix rows the chapter's file already holds, after the runs (mw-u2w5klk.349.39).
The rest of the shipped chapters are still to be paired, one chapter a command: `npm run lxx:align-choose -- --list --book <code> --chapter <n>`, then `--from <file>`; the Morpheus cache a worktree borrows (`npm run lxx:link`) must be there for the chapter, or `--list` says it is not a shipped chapter. What a book's passes did, and the chapter left, is in its own file, `docs/lxx-align/<code>-notes.txt` (`gen-notes.txt`, `exo-notes.txt`), and `npm run lxx:unpaired -- --book <code>` counts what is left of it; this file holds no book's batch.

## A pairing pass

A pass over a book's chapters (the stories of the epic mw-u2w5klk.349) touches the files of its own book and no other (mw-u2w5klk.349.73), so passes on different books run side by side: a book's pass writes its notes to its book's file, `docs/lxx-align/<code>-notes.txt`, and its tests to `tests/unit/lxx-align-choose-<code>.test.ts`, never to docs/lxx-align.md or the shared test file (mw-u2w5klk.349.99; `tests/unit/lxx-align-per-book.test.ts` holds it). The steps, in order; the last is the command:

1. `npm run lxx:link`, then `npm run lxx:align-choose -- --list --book <code> --chapter <n>`, and write the session's file `--from <file>`: `data/lxx/align/<code>-<NN>.tsv`, the `fix` rows after the runs ([The model pass](#the-model-pass)).
2. `npm run lxx:unpaired -- --book <code>` reads the gaps: 0 in each chapter of the pass.
3. **Last: `npm run lxx:align-expect -- --book <code>`.** It ships once and writes, for that book alone, `data/lxx/align/<code>.expect.json` (the sidecar) and `docs/lxx-align/<code>.txt` ([One file a book](#one-file-a-book)); it writes no file under `tests/`. A second run changes nothing.
4. Open the sidecar: each English content word of the pass's chapters that has no Greek word is in the chapter's `leftovers` with an empty reason. Read each against the verse (`--list`) and write why, a key of `"reasons"` (a sentence of the book's own, added there) or a sentence. A chapter's `placePairs`, if you read the aligner's pairs by place (`placePairs` in `scripts/lxx/align-expect.ts`: the chunks with c below 0.6 whose Greek word the lexicon's entry does not say), is the pairs you read, each `"read"`. Run the command again: it keeps every reason and changes nothing else.

The sidecar holds, for each chapter with a model file: `gaps` and `model` (the two counts of `npm run lxx:unpaired`), `leftovers` (`chapter:verse:word` with why; `also` names a function word the chapter counts all the same, as 'yes' of Genesis 20:6), and `placePairs`. A chapter with no `leftovers` is count-only (Genesis 1 to 11). Nothing in it is hand-kept but the reasons.
The tests read it and are generic: `tests/unit/lxx-unpaired.test.ts` the counts, `tests/unit/lxx-align-choose-gen.test.ts` the leftovers, the model files and the books' files (generic over every book's sidecar; it is the Genesis file only because it ships once), `tests/unit/lxx-align-low-confidence.test.ts` the pairs by place. Each fails in one line that names `npm run lxx:align-expect -- --book <code>` when the sidecar is stale (another story added alignment rows: run the command, commit the sidecar), and says where a leftover has no reason. The paragraphs of docs/lxx-align/gen-notes.txt that name 'tests/unit/lxx-align-choose-gen.test.ts' for a list are history: the lists are in `data/lxx/align/gen.expect.json` now. A pass adds no paragraph to this file: its numbers are in the sidecar and the book's file.

## The unpaired English

Story mw-u2w5klk.349.1, the sweep of the pairing epic (mw-u2w5klk.349; the Governor's report of 2026-11-10: he tapped 'removed' in Genesis 20:1 and got the Verse view). The Reader opens a Greek word from a tap on an English chunk only where the chunk names one (`septuagintChunkLinked`, src/reader/septuagint.ts);
`npm run lxx:unpaired` counts the English that is left where it does not. It runs the ship as `lxx:align` does (the choices and the model pass's files under `data/lxx/align`), reads the chapters the ship wrote, and prints a table, a row for each chapter shipped and the book's `total` after its chapters, books in the Old Testament's order; `--book gen` counts one book.

| Column | Meaning |
| --- | --- |
| English content words | the words of Brenton's English that are not function words (`FUNCTION_WORDS` in `scripts/lxx/unpaired.ts`: and, the, of, to, a, that, in, is, was, for, he, his, the pronouns, the prepositions, 'be', 'have', 'do' and their forms, Brenton's thou, thy, hath, unto); a word is its letters, so 'Abraham's' is 'abraham' |
| Unpaired | the content words in a remainder chunk (`y: 'align?'`) or in a chunk with no Greek word that is not the model's (`g` empty, or no `y` at all, the one chunk a verse that `data:build:lxx` makes): a tap on one opens the Verse view. These are the gaps the epic is to close |
| No Greek by the model | the content words in a model chunk (`y: 'model'`) whose `g` is empty: a session settled that they render no Greek word. Counted apart, not a gap. Some are English whose Greek word the aligner paired to another English word, which the pass does not touch (the 16 of Genesis 20 listed in `data/lxx/align/gen.expect.json`) |
| Share | Unpaired over English content words |

The command reports and does not fail on a gap. A later story makes a gap a failing test once the model batches have finished a book. `tests/unit/lxx-unpaired.test.ts` holds the function-word list, the counting on a fixture verse with a known remainder, the table, and (where the git-ignored sources are on the disk, as `lxx-align-choose.test.ts`)
the real chapters against the counts of their sidecars (`data/lxx/align/<book>.expect.json`, [A pairing pass](#a-pairing-pass)), which read 0 unpaired where a pass has been through. Read the table by the Share: it is the sweep's measure before and after each batch. At this story Genesis 40 to 50, Exodus, Leviticus, Numbers, Deuteronomy, Joshua, the Psalms and Isaiah, as the ship ships them, read between 10% and 35% a chapter; Genesis 12 to 13, 15 to 23 read 0 (mw-u2w5klk.349.3), Genesis 24 to 29 read 0 after mw-u2w5klk.349.4, and Genesis 30 to 36 after mw-u2w5klk.349.5, and Genesis 37 to 39 after mw-u2w5klk.349.47, and Genesis 40 to 42 after mw-u2w5klk.349.48, and Genesis 43 to 45 after mw-u2w5klk.349.49, and Genesis 46 to 48 after mw-u2w5klk.349.50.

## What reads the chunks

The Reader's English view draws each chunk as a tap, so a verse now has several taps (a model chunk with no Greek is a tap like any other). A chapter whose verses carry aligned chunks (`septuagintAligned`, src/reader/septuagint.ts: some chunk with `y: 'align'` and a word in `g`) is woven in the Weave position as the New Testament is (mw-u2w5klk.274.3: `septuagintSettings` leaves `weaveShown` as the settings have it, so the Greek dial, the weave order and the woven reading check follow); a chapter with none (`data:build:lxx`'s one chunk a verse) keeps the Weave position as the Greek verse alone with the once-only note that the Weave is off (`septuagintView`, `septuagintWeaveNoted`). The sweep of every reader of a Septuagint verse's `e` is in the story's closing comment (mw-u2w5klk.274.1).

## The report

'Aligned' is the Greek words that have an English chunk; 'At confidence 0.6 or more' is those whose chunk is sure. The share is of Greek words, not English: many Greek articles have no English article in Brenton, so the share cannot reach 100%.
The Genesis 1 fixture (tests/fixtures/lxx, all 31 verses of Brenton's chapter and TBESG's rows for its lemmas) aligns 630 of 751 words (83.9%); `tests/unit/lxx-align.test.ts` holds the floor at 83%.

### One file a book

The report is one file a book, `docs/lxx-align/<code>.txt` (`gen.txt`, `exo.txt`, ...; a `.txt`, because CLAUDE.md names every `.md` under `docs/`), so two passes on two books write no file in common (mw-u2w5klk.349.73).
Each opens with the book's name, a line that it is GENERATED, and 'Derived without a Morpheus cache: <code>.' or '... none.' for this book alone, then 'Each chapter shipped' (a row for each chapter the ship wrote) and the book's own row.
`npm run lxx:align-expect -- --book gen` writes the book's file (and its sidecar, [A pairing pass](#a-pairing-pass)); `npm run lxx:align` writes the file of every book it ships.
A run on a host whose Morpheus cache for the book is not the one the file was written with leaves it as it was and fails, naming both lists; `--force` writes it anyway.
`tests/unit/lxx-align-choose-gen.test.ts` fails, naming the command, when a file differs from what the ship gives (on a host whose cache for the book is the file's).
There is no total across books in the files, since a total would be a file every pass writes: add the book rows when you want it.
