# The Bible data

`npm run data:build` turns two public sources into `public/data/`: `index.json` and one JSON file per chapter,
`public/data/<book>/<chapter>.json`, for all 27 books of the New Testament (260 chapters, about 30 MB uncompressed). The JSON is
committed; the raw downloads are not. `npm run data:build:ot` does the same for the 39 books of the Old Testament, with the Hebrew words kept
(929 chapters, about 75 MB; 'The Old Testament data' below). The app loads one chapter at a time through `src/data/chapter.ts`
(`loadChapter`, `wordLemma`, `wordGloss`, `wordParse`) and never reads the short keys below directly.

**The rule (mw-uqlxea):** a chapter says its source language (`lang`: `'grc'` or `'hbo'`) and its translation (`translation`: `'msb'`); the word and chunk keys are the same for every source language.
The reader, the word sheet, the voices and the drills read the chapter's `lang` (`sourceLanguage(chapter)`) and never assume Greek; code that says 'greek' where it means 'the source language' is generalised when touched, never in a rename sweep.

<!-- toc -->

- [Building](#building)
- [Sources and licences](#sources-and-licences)
- [`index.json`](#indexjson)
- [`lexicon.json`](#lexiconjson)
- [`lemma-forms/<lemma>.json` (outside `public/data`)](#lemma-formslemmajson-outside-publicdata)
- [`frequency.json`](#frequencyjson)
- [`<book>/<chapter>.json`](#bookchapterjson)
- [Variants](#variants)
- [Variant English](#variant-english)
- [The RP 2026 overlay](#the-rp-2026-overlay)
- [The RP 2026 English](#the-rp-2026-english)
- [Changes to the sources](#changes-to-the-sources)
- [The maps' index (not in `public/data`)](#the-maps-index-not-in-publicdata)
- [The Logos Atlas's map list (not in `public/data`)](#the-logos-atlass-map-list-not-in-publicdata)
- [The Old Testament data](#the-old-testament-data)
  - [Source and licences](#source-and-licences)
  - [The build](#the-build)
  - [The keys for a Hebrew word](#the-keys-for-a-hebrew-word)
  - [`lexicon-hbo.json` and `frequency-hbo.json`](#lexicon-hbojson-and-frequency-hbojson)
  - [Sizes (2026-10-25)](#sizes-2026-10-25)
- [The spaced schedule (Dexie v10)](#the-spaced-schedule-dexie-v10)
- [Grammar levels (Dexie v11)](#grammar-levels-dexie-v11)
- [Offline](#offline)
  - [The offline copy (`src/data/offlineCopy.ts`, mw-lcv9z3g.1)](#the-offline-copy-srcdataofflinecopyts-mw-lcv9z3g1)
- [The places of each book (not in `public/data`)](#the-places-of-each-book-not-in-publicdata)

<!-- /toc -->

## Building

```bash
npm run data:build     # downloads data/raw/msb_nt_tables.tsv, data/raw/tbesg.txt and data/raw/byztxt-v3.3.2/*.csv if absent, then writes public/data
```

`data/raw` is git-ignored and the download is skipped for a file already there. A second run changes no file:
the output is deterministic and a file is rewritten only when its bytes differ. Files in `public/data` that the
build no longer produces are deleted. Tests use the small slices in `tests/fixtures/data/` and never the network.

## Sources and licences

| Source | Licence | Used for |
| --- | --- | --- |
| Majority Standard Bible NT tables, https://majoritybible.com/msb_nt_tables.tsv | public domain | the Byzantine Greek, its Strong's numbers, Robinson-Pierpont (RP) parsing codes, transliteration, and the MSB English aligned word by word |
| Robinson-Pierpont 2018 apparatus, https://github.com/byztxt/byzantine-majority-text tag `v3.3.2`, `csv-unicode/ccat/with-variants` | public domain | the variant readings of each chapter's `variants` ('Variants' below) |
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

Generated into `public/lemma-forms/` by `scripts/build-lemma-forms.mjs` (`npm run build`, or `npm run forms:build`) from the chapters above; git-ignored. One file for each of the 13,202 lemmas of the 66 books, 5,374 Greek (about 1 MB, the largest, ποιέω, 4 KB) and 7,828 Hebrew (about 6.5 MB, the largest, בּוֹא, 70 KB), every form of the lemma the text uses:

```json
{"l":"ἀγαπάω","f":[["ἀγαπήσεις","V-FAI-2S",10,"mat",5,43],["ἀγαπῶ","V-PAI-1S",5,"jhn",14,31]]}
```

A Hebrew lemma is the TBESH headword the chapter files give each word (`l`), pointed as it stands, so the entries are `["בָּרָ֣א","V-Qal-Perf-3ms",...,"gen",1,1]`: the form is the word's `t` byte for byte (the Greek `ownFormOf`'s lower-casing, acute and NFC would re-order the points and are not applied), the code is the table's own, and a word with no headword (a preposition with its suffix, `l` empty) has no file. The file name is the headword in NFC and `.json` (`lemmaFileName`, pointed Hebrew, a comma, a space or a maqaf in it as they are; a path separator would be an error and no headword has one); the app asks for it with `encodeURIComponent`. A second `npm run forms:build` on an unchanged checkout writes the same bytes (`tests/unit/lemma-forms-hbo.test.ts`). `lexicon-hbo.json` and `frequency-hbo.json` are not in the precache (see Offline): they are fetched on first use.


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
| `variants` | the New Testament's variant readings, one unit per place: `{"v":3,"w":[15,16,17],"base":"ἐπί σε ὡς","alts":[{"code":"N","text":"ὡς","g":[{"t":"ὡς","tr":"","s":"G5613","l":"ὡς","p":"ADV"}]}]}` (the English fields left out). Absent in an Old Testament file ('Variants' below) |
| `e[].s` | which words of the chunk the translators supplied (they are in `[square brackets]` in the MSB): their positions, from 0, among the chunk's `t` split on white space (`"was king"` with `s: [0]`: *was* is supplied, *king* is not); sorted, never empty; absent when no word is supplied. Punctuation alone is never supplied, so a chunk is wholly supplied when every word of it with a letter is listed |

The reader draws only the supplied words in italics (`englishRuns` in `src/data/chapter.ts` cuts a chunk into runs), and the tutor is
sent them between asterisks, as Markdown italics (`markSupplied`: `*was* king of Salem *and* priest of God`), with a section of its
instructions saying what the marks mean ('Italic words' in `grinds/bible-talk.instructions/`).
The Weave still leaves a chunk with any supplied word in English.
The Weave's Order Greek (mw-5r3p30.250, `chunkOrder` in `src/data/weave.ts`) lays the English chunks out by `e[].g`: each chunk where its first Greek word stands, a chunk with no Greek behind the chunk before it in the English; a Greek word with no `e` is drawn in neither order.

Links are mutual: `e[g[i].e].g` contains `i`, and every `g[e[j].g[k]].e` is `j`.

In the MSB table a word whose English is `-` or `vvv` has no English (no `e`, no chunk). A word whose English is
`. . .` is rendered by the chunk that completes it later in the English ("In all, then, there were fourteen
. . . generations"): its index joins that chunk's `g` array. Quotation marks and punctuation that sit on a word
with no English of its own move to the neighbouring chunk. Footnotes in the table (column 21, `footnotes`) are not carried into the chapters' words; the 'CT …' ones give the English of the New Testament's variant units ('Variant English' below).

Headings and paragraphs come from two columns of the table. `Hdg` (`<p class=|hdg|>Walking by the Spirit`) is on
the first word of the verse the heading comes before; the tag comes off and the text is `h`. `Par` is the paragraph
tag the MSB puts on a word: a verse gets `p: 1` when the tag on its **first** word opens a paragraph (`reg`, `red`
for the words of Jesus, or the first line of an indented block: `indent1stline`, `tab1stline`, `list1stline` and their
`red` forms). The indented lines inside a poetry block (`indent1`, `indent2`) are not paragraph starts. A paragraph
that starts in the middle of a verse is not carried: a break is only ever at a verse. The first verse of a chapter
starts a paragraph whether or not it has `p`; the reader treats it so.

## Variants

Each New Testament chapter carries `variants`: the apparatus of Robinson and Pierpont's 2018 edition, laid on the chapter's own Greek words
(`scripts/data/variants.ts`, run by `npm run data:build`; mw-9ji6ek0.1), each unit with its English, whether it changes the English and whose reading it is
('Variant English' below; mw-9ji6ek0.3). No screen reads it yet.

**Source.** <https://github.com/byztxt/byzantine-majority-text> at tag `v3.3.2`, `csv-unicode/ccat/with-variants`, the 27 book files
(`MAT.csv` to `REV.csv`, fetched from `https://raw.githubusercontent.com/byztxt/byzantine-majority-text/v3.3.2/csv-unicode/ccat/with-variants/<FILE>.csv`
into `data/raw/byztxt-v3.3.2/`, git-ignored; nothing of them is committed). The build checks the 27 files' bytes, one after another in
canon order, against one sha256, `VARIANTS_SHA256`:
`ef05d3a361c425bd3c2925251b3415efcd700899d360d524aab2da0aa9e99397`, and stops on any other. `PA.csv` (the Pericope Adulterae's own
Byzantine text) and `ACT24.csv` (Acts 24:6-8 as the minority has it) are other texts with their own units, not the apparatus of the
text the table has, and are not read; `JOH.csv` holds John 7:53-8:11 with its NA units. Public domain, like the edition.

**A unit** in the files is `{CODE base > reading = reading }` set in the verse's text after a word of its base (usually the first,
not always: Revelation 17:8 `τὰ {NA τὰ ὀνόματα > …} ὀνόματα {Byz τὰ ὀνόματα > …}`); `-` as a reading leaves the base out, `{NA ~ }` says
the NA text leaves out the whole verse (11 verses, John 5:4, Romans 16:24 and others), and `…` in a base and its reading marks words apart
(Mark 4:8 `ἐν... ἐν... ἐν`). The code, as the files spell it and as a chapter keeps it (byztxt's converter expands Robinson's CCAT
letters, which the chapter keeps):

| File | Chapter | Whose reading |
| --- | --- | --- |
| `Byz` | `B` | where the Byzantine manuscripts divide, their other reading (Robinson's own apparatus) |
| `NA` | `N` | the Nestle-Aland text, 27th and 28th editions |
| `NA27/28` | `C` | NA27 and NA28 together (only in Acts, beside the `M` units) |
| `NA27` | `S` | NA27 only (only in James to Jude) |
| `NA28` | `E` | NA28 only (only in James to Jude) |
| `ECM` | `M` | the *Editio Critica Maior* (Acts) |

**Aligning.** The table's Greek is the 2005 edition and the apparatus the 2018's: they differ at six words, all in accent or capital
(`docs/greek-edition.md`), and the table sets a few hundred words in another place. So words are matched by their letters alone (no
accents, breathings or case, final sigma as sigma, the marks beside a word off): the unit's base is found among the 2018 verse's words
nearest its brace, the 2018 verse is lined up with the table's verse (longest common run of letters), and each base word is carried to
the table word it lines up with. A base not carried whole is looked for again with the 2018 verse lined up against the table's verse
before, the verse itself and the verse after (Matthew 15:5's last words are the start of the table's 15:6), and laid there when all its
words land in one verse; words that stand together in the base are kept together. A `~` unit is on every word of the verse. Units on
the same words of a verse are one unit, with the readings of each in the files' order (Revelation 3:2: one unit on ἔμελλες ἀποβάλλειν,
two `B` readings and one `N`).

| Key | Meaning |
| --- | --- |
| `v` | the verse (it can be the verse before or after the one the files set the unit in, as above) |
| `w` | indexes into that verse's `g`, in Greek order |
| `base` | the 2018 text's words there, as the apparatus writes them (`…` kept); for a `~` unit the verse's words |
| `alts[].code` | `B`, `N`, `C`, `S`, `E` or `M` |
| `alts[].text` | the reading as the apparatus writes it (NA's `[ ]` and `[[ ]]` kept); `""` when it leaves the base out |
| `alts[].g` | the reading's words one by one, each a `g` word as above (`t`, `tr`, `s`, `l`, `p`): `t` is the word with the apparatus's brackets and marks off, `tr` is `""`, and `s`, `l`, `p` are its Strong's number, lemma and parsing where the text has the form ('Tagged words' below); `[]` when the reading leaves the base out. The chapter's `lex` and `parse` hold the entries these words use |
| `alts[].apart` | `true` when the reading has an ellipsis (`ἓν... ἓν... ἓν`, `ὃ μὲν... ὃ δὲ... ὃ δὲ`): it is in pieces and cannot be laid over the text word for word; absent otherwise (its `g` still holds its words) |
| `english` | `{"source":"msb"\|"lampas","base":"…","alts":["…"]}`: the base in English and each of `alts` in English, the same order ('Variant English' below) |
| `changesEnglish` | `true` when the English of the base and of any reading differ once case, punctuation and white space are set aside; `false` when the Greek differs (a spelling, a word order, an article) and the English does not, or when the verse reads the same either way (`src/data/variantVerse.ts`: the verse's chunks of the unit's words replaced by the base's English, and by the reading's, both give the verse itself, so 'that' / 'that I' before 'I love you' changes nothing; mw-9ji6ek0.14), or when the reading is the base's own Greek words in another order (`wordOrderOnly` in the same file: the same forms, case, punctuation and grave/acute set aside; Matthew 3:4 αὐτοῦ ἦν / ἦν αὐτοῦ; 632 units, mw-9ji6ek0.31; its sheet says 'Word order only: emphasis, not meaning'). The Reader's English filter (`shownUnits`) judges each reading the same way, with the chapter's verses; `npm run variants:sweep` re-judges the committed chapters (`-- --write` fixes the flag) |
| `witness` | `"byz"` (code `B`), `"na"` (`N`, `C`, `S`, `E`) or `"ecm"` (`M`); a unit with several codes takes the first class in that order |

Units are in verse order, then by their first word.

**Tagged words** (mw-9ji6ek0.21; `scripts/data/variantWords.ts`, run last in `buildData`, once every chapter and the RP 2026 overlay are laid). A reading is a string of
Greek the verse need not have, so each of its words is looked up in an index of every form the whole New Testament text uses (the inverse of
`scripts/build-lemma-forms.mjs`: a form -> the lemma, Strong's number and parsing it is used as). The form is matched whole first (lower case, a grave accent the
acute, so `καὶ` is `καί`); failing that by its letters alone (no accents or breathings), but only where every use of those letters is one Strong's number (`ἦ`
could be `ἡ` or `ἢ`, so it is left). Among several uses of a form the commonest wins (`λύει` indicative or subjunctive), a tie going to the book nearest the
chapter's in the canon. A form the text never has (`εἶπαν`, a numeral letter `ΙΒ`, `ἠμελλες`) keeps `t` alone with `s`, `l` and `p` `""`: no lemma is invented for it.
The build prints `variant words tagged: N of M` and writes the forms left alone to `data/variant-untagged.txt` (committed for review; one line a form: the form, how often
the readings read it, and the verse of its first reading). Because a chapter's fingerprint is its file's, the fingerprints in `index.json` are taken after the tagging.

**Tagged counts** (2026-10-28): 9,595 of 11,078 words of the readings tagged (86.6%); 1,053 distinct forms are left, mostly the New Testament editions' own spellings the
Byzantine text does not have (`εἶπαν` 86 times, `τεσσεράκοντα`, `ἔπεσαν`, `λήμψεται`, `Μωϋσεῖ`) and the letter numerals (`ΙΒ`, `ΚΔ`). Three readings are `apart`.
The chapters grew by about 1.1 MB in all (36.2 to 37.2 MB of JSON).

**Counts** (the build prints them; tag v3.3.2, 2026-10-27): 7,522 units in the files read, B 669, N 6,746, C 46, S 29, E 14, M 18
(Revelation B 350, N 443); 7,514 aligned (99.9%), in 7,200 units of the chapters (571 KB in all).

**Not aligned** (8; the build lists them as `not aligned:`):

| Verse | Code | Base | Why |
| --- | --- | --- | --- |
| Matthew 4:3 | N | αὐτῷ ὁ πειράζων εἶπεν | the table's order is ὁ πειράζων αὐτῷ εἶπεν |
| Matthew 5:25 | N | ἐν τῇ ὁδῷ μετ’ αὐτοῦ | the table has μετ' αὐτοῦ ἐν τῇ ὁδῷ, the NA's order |
| Matthew 13:51 | N | Λέγει αὐτοῖς ὁ Ἰησοῦς | the table's Greek order for the verse is out of order (Λέγει ταῦτα ὁ αὐτοῖς … Ἰησοῦς) |
| Acts 25:25 | N | πέμπειν αὐτόν | the table's verse ends ἔκρινα πέμπειν, without αὐτόν |
| Romans 14:26 | N | 14.24--26 | not a reading of words: the NA prints 14:24-26 elsewhere (as 16:25-27) |
| Revelation 11:16 | N | οἱ ἐνώπιον τοῦ θρόνου | the table has ἐνώπιον τοῦ θεοῦ, without τοῦ θρόνου |
| Revelation 11:16 | B | τοῦ θρόνου | the same |
| Revelation 13:1 | N | ἐστάθην | the table ends 12:17 with Καὶ ἐστάθην …, in another chapter |

## Variant English

Every unit has `english` (mw-9ji6ek0.3), from one of two sources, and the chapter build stops on a unit with neither, naming the verse
(`Revelation 3:2: the variant unit "…" has no English (…); run npm run variants:english`).

**`msb`: the MSB's footnote.** The table's column 21, `footnotes`, is read into `TableWord.note` (`scripts/data/bereanTable.ts`). A footnote that begins
`CT` is the critical text's reading against the MSB's own (Byzantine) one: `CT <i>King Herod</i>` on a word says the CT reads "King Herod" there.
`parseFootnote` (`scripts/data/variantEnglish.ts`) reads the first `<i>…</i>` (later ones are other witnesses, `; GOC and TR <i>…</i>`, or other
renderings, `or <i>…</i>`) and its kind: `CT does not include <i>X</i>` (X is left out), `CT includes <i>X</i>`, or a reading in place of the MSB's. The build lays a footnote on the
unit of its verse that holds the footnote's word (the narrowest, and one unit per footnote) when the unit has **one** other reading and it is not a Byzantine
split (`B`): then `english` is `{source:'msb', base, alts:[alt]}`, the alt being the footnote's English and the base the MSB's own English of the unit's words (the
chunks `e` that hold them, which can be more than the unit's words) or, for an omission, the footnote's X with the alt `""`. `CT includes …` and an
omission of part of a base are not laid (the unit's alt text is more than the footnote says): those units are made like the rest.

**`lampas`: made by the tutor's model.** `npm run variants:english` (`scripts/variants-english.ts`, on the home host, where `claude` runs; `--raw <dir>` where the downloads are)
asks sonnet, the tutor's model, for each unit the footnotes do not speak for: the verse in Greek and in the MSB's English, the base and the other readings with the lemma
and gloss of each of their words (from the lexicon of the whole text), 25 units a request. The answer is the English of the base and of each reading, 1-6 words
each (`""` for a reading that leaves the base out), in the verse's own vocabulary and with the same English for the same Greek word. Each answer is checked
(`problemsWith`): the word count, no Greek letters or brackets, and against the Greek lemmas: a reading with a noun, verb or adjective whose lemma is known must share
the first four letters of one English word with the gloss or definition of one of them. An item that fails is asked again with what was wrong, twice; one that still fails
is kept and listed when the script ends (the lexicon's gloss can be wrong for a name: Ἀσά is "Asaph" in TBESG). The result is `data/variant-english.json`, committed, one entry to a line:
`"mat 1:5 w4-5 6c2914bf": {"source":"lampas","base":"Boaz out of","alts":["Boes out of"]}`. The key is the book code, the verse, the first and last word of the unit and eight hex
digits of the sha256 of its readings, so an entry for a unit whose readings changed is not found (the unit is rendered again, the old entry dropped). A second run with nothing
new renders nothing and changes nothing.

Units from the files and from the table are never changed by the model: it only writes English beside them. To correct an entry, edit it in the file (the next run keeps it).

**Counts** (2026-10-27): 7,198 units in the chapters: English `msb` 908, `lampas` 6,290 (`data/variant-english.json` holds 6,292 entries: two are for units the RP 2026 overlay then dropped); `changesEnglish` 5,251 of 7,198 on 2026-10-29 (5,879 on 2026-10-27, before the 628 word-order-only units of mw-9ji6ek0.31 stopped counting; 5,901 before the verse-level compare of mw-9ji6ek0.14: 22 units whose verse already says the reading's extra word, such as Revelation 3:9 'that' / 'that I', no longer count); `witness` `byz` 667, `na` 6,527, `ecm` 4 (the 18 `M` units mostly share words with a `C` or `N` unit, which is the first class). The build prints these as `variant English:`, `variants that change the English:` and `variant witness:`. 13 entries that came back over six words (long bases of Mark 3, 4, 6, 9, 13, 1 Corinthians 9:20, Jude 1:23 and 25, Revelation 1:2) were shortened by hand in the file; the script’s check still lists about 130 readings whose English shares no beginning with the lemma’s gloss (irregular verbs, "if" for εἰ, names), which are left as they are.

## The RP 2026 overlay

The Robinson-Pierpont 2026 text words five verses otherwise than the 2018 text the apparatus is of; `data/rp2026-overlay.json` holds those changes and
the New Testament build lays them on the Greek it writes (`scripts/data/rp2026.ts`, run by `npm run data:build`; mw-9ji6ek0.2).

**Source.** <https://byzantinetext.com/wp-content/uploads/2026/10/ByzASCII.zip> (the "Clearview Press 2026 Edition" download on
<https://byzantinetext.com/study/editions/robinson-pierpont/>), sha256 `527149c3081647b7f36e370d12da9f7e331e0e087f82b5410944fba4e5b306c1`, fetched
into `data/raw/rp2026/` (git-ignored); the build stops on any other bytes. Its 27 files (`MT05.ASC` … `RE05.ASC`: the names are the 2005 release's) are
ASCII: each verse is a reference line (`11:16`) and wrapped lines of Greek in letters, `v` the final sigma, `y` theta, `q` psi, `c` chi, `x` xi, `f` phi,
with no accents, breathings, capitals or punctuation. Nothing of it is committed but the overlay the build writes. Public domain, like the edition.

**The overlay.** For every verse the build lines the 2018 base (the words of `with-variants` with its units taken out) up with the 2026 words by their
letters only (no accents, breathings or case, final sigma as sigma, no elision apostrophe), and each run of words that differ becomes an entry:
`{"book":"Revelation","chapter":13,"verse":14,"from":["εἶχεν","τὴν","πληγὴν"],"to":["ειχεν","πληγην"]}`: the 2018 words (accents as the base has
them) and the 2026 words (Greek letters), each with the word before and the word after the change, so that the entry says where it is. Two runs with one
word between them are one entry (Philemon 1:1 swaps χριστοῦ and Ἰησοῦ). The build prints `RP 2026 overlay: 5 entries in 4 books (Matthew 1, Romans 1,
Philemon 1, Revelation 2) …` and the verses. `docs/greek-edition.md` lists them.

**Laying it on.** After the apparatus, in `applyOverlay`: the entry's 2018 words are found in the chapter's verse by their letters and become the 2026
words. A word in both lists keeps its own entry in the verse (its lemma, parsing code and English), also when it moves; a word spelled otherwise keeps its
Strong's number, lemma and parsing code, takes the 2026 letters with the old word's accents where the letters are the same (γεννήματος → γενήματος) and
the beta-code of the 2026 word as its `tr`; a word the 2018 words have and the 2026 words lack goes (Revelation 13:14 τὴν), the verse's `g` indexes in the
chunks `e[].g` and in `variants[].w` moving with them. A variant unit left with no word, or whose other readings now read as the text, is dropped (the
build counts them: the `B` unit on τὴν in Revelation 13:14 and the `N` unit on γεννήματος in Matthew 26:29). The table's Greek is the 2005 edition,
so a verse can read the 2026 words already: Revelation 11:16 (no τοῦ θρόνου, which 2018 added) and Romans 13:9 (εαυτόν, where 2018 has σεαυτόν) are
left as they are and counted as `already read so`. An entry whose 2018 words are in the verse neither way fails the build, naming the verse; so does a
word the 2026 text adds (it would have no lemma), and an English chunk left with no Greek. The five entries: Matthew 26:29 (γεννήματος → γενήματος),
Romans 13:9, Philemon 1:1, Revelation 11:16 and 13:14.

## The RP 2026 English

The MSB's English is of the Robinson-Pierpont 2005 Greek, so a change the 2026 text makes to the 2018 wording can leave the MSB's English right or can need other
English (mw-9ji6ek0.32). `data/rp2026-english.json` holds, for each entry of `data/rp2026-overlay.json` (keyed `Philemon 1:1 <8 hex of its words>`, so a changed
overlay makes a stale entry the build names rather than a wrong one), whether the English changes: `changesEnglish`; the MSB's English for the affected words
(`msb`); Lampas's own English for them (`lampas`, `null` unless `changesEnglish`); a `note`; and its `provenance`: `greek` (the Robinson-Pierpont 2026 text, the
ByzASCII.zip of byzantinetext.com, and its licence: the editors' page says of that file 'This file may be freely distributed by anyone without any restrictions',
checked 2026-10-28), `msb` (public domain), `decision` (the model and the date) and, only where there is Lampas English, `rendering` (`Lampas rendering, AI-made
at build time`, the model, the date). An entry whose 2026 words are the 2005 words (Romans 13:9, Revelation 11:16) never changes the MSB's English; one that
changes only a shade the MSB's English never rendered (the article of Revelation 13:14, which 'had been wounded' leaves out) is left as the MSB has it.

The build (`runBuild`, after the overlay report) stops, naming the verse, on an overlay change with no entry, an entry for a change no longer in the overlay,
Lampas English on an entry that does not change the English (or none on one that does), or a missing provenance (`checkRp2026English`,
`scripts/data/rp2026English.ts`), and prints `RP 2026 English: 5 changes, 1 alters the English, 4 do not` and the verses that alter it with both Englishes.
Nothing lays this English on the chapters yet: it is the data a setting would read. A new overlay change needs its entry written by hand, with the model that
decided it named in the provenance; there is no script that renders it yet. Entries: Matthew 26:29 (γεννήματος/γενήματος, 'fruit': no), Romans 13:9 (no),
Philemon 1:1 ('of Christ Jesus' → 'of Jesus Christ': yes), Revelation 11:16 (no) and 13:14 (no).

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

## The maps' index (not in `public/data`)

`src/maps/data/biblemapper.json` (about 140 KB, committed) is Bible Mapper's list of maps and the maps of each chapter, compacted by `npm run maps:build` (`scripts/maps-build.ts`). It is not Bible text and
is not under `public/data`: the app loads it as its own chunk, on the first ask for a chapter's maps. Its shape, refresh and terms are in `docs/maps.md`; `ATTRIBUTION.md` credits Bible Mapper.

## The Logos Atlas's map list (not in `public/data`)

`src/maps/data/logosatlas.json` (about 210 KB, committed) is the list of maps of the Logos web atlas: 261 maps, each with its id, title, period, order and the passages it is tagged to. It is copied as it was read (by hand once, signed in), not built, and holds no map, image or text. The app loads it as its own chunk, on the first ask for a verse's maps while Logos is On. Its shape, the book numbers and how it is refreshed are in `docs/maps.md`; `ATTRIBUTION.md` credits it in the Logos bullet.

## The Old Testament data

`scripts/data-build-ot.ts` (`npm run data:build:ot`) writes `public/data/<code>/<n>.json` for the 39 books and their 929 chapters, `lexicon-hbo.json` and `frequency-hbo.json`, and adds the 39 to `index.json`. Screens open them since mw-5vvlay: the Reader's Hebrew view draws a chapter (`docs/layout/reader.md`), the word sheet shows a word's gloss, definition and parsing (`docs/layout/word-sheet.md`), and the tutor is sent the verse's Hebrew words (`docs/hebrew.md`). `pwa-precache.ts` is not widened, so the Hebrew lexicon and frequency files (`lexicon-hbo.json`, `frequency-hbo.json`) are not precached and the install stays the same size (the epic's story d decides if they should be). **The gloss rules**: a Strong's number with several TBESH lines resolves to its first, except that a first line which is only the part of a name (`H1709G` 'Fish (Gate)': a capitalised or bracketed gloss on a word the morph does not call a name, its second column a bare `=`) gives way to the first plain line after it that is no such part (`H1709H` 'fish'); a line that is a related sense ('a Name of', 'in Hebrew of', 'a Meaning of') is never passed over, and the Greek's resolve to their first as ever (`parseTbes`, `tests/unit/tbes-parse.test.ts`). A verb whose definition gives a stem a sense of its own ('1c) (Piel) to appoint, ordain') gives a word in that stem a gloss of its own: `g[].gl`, below. Both rules were added in mw-gdcyf98.7 and the Old Testament chapters rebuilt.

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
Tests use `tests/fixtures/data/bsb_tables_slice.tsv` (the header and the verse groups of Genesis 1:1-5, Jonah 1:1-3 and 1:17 and Daniel 2:4) and `tbesh_slice.txt`, made from the real files with
`awk -F'\t' -v refs='Genesis 1:1|Genesis 1:2|Genesis 1:3|Genesis 1:4|Genesis 1:5|Jonah 1:1|Jonah 1:2|Jonah 1:3|Jonah 1:17|Daniel 2:4' 'BEGIN{n=split(refs,a,"|");for(i=1;i<=n;i++)want[a[i]]=1} FNR==NR{ if($13 in want) g[$4]=1; next} FNR==1||($4 in g && $5!="Greek")' bsb_tables.tsv bsb_tables.tsv`
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
| `g[].gl` | the word's own gloss, only where it differs from its lemma's (`lex[s].g`): a verb in a stem (Niphal, Piel, Pual, Hiphil, Hophal, Hithpael; the Qal is the lemma's) whose TBESH sense begins with 'to ' gets that sense's first meaning, cut at a comma, a semicolon, a bracket or ' or ' (Jonah 1:17's וַיְמַן, the Piel of H4487: `gl` 'to appoint', the lemma 'to count'). `lex[s]` keeps the lemma's gloss and definition; `wordGloss` reads `w.gl ?? lex[w.s].g`, so the word sheet, the tutor's `hebrew_words` and the frontier read it too |
| `g[].e` | the index into the verse's `e` array of the English chunk this word is part of; absent for a word the table gives no English (`אֵת`, the direct object marker) |
| `e[].t`, `e[].g`, `e[].s`, `verses[].h`, `verses[].p` | as for the New Testament |
| `parse` | the short code -> the table's LONG parsing column (`V-Qal-Perf-3ms` -> `Verb - Qal - Perfect - third person masculine singular`): no code table of ours. `N-msc \| 1cs` is read two ways in the table, 1,457 times as a noun with a suffix and once as a 'Preposition'; `PARSE_FIXES` settles it, and any other code read two ways stops the build |
| `lex[].g`, `lex[].d` | the TBESH gloss (cleaned of its `range: chosen` form, as the Greek's) and definition (markup, references and daggers off, cut at 300 characters) |

* **Aramaic.** The Aramaic verses of Daniel (2:4 to 7:28), Ezra and Jeremiah 10:11 are rows with `Language` `Aramaic` and are kept as words of their `hbo` chapter; a per-word language mark is LATER.
* **TBESH keys.** A Strong's number with several senses is `H0834a`, `H0834b` ... in the file; the number resolves to the first (`a`), as the Greek resolves to its first entry. `H0001` with several entries resolves to the first too, save the name-part case of the gloss rules above.
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

### The offline copy (`src/data/offlineCopy.ts`, mw-lcv9z3g.1)

A chosen scope keeps chapters ahead of reading, with no screen yet. Three scopes, saved as `offlineCopy` in the settings store (outside the registry, like `dailyDone`; `getOfflineScope` gives `'none'` for anything else): `'none'` (only what he has read, as above), `'nt'` (the 260 chapters of the 27 Greek books, about 34 MB) and `'all'` (the 1,189 chapters of the 66 books and the two Hebrew lists `lexicon-hbo.json` and `frequency-hbo.json`, about 113 MB).
Every file is fetched by the address the Reader uses (`chapterUrl`, `?v=<fingerprint>` from `index.json`), so the worker's `serveChapter` keeps it in `lampas-data-v3` and drops an older copy: **a kept chapter is the one at `index.json`'s fingerprint**, and after a deploy that changes a chapter the copy runs again and fetches only the changed ones. The Hebrew lists are asked for plain and kept as they first came.
A run asks the cache from the page (`caches.open(DATA_CACHE).match(url)`, no HEAD) and fetches only what it lacks, at most 3 at once, each under `within()`. A fetch that fails is tried once more and then listed in `failed`, never thrown; `{done, total, bytes, failed, paused}` goes to `onOfflineProgress` listeners and ends at `done === total`. The `offline` event pauses it (no new fetch starts) and `online` goes on. The page's fetch is kept only when the worker controls the page.
**The copy is refreshed** (mw-lcv9z3g.3) by `refreshOfflineCopy`: once at app start, after the first render (`src/main.tsx` never awaits it and an update check that ends before the render waits for it), and after each update check of pwa-kit's `startAppUpdates` (every 30 minutes and on return to the foreground) that ends, through `updateChecked`, which wraps the registration's `update()` and does nothing when the check fails (offline). It is no network check of its own: it compares the index's addresses with the data cache (`caches.match`), and a changed fingerprint is a missing address, so only the changed chapters are fetched, and `serveChapter` drops each older copy. The index is the bundle's: a new build's `index.json` is read only once the build has taken over and the page has reloaded, so the refresh at the next app start is the one that fetches it. With scope `'none'`, or a copy run already going, nothing is done; otherwise the time of the check is saved as `offlineCopyChecked` (`getOfflineCheckedAt`, ms since 1970), for the settings row that will show it.

## The places of each book (not in `public/data`)

`src/maps/data/places/<book>.json` (62 files, the largest about 67 KB, committed) is STEPBible's TIPNR cut into the places each book names, with their verses, Strong's numbers, positions and regions, by `npm run places:build` (`scripts/places-build.ts`).
It reads the committed chapter files (`public/data`) only to note where in a verse a place stands. It is not Bible text; the app loads a book's file as its own chunk, on the first ask for a verse's maps. Its shape, refresh and the matching of names are in `docs/maps.md`; `ATTRIBUTION.md` credits TIPNR.
