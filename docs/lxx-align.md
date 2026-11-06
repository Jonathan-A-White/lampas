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
- [What reads the chunks](#what-reads-the-chunks)
- [The report](#the-report)
  - [Each chapter shipped](#each-chapter-shipped)
  - [Each book](#each-book)

<!-- /toc -->

## The commands

- `npm run lxx:ship -- --out dist/data-lxx` aligns every chapter it ships (the Laptop's deploy step, docs/lxx-derivation.md 'The commands'). `npm run data:build:lxx` (public/data-lxx) is unchanged: one chunk a verse.
- `npm run lxx:align [-- --out <dir>] [--no-morpheus] [--build <n>]` is that ship into `<dir>` (a temporary directory by default) and writes the aligned share of each chapter shipped between the markers below.
  Both read the choices under `data/lxx/choices`, so the chapters are the ones the ship ships, and both apply the model pass's files under `data/lxx/align`.
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
`tests/unit/lxx-align-choose.test.ts` fails on any such note for Genesis 1 to 11, so a change to the aligner is followed by a rerun of the session for the chapters it touches.

What the pass settled in Genesis 1 to 11 (story mw-u2w5klk.274.2: 297 verses, 1,385 runs, 6,057 Greek words): before it, 4,981 of the words (82.2%) had an English chunk; after it 5,544 (91.5%), 563 of them (9.3%) by the model, and no remainder chunk is left in those chapters.
The words still without English are mostly Greek articles Brenton has no 'the' for, particles, and Greek that Brenton leaves out (Genesis 1:14's 'and to rule the day and the night'). Many remainders render no Greek word at all ('there' in 'there was', 'of' after a noun in the genitive): they are model chunks with no `g`, and the weave leaves them English.
Two limits belong to the aligner, not to this pass, and show in the chunks: a pair the aligner made out of order or by place can be wrong (Genesis 1:7's 'God' sits on the second θεός), and the pass does not touch a pair; and a few LXX2012 verses carry English that belongs to the next Greek verse (Genesis 8:3 and 8:4), which no pairing can fix.
The rest of the shipped chapters are still to do, one chapter a command: `npm run lxx:align-choose -- --list --book <code> --chapter <n>`, then `--from <file>`. They are Genesis 12 to 50 (38 chapters, 7,085 runs), Exodus (16 chapters, 2,294 runs) and the Psalms (117 chapters, 7,323 runs): about twelve batches of some 1,400 runs, as Genesis 1 to 11 was one.

## What reads the chunks

The Reader's English view draws each chunk as a tap, so a verse now has several taps (a model chunk with no Greek is a tap like any other). A chapter whose verses carry aligned chunks (`septuagintAligned`, src/reader/septuagint.ts: some chunk with `y: 'align'` and a word in `g`) is woven in the Weave position as the New Testament is (mw-u2w5klk.274.3: `septuagintSettings` leaves `weaveShown` as the settings have it, so the Greek dial, the weave order and the woven reading check follow); a chapter with none (`data:build:lxx`'s one chunk a verse) keeps the Weave position as the Greek verse alone with the once-only note that the Weave is off (`septuagintView`, `septuagintWeaveNoted`). The sweep of every reader of a Septuagint verse's `e` is in the story's closing comment (mw-u2w5klk.274.1).

## The report

'Aligned' is the Greek words that have an English chunk; 'At confidence 0.6 or more' is those whose chunk is sure. The share is of Greek words, not English: many Greek articles have no English article in Brenton, so the share cannot reach 100%.
The Genesis 1 fixture (tests/fixtures/lxx, all 31 verses of Brenton's chapter and TBESG's rows for its lemmas) aligns 630 of 751 words (83.9%); `tests/unit/lxx-align.test.ts` holds the floor at 83%.

<!-- lxx-align:start -->

### Each chapter shipped

| Chapter | Verses | Greek words | Aligned | Aligned share | At confidence 0.6 or more | By the model pass |
| --- | --- | --- | --- | --- | --- | --- |
| Exodus 1 | 22 | 374 | 293 | 78.3% | 49.2% | — |
| Exodus 6 | 30 | 569 | 506 | 88.9% | 64.7% | — |
| Exodus 8 | 32 | 823 | 677 | 82.3% | 54.7% | — |
| Exodus 11 | 10 | 258 | 201 | 77.9% | 55.4% | — |
| Exodus 14 | 31 | 786 | 668 | 85.0% | 54.5% | — |
| Exodus 15 | 27 | 512 | 446 | 87.1% | 57.0% | — |
| Exodus 17 | 16 | 377 | 327 | 86.7% | 61.8% | — |
| Exodus 18 | 27 | 582 | 469 | 80.6% | 55.5% | — |
| Exodus 19 | 25 | 570 | 474 | 83.2% | 57.5% | — |
| Exodus 20 | 26 | 506 | 390 | 77.1% | 49.6% | — |
| Exodus 22 | 31 | 571 | 437 | 76.5% | 48.7% | — |
| Exodus 24 | 18 | 398 | 359 | 90.2% | 64.3% | — |
| Exodus 25 | 40 | 673 | 298 | 44.3% | 25.9% | — |
| Exodus 27 | 21 | 446 | 356 | 79.8% | 48.0% | — |
| Exodus 37 | 21 | 394 | 294 | 74.6% | 48.7% | — |
| Exodus 40 | 32 | 522 | 240 | 46.0% | 21.5% | — |
| Genesis 1 | 31 | 751 | 676 | 90.0% | 65.6% | 47 (6.3%) |
| Genesis 2 | 24 | 516 | 472 | 91.5% | 61.6% | 68 (13.2%) |
| Genesis 3 | 24 | 597 | 553 | 92.6% | 60.0% | 72 (12.1%) |
| Genesis 4 | 26 | 531 | 477 | 89.8% | 60.5% | 70 (13.2%) |
| Genesis 5 | 31 | 467 | 430 | 92.1% | 80.1% | 16 (3.4%) |
| Genesis 6 | 22 | 523 | 474 | 90.6% | 60.8% | 56 (10.7%) |
| Genesis 7 | 24 | 531 | 489 | 92.1% | 64.6% | 58 (10.9%) |
| Genesis 8 | 22 | 520 | 466 | 89.6% | 62.9% | 56 (10.8%) |
| Genesis 9 | 29 | 565 | 526 | 93.1% | 65.0% | 53 (9.4%) |
| Genesis 10 | 32 | 455 | 423 | 93.0% | 69.0% | 25 (5.5%) |
| Genesis 11 | 32 | 601 | 558 | 92.8% | 77.2% | 42 (7.0%) |
| Genesis 12 | 20 | 432 | 344 | 79.6% | 54.6% | — |
| Genesis 13 | 18 | 396 | 308 | 77.8% | 49.2% | — |
| Genesis 15 | 21 | 363 | 305 | 84.0% | 54.3% | — |
| Genesis 16 | 16 | 356 | 278 | 78.1% | 50.3% | — |
| Genesis 17 | 27 | 582 | 455 | 78.2% | 52.4% | — |
| Genesis 18 | 33 | 648 | 527 | 81.3% | 59.1% | — |
| Genesis 19 | 38 | 915 | 731 | 79.9% | 51.8% | — |
| Genesis 20 | 18 | 427 | 340 | 79.6% | 54.6% | — |
| Genesis 21 | 34 | 662 | 540 | 81.6% | 54.5% | — |
| Genesis 22 | 24 | 540 | 412 | 76.3% | 51.9% | — |
| Genesis 23 | 20 | 426 | 344 | 80.8% | 55.6% | — |
| Genesis 24 | 67 | 1,541 | 1,205 | 78.2% | 47.9% | — |
| Genesis 25 | 34 | 627 | 503 | 80.2% | 53.7% | — |
| Genesis 26 | 35 | 758 | 609 | 80.3% | 52.4% | — |
| Genesis 27 | 46 | 1,044 | 832 | 79.7% | 52.3% | — |
| Genesis 28 | 22 | 525 | 429 | 81.7% | 55.0% | — |
| Genesis 29 | 35 | 729 | 595 | 81.6% | 55.4% | — |
| Genesis 30 | 43 | 921 | 709 | 77.0% | 51.9% | — |
| Genesis 31 | 54 | 1,267 | 969 | 76.5% | 49.6% | — |
| Genesis 32 | 32 | 693 | 536 | 77.3% | 49.9% | — |
| Genesis 33 | 20 | 416 | 338 | 81.3% | 53.6% | — |
| Genesis 34 | 31 | 703 | 565 | 80.4% | 52.1% | — |
| Genesis 35 | 29 | 588 | 497 | 84.5% | 58.5% | — |
| Genesis 36 | 43 | 682 | 583 | 85.5% | 53.5% | — |
| Genesis 37 | 36 | 768 | 581 | 75.7% | 46.0% | — |
| Genesis 38 | 30 | 678 | 537 | 79.2% | 49.7% | — |
| Genesis 39 | 23 | 562 | 426 | 75.8% | 49.1% | — |
| Genesis 40 | 23 | 478 | 388 | 81.2% | 50.6% | — |
| Genesis 41 | 57 | 1,153 | 907 | 78.7% | 52.9% | — |
| Genesis 42 | 38 | 801 | 646 | 80.6% | 49.1% | — |
| Genesis 43 | 34 | 801 | 614 | 76.7% | 45.9% | — |
| Genesis 44 | 34 | 760 | 562 | 73.9% | 43.7% | — |
| Genesis 45 | 28 | 611 | 491 | 80.4% | 54.3% | — |
| Genesis 46 | 34 | 672 | 568 | 84.5% | 61.3% | — |
| Genesis 47 | 31 | 839 | 629 | 75.0% | 48.0% | — |
| Genesis 48 | 22 | 560 | 460 | 82.1% | 55.7% | — |
| Genesis 49 | 33 | 573 | 431 | 75.2% | 48.2% | — |
| Genesis 50 | 26 | 559 | 452 | 80.9% | 54.7% | — |
| Psalms 2 | 12 | 164 | 127 | 77.4% | 43.3% | — |
| Psalms 3 | 9 | 108 | 84 | 77.8% | 42.6% | — |
| Psalms 4 | 9 | 129 | 88 | 68.2% | 38.8% | — |
| Psalms 5 | 13 | 201 | 137 | 68.2% | 41.3% | — |
| Psalms 6 | 11 | 147 | 98 | 66.7% | 37.4% | — |
| Psalms 7 | 18 | 255 | 184 | 72.2% | 46.7% | — |
| Psalms 8 | 10 | 134 | 108 | 80.6% | 50.0% | — |
| Psalms 11 | 9 | 126 | 91 | 72.2% | 46.8% | — |
| Psalms 12 | 6 | 99 | 61 | 61.6% | 32.3% | — |
| Psalms 13 | 7 | 167 | 128 | 76.6% | 51.5% | — |
| Psalms 15 | 11 | 171 | 117 | 68.4% | 33.9% | — |
| Psalms 16 | 15 | 236 | 168 | 71.2% | 38.1% | — |
| Psalms 18 | 15 | 220 | 170 | 77.3% | 47.3% | — |
| Psalms 19 | 10 | 127 | 101 | 79.5% | 54.3% | — |
| Psalms 22 | 6 | 104 | 77 | 74.0% | 44.2% | — |
| Psalms 23 | 10 | 153 | 121 | 79.1% | 54.9% | — |
| Psalms 25 | 12 | 145 | 115 | 79.3% | 47.6% | — |
| Psalms 26 | 14 | 262 | 197 | 75.2% | 43.1% | — |
| Psalms 28 | 11 | 134 | 106 | 79.1% | 55.2% | — |
| Psalms 29 | 13 | 189 | 138 | 73.0% | 46.6% | — |
| Psalms 31 | 11 | 189 | 135 | 71.4% | 41.3% | — |
| Psalms 32 | 22 | 269 | 205 | 76.2% | 45.4% | — |
| Psalms 33 | 23 | 285 | 214 | 75.1% | 49.5% | — |
| Psalms 34 | 28 | 403 | 286 | 71.0% | 41.9% | — |
| Psalms 37 | 23 | 316 | 229 | 72.5% | 40.2% | — |
| Psalms 38 | 14 | 230 | 157 | 68.3% | 43.9% | — |
| Psalms 39 | 18 | 327 | 234 | 71.6% | 42.2% | — |
| Psalms 40 | 14 | 193 | 150 | 77.7% | 45.1% | — |
| Psalms 42 | 5 | 115 | 71 | 61.7% | 34.8% | — |
| Psalms 43 | 26 | 373 | 258 | 69.2% | 39.1% | — |
| Psalms 45 | 12 | 156 | 109 | 69.9% | 43.6% | — |
| Psalms 46 | 10 | 106 | 86 | 81.1% | 53.8% | — |
| Psalms 47 | 15 | 187 | 137 | 73.3% | 47.1% | — |
| Psalms 48 | 21 | 292 | 213 | 72.9% | 42.1% | — |
| Psalms 50 | 21 | 284 | 199 | 70.1% | 45.1% | — |
| Psalms 51 | 11 | 162 | 100 | 61.7% | 35.8% | — |
| Psalms 52 | 7 | 117 | 76 | 65.0% | 46.2% | — |
| Psalms 53 | 9 | 117 | 75 | 64.1% | 32.5% | — |
| Psalms 54 | 23 | 326 | 244 | 74.8% | 46.0% | — |
| Psalms 55 | 14 | 203 | 142 | 70.0% | 40.4% | — |
| Psalms 56 | 12 | 198 | 154 | 77.8% | 47.0% | — |
| Psalms 57 | 12 | 156 | 115 | 73.7% | 47.4% | — |
| Psalms 58 | 18 | 284 | 212 | 74.6% | 43.0% | — |
| Psalms 59 | 14 | 185 | 110 | 59.5% | 37.3% | — |
| Psalms 60 | 9 | 119 | 89 | 74.8% | 43.7% | — |
| Psalms 61 | 13 | 193 | 130 | 67.4% | 44.0% | — |
| Psalms 62 | 12 | 170 | 124 | 72.9% | 45.3% | — |
| Psalms 63 | 10 | 121 | 85 | 70.2% | 47.9% | — |
| Psalms 64 | 14 | 187 | 140 | 74.9% | 41.7% | — |
| Psalms 65 | 20 | 270 | 196 | 72.6% | 44.8% | — |
| Psalms 66 | 8 | 93 | 66 | 71.0% | 45.2% | — |
| Psalms 67 | 36 | 528 | 360 | 68.2% | 44.1% | — |
| Psalms 68 | 37 | 532 | 395 | 74.2% | 43.6% | — |
| Psalms 69 | 6 | 85 | 58 | 68.2% | 38.8% | — |
| Psalms 70 | 24 | 377 | 265 | 70.3% | 41.1% | — |
| Psalms 71 | 20 | 292 | 230 | 78.8% | 49.3% | — |
| Psalms 73 | 23 | 326 | 235 | 72.1% | 42.9% | — |
| Psalms 75 | 13 | 162 | 115 | 71.0% | 48.1% | — |
| Psalms 76 | 21 | 273 | 199 | 72.9% | 49.5% | — |
| Psalms 77 | 72 | 994 | 742 | 74.6% | 48.5% | — |
| Psalms 78 | 13 | 230 | 150 | 65.2% | 35.7% | — |
| Psalms 79 | 20 | 263 | 182 | 69.2% | 44.5% | — |
| Psalms 80 | 17 | 219 | 164 | 74.9% | 43.4% | — |
| Psalms 81 | 8 | 85 | 69 | 81.2% | 63.5% | — |
| Psalms 82 | 19 | 222 | 166 | 74.8% | 50.5% | — |
| Psalms 83 | 13 | 207 | 148 | 71.5% | 44.4% | — |
| Psalms 85 | 17 | 262 | 208 | 79.4% | 50.4% | — |
| Psalms 86 | 7 | 85 | 70 | 82.4% | 57.6% | — |
| Psalms 87 | 19 | 258 | 199 | 77.1% | 49.2% | — |
| Psalms 90 | 16 | 202 | 151 | 74.8% | 43.6% | — |
| Psalms 91 | 16 | 196 | 135 | 68.9% | 42.3% | — |
| Psalms 92 | 5 | 78 | 51 | 65.4% | 35.9% | — |
| Psalms 93 | 23 | 268 | 182 | 67.9% | 42.5% | — |
| Psalms 94 | 11 | 167 | 127 | 76.0% | 46.1% | — |
| Psalms 95 | 13 | 196 | 159 | 81.1% | 46.4% | — |
| Psalms 97 | 9 | 128 | 102 | 79.7% | 51.6% | — |
| Psalms 98 | 9 | 141 | 108 | 76.6% | 53.9% | — |
| Psalms 99 | 5 | 74 | 62 | 83.8% | 47.3% | — |
| Psalms 100 | 8 | 123 | 80 | 65.0% | 39.8% | — |
| Psalms 104 | 45 | 518 | 389 | 75.1% | 45.6% | — |
| Psalms 105 | 48 | 610 | 434 | 71.1% | 41.3% | — |
| Psalms 107 | 14 | 176 | 127 | 72.2% | 45.5% | — |
| Psalms 109 | 7 | 100 | 79 | 79.0% | 52.0% | — |
| Psalms 110 | 10 | 130 | 98 | 75.4% | 44.6% | — |
| Psalms 111 | 10 | 132 | 92 | 69.7% | 40.9% | — |
| Psalms 112 | 9 | 90 | 66 | 73.3% | 52.2% | — |
| Psalms 114 | 9 | 102 | 67 | 65.7% | 37.3% | — |
| Psalms 115 | 9 | 81 | 59 | 72.8% | 54.3% | — |
| Psalms 116 | 2 | 28 | 20 | 71.4% | 35.7% | — |
| Psalms 119 | 7 | 74 | 51 | 68.9% | 45.9% | — |
| Psalms 120 | 8 | 95 | 68 | 71.6% | 46.3% | — |
| Psalms 122 | 4 | 69 | 47 | 68.1% | 42.0% | — |
| Psalms 123 | 8 | 100 | 58 | 58.0% | 40.0% | — |
| Psalms 124 | 5 | 82 | 51 | 62.2% | 35.4% | — |
| Psalms 126 | 5 | 83 | 62 | 74.7% | 43.4% | — |
| Psalms 127 | 6 | 84 | 60 | 71.4% | 47.6% | — |
| Psalms 128 | 8 | 88 | 56 | 63.6% | 42.0% | — |
| Psalms 129 | 8 | 84 | 59 | 70.2% | 46.4% | — |
| Psalms 130 | 3 | 57 | 37 | 64.9% | 36.8% | — |
| Psalms 131 | 18 | 231 | 162 | 70.1% | 40.3% | — |
| Psalms 132 | 3 | 59 | 37 | 62.7% | 40.7% | — |
| Psalms 133 | 3 | 44 | 35 | 79.5% | 52.3% | — |
| Psalms 134 | 21 | 248 | 198 | 79.8% | 57.3% | — |
| Psalms 135 | 25 | 326 | 215 | 66.0% | 30.7% | — |
| Psalms 137 | 8 | 141 | 110 | 78.0% | 44.7% | — |
| Psalms 138 | 24 | 323 | 242 | 74.9% | 44.6% | — |
| Psalms 139 | 14 | 179 | 138 | 77.1% | 43.6% | — |
| Psalms 141 | 8 | 132 | 89 | 67.4% | 40.9% | — |
| Psalms 143 | 15 | 231 | 166 | 71.9% | 42.0% | — |
| Psalms 144 | 21 | 302 | 200 | 66.2% | 42.7% | — |
| Psalms 145 | 10 | 131 | 88 | 67.2% | 43.5% | — |
| Psalms 146 | 11 | 147 | 105 | 71.4% | 45.6% | — |
| Psalms 147 | 9 | 108 | 75 | 69.4% | 46.3% | — |
| Psalms 148 | 14 | 168 | 136 | 81.0% | 54.2% | — |
| Psalms 149 | 9 | 110 | 75 | 68.2% | 41.8% | — |
| Psalms 150 | 6 | 67 | 55 | 82.1% | 41.8% | — |
| Psalms 151 | 7 | 116 | 78 | 67.2% | 37.1% | — |

### Each book

| Book | Verses | Greek words | Aligned | Aligned share | At confidence 0.6 or more | By the model pass |
| --- | --- | --- | --- | --- | --- | --- |
| Exodus | 409 | 8,361 | 6,435 | 77.0% | 50.5% | — |
| Genesis | 1,506 | 32,113 | 26,190 | 81.6% | 54.5% | 563 (1.8%) |
| Psalms | 1,641 | 22,716 | 16,453 | 72.4% | 44.4% | — |

182 chapters: 49,078 of 63,190 Greek words aligned (77.7%), 563 of them by the model pass (y `model`); 49,220 of 78,177 English words are in a chunk of Greek (63.0%), the rest are in remainder chunks (y `align?`, waiting for the model pass) or in English the model found no Greek for.

<!-- lxx-align:end -->
