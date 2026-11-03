# The MSB's '. . .' rows and the chunks they join (mw-5r3p30.993)

FIXED by mw-5r3p30.997 (see 'What was done' at the end); the report below is mw-5r3p30.993's, as written. Luke 20:20's English chunk 'to the' holds αὐτὸν τῇ while 'to hand Him over' holds παραδοῦναι alone
(public/data/luk/20.json, verse 20, `e[12]` and `e[13]`). Is that the Majority Standard Bible's table as published, or our build?

<!-- toc -->

- [The row, as published](#the-row-as-published)
- [Answer: both. The source says nothing wrong; our build reads the marker the wrong way for these words](#answer-both-the-source-says-nothing-wrong-our-build-reads-the-marker-the-wrong-way-for-these-words)
- [The count (`node scripts/check-msb-chunk-pairs.ts [--list] [--tsv <msb_nt_tables.tsv>]`, run on this tree, 117,385 chunks)](#the-count-node-scriptscheck-msb-chunk-pairsts---list---tsv-msb_nt_tablestsv-run-on-this-tree-117385-chunks)
- [What a fix would need (not done here: it changes data)](#what-a-fix-would-need-not-done-here-it-changes-data)
- [What was done (mw-5r3p30.997)](#what-was-done-mw-5r3p30997)

<!-- /toc -->

## The row, as published

`msb_nt_tables.tsv` (https://majoritybible.com/msb_nt_tables.tsv, fetched 2026-11-02), verse group 25800 / VerseId `Luke 20:20`, in English order, Greek word, parsing, the
'MSB version' cell:

```
εἰς         PREP    (empty)
τὸ          T-ASN   in order
παραδοῦναι  V-2AAN  to hand Him over
αὐτὸν       P-ASM   . . .
τῇ          T-DSF   to the
ἀρχῇ        N-DSF   rule
```

The table itself pairs 'Him' with παραδοῦναι (it is inside the English 'to hand Him over') and gives αὐτὸν the English `. . .`: a marker that its English is in another row.
It does not say which row.

## Answer: both. The source says nothing wrong; our build reads the marker the wrong way for these words

`scripts/data/chapterWriter.ts` `buildVerse` reads `. . .` as 'rendered by the chunk that completes it, which comes LATER in English order': the word waits and joins the
next row that has English. For αὐτὸν that next row is τῇ 'to the', so the chunk is `{ t: 'to the', g: [αὐτὸν, τῇ] }` and παραδοῦναι is left alone. The table's meaning for
a pronoun is the other way: its English is already inside the chunk BEFORE ('hand Him over', 'will raise him up', 'turned him over'). The cause is our build's rule.

## The count (`node scripts/check-msb-chunk-pairs.ts [--list] [--tsv <msb_nt_tables.tsv>]`, run on this tree, 117,385 chunks)

Detector 1, on the built data: a chunk of two or more Greek words whose first is a pronoun (`P-`, `F-`, `S-`) and whose second is an article (`T-`): **31 chunks in 31 verses**
(Matthew 5:25, 5:40, 7:12, 14:28, 18:34; Luke 2:48, 9:42, 20:20, 20:34, 21:34, 22:25, 23:11; John 5:36, 6:39, 6:40, 6:54, 9:8, 13:8; Acts 4:3, 12:4, 16:20, 16:22, 18:10;
1 Corinthians 8:8, 15:27; 2 Corinthians 8:1; Galatians 4:13; Ephesians 4:19; 1 Timothy 6:14; Hebrews 10:1; James 2:16). All 31 were read by hand against the table's rows:

| Reading | Hits | Which |
| --- | --- | --- |
| the exact shape: the pronoun's `. . .` English is in the chunk before; it joined the next, article's chunk | 23 | Mt 5:25, 5:40, 14:28, 18:34; Lk 2:48, 9:42, 20:20, 20:34, 22:25, 23:11; Jn 5:36, 6:39, 6:40, 6:54, 13:8; Acts 12:4, 16:20, 16:22; 1 Co 8:8; 2 Co 8:1; Eph 4:19; 1 Ti 6:14; Jas 2:16 |
| the same cause, the other way round: the pronoun has its own English, and `. . .` article or noun words whose English is in the chunk before joined it | 7 | Mt 7:12 (οἱ ἄνθρωποι), Jn 9:8 (τὸ πρότερον), Acts 4:3 (τὰς χεῖρας), Acts 18:10 (σοι τοῦ κακῶσαί), 1 Co 15:27 (τὰ πάντα), Gal 4:13 (τὸ πρότερον), Heb 10:1 (τῶν πραγμάτων) |
| right as it stands: the `. . .` article joins its own 'your' | 1 | Lk 21:34 (αἱ + ὑμῶν) |

So the detector's false rate is 1 of 31 (3%): 30 of 31 are the build's `. . .` rule putting a word with a later chunk when its English is in the earlier one.

Detector 2, on the published table (`--tsv`): the table has **4,000** rows whose English is `. . .`, **781** of them pronouns (`P-`). For each pronoun row the script looks at the nearest chunk
with English before it and after it for an English pronoun (him, them, you, ...): English pronoun only before: **420 rows in 407 verses**; only after: 60; both: 82; neither: 219.
A hand read of 12 of the 420 (every 35th) found all 12 a pronoun whose English is in the chunk before (e.g. 'led them up' + αὐτοὺς, 'to lay it down' + αὐτήν), so the build joins about
420 pronouns to the wrong chunk. The other 3,219 `. . .` rows (articles, nouns, particles) were not read, and nor were the 82 'both' and 219 'neither' pronouns: the build's direction may be right for some and wrong for others.
This heuristic's false rate is therefore known only from that sample of 12 (0 false).

## What a fix would need (not done here: it changes data)

- `buildVerse` (scripts/data/chapterWriter.ts): a `. . .` word whose parsing is a pronoun (`P-`) joins the chunk BEFORE it in English order when that chunk's English holds a pronoun, else the
  next as now. The 7 'other way round' hits above need a rule for article and noun `. . .` rows (join the chunk before when it is a verb whose English names the thing, e.g. 'seized' + τὰς χεῖρας);
  it needs reading a sample of the 3,219 first. The first 420 rows are the safe part.
- `npm run data:build` rewrites every chapter that has one (at least the 407 verses above), and index.json's fingerprints for them change, so a phone refetches them.
- What reads `e`/`g` and could change: the weave (Memorize), the verse's Quiz me, English-to-Greek highlights; tests pinned to a verse's chunks (grep `'to the'`, `luk/20`).
- ALIGNMENT_FIXES in scripts/data-build.ts is for a verse where the table pairs the wrong word (1 John 2:6); this is not that case, it is the general `. . .` rule.
- Side finding, not counted: in Matthew 5:25 the table's parsing column is out of step with its Greek text for the words μετ' αὐτοῦ ἐν τῇ ὁδῷ (ἐν is `N-DSF`, τῇ `PREP`), so the built `p` of those words is wrong in the source. Worth its own check.

## What was done (mw-5r3p30.997)

`buildVerse` now joins a `. . .` word whose parsing is `P-` or `F-` (personal, reflexive pronoun) to the chunk BEFORE it in English order, unless that chunk holds only
conjunctions, articles, prepositions, particles, conditionals or interjections (then it waits for the next chunk as before). The doc's heuristic (an English pronoun only
in the chunk before) was not kept: a read of 44 of the 'both', 'neither' and 'only after' personal pronouns and 27 of the reflexives found the chunk before right in about
5 of 6, wrong mostly where the chunk before was a bare 'and' or 'while' (Luke 2:6, 12:37). Tests: `tests/unit/msb-dots-pronoun.test.ts` (rows in `tests/fixtures/data/msb-dots.tsv`).
After `npm run data:build`, `node scripts/check-msb-chunk-pairs.ts` finds 7 chunks (the detector's 31 before): 6 are the 'other way round' shape (articles and nouns, not pronouns) and Luke 21:34 is right.
Not changed: `. . .` demonstratives (`D-`, 120 rows), relatives (`R-`, 80) and every non-pronoun `. . .` row still join the NEXT chunk.
