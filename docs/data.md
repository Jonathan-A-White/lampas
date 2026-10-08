# The New Testament data

`npm run data:build` turns two public sources into `public/data/`: `index.json` and one JSON file per chapter,
`public/data/<book>/<chapter>.json`, for all 27 books (260 chapters, about 30 MB uncompressed). The JSON is
committed; the raw downloads are not. The app loads one chapter at a time through `src/data/chapter.ts`
(`loadChapter`, `wordLemma`, `wordGloss`, `wordParse`) and never reads the short keys below directly.

## Building

```bash
npm run data:build     # downloads data/raw/msb_nt_tables.tsv and data/raw/tbesg.txt if absent, then writes public/data
```

`data/raw` is git-ignored and the download is skipped for a file already there. A second run changes no file:
the output is deterministic and a file is rewritten only when its bytes differ. Files in `public/data` that the
build no longer produces are deleted. Tests use the small slices in `tests/fixtures/data/` and never the network.

## Sources and licences

| Source | Licence | Used for |
| --- | --- | --- |
| Majority Standard Bible NT tables, https://majoritybible.com/msb_nt_tables.tsv | public domain | the Byzantine Greek, its Strong's numbers, Robinson-Pierpont (RP) parsing codes, transliteration, and the MSB English aligned word by word |
| STEPBible TBESG (Translators Brief lexicon of Extended Strongs for Greek), https://github.com/STEPBible/STEPBible-Data | CC BY 4.0, credit STEPBible / Tyndale House, Cambridge | lemma, gloss and definition per Strong's number |

`ATTRIBUTION.md` names both. TBESG's definitions are Abbott-Smith's; the build changes them (see Changes).

## `index.json`

```json
{"books":[{"code":"rom","name":"Romans","chapters":16,"verses":[32,29,31,25,21,23,25,39,33,21,36,21,14,26,33,24]}]}
```

The 27 books in canonical order. `code` is lower-case: `mat mrk luk jhn act rom 1co 2co gal eph php col 1th 2th
1ti 2ti tit phm heb jas 1pe 2pe 1jn 2jn 3jn jud rev`. `verses[i]` is the number of verses in chapter `i + 1`.

## `lexicon.json`

Every lemma of the text once (about 5,400, 320 KB), so a word he names that the open chapter does not use still has a gloss:

```json
{"ἀγγελία":{"g":"message","s":"G31","c":"noun"},"σάρξ":{"g":"flesh","s":"G4561","c":"noun"}}
```

`g` is the TBESG gloss, `s` the Strong's number, `c` the part of speech (`parseCode.ts` `splitParse`) of the lemma's first use in
canonical order; keys are NFC, in alphabetical order. `src/data/lexicon.ts` (`loadLexicon`, `lookupLemma`) reads it.

## `<book>/<chapter>.json`

Compact: short keys, no indentation, each lexicon entry once per file.

```json
{"book":"Romans","code":"rom","chapter":8,
 "lex":{"G686":{"g":"therefore","d":"ἄρα, illative particle, ..."}},
 "parse":{"PRT":"particle","V-PAP-DPM":"verb, present active participle, dative plural masculine"},
 "verses":[{"n":1,"h":"Walking by the Spirit","p":1,
   "g":[{"t":"Οὐδὲν","tr":"ouden","s":"G3762","l":"οὐδείς","p":"A-NSN-N","e":2},
        {"t":"ἄρα","tr":"ara","s":"G686","l":"ἄρα","p":"PRT","e":0}, "..."],
   "e":[{"t":"Therefore","g":[1]},{"t":"there is now","g":[2],"s":1},{"t":"no","g":[0]}, "..."]}]}
```

| Key | Meaning |
| --- | --- |
| `lex` | every Strong's number used in the file, once: `g` gloss (TBESG), `d` definition (plain text, at most about 300 characters) |
| `parse` | every parsing code used in the file, once, decoded to words by `src/data/parseCode.ts` |
| `verses[].n` | the verse number; a verse the Byzantine text lacks is not listed |
| `verses[].h` | the MSB's section heading (English, plain text) that comes **before** this verse; absent on a verse with no heading. All 993 headings of the table are carried |
| `verses[].p` | `1` when the MSB starts a paragraph at this verse; absent otherwise (see below) |
| `verses[].g` | the Greek words **in Greek order**; a word's position in this array is its index |
| `g[].t` | the word as the Byzantine text has it (NFC) |
| `g[].tr` | transliteration (beta-code, 'cristw'; no screen shows it: the word sheet respells the Greek, docs/pronunciation.md) |
| `g[].s` | Strong's number without padding, `G686` (the key into `lex`) |
| `g[].l` | lemma, accents kept, NFC (inline on every word) |
| `g[].p` | RP parsing code (the key into `parse`) |
| `g[].e` | index into the verse's `e` array of the English chunk this word belongs to; absent when the MSB gives the word no English |
| `verses[].e` | the English chunks **in English order**, so joined with spaces they read as the MSB verse |
| `e[].t` | the chunk's English with its punctuation and quotation marks, without the `[ ]` and `{ }` marks |
| `e[].g` | indexes into the verse's `g` array of the Greek word(s) the chunk renders, in Greek order |
| `e[].s` | `1` when part of the chunk is supplied (it is in `[square brackets]` in the MSB); absent otherwise |

