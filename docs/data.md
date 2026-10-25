# The Bible data

`npm run data:build` turns two public sources into `public/data/`: `index.json` and one JSON file per chapter,
`public/data/<book>/<chapter>.json`, for all 27 books of the New Testament (260 chapters, about 30 MB uncompressed). The JSON is
committed; the raw downloads are not. `npm run data:build:ot` does the same for the 39 books of the Old Testament, with the Hebrew words kept
(929 chapters, about 75 MB; 'The Old Testament data' below). The app loads one chapter at a time through `src/data/chapter.ts`
(`loadChapter`, `wordLemma`, `wordGloss`, `wordParse`) and never reads the short keys below directly.

**The rule (mw-uqlxea):** a chapter says its source language (`lang`: `'grc'` or `'hbo'`) and its translation (`translation`: `'msb'`); the word and chunk keys are the same for every source language.
The reader, the word sheet, the voices and the drills read the chapter's `lang` (`sourceLanguage(chapter)`) and never assume Greek; code that says 'greek' where it means 'the source language' is generalised when touched, never in a rename sweep.

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

The table's Greek is the Robinson-Pierpont 2005 edition, not 2018: `docs/greek-edition.md` (`npm run greek:edition`) has the word-by-word comparison.

`ATTRIBUTION.md` names both. TBESG's definitions are Abbott-Smith's; the build changes them (see Changes).

## `index.json`

```json
{"books":[{"code":"rom","name":"Romans","chapters":16,"verses":[32,29,31,25,21,23,25,39,33,21,36,21,14,26,33,24],"fingerprints":["0123456789ab","..."],"lang":"grc"}]}
```

The 66 books in canon order, Genesis to Revelation (`CANON` in `src/data/canon.ts`; `tests/unit/books.test.ts` holds it equal to this file). `lang` is the language the book is read in: `hbo` for the 39 of the Old Testament, `grc` for the 27 of the New. `code` is lower-case: the Old Testament's
`gen exo lev num deu jos jdg rut 1sa 2sa 1ki 2ki 1ch 2ch ezr neh est job psa pro ecc sng isa jer lam ezk dan hos jol amo oba jon mic nam hab zep hag zec mal`, then the New Testament's `mat mrk luk jhn act rom 1co 2co gal eph php col 1th 2th
1ti 2ti tit phm heb jas 1pe 2pe 1jn 2jn 3jn jud rev`. Each build writes its own language's books and keeps the other's from the index already on disk (`mergeIndex` in `scripts/data/chapterWriter.ts`), so building one Testament never loses the other's entries.
`BOOKS` (`src/data/books.ts`) is the canon's `grc` 27 until the readers move to the canon (mw-uqlxea.2), and `BOOK_INDEX` and `loadIndex` give the same 27 of this file: nothing on a screen reads an Old Testament book yet; `CANON_INDEX` and `loadCanonIndex` give all 66. `verses[i]` is the number of verses in chapter `i + 1`. `fingerprints[i]` is the first 12 hex characters of the SHA-256 of chapter `i + 1`'s file (`chapterFingerprint` in `scripts/data-build.ts`; the same bytes give the same fingerprint; empty for a chapter a test slice lacks). The app asks for a chapter as `/data/<book>/<n>.json?v=<fingerprint>` (`chapterUrl` in `src/data/chapter.ts`, the index read from the bundle).

## `lexicon.json`

Every lemma of the text once (about 5,400, 320 KB), so a word he names that the open chapter does not use still has a gloss:

```json
{"ἀγγελία":{"g":"message","s":"G31","c":"noun"},"σάρξ":{"g":"flesh","s":"G4561","c":"noun"}}
```

`g` is the TBESG gloss (cleaned of its `range: chosen` form, below), `s` the Strong's number, `c` the part of speech (`parseCode.ts` `splitParse`) of the lemma's first use in
canonical order; keys are NFC, in alphabetical order. `src/data/lexicon.ts` (`loadLexicon`, `lookupLemma`) reads it.

## `lemma-forms/<lemma>.json` (outside `public/data`)

Generated into `public/lemma-forms/` by `scripts/build-lemma-forms.mjs` (`npm run build`, or `npm run forms:build`) from the chapters above; git-ignored. One file for each of the 5,374 lemmas (about 1 MB in all, the largest, ποιέω, 4 KB), every form of the lemma the text uses:

```json
{"l":"ἀγαπάω","f":[["ἀγαπήσεις","V-FAI-2S",10,"mat",5,43],["ἀγαπῶ","V-PAI-1S",5,"jhn",14,31]]}
```

`[form, RP code, count, book, chapter, verse of the first use]`, in the order the text first uses them; the same form with another code is another entry. The form is the text's own, the first letter lower-cased unless the lemma is a name, a grave accent turned acute.
`src/data/paradigms/ownForms.ts` (`loadLemmaForms`) fetches one on demand for a word's own paradigm (docs/paradigms.md 'This word').

## `frequency.json`

How often each word is used, for the frontier ("the commonest words he does not know yet"). One entry per Strong's number the text uses
(5,380, 450 KB), commonest first, ties by Strong's number; compact, deterministic:

```json
[{"strongs":"G2532","lemma":"καί","count":9217,"chapters":260,"proper":false},
 {"strongs":"G2424","lemma":"Ἰησοῦς","count":972,"chapters":207,"proper":true}]
