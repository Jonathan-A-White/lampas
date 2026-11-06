# The Septuagint's English aligned to its Greek

Story mw-u2w5klk.274.1 (the Governor's word, 2026-11-05: "Do A - I'd like to see true weave mode asap"). PROVISIONAL, Governor to confirm: every choice below.

The Septuagint chapters are Swete's Greek with Brenton's English (LXX2012), and the build gives a verse's English as one chunk holding every Greek word, so the Weave has nothing to put a Greek word over.
`scripts/lxx/align.ts` cuts Brenton's verse into English chunks and pairs each to the Greek word it renders, in the shape the Old Testament's Weave already reads (`EnglishChunk` and `GreekWord.e` in
`src/data/chapter.ts`, `weaveVerse` in `src/data/weave.ts`). It is deterministic and calls no model; a second run on the same inputs writes the same bytes.

## The commands

- `npm run lxx:ship -- --out dist/data-lxx` aligns every chapter it ships (the Laptop's deploy step, docs/lxx-derivation.md 'The commands'). `npm run data:build:lxx` (public/data-lxx) is unchanged: one chunk a verse.
- `npm run lxx:align [-- --out <dir>] [--no-morpheus] [--build <n>]` is that ship into `<dir>` (a temporary directory by default) and writes the aligned share of each chapter shipped between the markers below.
  Both read the choices under `data/lxx/choices`, so the chapters are the ones the ship ships.

## The shape

A verse's `e` is a list of chunks in English order, and a verse's English words are all in it: the chunks, joined by a space, are Brenton's whole verse.

| Chunk | Fields | Meaning |
| --- | --- | --- |
| Aligned | `t`, `g: [i]`, `s?`, `c`, `y: 'align'` | one English word (with its punctuation) that renders Greek word `i`; `c` is the confidence, 0 to 1 with two decimals; `s: [0]` where Brenton's brackets mark the word supplied |
| Remainder | `t`, `g: []`, `s?`, `y: 'align?'` | a run of English words the aligner could not pair; it is left for the model pass. A verse nothing pairs in is one remainder chunk |

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

## What reads the chunks

The Reader's English view draws each chunk as a tap, so a verse now has several taps; the Septuagint's Weave position still draws the Greek verse alone (`septuagintView`, src/reader/septuagint.ts). The sweep of every reader of a Septuagint verse's `e` is in the story's closing comment (mw-u2w5klk.274.1).

## The report

'Aligned' is the Greek words that have an English chunk; 'At confidence 0.6 or more' is those whose chunk is sure. The share is of Greek words, not English: many Greek articles have no English article in Brenton, so the share cannot reach 100%.
The Genesis 1 fixture (tests/fixtures/lxx, all 31 verses of Brenton's chapter and TBESG's rows for its lemmas) aligns 630 of 751 words (83.9%); `tests/unit/lxx-align.test.ts` holds the floor at 83%.

<!-- lxx-align:start -->

### Each chapter shipped

| Chapter | Verses | Greek words | Aligned | Aligned share | At confidence 0.6 or more |
| --- | --- | --- | --- | --- | --- |
| Genesis 1 | 31 | 751 | 629 | 83.8% | 60.2% |
| Genesis 2 | 24 | 516 | 404 | 78.3% | 52.5% |
| Genesis 3 | 24 | 597 | 481 | 80.6% | 51.9% |
| Genesis 4 | 26 | 531 | 407 | 76.6% | 50.3% |
| Genesis 5 | 31 | 467 | 414 | 88.7% | 77.5% |
| Genesis 6 | 22 | 523 | 418 | 79.9% | 53.3% |
| Genesis 7 | 24 | 531 | 431 | 81.2% | 56.9% |
| Genesis 8 | 22 | 520 | 410 | 78.8% | 55.2% |
| Genesis 9 | 29 | 565 | 473 | 83.7% | 59.1% |
| Genesis 10 | 32 | 455 | 398 | 87.5% | 64.6% |
| Genesis 11 | 32 | 601 | 516 | 85.9% | 71.5% |
| Genesis 12 | 20 | 432 | 344 | 79.6% | 54.6% |
| Genesis 13 | 18 | 396 | 308 | 77.8% | 49.2% |
| Genesis 15 | 21 | 363 | 305 | 84.0% | 54.3% |
| Genesis 16 | 16 | 356 | 278 | 78.1% | 50.3% |
| Genesis 17 | 27 | 582 | 455 | 78.2% | 52.4% |
| Genesis 18 | 33 | 648 | 527 | 81.3% | 59.1% |
| Genesis 19 | 38 | 915 | 731 | 79.9% | 51.8% |
| Genesis 20 | 18 | 427 | 340 | 79.6% | 54.6% |
| Genesis 21 | 34 | 662 | 540 | 81.6% | 54.5% |
| Genesis 22 | 24 | 540 | 357 | 66.1% | 40.9% |
| Genesis 23 | 20 | 426 | 344 | 80.8% | 55.6% |
| Genesis 24 | 67 | 1,541 | 1,205 | 78.2% | 47.9% |
| Genesis 25 | 34 | 627 | 503 | 80.2% | 53.7% |
| Genesis 26 | 35 | 758 | 609 | 80.3% | 52.4% |
| Genesis 27 | 46 | 1,044 | 832 | 79.7% | 52.3% |
| Genesis 28 | 22 | 525 | 429 | 81.7% | 55.0% |
| Genesis 29 | 35 | 729 | 595 | 81.6% | 55.4% |
| Genesis 30 | 43 | 921 | 709 | 77.0% | 51.9% |
| Genesis 31 | 54 | 1,267 | 969 | 76.5% | 49.6% |
| Genesis 32 | 32 | 693 | 536 | 77.3% | 49.9% |
| Genesis 33 | 20 | 416 | 338 | 81.3% | 53.6% |
| Genesis 34 | 31 | 703 | 565 | 80.4% | 52.1% |
| Genesis 35 | 29 | 588 | 497 | 84.5% | 58.5% |
| Genesis 36 | 43 | 682 | 583 | 85.5% | 53.5% |
| Genesis 37 | 36 | 768 | 551 | 71.7% | 42.7% |
| Genesis 38 | 30 | 678 | 537 | 79.2% | 49.7% |
| Genesis 39 | 23 | 562 | 426 | 75.8% | 49.1% |
| Genesis 40 | 23 | 478 | 388 | 81.2% | 50.6% |
| Genesis 41 | 57 | 1,153 | 907 | 78.7% | 52.9% |
| Genesis 42 | 38 | 801 | 646 | 80.6% | 49.1% |
| Genesis 43 | 34 | 801 | 614 | 76.7% | 45.9% |
| Genesis 44 | 34 | 760 | 562 | 73.9% | 43.7% |
| Genesis 45 | 28 | 611 | 491 | 80.4% | 54.3% |
| Genesis 46 | 34 | 672 | 568 | 84.5% | 61.3% |
| Genesis 47 | 31 | 839 | 629 | 75.0% | 48.0% |
| Genesis 48 | 22 | 560 | 460 | 82.1% | 55.7% |
| Genesis 49 | 33 | 573 | 431 | 75.2% | 48.2% |
| Genesis 50 | 26 | 559 | 452 | 80.9% | 54.7% |
| Psalms 2 | 12 | 164 | 127 | 77.4% | 43.3% |
| Psalms 3 | 9 | 108 | 84 | 77.8% | 42.6% |
| Psalms 4 | 9 | 129 | 88 | 68.2% | 38.8% |
| Psalms 5 | 13 | 201 | 137 | 68.2% | 41.3% |
| Psalms 6 | 11 | 147 | 98 | 66.7% | 37.4% |
| Psalms 7 | 18 | 255 | 184 | 72.2% | 46.7% |
| Psalms 8 | 10 | 134 | 108 | 80.6% | 50.0% |
| Psalms 11 | 9 | 126 | 91 | 72.2% | 46.8% |
| Psalms 12 | 6 | 99 | 61 | 61.6% | 32.3% |
| Psalms 13 | 7 | 167 | 128 | 76.6% | 51.5% |
| Psalms 15 | 11 | 171 | 117 | 68.4% | 33.9% |
| Psalms 16 | 15 | 236 | 168 | 71.2% | 38.1% |
| Psalms 18 | 15 | 220 | 170 | 77.3% | 47.3% |
| Psalms 19 | 10 | 127 | 101 | 79.5% | 54.3% |
| Psalms 22 | 6 | 104 | 77 | 74.0% | 44.2% |
| Psalms 23 | 10 | 153 | 121 | 79.1% | 54.9% |
| Psalms 25 | 12 | 145 | 115 | 79.3% | 47.6% |
| Psalms 26 | 14 | 262 | 197 | 75.2% | 43.1% |
| Psalms 28 | 11 | 134 | 106 | 79.1% | 55.2% |
| Psalms 29 | 13 | 189 | 138 | 73.0% | 46.6% |
| Psalms 31 | 11 | 189 | 135 | 71.4% | 41.3% |
| Psalms 32 | 22 | 269 | 205 | 76.2% | 45.4% |
| Psalms 33 | 23 | 285 | 214 | 75.1% | 49.5% |
| Psalms 34 | 28 | 403 | 286 | 71.0% | 41.9% |
| Psalms 37 | 23 | 316 | 229 | 72.5% | 40.2% |
| Psalms 38 | 14 | 230 | 157 | 68.3% | 43.9% |
| Psalms 39 | 18 | 327 | 234 | 71.6% | 42.2% |
| Psalms 40 | 14 | 193 | 150 | 77.7% | 45.1% |
| Psalms 42 | 5 | 115 | 71 | 61.7% | 34.8% |
| Psalms 43 | 26 | 373 | 258 | 69.2% | 39.1% |
| Psalms 45 | 12 | 156 | 109 | 69.9% | 43.6% |
| Psalms 46 | 10 | 106 | 86 | 81.1% | 53.8% |
| Psalms 47 | 15 | 187 | 137 | 73.3% | 47.1% |
| Psalms 48 | 21 | 292 | 213 | 72.9% | 42.1% |
| Psalms 50 | 21 | 284 | 199 | 70.1% | 45.1% |
| Psalms 51 | 11 | 162 | 100 | 61.7% | 35.8% |
| Psalms 52 | 7 | 117 | 76 | 65.0% | 46.2% |
| Psalms 53 | 9 | 117 | 75 | 64.1% | 32.5% |
| Psalms 54 | 23 | 326 | 244 | 74.8% | 46.0% |
| Psalms 55 | 14 | 203 | 142 | 70.0% | 40.4% |
| Psalms 56 | 12 | 198 | 154 | 77.8% | 47.0% |
| Psalms 57 | 12 | 156 | 115 | 73.7% | 47.4% |
| Psalms 58 | 18 | 284 | 212 | 74.6% | 43.0% |
| Psalms 59 | 14 | 185 | 110 | 59.5% | 37.3% |
| Psalms 60 | 9 | 119 | 89 | 74.8% | 43.7% |
| Psalms 61 | 13 | 193 | 130 | 67.4% | 44.0% |
| Psalms 62 | 12 | 170 | 124 | 72.9% | 45.3% |
| Psalms 63 | 10 | 121 | 85 | 70.2% | 47.9% |
| Psalms 64 | 14 | 187 | 140 | 74.9% | 41.7% |
| Psalms 65 | 20 | 270 | 196 | 72.6% | 44.8% |
| Psalms 66 | 8 | 93 | 66 | 71.0% | 45.2% |
| Psalms 67 | 36 | 528 | 360 | 68.2% | 44.1% |
| Psalms 68 | 37 | 532 | 395 | 74.2% | 43.6% |
| Psalms 69 | 6 | 85 | 58 | 68.2% | 38.8% |
| Psalms 70 | 24 | 377 | 265 | 70.3% | 41.1% |
| Psalms 71 | 20 | 292 | 230 | 78.8% | 49.3% |
| Psalms 73 | 23 | 326 | 235 | 72.1% | 42.9% |
| Psalms 75 | 13 | 162 | 115 | 71.0% | 48.1% |
| Psalms 76 | 21 | 273 | 199 | 72.9% | 49.5% |
| Psalms 77 | 72 | 994 | 742 | 74.6% | 48.5% |
| Psalms 78 | 13 | 230 | 150 | 65.2% | 35.7% |
| Psalms 79 | 20 | 263 | 182 | 69.2% | 44.5% |
| Psalms 80 | 17 | 219 | 164 | 74.9% | 43.4% |
| Psalms 81 | 8 | 85 | 69 | 81.2% | 63.5% |
| Psalms 82 | 19 | 222 | 166 | 74.8% | 50.5% |
| Psalms 83 | 13 | 207 | 148 | 71.5% | 44.4% |
| Psalms 85 | 17 | 262 | 208 | 79.4% | 50.4% |
| Psalms 86 | 7 | 85 | 70 | 82.4% | 57.6% |
| Psalms 87 | 19 | 258 | 199 | 77.1% | 49.2% |
| Psalms 90 | 16 | 202 | 151 | 74.8% | 43.6% |
| Psalms 91 | 16 | 196 | 135 | 68.9% | 42.3% |
| Psalms 92 | 5 | 78 | 51 | 65.4% | 35.9% |
| Psalms 93 | 23 | 268 | 182 | 67.9% | 42.5% |
| Psalms 94 | 11 | 167 | 127 | 76.0% | 46.1% |
| Psalms 95 | 13 | 196 | 159 | 81.1% | 46.4% |

### Each book

| Book | Verses | Greek words | Aligned | Aligned share | At confidence 0.6 or more |
| --- | --- | --- | --- | --- | --- |
| Genesis | 1,506 | 32,113 | 25,542 | 79.5% | 52.9% |
| Psalms | 1,159 | 16,404 | 11,917 | 72.6% | 44.5% |

124 chapters: 37,459 of 48,517 Greek words aligned (77.2%); 37,459 of 59,696 English words are in a chunk of Greek (62.7%), the rest are in remainder chunks (y `align?`).

<!-- lxx-align:end -->