Links are mutual: `e[g[i].e].g` contains `i`, and every `g[e[j].g[k]].e` is `j`.

In the MSB table a word whose English is `-` or `vvv` has no English (no `e`, no chunk). A word whose English is
`. . .` is rendered by the chunk that completes it later in the English ("In all, then, there were fourteen
. . . generations"): its index joins that chunk's `g` array. Quotation marks and punctuation that sit on a word
with no English of its own move to the neighbouring chunk. Footnotes in the table are not carried.

Headings and paragraphs come from two columns of the table. `Hdg` (`<p class=|hdg|>Walking by the Spirit`) is on
the first word of the verse the heading comes before; the tag comes off and the text is `h`. `Par` is the paragraph
tag the MSB puts on a word: a verse gets `p: 1` when the tag on its **first** word opens a paragraph (`reg`, `red`
for the words of Jesus, or the first line of an indented block: `indent1stline`, `tab1stline`, `list1stline` and their
`red` forms). The indented lines inside a poetry block (`indent1`, `indent2`) are not paragraph starts. A paragraph
that starts in the middle of a verse is not carried: a break is only ever at a verse. The first verse of a chapter
starts a paragraph whether or not it has `p`; the reader treats it so.

## Changes to the sources

* TBESG: a Strong's number with several entries (an extended-Strong's split such as G0032G / G0032H) resolves
  to its **first** entry, for the lemma, the gloss and the definition. The numbers that have more than one entry
  among the 5,381 the New Testament uses, with the gloss chosen, are: G1 (Alpha), G7 (Abijah), G32 (angel), G40 (holy), G68 (Field of), G129 (blood), G165 (an age: age), G223 (Alexander), G256 (Alphaeus), G301 (Amos), G367 (Ananias), G435 (man), G490 (Antioch), G630 (to release: release), G769 (weakness: weak), G770 (be weak: weak), G772 (weak), G863 (to release: leave), G906 (to throw: throw), G921 (Barnabas), G923 (Barsabbas), G928 (to torture: torture), G938 (queen), G1050 (Gaius), G1056 (Galilee), G1081 (offspring), G1085 (family: descendant), G1086 (Gerasene), G1093 (earth: planet), G1135 (woman), G1487 (if), G1492 (to perceive: understand), G1662 (Eliakim), G2060 (Hermes), G2197 (Zechariah), G2199 (Zebedee), G2216 (Zerubbabel), G2264 (Herod), G2266 (Herodias), G2269 (Esau), G2384 (Jacob), G2385 (James), G2424 (Jesus), G2455 (Judas), G2459 (Justus), G2491 (John), G2495 (John), G2500 (Joseph), G2501 (Joseph), G2533 (Caiaphas), G2536 (Cainan), G2541 (Caesar), G2542 (Caesarea), G2556 (evil/harm: evil), G2564 (to call: call), G2570 (good), G2577 (be weary/sick: weak), G2763 (potter), G2787 (ark: covenant), G2804 (Claudius), G2839 (common: unsanctified), G2857 (Colossae), G2962 (lord: God), G2976 (Lazarus), G3004 (to say), G3017 (Levi), G3123 (more), G3128 (Manasseh), G3137 (Mary), G3158 (Matthat), G3161 (Mattathias), G3197 (Melchi), G3558 (south), G3614 (home), G3624 (house: home), G3708 (to see: see), G3754 (that/since: that), G3972 (Paul), G3985 (to test/tempt: tempt), G3986 (temptation/testing: temptation), G4074 (Peter), G4102 (faith), G4151 (spirit/breath: spirit), G4160 (to do/make: do), G4245 (elder: Elder), G4413 (first), G4504 (Rufus), G4527 (Sala), G4528 (Shealtiel), G4549 (Saul), G4569 (Saul), G4613 (Simon), G4672 (Solomon), G4690 (seed: offspring), G4826 (Simeon), G5083 (to keep: observe), G5085 ((Sea of) Tiberias), G5259 (by/under: by), G5328 (Pharaoh), G5376 (Philip), G5438 (prison/watch: prison), G5442 (to keep/guard: observe), G5456 (voice/sound: voice), G5514 (Chloe), G5564 (place), G5586 (stone), G5590 (soul).
* TBESG: the definition has its markup, scripture references, daggers and `(AS)` / `(ML)` source tags removed
  and is cut at a word boundary near 300 characters, ending in `…`. This is the "note of changes" CC BY 4.0
  asks for. The full lexicon is at the STEPBible address above.
