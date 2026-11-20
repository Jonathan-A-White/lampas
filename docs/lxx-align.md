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
- [The unpaired English](#the-unpaired-english)
- [What reads the chunks](#what-reads-the-chunks)
- [The report](#the-report)
  - [Each chapter shipped](#each-chapter-shipped)
  - [Each book](#each-book)

<!-- /toc -->

## The commands

- `npm run lxx:ship -- --out dist/data-lxx` aligns every chapter it ships (the Laptop's deploy step, docs/lxx-derivation.md 'The commands'). `npm run data:build:lxx` (public/data-lxx) is unchanged: one chunk a verse.
- `npm run lxx:align [-- --out <dir>] [--no-morpheus] [--build <n>]` is that ship into `<dir>` (a temporary directory by default) and writes the aligned share of each chapter shipped between the markers below.
  Both read the choices under `data/lxx/choices`, so the chapters are the ones the ship ships, and both apply the model pass's files under `data/lxx/align`.
  Which chapters ship depends on which books have a Morpheus cache (git-ignored; a worktree borrows the Laptop's with `npm run lxx:link`), so [the report](#the-report) opens with the line 'Derived without a Morpheus cache: ...'.
  A run on a host whose books without a cache are other than that line's leaves the report as it was and fails, naming both; `--force` writes it anyway (story mw-u2w5klk.349.24).
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
`tests/unit/lxx-align-choose.test.ts` fails on any such note for Genesis 1 to 11, so a change to the aligner is followed by a rerun of the session for the chapters it touches.

What the pass settled in Genesis 1 to 11 (story mw-u2w5klk.274.2: 297 verses, 1,385 runs, 6,057 Greek words): before it, 4,981 of the words (82.2%) had an English chunk; after it 5,544 (91.5%), 563 of them (9.3%) by the model, and no remainder chunk is left in those chapters.
The words still without English are mostly Greek articles Brenton has no 'the' for, particles, and Greek that Brenton leaves out (Genesis 1:14's 'and to rule the day and the night'). Many remainders render no Greek word at all ('there' in 'there was', 'of' after a noun in the genitive): they are model chunks with no `g`, and the weave leaves them English.
Two limits belong to the aligner, not to this pass, and show in the chunks: a pair the aligner made out of order or by place can be wrong (Genesis 1:7's 'God' sits on the second θεός), and the pass does not touch a pair; and a few LXX2012 verses carry English that belongs to the next Greek verse (Genesis 8:3 and 8:4), which no pairing can fix.
Genesis 20 was done on its own (story mw-u2w5klk.349.2, the Governor's report of 2026-11-10: a tap on 'removed' in Genesis 20:1 opened the Verse view, because 'removed thence' was a remainder with no Greek word): 118 runs, 141 chunks (138 chosen, 3 unsure), 41 Greek words (9.6%) now by the model, 340 of 427 words (79.6%) with English before it and 381 (89.2%) after.
`removed` is paired to ἐκίνησεν, `thence` to ἐκεῖθεν. Of its English content words 53 had no Greek word before (read by hand from `--list`) and 16 have none after, each named in `tests/unit/lxx-align-choose.test.ts` with why: the Greek word that renders it is a pair the aligner made to another English word (the pass does not touch a pair), or Brenton has no Greek word for it (Genesis 20:6's 'Yes,'). A tap on one opens the Verse view, never a wrong word.
`--list` and `--from` number and check the runs at the stage `lxx:ship` applies the rows at (`alignRuns` in `scripts/lxx/align.ts`, which `alignChapter` also starts from: the chapter before the rows and before `joinSupplied`; the command asks the ship for it with `runsOnly`), so a verse with supplied words before a verb ('She will' + 'love') lists the supplied words as a run of their own, as the ship has it (mw-u2w5klk.349.16; before it the listing read the chapter after the join and its numbers were not the ship's).
Genesis 12 to 19 and 21 to 23 were done as one batch (story mw-u2w5klk.349.3; Genesis 14 was left, and is done below): 1,453 runs in ten chapters, 1,453 chunks (1,398 chosen, 55 unsure); of their 5,320 Greek words 672 (12.6%) are now paired by the model (Genesis 12 58, 13 51, 15 43, 16 53, 17 71, 18 96, 19 112, 21 75, 22 52, 23 61), and 4,244 (79.8%) had an English chunk before the pass and 4,916 (92.4%) after it.
The English content words that sat where a tap opened the Verse view were 607 before the pass (`npm run lxx:unpaired -- --book gen`) and are 0 after it; 189 more are settled as rendering no Greek word, each named in `tests/unit/lxx-align-choose.test.ts` in one of three lists with why: the 14 of 'it came to pass' (ἐγένετο is a pair the aligner made to one English word), the 14 of two verses that carry the next Greek verse's English (Genesis 13:11, 22:15), and the 161 whose Greek word is a pair the aligner made to another English word or that Brenton adds to make English of a Greek phrase ('forth', 'aside', 'fine', 'aloud').
Genesis 14 was done on its own (story mw-u2w5klk.349.23; the first pass left it, `npm run lxx:unpaired -- --book gen` listed it with 50 unpaired English content words and it had no file in `data/lxx/align`): 136 runs, 144 chunks (139 chosen, 5 unsure); of its 522 Greek words 51 (9.8%) are now paired by the model, and 441 (84.5%) had an English chunk before the pass and 492 (94.3%) after it; the English content words where a tap opened the Verse view were 50 before the pass and are 0 after it, and 24 more are settled as rendering no Greek word, each named in `tests/unit/lxx-align-choose.test.ts` with why (the 3 of 'it came to pass' and 'he came upon', and the 21 whose Greek word is a pair the aligner made to another English word: 'most' of 'the most high God' beside ὕψιστος's 'high', 'fled' of 14:10 on 'country.', 'recovered' of 14:16 on 'nephew,').
Genesis 24 to 29 were done as one batch (story mw-u2w5klk.349.4): 1,400 runs in six chapters, 1,504 chunks (1,458 chosen, 46 unsure); of their 5,224 Greek words 701 (13.4%) are now paired by the model (Genesis 24 240, 25 68, 26 125, 27 117, 28 63, 29 88), and 4,173 (79.9%) had an English chunk before the pass and 4,874 (93.3%) after it.
The English content words that sat where a tap opened the Verse view were 566 before the pass (`npm run lxx:unpaired -- --book gen`) and are 0 after it; 187 more are settled as rendering no Greek word, each named in `tests/unit/lxx-align-choose.test.ts` in one of three lists with why: the 26 of 'it came to pass' (ἐγένετο is a pair the aligner made to one English word), the 19 of English whose Greek is in the verse before or after or that the Greek verse does not have (Genesis 24:18 'till', 25:20 'Abraam begot Isaac', 27:44 'until your brother's anger', 27:38 and 29:20), and the 142 whose Greek word is a pair the aligner made to another English word ('master' for Κύριος, 'draw' for ὑδρεύσατο) or that Brenton adds to make English of a Greek phrase ('instead', 'just', 'hither', 'forth', 'away').
Genesis 30 to 36 were done as one batch (story mw-u2w5klk.349.5): 1,385 runs in seven chapters, 1,590 chunks (1,568 chosen, 22 unsure); of their 5,270 Greek words 663 (12.6%) are now paired by the model (Genesis 30 106, 31 179, 32 116, 33 56, 34 85, 35 57, 36 64), and 4,197 (79.6%) had an English chunk before the pass and 4,860 (92.2%) after it.
The English content words that sat where a tap opened the Verse view were 584 before the pass (`npm run lxx:unpaired -- --book gen`) and are 0 after it; 167 more are settled as rendering no Greek word, each named in `tests/unit/lxx-align-choose.test.ts` in one of three lists with why: the 17 of 'it came to pass' (ἐγένετο is a pair the aligner made to one English word), the 21 of English whose Greek is in the verse before or after or that the Greek verse does not have (Genesis 31:51 is a whole verse with no Greek, 31:50 and 31:53 share a clause, 36:18's 'daughter of Ana, wife of Esau'), and the 129 whose Greek word is a pair the aligner made to another English word (Genesis 30:37's 'storax tree', 'plane', 'stripes' are crossed with their Greek neighbours) or that Brenton adds to make English of a Greek phrase ('forth', 'away', 'back', 'hard', 'very').
A fix of the aligner's own pair (story mw-u2w5klk.349.32; the Governor's 'removed', Genesis 13:18): the model pass re-chooses remainders and never a pair, but the aligner's gloss match gives a Greek word to the wrong English word of its phrase ('tent,' to ἀποσκηνώσας, 'up' to ἀναβλέψας and ἀνήνεγκεν, κυρίαν to 'Return', 'offering' to ὁλοκάρπωσιν), so the word that renders it had no Greek and a tap on it opened the Verse view or a neighbour's word. A row whose `run` is `fix` in the same file (`Gen.13:18<TAB>fix<TAB>having removed his tent,<TAB>1<TAB><TAB>0.80`) names English words of the verse, as they read in a row of its chunks (after the runs, before `joinSupplied`), and the Greek positions they render: those chunks become ONE model chunk holding those words (`g` `-`: a chunk that renders no Greek), and each Greek word's `e` follows its chunk.
`applyFixes` (`scripts/lxx/align-choose.ts`) applies a verse's fixes together and keeps the verse as the model pass left it, naming it in the ship's notes as stale, when a fix finds its words no longer in the chunks (or in two places), puts a Greek word in two chunks, or leaves a Greek word that had English with none. The words must begin and end at chunk boundaries of the verse after the model pass (a remainder run cut as 'money shall' cannot be cut after 'money'). `lxx:align-choose --from` writes the runs of a session's file and keeps the fix rows the chapter's file already holds, after the runs (mw-u2w5klk.349.39).
The 58 content words of Genesis 12 to 18 and 22 that this moved from no Greek word to one (the 189 named in the batch above are 133 now; 'God' in 17:19 and 'came' in 12:11 moved the other way, to a name of their own) include 13:18 'removed' (the whole 'having removed his tent,' is ἀποσκηνώσας's), 16:9 'Return' (Ἀποστράφηθι) and 'mistress,' (κυρίαν), 18:2, 22:4 and 22:13 'lifted up' (ἀναβλέψας), 22:13 'offered' (ἀνήνεγκεν) and 'a whole burnt offering' (ὁλοκάρπωσιν, also 22:2, 3, 6, 7 and 8). Genesis 15, 19, 21 and 23 were not swept (the Morpheus cache that a sweep needs is not on the host this story ran on); their lists in `tests/unit/lxx-align-choose.test.ts` are as they were.
The low-confidence pairs of Genesis 24 to 29 (story mw-u2w5klk.349.33; the Tester's four of mw-u2w5klk.349.4: a tap on 'it' of 24:15, 'well.' of 29:6, 'departed;' of 25:34 and 'Peradventure' of 27:12 opened αὐτῆς, λαλοῦντος, ἐφαύλισεν and ψηλαφήσῃ): the aligner's pairs by place (c 0.3 to 0.5, step 5 above) are the ones that can sit on the wrong Greek word. `placePairs` of `tests/unit/lxx-align-low-confidence.test.ts` lists the aligner's chunks of a chapter with c below 0.6 whose Greek word is a noun, adjective, verb or adverb and whose English neither the gloss nor the definition of its lemma in the shipped lexicon says (the lead chunks of supplied words, 'I will', are left out). Genesis 24 to 29 had 212; 33 of them were wrong and are moved, with the pairs that came with them, by 65 `fix` rows in `data/lxx/align/gen-24` to `gen-29` (the four above among them: 'it came to pass' is ἐγένετο's, 'is well.' Ὑγιαίνει.'s, 'departed;' ᾤχετο's, 'Peradventure' μή ποτε's), and the 179 left (180 with 29:26 'younger' on νεωτέραν, which the lexicon has no entry for and which is right) were read by hand against the verse and are named in that test, which fails on a pair it does not name and on a name no chunk has. `lxx:align-choose --list` shows an aligner pair that a fix row of the chapter's file moves on the Greek positions the fix gives and marks it `fix` (`Peradventure⟨0,1 fix⟩`, never a remainder, so the run numbers are the ship's); a fix whose words take in a remainder is not shown, because only the ship has the model's chunks. What this does not cover: the pairs of function words (a 'my' on the wrong μου, a 'he' on the wrong αὐτοῦ) and a pair made by gloss that is wrong in its phrase (24:14 'water-pot,' on ποτιῶ), and Genesis 12 to 23, where `placePairs` finds some 200 by place and nobody has read them (a later story). Genesis 30 to 36 are next.
The low-confidence pairs of Genesis 30 to 36 (story mw-u2w5klk.349.36; the Tester's finding on mw-u2w5klk.349.5: a tap on 'pillar.' of 31:52, 'offered' of 31:54, 'considered' and 'strangers' of 31:15, 'wrought' and 'foolishly.' of 31:28, 'jealous' of 30:1 and 'many' and 'cattle,' of 30:43 opened κακίᾳ, Ἰσαάκ, each other's Greek word, Ῥαχήλ and each other's): the same sweep as Genesis 24 to 29. `placePairs` found 251 pairs by place in the seven chapters; 36 were wrong and are moved, with the pairs that came with them, by 61 `fix` rows in `data/lxx/align/gen-30` to `gen-36` ('pillar.' is στήλην's, 'offered' ἔθυσεν's, 'jealous' ἐζήλωσεν's, 'wrought' ἔπραξας's and 'foolishly.' ἀφρόνως's, 'many' πολλά's, 'cattle,' κτήνη's, 'depart' of 31:49 ἀποστησόμεθα's, 'man' of 34:7 Συχέμ's and 'folly' ἄσχημον's), and the 216 left were read by hand against the verse (a host with the Morpheus cache finds 252 by place, one more than the 251 first counted: 31:30 'way,' on πεπόρευσαι, 'go on your way', is right) and are named in `tests/unit/lxx-align-low-confidence.test.ts`, which fails on a pair it does not name and on a name no chunk has. 14 English content words that had no Greek word have one now (the unpaired lists of `tests/unit/lxx-align-choose.test.ts` read 153, not 167). A fix whose Greek word was the other English word's gives that word a Greek word of its own (31:54's Ἰσαάκ, which Swete has in the verse and Brenton in 31:53, stays with 'he').
The rest of the shipped chapters are still to do, one chapter a command: `npm run lxx:align-choose -- --list --book <code> --chapter <n>`, then `--from <file>`. They are Genesis 37 to 50 (14 chapters), Exodus (16 chapters, 2,294 runs) and the Psalms (117 chapters, 7,323 runs); the Morpheus cache a worktree borrows (`npm run lxx:link`) must be there for the chapter, or `--list` says it is not a shipped chapter.

## The unpaired English

Story mw-u2w5klk.349.1, the sweep of the pairing epic (mw-u2w5klk.349; the Governor's report of 2026-11-10: he tapped 'removed' in Genesis 20:1 and got the Verse view). The Reader opens a Greek word from a tap on an English chunk only where the chunk names one (`septuagintChunkLinked`, src/reader/septuagint.ts);
`npm run lxx:unpaired` counts the English that is left where it does not. It runs the ship as `lxx:align` does (the choices and the model pass's files under `data/lxx/align`), reads the chapters the ship wrote, and prints a table, a row for each chapter shipped and the book's `total` after its chapters, books in the Old Testament's order; `--book gen` counts one book.

| Column | Meaning |
| --- | --- |
| English content words | the words of Brenton's English that are not function words (`FUNCTION_WORDS` in `scripts/lxx/unpaired.ts`: and, the, of, to, a, that, in, is, was, for, he, his, the pronouns, the prepositions, 'be', 'have', 'do' and their forms, Brenton's thou, thy, hath, unto); a word is its letters, so 'Abraham's' is 'abraham' |
| Unpaired | the content words in a remainder chunk (`y: 'align?'`) or in a chunk with no Greek word that is not the model's (`g` empty, or no `y` at all, the one chunk a verse that `data:build:lxx` makes): a tap on one opens the Verse view. These are the gaps the epic is to close |
| No Greek by the model | the content words in a model chunk (`y: 'model'`) whose `g` is empty: a session settled that they render no Greek word. Counted apart, not a gap. Some are English whose Greek word the aligner paired to another English word, which the pass does not touch (the 16 of Genesis 20 listed in `tests/unit/lxx-align-choose.test.ts`) |
| Share | Unpaired over English content words |

The command reports and does not fail on a gap. A later story makes a gap a failing test once the model batches have finished a book. `tests/unit/lxx-unpaired.test.ts` holds the function-word list, the counting on a fixture verse with a known remainder, the table, and (where the git-ignored sources are on the disk, as `lxx-align-choose.test.ts`)
the real Genesis 1 to 11, which read 0 unpaired. Read the table by the Share: it is the sweep's measure before and after each batch. At this story Genesis 37 to 50, Exodus, Leviticus, Numbers, Deuteronomy, Joshua, the Psalms and Isaiah, as the ship ships them, read between 10% and 35% a chapter; Genesis 12 to 13, 15 to 23 read 0 (mw-u2w5klk.349.3), Genesis 24 to 29 read 0 after mw-u2w5klk.349.4, and Genesis 30 to 36 after mw-u2w5klk.349.5.

## What reads the chunks

The Reader's English view draws each chunk as a tap, so a verse now has several taps (a model chunk with no Greek is a tap like any other). A chapter whose verses carry aligned chunks (`septuagintAligned`, src/reader/septuagint.ts: some chunk with `y: 'align'` and a word in `g`) is woven in the Weave position as the New Testament is (mw-u2w5klk.274.3: `septuagintSettings` leaves `weaveShown` as the settings have it, so the Greek dial, the weave order and the woven reading check follow); a chapter with none (`data:build:lxx`'s one chunk a verse) keeps the Weave position as the Greek verse alone with the once-only note that the Weave is off (`septuagintView`, `septuagintWeaveNoted`). The sweep of every reader of a Septuagint verse's `e` is in the story's closing comment (mw-u2w5klk.274.1).

## The report

'Aligned' is the Greek words that have an English chunk; 'At confidence 0.6 or more' is those whose chunk is sure. The share is of Greek words, not English: many Greek articles have no English article in Brenton, so the share cannot reach 100%.
The Genesis 1 fixture (tests/fixtures/lxx, all 31 verses of Brenton's chapter and TBESG's rows for its lemmas) aligns 630 of 751 words (83.9%); `tests/unit/lxx-align.test.ts` holds the floor at 83%.

<!-- lxx-align:start -->

Derived without a Morpheus cache: amo, exo, hos, isa, joe, mic, oba, psa.

### Each chapter shipped

| Chapter | Verses | Greek words | Aligned | Aligned share | At confidence 0.6 or more | By the model pass |
| --- | --- | --- | --- | --- | --- | --- |
| Amos 1 | 15 | 344 | 279 | 81.1% | 57.0% | — |
| Amos 2 | 16 | 365 | 280 | 76.7% | 49.9% | — |
| Amos 3 | 15 | 309 | 221 | 71.5% | 50.5% | — |
| Amos 4 | 13 | 332 | 250 | 75.3% | 52.1% | — |
| Amos 5 | 27 | 495 | 384 | 77.6% | 55.6% | — |
| Amos 6 | 14 | 288 | 162 | 56.3% | 35.8% | — |
| Amos 7 | 17 | 351 | 270 | 76.9% | 55.8% | — |
| Amos 8 | 14 | 296 | 219 | 74.0% | 51.4% | — |
| Deuteronomy 1 | 46 | 987 | 777 | 78.7% | 54.3% | — |
| Deuteronomy 2 | 37 | 834 | 653 | 78.3% | 50.7% | — |
| Deuteronomy 3 | 29 | 703 | 545 | 77.5% | 53.1% | — |
| Deuteronomy 4 | 49 | 1,245 | 980 | 78.7% | 54.5% | — |
| Deuteronomy 5 | 33 | 769 | 593 | 77.1% | 53.4% | — |
| Deuteronomy 6 | 25 | 538 | 402 | 74.7% | 53.3% | — |
| Deuteronomy 7 | 26 | 699 | 524 | 75.0% | 49.1% | — |
| Deuteronomy 8 | 20 | 480 | 365 | 76.0% | 52.1% | — |
| Deuteronomy 9 | 29 | 788 | 652 | 82.7% | 56.5% | — |
| Deuteronomy 10 | 22 | 504 | 421 | 83.5% | 56.0% | — |
| Deuteronomy 11 | 32 | 806 | 631 | 78.3% | 48.0% | — |
| Deuteronomy 12 | 32 | 868 | 651 | 75.0% | 48.5% | — |
| Deuteronomy 13 | 18 | 484 | 382 | 78.9% | 50.0% | — |
| Deuteronomy 14 | 28 | 535 | 314 | 58.7% | 31.8% | — |
| Deuteronomy 16 | 22 | 558 | 449 | 80.5% | 51.4% | — |
| Deuteronomy 17 | 20 | 524 | 410 | 78.2% | 48.3% | — |
| Deuteronomy 18 | 22 | 465 | 348 | 74.8% | 45.4% | — |
| Deuteronomy 19 | 21 | 531 | 401 | 75.5% | 49.0% | — |
| Deuteronomy 20 | 20 | 495 | 385 | 77.8% | 47.9% | — |
| Deuteronomy 21 | 23 | 547 | 446 | 81.5% | 50.1% | — |
| Deuteronomy 22 | 30 | 664 | 516 | 77.7% | 44.4% | — |
| Deuteronomy 23 | 25 | 462 | 359 | 77.7% | 47.2% | — |
| Deuteronomy 24 | 22 | 516 | 395 | 76.6% | 48.4% | — |
| Deuteronomy 25 | 19 | 408 | 313 | 76.7% | 46.8% | — |
| Deuteronomy 26 | 19 | 527 | 429 | 81.4% | 54.1% | — |
| Deuteronomy 27 | 26 | 476 | 395 | 83.0% | 60.3% | — |
| Deuteronomy 28 | 68 | 1,607 | 1,229 | 76.5% | 49.6% | — |
| Deuteronomy 29 | 29 | 700 | 525 | 75.0% | 51.4% | — |
| Deuteronomy 30 | 20 | 589 | 463 | 78.6% | 52.1% | — |
| Deuteronomy 32 | 52 | 971 | 776 | 79.9% | 52.1% | — |
| Deuteronomy 33 | 29 | 551 | 435 | 78.9% | 55.5% | — |
| Deuteronomy 34 | 12 | 246 | 198 | 80.5% | 60.6% | — |
| Exodus 1 | 22 | 374 | 293 | 78.3% | 49.2% | — |
| Exodus 6 | 30 | 569 | 506 | 88.9% | 64.7% | — |
| Exodus 8 | 32 | 823 | 677 | 82.3% | 54.7% | — |
| Exodus 14 | 31 | 786 | 668 | 85.0% | 54.3% | — |
| Exodus 15 | 27 | 512 | 446 | 87.1% | 57.0% | — |
| Exodus 17 | 16 | 377 | 327 | 86.7% | 61.5% | — |
| Exodus 18 | 27 | 582 | 469 | 80.6% | 55.5% | — |
| Exodus 19 | 25 | 570 | 474 | 83.2% | 57.5% | — |
| Exodus 20 | 26 | 506 | 390 | 77.1% | 49.6% | — |
| Exodus 22 | 31 | 571 | 437 | 76.5% | 48.7% | — |
| Exodus 24 | 18 | 398 | 359 | 90.2% | 64.3% | — |
| Exodus 25 | 40 | 673 | 298 | 44.3% | 25.9% | — |
| Exodus 27 | 21 | 446 | 356 | 79.8% | 48.0% | — |
| Exodus 35 | 35 | 571 | 393 | 68.8% | 43.1% | — |
| Exodus 37 | 21 | 394 | 294 | 74.6% | 48.7% | — |
| Exodus 39 | 23 | 443 | 365 | 82.4% | 44.9% | — |
| Exodus 40 | 32 | 522 | 240 | 46.0% | 21.5% | — |
| Genesis 1 | 31 | 751 | 676 | 90.0% | 65.6% | 47 (6.3%) |
| Genesis 2 | 24 | 516 | 472 | 91.5% | 61.6% | 68 (13.2%) |
| Genesis 3 | 24 | 597 | 553 | 92.6% | 60.0% | 72 (12.1%) |
| Genesis 4 | 26 | 531 | 477 | 89.8% | 60.5% | 70 (13.2%) |
| Genesis 5 | 31 | 467 | 430 | 92.1% | 80.1% | 16 (3.4%) |
| Genesis 6 | 22 | 523 | 474 | 90.6% | 60.8% | 56 (10.7%) |
| Genesis 7 | 24 | 531 | 489 | 92.1% | 64.4% | 58 (10.9%) |
| Genesis 8 | 22 | 520 | 466 | 89.6% | 62.9% | 56 (10.8%) |
| Genesis 9 | 29 | 565 | 526 | 93.1% | 65.0% | 53 (9.4%) |
| Genesis 10 | 32 | 455 | 423 | 93.0% | 69.0% | 25 (5.5%) |
| Genesis 11 | 32 | 601 | 558 | 92.8% | 77.2% | 42 (7.0%) |
| Genesis 12 | 20 | 432 | 404 | 93.5% | 66.9% | 69 (16.0%) |
| Genesis 13 | 18 | 396 | 359 | 90.7% | 60.9% | 54 (13.6%) |
| Genesis 14 | 24 | 522 | 492 | 94.3% | 66.3% | 51 (9.8%) |
| Genesis 15 | 21 | 363 | 348 | 95.9% | 65.6% | 43 (11.8%) |
| Genesis 16 | 16 | 356 | 332 | 93.3% | 64.0% | 57 (16.0%) |
| Genesis 17 | 27 | 582 | 526 | 90.4% | 64.1% | 82 (14.1%) |
| Genesis 18 | 33 | 648 | 623 | 96.1% | 73.3% | 109 (16.8%) |
| Genesis 19 | 38 | 915 | 843 | 92.1% | 63.0% | 112 (12.2%) |
| Genesis 20 | 18 | 427 | 381 | 89.2% | 63.5% | 41 (9.6%) |
| Genesis 21 | 34 | 662 | 615 | 92.9% | 64.8% | 75 (11.3%) |
| Genesis 22 | 24 | 540 | 464 | 85.9% | 61.3% | 65 (12.0%) |
| Genesis 23 | 20 | 426 | 405 | 95.1% | 68.3% | 61 (14.3%) |
| Genesis 24 | 67 | 1,541 | 1,445 | 93.8% | 62.6% | 240 (15.6%) |
| Genesis 25 | 34 | 627 | 571 | 91.1% | 63.8% | 68 (10.8%) |
| Genesis 26 | 35 | 758 | 734 | 96.8% | 67.9% | 125 (16.5%) |
| Genesis 27 | 46 | 1,044 | 949 | 90.9% | 63.1% | 117 (11.2%) |
| Genesis 28 | 22 | 525 | 492 | 93.7% | 65.9% | 63 (12.0%) |
| Genesis 29 | 35 | 729 | 683 | 93.7% | 66.0% | 88 (12.1%) |
| Genesis 30 | 43 | 921 | 815 | 88.5% | 62.0% | 106 (11.5%) |
| Genesis 31 | 55 | 1,267 | 1,148 | 90.6% | 63.2% | 179 (14.1%) |
| Genesis 32 | 32 | 693 | 652 | 94.1% | 65.8% | 116 (16.7%) |
| Genesis 33 | 20 | 416 | 394 | 94.7% | 66.8% | 56 (13.5%) |
| Genesis 34 | 31 | 703 | 650 | 92.5% | 63.6% | 85 (12.1%) |
| Genesis 35 | 29 | 588 | 554 | 94.2% | 68.2% | 57 (9.7%) |
| Genesis 36 | 43 | 682 | 647 | 94.9% | 62.9% | 64 (9.4%) |
| Genesis 37 | 36 | 768 | 581 | 75.7% | 45.8% | — |
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
| Hosea 1 | 11 | 263 | 223 | 84.8% | 58.2% | — |
| Hosea 5 | 15 | 286 | 213 | 74.5% | 48.3% | — |
| Hosea 6 | 11 | 168 | 126 | 75.0% | 50.0% | — |
| Isaiah 2 | 21 | 436 | 344 | 78.9% | 51.4% | — |
| Isaiah 3 | 26 | 491 | 309 | 62.9% | 36.9% | — |
| Isaiah 4 | 6 | 140 | 109 | 77.9% | 62.1% | — |
| Isaiah 5 | 30 | 666 | 465 | 69.8% | 49.7% | — |
| Isaiah 6 | 13 | 307 | 238 | 77.5% | 56.7% | — |
| Isaiah 7 | 25 | 505 | 398 | 78.8% | 57.2% | — |
| Isaiah 8 | 22 | 475 | 371 | 78.1% | 53.5% | — |
| Isaiah 12 | 6 | 110 | 87 | 79.1% | 47.3% | — |
| Isaiah 15 | 9 | 186 | 148 | 79.6% | 48.9% | — |
| Isaiah 18 | 7 | 184 | 138 | 75.0% | 54.9% | — |
| Isaiah 23 | 18 | 305 | 231 | 75.7% | 50.2% | — |
| Isaiah 24 | 23 | 392 | 309 | 78.8% | 49.7% | — |
| Isaiah 25 | 12 | 231 | 174 | 75.3% | 50.6% | — |
| Isaiah 26 | 21 | 361 | 264 | 73.1% | 44.9% | — |
| Isaiah 28 | 29 | 552 | 404 | 73.2% | 46.2% | — |
| Isaiah 29 | 24 | 548 | 406 | 74.1% | 50.4% | — |
| Isaiah 31 | 9 | 237 | 179 | 75.5% | 54.4% | — |
| Isaiah 37 | 38 | 817 | 671 | 82.1% | 55.1% | — |
| Isaiah 38 | 22 | 436 | 347 | 79.6% | 53.0% | — |
| Isaiah 40 | 31 | 529 | 397 | 75.0% | 48.0% | — |
| Isaiah 41 | 29 | 557 | 437 | 78.5% | 54.4% | — |
| Isaiah 46 | 13 | 243 | 178 | 73.3% | 51.4% | — |
| Isaiah 52 | 15 | 300 | 235 | 78.3% | 52.0% | — |
| Isaiah 55 | 13 | 305 | 239 | 78.4% | 48.2% | — |
| Isaiah 56 | 11 | 251 | 191 | 76.1% | 48.2% | — |
| Isaiah 63 | 19 | 397 | 308 | 77.6% | 50.1% | — |
| Isaiah 64 | 12 | 216 | 150 | 69.4% | 47.7% | — |
| Judges 1 | 36 | 936 | 716 | 76.5% | 46.6% | — |
| Judges 2 | 23 | 584 | 445 | 76.2% | 50.0% | — |
| Judges 3 | 31 | 756 | 601 | 79.5% | 54.4% | — |
| Judges 4 | 24 | 657 | 552 | 84.0% | 60.0% | — |
| Joel 1 | 20 | 356 | 262 | 73.6% | 44.7% | — |
| Joel 2 | 32 | 768 | 602 | 78.4% | 51.4% | — |
| Joel 3 | 21 | 449 | 351 | 78.2% | 46.3% | — |
| Jonah 1 | 16 | 395 | 315 | 79.7% | 49.4% | — |
| Jonah 2 | 11 | 184 | 139 | 75.5% | 47.8% | — |
| Jonah 3 | 10 | 237 | 182 | 76.8% | 52.3% | — |
| Jonah 4 | 11 | 264 | 203 | 76.9% | 54.5% | — |
| Joshua 1 | 18 | 440 | 333 | 75.7% | 49.8% | — |
| Joshua 2 | 24 | 582 | 476 | 81.8% | 50.9% | — |
| Joshua 3 | 17 | 440 | 361 | 82.0% | 53.0% | — |
| Joshua 4 | 24 | 542 | 416 | 76.8% | 53.1% | — |
| Joshua 5 | 15 | 384 | 288 | 75.0% | 45.8% | — |
| Joshua 6 | 27 | 617 | 470 | 76.2% | 48.9% | — |
| Joshua 7 | 26 | 644 | 506 | 78.6% | 51.4% | — |
| Joshua 8 | 29 | 647 | 505 | 78.1% | 50.5% | — |
| Joshua 13 | 32 | 707 | 565 | 79.9% | 54.0% | — |
| Joshua 16 | 10 | 238 | 203 | 85.3% | 57.6% | — |
| Joshua 17 | 18 | 473 | 371 | 78.4% | 54.1% | — |
| Joshua 18 | 28 | 554 | 442 | 79.8% | 52.5% | — |
| Joshua 19 | 51 | 778 | 611 | 78.5% | 56.0% | — |
| Joshua 22 | 34 | 1,044 | 829 | 79.4% | 53.2% | — |
| Joshua 23 | 16 | 448 | 309 | 69.0% | 46.4% | — |
| Joshua 24 | 33 | 1,002 | 780 | 77.8% | 52.1% | — |
| Leviticus 1 | 17 | 400 | 336 | 84.0% | 47.5% | — |
| Leviticus 2 | 16 | 317 | 265 | 83.6% | 56.2% | — |
| Leviticus 3 | 17 | 386 | 306 | 79.3% | 45.3% | — |
| Leviticus 4 | 35 | 895 | 726 | 81.1% | 45.8% | — |
| Leviticus 5 | 19 | 497 | 373 | 75.1% | 45.3% | — |
| Leviticus 6 | 40 | 828 | 650 | 78.5% | 47.7% | — |
| Leviticus 7 | 28 | 562 | 429 | 76.3% | 44.7% | — |
| Leviticus 8 | 36 | 895 | 615 | 68.7% | 40.2% | — |
| Leviticus 9 | 24 | 520 | 453 | 87.1% | 55.6% | — |
| Leviticus 10 | 20 | 529 | 428 | 80.9% | 56.1% | — |
| Leviticus 11 | 47 | 927 | 745 | 80.4% | 50.5% | — |
| Leviticus 12 | 8 | 193 | 152 | 78.8% | 52.8% | — |
| Leviticus 13 | 59 | 1,493 | 1,145 | 76.7% | 44.8% | — |
| Leviticus 14 | 57 | 1,333 | 1,069 | 80.2% | 48.5% | — |
| Leviticus 15 | 33 | 794 | 575 | 72.4% | 48.0% | — |
| Leviticus 16 | 34 | 916 | 728 | 79.5% | 44.5% | — |
| Leviticus 17 | 16 | 452 | 355 | 78.5% | 46.5% | — |
| Leviticus 18 | 30 | 528 | 376 | 71.2% | 42.0% | — |
| Leviticus 19 | 37 | 697 | 519 | 74.5% | 46.2% | — |
| Leviticus 20 | 27 | 618 | 437 | 70.7% | 47.2% | — |
| Leviticus 21 | 24 | 455 | 339 | 74.5% | 46.4% | — |
| Leviticus 22 | 33 | 672 | 529 | 78.7% | 48.2% | — |
| Leviticus 23 | 44 | 864 | 696 | 80.6% | 55.3% | — |
| Leviticus 24 | 23 | 400 | 319 | 79.8% | 55.5% | — |
| Leviticus 25 | 55 | 1,185 | 906 | 76.5% | 44.9% | — |
| Leviticus 26 | 46 | 1,002 | 740 | 73.9% | 47.4% | — |
| Leviticus 27 | 34 | 684 | 521 | 76.2% | 44.9% | — |
| Micah 1 | 16 | 320 | 257 | 80.3% | 53.1% | — |
| Micah 2 | 13 | 289 | 216 | 74.7% | 43.9% | — |
| Micah 3 | 12 | 292 | 212 | 72.6% | 46.9% | — |
| Micah 5 | 15 | 332 | 256 | 77.1% | 53.6% | — |
| Micah 6 | 16 | 334 | 256 | 76.6% | 54.5% | — |
| Micah 7 | 20 | 430 | 317 | 73.7% | 44.2% | — |
| Numbers 1 | 54 | 991 | 802 | 80.9% | 52.7% | — |
| Numbers 2 | 34 | 511 | 417 | 81.6% | 53.8% | — |
| Numbers 3 | 51 | 950 | 793 | 83.5% | 50.9% | — |
| Numbers 4 | 49 | 1,108 | 876 | 79.1% | 48.5% | — |
| Numbers 5 | 31 | 714 | 571 | 80.0% | 49.9% | — |
| Numbers 6 | 27 | 549 | 434 | 79.1% | 51.4% | — |
| Numbers 7 | 89 | 1,391 | 1,253 | 90.1% | 62.0% | — |
| Numbers 8 | 26 | 502 | 416 | 82.9% | 51.8% | — |
| Numbers 9 | 23 | 508 | 361 | 71.1% | 42.5% | — |
| Numbers 10 | 36 | 613 | 492 | 80.3% | 52.9% | — |
| Numbers 11 | 35 | 827 | 696 | 84.2% | 56.6% | — |
| Numbers 12 | 15 | 277 | 233 | 84.1% | 60.3% | — |
| Numbers 13 | 34 | 573 | 500 | 87.3% | 56.7% | — |
| Numbers 14 | 45 | 966 | 762 | 78.9% | 50.0% | — |
| Numbers 15 | 41 | 783 | 582 | 74.3% | 46.1% | — |
| Numbers 16 | 50 | 1,040 | 866 | 83.3% | 57.1% | — |
| Numbers 17 | 13 | 266 | 226 | 85.0% | 57.9% | — |
| Numbers 18 | 32 | 813 | 646 | 79.5% | 47.0% | — |
| Numbers 19 | 22 | 534 | 439 | 82.2% | 55.8% | — |
| Numbers 20 | 29 | 631 | 516 | 81.8% | 56.4% | — |
| Numbers 21 | 35 | 745 | 570 | 76.5% | 51.8% | — |
| Numbers 22 | 41 | 948 | 770 | 81.2% | 54.4% | — |
| Numbers 23 | 30 | 596 | 494 | 82.9% | 58.6% | — |
| Numbers 24 | 25 | 464 | 371 | 80.0% | 59.3% | — |
| Numbers 25 | 18 | 335 | 282 | 84.2% | 57.6% | — |
| Numbers 26 | 65 | 980 | 805 | 82.1% | 46.1% | — |
| Numbers 27 | 23 | 500 | 377 | 75.4% | 49.4% | — |
| Numbers 28 | 31 | 533 | 361 | 67.7% | 45.6% | — |
| Numbers 29 | 39 | 755 | 506 | 67.0% | 42.5% | — |
| Numbers 30 | 17 | 442 | 300 | 67.9% | 37.1% | — |
| Numbers 31 | 54 | 1,009 | 788 | 78.1% | 50.7% | — |
| Numbers 32 | 42 | 855 | 677 | 79.2% | 54.5% | — |
| Numbers 33 | 56 | 784 | 704 | 89.8% | 60.5% | — |
| Numbers 34 | 29 | 432 | 352 | 81.5% | 53.9% | — |
| Numbers 35 | 34 | 730 | 551 | 75.5% | 46.6% | — |
| Numbers 36 | 13 | 318 | 246 | 77.4% | 52.5% | — |
| Obadiah 1 | 21 | 456 | 356 | 78.1% | 51.8% | — |
| Psalms 2 | 12 | 164 | 127 | 77.4% | 43.3% | — |
| Psalms 3 | 9 | 108 | 84 | 77.8% | 42.6% | — |
| Psalms 4 | 9 | 129 | 88 | 68.2% | 38.8% | — |
| Psalms 5 | 13 | 201 | 137 | 68.2% | 41.3% | — |
| Psalms 6 | 11 | 147 | 98 | 66.7% | 37.4% | — |
| Psalms 7 | 18 | 255 | 184 | 72.2% | 46.7% | — |
| Psalms 8 | 10 | 134 | 107 | 79.9% | 49.3% | — |
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
| Psalms 28 | 11 | 134 | 106 | 79.1% | 55.2% | — |
| Psalms 29 | 13 | 189 | 138 | 73.0% | 46.6% | — |
| Psalms 31 | 11 | 189 | 135 | 71.4% | 41.3% | — |
| Psalms 32 | 22 | 269 | 205 | 76.2% | 45.4% | — |
| Psalms 33 | 23 | 285 | 214 | 75.1% | 49.5% | — |
| Psalms 37 | 23 | 316 | 229 | 72.5% | 40.2% | — |
| Psalms 38 | 14 | 230 | 157 | 68.3% | 43.9% | — |
| Psalms 39 | 18 | 327 | 234 | 71.6% | 42.2% | — |
| Psalms 40 | 14 | 193 | 150 | 77.7% | 45.1% | — |
| Psalms 42 | 5 | 115 | 71 | 61.7% | 34.8% | — |
| Psalms 43 | 27 | 373 | 258 | 69.2% | 39.1% | — |
| Psalms 45 | 12 | 156 | 109 | 69.9% | 43.6% | — |
| Psalms 46 | 10 | 106 | 86 | 81.1% | 53.8% | — |
| Psalms 47 | 15 | 187 | 137 | 73.3% | 47.1% | — |
| Psalms 48 | 21 | 292 | 213 | 72.9% | 42.1% | — |
| Psalms 50 | 21 | 284 | 199 | 70.1% | 45.1% | — |
| Psalms 51 | 11 | 162 | 100 | 61.7% | 35.8% | — |
| Psalms 52 | 7 | 117 | 76 | 65.0% | 46.2% | — |
| Psalms 53 | 9 | 117 | 75 | 64.1% | 32.5% | — |
| Psalms 54 | 24 | 326 | 244 | 74.8% | 46.0% | — |
| Psalms 55 | 14 | 203 | 142 | 70.0% | 40.4% | — |
| Psalms 56 | 12 | 198 | 154 | 77.8% | 47.0% | — |
| Psalms 57 | 12 | 156 | 113 | 72.4% | 46.8% | — |
| Psalms 58 | 18 | 284 | 212 | 74.6% | 43.0% | — |
| Psalms 59 | 14 | 185 | 110 | 59.5% | 37.3% | — |
| Psalms 60 | 9 | 119 | 89 | 74.8% | 43.7% | — |
| Psalms 61 | 13 | 193 | 130 | 67.4% | 44.0% | — |
| Psalms 62 | 12 | 170 | 124 | 72.9% | 45.3% | — |
| Psalms 63 | 11 | 121 | 85 | 70.2% | 47.9% | — |
| Psalms 64 | 14 | 187 | 140 | 74.9% | 41.7% | — |
| Psalms 65 | 20 | 270 | 196 | 72.6% | 44.8% | — |
| Psalms 66 | 8 | 93 | 66 | 71.0% | 45.2% | — |
| Psalms 67 | 36 | 528 | 359 | 68.0% | 43.9% | — |
| Psalms 68 | 37 | 532 | 395 | 74.2% | 43.6% | — |
| Psalms 69 | 6 | 85 | 58 | 68.2% | 38.8% | — |
| Psalms 70 | 24 | 377 | 265 | 70.3% | 41.1% | — |
| Psalms 71 | 20 | 292 | 230 | 78.8% | 49.3% | — |
| Psalms 73 | 23 | 326 | 235 | 72.1% | 42.9% | — |
| Psalms 75 | 13 | 162 | 115 | 71.0% | 48.1% | — |
| Psalms 76 | 21 | 273 | 198 | 72.5% | 49.1% | — |
| Psalms 77 | 72 | 994 | 742 | 74.6% | 48.5% | — |
| Psalms 78 | 13 | 230 | 150 | 65.2% | 35.7% | — |
| Psalms 79 | 20 | 263 | 182 | 69.2% | 44.5% | — |
| Psalms 80 | 17 | 219 | 164 | 74.9% | 43.4% | — |
| Psalms 81 | 8 | 85 | 69 | 81.2% | 63.5% | — |
| Psalms 82 | 19 | 222 | 166 | 74.8% | 50.5% | — |
| Psalms 83 | 13 | 207 | 148 | 71.5% | 44.4% | — |
| Psalms 84 | 14 | 176 | 120 | 68.2% | 44.3% | — |
| Psalms 85 | 17 | 262 | 208 | 79.4% | 50.4% | — |
| Psalms 86 | 7 | 85 | 70 | 82.4% | 57.6% | — |
| Psalms 87 | 19 | 258 | 199 | 77.1% | 49.2% | — |
| Psalms 88 | 53 | 715 | 516 | 72.2% | 41.8% | — |
| Psalms 90 | 16 | 202 | 151 | 74.8% | 43.6% | — |
| Psalms 91 | 16 | 196 | 135 | 68.9% | 42.3% | — |
| Psalms 92 | 5 | 78 | 51 | 65.4% | 35.9% | — |
| Psalms 93 | 23 | 268 | 182 | 67.9% | 42.5% | — |
| Psalms 94 | 11 | 167 | 127 | 76.0% | 46.1% | — |
| Psalms 95 | 13 | 196 | 159 | 81.1% | 46.4% | — |
| Psalms 96 | 12 | 166 | 115 | 69.3% | 46.4% | — |
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
| Psalms 115 | 10 | 81 | 59 | 72.8% | 54.3% | — |
| Psalms 116 | 2 | 28 | 20 | 71.4% | 35.7% | — |
| Psalms 119 | 7 | 74 | 51 | 68.9% | 45.9% | — |
| Psalms 120 | 8 | 95 | 68 | 71.6% | 46.3% | — |
| Psalms 122 | 4 | 69 | 47 | 68.1% | 42.0% | — |
| Psalms 123 | 8 | 100 | 58 | 58.0% | 40.0% | — |
| Psalms 124 | 5 | 82 | 51 | 62.2% | 35.4% | — |
| Psalms 125 | 6 | 78 | 56 | 71.8% | 48.7% | — |
| Psalms 126 | 5 | 83 | 62 | 74.7% | 43.4% | — |
| Psalms 127 | 6 | 84 | 60 | 71.4% | 47.6% | — |
| Psalms 128 | 8 | 88 | 56 | 63.6% | 42.0% | — |
| Psalms 129 | 8 | 84 | 59 | 70.2% | 46.4% | — |
| Psalms 130 | 3 | 57 | 37 | 64.9% | 36.8% | — |
| Psalms 131 | 18 | 231 | 162 | 70.1% | 40.3% | — |
| Psalms 132 | 3 | 59 | 37 | 62.7% | 40.7% | — |
| Psalms 133 | 3 | 44 | 35 | 79.5% | 52.3% | — |
| Psalms 134 | 21 | 248 | 198 | 79.8% | 57.3% | — |
| Psalms 135 | 26 | 326 | 215 | 66.0% | 30.7% | — |
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
| Amos | 131 | 2,780 | 2,065 | 74.3% | 51.5% | — |
| Deuteronomy | 905 | 21,077 | 16,362 | 77.6% | 50.9% | — |
| Exodus | 457 | 9,117 | 6,992 | 76.7% | 49.6% | — |
| Genesis | 1,531 | 32,635 | 28,762 | 88.1% | 60.6% | 2,746 (8.4%) |
| Hosea | 37 | 717 | 562 | 78.4% | 52.3% | — |
| Isaiah | 504 | 10,177 | 7,727 | 75.9% | 50.7% | — |
| Judges | 114 | 2,933 | 2,314 | 78.9% | 52.3% | — |
| Joel | 73 | 1,573 | 1,215 | 77.2% | 48.4% | — |
| Jonah | 48 | 1,080 | 839 | 77.7% | 51.0% | — |
| Joshua | 402 | 9,540 | 7,465 | 78.2% | 52.0% | — |
| Leviticus | 859 | 19,042 | 14,732 | 77.4% | 47.5% | — |
| Micah | 92 | 1,997 | 1,514 | 75.8% | 49.3% | — |
| Numbers | 1,288 | 24,973 | 20,035 | 80.2% | 52.2% | — |
| Obadiah | 21 | 456 | 356 | 78.1% | 51.8% | — |
| Psalms | 1,689 | 23,186 | 16,772 | 72.3% | 44.4% | — |

353 chapters: 127,712 of 161,283 Greek words aligned (79.2%), 2,746 of them by the model pass (y `model`); 129,605 of 205,954 English words are in a chunk of Greek (62.9%), the rest are in remainder chunks (y `align?`, waiting for the model pass) or in English the model found no Greek for.

<!-- lxx-align:end -->