```

`lemma` is the TBESG lemma (NFC), `count` the uses in all 27 books, `chapters` how many of the 260 chapters use it. Counts are by
Strong's number, so the forms of a word, and the lemmas the table spells differently, are one entry. `src/data/frequency.ts`
reads it: `loadFrequency()` (fetched once, shared), `rankOf(strongs)` (1 is the commonest; undefined for a number not in the table) and
`isProperNoun(strongs)`. It is precached beside `index.json`.

* **The article is left out.** ὁ (G3588) is used 20,286 times, more than twice as often as καί (9,217), and is not a word to offer
  for learning, so the table has no row for it (`FREQUENCY_LEAVES_OUT` in `scripts/data-build.ts`); καί is first and ἐν fifth.
  `rankOf('G3588')` is undefined. The word is still in the chapters and in `lexicon.json`.
* **The proper-noun rule** (`isProperNounWord`): `proper` is true when any use of the word is coded `N-PRI` (the RP code for an
  indeclinable proper noun: Ἀβραάμ, Ἰσραήλ), or when a use is coded as a noun (`N-...`) and the lexicon's lemma starts with a
  capital letter (Ἰησοῦς, Παῦλος, Ἱεροσόλυμα, Φαρισαῖος: a name, a place or a people). RP gives a declined name the plain noun code, so
  the capital letter of the lemma is the lexicon's mark. Adjectives and adverbs made from names (Ῥωμαῖος as an adjective, Ἑβραϊστί) are not
  proper. The rule on a capitalised TBESG gloss was tried and rejected: it also marks θεός 'God', ἔθνος 'Gentiles', σάββατον 'Sabbath' and ἐγώ
  'I/we'. A handful of `N-PRI` words that are not names (ἀββά, χερουβίμ ...) count as proper: they are foreign words the frontier may skip too.

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
| `lang` | the language the words are in, `grc` or `hbo`. The New Testament's files leave it out and mean `grc`; `loadChapter` fills it (`fillChapter`), so a chapter kept on a phone from before it still reads. Always present in an Old Testament file |
| `translation` | the translation the English chunks are from, `msb` (the Majority Standard Bible; its Old Testament is the Berean Standard Bible's). Absent in the New Testament's files, filled by `loadChapter` |
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
| `e[].s` | which words of the chunk the translators supplied (they are in `[square brackets]` in the MSB): their positions, from 0, among the chunk's `t` split on white space (`"was king"` with `s: [0]`: *was* is supplied, *king* is not); sorted, never empty; absent when no word is supplied. Punctuation alone is never supplied, so a chunk is wholly supplied when every word of it with a letter is listed |

The reader draws only the supplied words in italics (`englishRuns` in `src/data/chapter.ts` cuts a chunk into runs), and the tutor is
sent them between asterisks, as Markdown italics (`markSupplied`: `*was* king of Salem *and* priest of God`), with a section of its
instructions saying what the marks mean ('Italic words' in `grinds/verse-ask.instructions/` and `grinds/bible-talk.instructions/`).
The Weave still leaves a chunk with any supplied word in English.
The Weave's Order Greek (mw-5r3p30.250, `chunkOrder` in `src/data/weave.ts`) lays the English chunks out by `e[].g`: each chunk where its first Greek word stands, a chunk with no Greek behind the chunk before it in the English; a Greek word with no `e` is drawn in neither order.

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
* TBESG: a gloss written in the lexicon's own form, the word's range of senses and then the sense this entry is
  (`spirit/breath: spirit`, the 33 of the list above and others with a colon), is shown as one plain list of meanings:
  the range's senses, then the chosen one when the range lacks it (`spirit, breath`, `to keep, observe`, `an age`);
  a slash alone (`cause/charge`) is the lexicon's plain 'or' and stays. `src/data/gloss.ts` `cleanGloss` does it in
  `parseLexicon`, so `lexicon.json` and every chapter's `lex` hold the clean gloss; the seed build and Import run the same
  function on the BMA list, whose case before a preposition's meanings (`dat: in, by, with`) becomes a word after them
  (`in, by, with (dative)`), and Dexie v22 cleans a gloss a phone kept before (mw-5r3p30.384).
* TBESG: the gloss of a verb whose aorist cannot be guessed ends with it, `to come/go (aorist ἦλθον)`: the 28 verbs of
  `src/data/irregular-aorists.ts` (the Governor's fourteen and λέγω, then the sweep of the top 300 by frequency: γίνομαι,
  εὑρίσκω, the compounds of ἔρχομαι, ἀναβαίνω, καταβαίνω, ἄγω, συνάγω, ἐκβάλλω, ἵστημι, ἀνίστημι). `withAoristNote` runs in `parseLexicon` (so
  `lexicon.json` and every chapter's `lex` hold it) and in the seed build; a regular verb gets none, and
  `tests/unit/irregular-aorists.test.ts` checks every aorist against the text's own aorist forms (mw-bsf54t.12).
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
* MSB: 1 John 2:6 gives "walk" to the aorist περιεπάτησεν and "walked." to the present infinitive περιπατεῖν, and puts
  οὕτως and αὐτὸς into the chunk "walked.". `scripts/data-build.ts` (`ALIGNMENT_FIXES`) swaps the English of the two
  verbs and takes the English off οὕτως and αὐτὸς, so "walked." is περιεπάτησεν's alone (mw-5r3p30.334).
* MSB: Luke 17:36, Acts 8:37, Acts 15:34 and Acts 24:7 have a row in the table and no Greek; they are left out.
* Every Greek word in all 260 chapters has a lemma and a gloss, and every parsing code decodes
  (`features/data.feature` walks all of them). An unknown code or a Strong's number the lexicon lacks fails the
  build instead of shipping a guess.

## The Old Testament data

`scripts/data-build-ot.ts` (`npm run data:build:ot`) writes `public/data/<code>/<n>.json` for the 39 books and their 929 chapters, `lexicon-hbo.json` and `frequency-hbo.json`, and adds the 39 to `index.json`. **Nothing on a screen opens them yet** (mw-uqlxea.2 does): the picker still sends an Old Testament chapter to Logos or Audible, and `pwa-precache.ts` is not widened, so the install stays the same size.

### Source and licences

| Source | Licence | Used for |
| --- | --- | --- |
| Berean Standard Bible tables, https://bereanbible.com/bsb_tables.tsv | public domain (berean.bible/licensing.htm); the Majority Standard Bible's Old Testament is the Berean Standard Bible's | the pointed Hebrew and Aramaic words (the WLC text), their transliteration, Strong's numbers and parsing, and the English aligned word by word |
| STEPBible TBESH (Translators Brief lexicon of Extended Strongs for Hebrew), https://github.com/STEPBible/STEPBible-Data (Lexicons folder) | CC BY 4.0, credit STEPBible / Tyndale House, Cambridge | headword, gloss and definition per Strong's number (the definitions are the Abridged BDB's, by Online Bible, for guidance) |

`ATTRIBUTION.md` names both. The table holds the New Testament too (the same file, Greek rows after the Hebrew); the Old Testament build keeps the rows whose `Language` is `Hebrew` or `Aramaic` and leaves the rest.

### The build

```bash
npm run data:build:ot   # downloads data/raw/bsb_tables.tsv (85 MB) and data/raw/tbesh.txt if absent, then writes public/data
```

It reads the table **as a stream**, a line at a time (`readLines`), keeps the rows of one verse group, builds a chapter the moment the next begins, writes it and lets it go: the table is never held whole (about 4.5 s on the Laptop). The first line must be the header the build was written against
(`OT_EXPECTED_HEADER`, the names the table had on 2026-10-25): a table that renames a column stops the build with the differing column named, and so does a Strong number, a book or a parsing code it does not know.
It is deterministic, a file is rewritten only when its bytes differ, and the files of the Old Testament's own dirs that it no longer produces are deleted; the New Testament build (`npm run data:build`) leaves the Old Testament's files alone, and this one the New Testament's.
The two builds share the table reader (`scripts/data/bereanTable.ts`), the TBES lexicon reader (`scripts/data/tbes.ts`) and the chapter writer (`scripts/data/chapterWriter.ts`: the English alignment, supplied words, headings, paragraphs, fingerprints, the index, the files), so a chapter of either Testament is aligned by one function.
Tests use `tests/fixtures/data/bsb_tables_slice.tsv` (the header and the verse groups of Genesis 1:1-5, Jonah 1:1-3 and Daniel 2:4) and `tbesh_slice.txt`, made from the real files with
`awk -F'\t' -v refs='Genesis 1:1|Genesis 1:2|Genesis 1:3|Genesis 1:4|Genesis 1:5|Jonah 1:1|Jonah 1:2|Jonah 1:3|Daniel 2:4' 'BEGIN{n=split(refs,a,"|");for(i=1;i<=n;i++)want[a[i]]=1} FNR==NR{ if($13 in want) g[$4]=1; next} FNR==1||($4 in g && $5!="Greek")' bsb_tables.tsv bsb_tables.tsv`
and the TBESH lines of the Strong numbers those rows use.

### The keys for a Hebrew word

The word and chunk keys are the New Testament's (the table above), with this meaning for a Hebrew word:

| Key | Meaning for a Hebrew word |
| --- | --- |
| `g[].t` | the pointed word as the table's WLC column has it (NFC), with its cantillation marks and a maqqef (`־`) where the word has one; 15 words end in ` פ`, the petuhah mark the column glues to the last word of a section, so a word may hold a space |
| `g[].tr` | the table's transliteration (`bə·rê·šîṯ`; the dots mark the syllables) |
| `g[].s` | the Strong's number with no padding, `H7225`, the key into `lex`. `''` for the 6,038 words the table gives no number (almost all a preposition with a pronoun suffix, such as `לָהֶם` 'to them'): no number, no `l`, no `lex` entry, no count; the Hebrew epic recovers them |
| `g[].l` | the TBESH headword (NFC), `''` when `s` is |
| `g[].p` | the table's SHORT parsing code (`V-Qal-Perf-3ms`, `Prep-b \| N-fs`; `Prep-b` is the prefix and the code after the bar is the word); `''` for the 291 words the table gives none |
| `g[].e`, `e[].t`, `e[].g`, `e[].s`, `verses[].h`, `verses[].p` | as for the New Testament |
| `parse` | the short code -> the table's LONG parsing column (`V-Qal-Perf-3ms` -> `Verb - Qal - Perfect - third person masculine singular`): no code table of ours. `N-msc \| 1cs` is read two ways in the table, 1,457 times as a noun with a suffix and once as a 'Preposition'; `PARSE_FIXES` settles it, and any other code read two ways stops the build |
| `lex[].g`, `lex[].d` | the TBESH gloss (cleaned of its `range: chosen` form, as the Greek's) and definition (markup, references and daggers off, cut at 300 characters) |

* **Aramaic.** The Aramaic verses of Daniel (2:4 to 7:28), Ezra and Jeremiah 10:11 are rows with `Language` `Aramaic` and are kept as words of their `hbo` chapter; a per-word language mark is LATER.
* **TBESH keys.** A Strong's number with several senses is `H0834a`, `H0834b` ... in the file; the number resolves to the first (`a`), as the Greek resolves to its first entry. `H0001` with several entries resolves to the first too.
* **Order.** Hebrew words are in `Heb Sort` order (Hebrew reading order), the English chunks in `BSB Sort` order. As in the New Testament, a chunk is the English of one table row (so Genesis 1:1's `and` and `the earth` are two chunks, one for וְאֵת and one for הָאָרֶץ), a word whose English is `-`, `vvv` or empty has no `e` (the direct object marker `אֵת`), and `. . .` joins the chunk that completes it.
* **Headings.** `Hdg` carries the section heading (`hdg`), the Song of Solomon's speaker (`ihdg`), a Psalm's book and title lines and the acrostic letters of Psalm 119; the tags come off with a space in their place and a numeric character reference is written out (`א ALEPH`).
* **Paragraphs.** `p: 1` as for the New Testament (`PARAGRAPH_OPENER`): the poetry lines (`indent1`, `indent2`) and a Psalm's `selah` are not openers.
* **A Psalm's number mark.** The table puts the title of a Psalm in verse 1 and marks the verse's own first word with its number; that mark (`<span class=|reftext|>`) is not text and is dropped.
* **Missing verses.** A verse the Hebrew text lacks (Nehemiah 7:68) has a row in the table and no words; it is left out, as the Greek's are.

### `lexicon-hbo.json` and `frequency-hbo.json`

The shapes of `lexicon.json` and `frequency.json`. `lexicon-hbo.json` has every Hebrew lemma of the text once (7,828, 445 KB), `{"g": TBESH gloss, "s": "H7225", "c": "noun"}`, the part of speech the TBESH morph names (`verb`, `noun`, `preposition` ...), from the lemma's first use in canon order; keys NFC, in sort order.
`frequency-hbo.json` has one entry per Strong's number the text uses (8,539, 711 KB), commonest first, ties by number; `proper` is true when TBESH calls the entry a name (a person, a place or a people: the morph's language `N`). **Nothing is left out** (the Greek leaves out the article, which Hebrew writes as a prefix the table does not number): אֵת (the object marker, 10,937) is first.
Neither is loaded by the app yet.

### Sizes (2026-10-25)

`public/data` was 33,979,126 bytes and is 110,165,157 with the Old Testament: 75,009,674 bytes of the 929 chapter files (the largest, Psalm 119, 236,644 bytes), `index.json` 27,092 (it was 2 KB), `lexicon-hbo.json` 444,690 and `frequency-hbo.json` 711,270. A walk of every word of every chapter takes about 0.6 s.
Only `index.json` is precached, as before; an Old Testament chapter is fetched on first read and kept by the worker's `/data/` route like a New Testament one.

## The spaced schedule (Dexie v10)

Not part of the text data: the phone's own store (`src/data/db.ts`, version 10) has a `reviews` table, one row per
item he reviews, key `[kind+id]` (indexes `due`, `kind`): `{kind, id, step, due, lastWhen, lapses, rights}`. A word
is kind `'word'` with its NFC headword as the id; the other kinds are `'grammar'` (a ladder idea's id), `'paradigm'` (a table's id, docs/paradigms.md
'Drill this table'), `'sound'` (a drilled sound or word) and `'drill-plan'` (a step of Your drill plan). `src/data/schedule.ts` holds the
rule (pure) and `src/data/repositories/reviews.ts` the rows (`recordReview`, `listDue`, `countDue`, `ensureScheduled`).

* Steps (provisional, the Governor to confirm): 1, 3, 7, 14, 30, 60 days (`STEP_DAYS`); past the last, a rare check
  every 90 days.
* A new item starts at step 0. Right twice in a row (`rights`) moves it up one step; a single right keeps the step and
  it comes back after that step's gap. One wrong drops it two steps (not below 0), adds a lapse, and it is due tomorrow.
* A Quick test answer (`recordAnswer`) calls `recordReview('word', lemma, right)`.
* A new install starts empty (mw-5r3p30.385): nothing is put in the word list, on the schedule or on the grammar ladder at the first
  open. The 63 BMA words of `seed-words.ts` are content (the Quick test's wrong choices, `seedDistractors`), never his progress.
* `seedScheduleIfFirstOpen` is the upgrade path of a store from before the schedule existed: it runs once, only when the store holds the
  old `wordsSeeded` flag (a phone that was seeded the old way), and does nothing on a new install (meta `reviewsSeeded`): every solid word starts at the 30-day step, due on one of the next 30 days in turn
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

Only `data/index.json`, `data/lexicon.json`, `data/frequency.json` and `data/rom/8.json` are in the service worker's precache (`pwa-precache.ts`; the
globs name those four files, with no wildcard; `lexicon-hbo.json`, `frequency-hbo.json` and the Old Testament's chapters are not). Every other chapter is fetched when first opened and kept by a
CacheFirst route for `/data/` in `src/sw.ts` (cache `lampas-data-v<N>`, `src/dataCache.ts`: raise the version in a deploy that changes the data's shape, and the old cache is dropped on activate), so a chapter once read stays offline.
A chapter is kept under its fingerprinted address (`?v=`), so an update that leaves a chapter's data alone never fetches it again, and one that changes it fetches only that chapter and drops its old copy (`serveChapter`, `src/dataCache.ts`); the version is raised only for a change of the cache's own layout (3 is the `?v=` keys). The ladder lists (`/data/ladder/*.json`) are still plain CacheFirst.