* MSB: seven Greek forms carry the Strong's number 0 in the table; `scripts/data-build.ts` (`STRONGS_FIXES`)
  gives them their TBESG numbers: ἐνενήκοντα G1768, ἐκπερισσοῦ G6029, κόπρια G2874, ἔνθεν G1782, αὐτοφόρῳ G1888,
  διαυγής G6897, διαπαρατριβαὶ G6856.
* MSB: four rows (Οὐαὶ in Matthew 23:13 and 23:14, Πολλῆς in Acts 24:2, Τὸ in Revelation 17:8) are shifted a column:
  the transliteration sits where the Strong's number belongs and the Strong's number is missing. The build reads
  the transliteration from there and takes the Strong's number from the same Greek form and parsing elsewhere in
  the table.
* MSB: Luke 17:36, Acts 8:37, Acts 15:34 and Acts 24:7 have a row in the table and no Greek; they are left out.
* Every Greek word in all 260 chapters has a lemma and a gloss, and every parsing code decodes
  (`features/data.feature` walks all of them). An unknown code or a Strong's number the lexicon lacks fails the
  build instead of shipping a guess.

## The spaced schedule (Dexie v10)

Not part of the text data: the phone's own store (`src/data/db.ts`, version 10) has a `reviews` table, one row per
item he reviews, key `[kind+id]` (indexes `due`, `kind`): `{kind, id, step, due, lastWhen, lapses, rights}`. A word
is kind `'word'` with its NFC headword as the id; the course epic adds other kinds. `src/data/schedule.ts` holds the
rule (pure) and `src/data/repositories/reviews.ts` the rows (`recordReview`, `listDue`, `countDue`, `ensureScheduled`).

* Steps (provisional, the Governor to confirm): 1, 3, 7, 14, 30, 60 days (`STEP_DAYS`); past the last, a rare check
  every 90 days.
* A new item starts at step 0. Right twice in a row (`rights`) moves it up one step; a single right keeps the step and
  it comes back after that step's gap. One wrong drops it two steps (not below 0), adds a lapse, and it is due tomorrow.
* A Quick test answer (`recordAnswer`) calls `recordReview('word', lemma, right)`.
* `seedScheduleIfFirstOpen` runs once after the words are seeded, on a first open and on the first open after the
  upgrade (meta `reviewsSeeded`): every solid word starts at the 30-day step, due on one of the next 30 days in turn
  (so about two a day, not a flood); every learning word at step 0, due now; a dropped word is left off.
* How Review asks a word follows its step (`modeFor`, `FLASHCARD_STEP` in `schedule.ts`, provisional): multiple choice below
  step 3, a flashcard (see the lemma, Show, grade yourself) from step 3 up; a lapse that drops it below step 3 makes it multiple
  choice again. A word not on the schedule yet is at step 0.
* What is due counts live words only: `listDue` (and so `countDue`, the Reader's strip, Review's cards and the round) leaves out the
  row of a dropped or unlisted word. The row is kept, so a word taken up again comes back on the schedule it had (overdue ones are due at once).
* Every change publishes `review-due-changed` (docs/events.md).
* A grammar idea (`src/data/grammar/ladder.ts`, docs/grammar.md) is an item of kind `'grammar'` with the idea's id; `listDue`
  counts it live like any kind that is not a word.

## Grammar levels (Dexie v11)

The store's version 11 adds `grammarLevels`, one row per grammar idea, key `id` (index `level`): `{id, level, since, how}`.
`level` is `'solid'` (he has it), `'frontier'` (he is working on it) or `'notYet'`; `how` is what set it: `'placement'`,
`'review'`, `'sheet'`, `'tutor'` or `'marked'`. `src/data/repositories/grammarLevels.ts` keeps it:

* `setLevel(id, level, how)` writes the row and publishes `grammar-level-changed` (docs/events.md).
* `recordGrammarAnswer(id, right)` is `recordReview('grammar', id, right)` and the level from the new step in one transaction:
  `levelFromStep` says solid from `SOLID_STEP` (3, the 14-day step, provisional, the Governor to confirm) and frontier below it. So
  two rights in a row at step 2 turn an idea solid, a wrong at step 3 drops it to step 1 and frontier, and a not-yet idea
  that is answered becomes frontier. A right never lowers an idea he set solid by hand; a level that does not change keeps
  its `since` and `how`.
* `scheduleIdea(id, level)` puts the idea on the schedule if it is not there: step 0 for frontier, the 30-day step (due in
  30 days) for solid (the 'I know this' jump); not-yet ideas are not scheduled.
* `seedLevelsIfFirstOpen` runs once (meta `grammarLevelsSeeded`), after the upgrade: every term in `grammarKnown` makes every idea
  that covers it solid, `how` `'marked'`, scheduled at the 30-day step; an idea that already has a level keeps it.

## Offline

Only `data/index.json`, `data/lexicon.json` and `data/rom/8.json` are in the service worker's precache (`pwa-precache.ts`; the
globs name those three files, with no wildcard). Every other chapter is fetched when first opened and kept by a
CacheFirst route for `/data/` in `src/sw.ts` (cache `lampas-data`), so a chapter once read stays offline.
