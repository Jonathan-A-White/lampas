# The Septuagint derivation: lemma and parsing for Swete's Greek

How Lampas derives a lemma and a parsing for each word of Swete's Septuagint, written so that anyone can rerun it and check it. The method was
measured by the probe (`docs/sources/lxx-derivation-probe.md`, story mw-cbsbw9q.3, whose script `scripts/lxx-derivation-probe.mjs` stays as its
record); this is the tested pipeline under `scripts/lxx/` (story mw-u2w5klk.1 onward). What the files may be shared under is in `data/lxx/README.md`
and `data/lxx/LICENSE` (MIT for Lampas's own data; STEPBible credited, CC BY 4.0).

<!-- toc -->

- [The layers](#the-layers)
- [Layer 1 in detail](#layer-1-in-detail)
- [Layer 2 in detail](#layer-2-in-detail)
- [The agreement check](#the-agreement-check)
- [Swete's tokens](#swetes-tokens)
- [The files](#the-files)
- [The commands](#the-commands)
- [The sources](#the-sources)
- [Checking it](#checking-it)
- [What the move from the probe changed](#what-the-move-from-the-probe-changed)

<!-- /toc -->

## The layers

Each word is looked up in three layers, in order. A word keeps the layer that gave its answer and a confidence.

| Layer | What it does | State |
| --- | --- | --- |
| Layer 1, TAGNT form | The word's form as STEPBible's TAGNT has it anywhere in the New Testament, taken when TAGNT gives it one analysis, or one with at least 95% of 20 or more words | built (`scripts/lxx/tagnt.ts`, `derive.ts`) |
| Layer 2, parser | For a form the New Testament lacks: ending rules learned from TAGNT's (form, lemma, parsing) triples, proposing only lemmas in TBESG; then Swete's other spellings; then analogy. Taken when one candidate is left, or one with 90% of the support | built (`scripts/lxx/parser.ts`, `tbesg.ts`, `derive.ts`) |
| The agreement check, layer 2a | Before the model: an answer whose ending two cases or genders share is demoted to its candidates; a name the New Testament has, written here in lower case, goes to the model; within a verse an article, adjective or participle must agree with its noun, a settled pair that does not is a break (both to the model), and a word left with exactly one candidate that agrees with its settled neighbours takes it as layer 2a | built (`scripts/lxx/agreement.ts`, `derive.ts`) |
| Layer 3, model choice | A model reads the verse and chooses among the candidates, or guesses (marked) when there are none | to come; no paid API: a Builder's own session |

Until layer 3 exists, every word that layers 1 and 2 and the agreement check do not settle is **pending**, with its candidates.

## Layer 1 in detail

`scripts/lxx/tagnt.ts` reads every word row of the two TAGNT files (`readTagnt`) and builds the form index (`formIndex`):

- **The key** (`keyOf`, `scripts/lxx/swete.ts`): punctuation and brackets dropped, lower case, a grave accent read as acute, an enclitic's second
  accent dropped (`ἐξέθρεψέν με` is looked up as `ἐξέθρεψεν`), an elision mark written `’`, NFC. A noun's semantic tags are dropped from TAGNT's code
  (`N-NSM-T` is `N-NSM`): they say what a name refers to, not how it is inflected.
- **Capitals with no accents** (`ΕΝ ΑΡΧΗ` at a book's opening) are matched on a second key with every mark dropped and final sigma as sigma (`bareOf`).
- **The 95%-of-20 rule** (`settle`): the form's first analysis is taken when it is the only one, or when it has at least 95% of 20 or more New Testament words.
  Confidence 0.97 for one analysis seen three times or more, 0.90 for one seen once or twice, the share x 0.97 for a dominant one.
- **Swete's spellings** (`spellings`): when the form is not found and the parser (layer 2) finds nothing for it either, other spellings are tried once
  each, in turn, on the second key: ει read as ι (`Δαυείδ`), ι read as ει (`ἴδεν` as `εἶδεν`), the movable ν added after -σι, -ξι, -ψι or -ε (`πᾶσι` as
  `πᾶσιν`) or dropped after them. The first that the New Testament has gives the candidates as a layer-1 answer, and the row says which (`notes`); a
  spelling the New Testament lacks is parsed, and the first the parser analyses gives layer 2's candidates.

A form with several analyses and none dominant is pending with its candidates (`several analyses: for the model`). A form the New Testament lacks goes
to layer 2.

## Layer 2 in detail

`scripts/lxx/parser.ts` is the paradigm parser, trained on the same TAGNT rows as layer 1 (a hidden book left out of both) with TBESG's lemmas
(`scripts/lxx/tbesg.ts`). On the whole New Testament it learns 2,083 ending rules from 18,914 distinct (form, lemma, parsing) triples; TBESG gives 10,941
one-word lemmas. The run prints these counts. Letters are compared without accents or breathings, in lower case, final sigma as sigma (`bareOf`).

- **Undoing the augment, reduplication or a compound's prefix** (`unaugment`). A form is read as it stands and also: with `ἐρρ-` as `ρ-`; with a syllabic
  `ε-` before a consonant dropped (`ἐποίησεν`, `ποιησ-`); with a temporal augment read back (`ηὐ-` as `εὐ-` or `αὐ-`, `η-` as `α-`, `ε-` or `αι-`, `ει-` as
  `ε-`, `ω-` as `ο-`); with a reduplication dropped (a consonant, ε, and the same consonant or its aspirate: `πεπληρ-`, `τεθ-`); and inside a compound of one
  of 18 prepositions, with the augment after the prefix undone, the prefix written whole and assimilated where Greek assimilates it (`ἐπεφέρετο` as
  `επιφερετο`, `ἐνέβλεψεν` as `εμβλεψεν`, `συνεκάλεσεν` as `συγκαλεσεν`). Each reading is tried once.
- **A rule** (`ruleOf`, `trainRules`). Each triple is matched against its lemma by the reading that shares the most letters with it (two at least); what is
  left on each side is the rule, kept with the reading's kind: `ἐπεφέρετο` / `ἐπιφέρω` / V-IPI-3S is 'with the augment undone, -ετο for the lemma's -ω is
  V-IPI-3S'. A rule's weight is the number of New Testament lemmas that show it.
- **Parsing a form** (`parse`). For each reading and each ending of up to 12 letters (leaving two), each rule for that ending puts the lemma's ending on the
  stem. A candidate is kept only when the result is a **TBESG lemma** and the parsing **fits the lemma** (`fits`): the New Testament shows the lemma with
  that part of speech (and, for a noun, that gender), or else TBESG's row allows it: a noun's gender must be one the row gives (`G:N-M/F`), an adjective's
  row also takes an adverb, any other part of speech must match. A candidate's support is the weight of every rule that gives it, summed.
- **Analogy** (`byAnalogy`), only when the rules find nothing for the form or any of Swete's other spellings: a New Testament form sharing the form's
  first letters (four at least, the most first) gives its lemma, and its ending beside the form's ending gives the parsing, as other lemmas show that pair
  of endings (a form in `-ωσαν` beside a New Testament form in `-ω` takes the parsing other lemmas' `-ωσαν` forms have beside their `-ω`). The row notes `analogy: a sibling form in the New Testament`.
- **The 90% rule** (`settleParsed`): layer 2 takes the first candidate when it is the only one or has at least 90% of the support. Confidence 0.75 x its
  share. Otherwise the word is pending with every candidate (`several candidates: for the model`), or with none (`no candidate: for the model to guess`).
- **The order**: most support first, then by lemma and parsing (analogy: by parsing, then lemma), never by the order of the files.

**Known weak spots.** In the probe's sample of the whole of Swete, 27.3% of the words whose form the New Testament lacks got no candidate at all: mostly
lemmas TBESG lacks, irregular stems the rules cannot reach from the lemma (`Γενηθήτωσαν` has no rule and no sibling with that pair of endings), and
lexicon entries that refuse the right parsing: TBESG lists `μακρότης` as masculine (`G:N-M`), so the feminine `μακρότητα` (Ps 22:6) gets nothing until the
lexicon is fixed or a later layer reads it. An ending two genders or cases share is settled by the 90% rule on the New Testament's evidence alone
(`ἕρπον[τι`, Gen 1:30, masculine where it goes with a neuter noun): the agreement check below demotes such an answer before the model.

## The agreement check

`scripts/lxx/agreement.ts` runs after layers 1 and 2 and before the files are written (`checkAgreement`, called by `deriveBook`), from the probe's
'Error checks for the full run', 2(a) and 2(b). It reads one book's words verse by verse, and its rules are data (`SHARED_ENDINGS`, `TAGNT_EVIDENCE`,
`LINKS`), each with the comment this section copies. Its tests are `tests/unit/lxx-agreement.test.ts`; each rule below names its test there. In order:

1. **A name written in lower case** (test: 'sends χλόης (Ps 22:2) to the model'; 'keeps a name the text writes with a capital'). A form whose every New
   Testament word TAGNT tags a person or a place (`-P`, `-L`), or a title whose lemma it writes with a capital (`Χριστός`, `-T`), and which the text writes
   in lower case, goes to the model with the note `a name in the New Testament: lower case here, for the model`: `χλόης` (grass, Ps 22:2) is in the New
   Testament only as Chloe. TAGNT also tags every `θεός` and `κύριος` a title (`-T`); they are common nouns, and stay in layer 1.
2. **The shared-ending rule.** A layer-1 or layer-2 answer whose ending is in a class below is not settled on the New Testament's evidence alone: the word
   is demoted to pending with the note `shared ending: <class>: for the agreement check or the model`, its candidates its own (layer 1's analyses or the
   parser's) and, at support 0, every reading of the same lemma the ending can be. Not the parser's candidates for a form the New Testament has: its rules,
   learned from other lemmas, offer tagged and stray readings (`ἁγίῳ` as `A-DSN-LG` and `A-DSF`) that only blur the choice. A word in several classes
   takes the readings of each and the first one's name.
3. **The agreement links** (`agree`), within a verse; no link reaches past a mark of punctuation Swete prints after a word (a comma, a colon or high point,
   a full stop, a question mark; his brackets are read past: test 'reaches past no mark of punctuation'). First the breaks: two settled words joined by a link that breaks and not agreeing in gender, number
   and case are a **break**, counted once, and both go pending with the note `agreement break: <link> with <ref>: for the model`. Then, until nothing
   changes, a pending word (demoted or not) whose candidates leave **exactly one** agreeing with every settled word it is linked to takes it as **layer
   2a**, confidence 0.85, the candidate first and the note `agreement: <link> with <ref>`; a word settled so is a settled neighbour on the next round. A
   link that only chooses narrows what the others leave, and is set aside where it would leave nothing. Where two candidates agree the word stays pending:
   the check never guesses (test: 'never guesses: where two candidates agree'). A word plays a part in a link when its settled answer is of that part, or
   its candidates of that part hold at least half its support (`τοῦ` with `ὁ T-GSM`, `ὁ T-GSN` and a stray `αὐτός P-GSN` is an article; `ὃ` with `ὅς
   R-ASN` and a stray `ὁ T-NSM` is not); only those candidates take part.

The shared-ending classes (`SHARED_ENDINGS`, then `TAGNT_EVIDENCE`), each with its test in `tests/unit/lxx-agreement.test.ts`:

| Class | Parts of speech | Readings that share one form | Why | Test |
| --- | --- | --- | --- | --- |
| masculine accusative and neuter in -on | an adjective whose lemma ends in -ος; a participle not active, in -μενον | ASM, NSN, ASN | `χλωρόν` (Gen 1:30) with `χόρτον`, masculine, given neuter. A comparative (`μεῖζον`, masculine `μείζονα`) and an active participle (masculine `-οντα`; `μένον`, John 1:33, only looks like `-μενον`) are not in it | 'masculine accusative and neuter in -on: …' |
| neuter nominative and accusative | a noun, and every part with a gender | NSN, ASN; NPN, APN | every neuter has one form for both cases (the probe named -ον and -α; -ος and -ο are the same): `ποιοῦν` (Gen 1:11, 1:12) and `μένον` (John 1:33) given nominative, accusative needed | 'neuter nominative and accusative: …' |
| masculine and neuter genitive and dative singular | every part with a gender (an adjective, the article, a pronoun of the third person or another kind, a participle); never a noun, whose gender is its own | GSM, GSN; DSM, DSN | `αὐτοῦ` and `αὐτῷ` of `ξύλον` (Gen 1:11-12) given masculine; `ἕρπον[τι` of `ἑρπετῷ` (Gen 1:30) given masculine by the parser | 'masculine and neuter genitive and dative singular: …' |
| every gender in the genitive plural | the article, pronouns, an adjective whose lemma ends in -ος | GPM, GPF, GPN | `τῶν`, `αὐτῶν`, `τούτων`, `ὧν`, `ἁγίων` (Gen 1:9, `αὐτῶν`) | 'every gender in the genitive plural: …' |
| masculine and neuter genitive plural | any other adjective, a participle | GPM, GPN | `πάντων`, `ποιούντων` (the feminine is `πασῶν`, `ποιουσῶν`) | the same test |
| masculine and neuter dative plural | every part with a gender | DPM, DPN | `τοῖς`, `αὐτοῖς`, `πᾶσι`, `ποιοῦσι` (Gen 1:30, `πᾶσι` with `θηρίοις`) | 'masculine and neuter dative plural: …' |
| the New Testament's analyses differ only in case or gender | any, layer 1 only | the New Testament's analyses of the same lemma, part of speech and number | the ending is shared whatever the rows above say (`ἀόρατος`, masculine and feminine). A vocative is not counted (`ὁ θεός` as an address); an analysis seen in one New Testament word only is a slip of tagging, not evidence (`τόν` is `T-ASM` 1,628 times, `T-DSF` once) | "the New Testament's analyses differ only in case or gender: …" |

The links (`LINKS`):

| Link | Breaks? | What agrees | Test |
| --- | --- | --- | --- |
| an article and the word after it | yes | an article and the next word (past `δέ`, `γάρ`, `μέν`, `οὖν`, `τε`, `γε`, `δή`) when that word is a noun, an adjective, a possessive, a participle or an infinitive (an article before an infinitive is neuter singular). Not when it is another article (`τὸ τοῦ θεοῦ πνεῦμα`), a pronoun, or a genitive after an article in another case (`τὰ Καίσαρος`). Read the other way it is the rule that **a neuter noun in -ον or -α takes its case from its article** | 'settles τὸ before φῶς by agreement only when φῶς is itself settled'; 'gives a neuter noun in -ον or -α the case of its article'; 'reads past δέ'; 'marks a break'; 'takes no genitive after an article' |
| an article, adjective and noun | no, it only chooses | an article, an adjective and a noun in a row (`τὸ μέγα φῶς`): all three agree. Never a break: the adjective may stand for a noun with another noun after it (`ἡ νεωτέρα υἱόν`, Gen 19:38; `τῇ τρίτῃ ἡμέρα γενέσεως`, Gen 40:20), which the whole of Genesis showed | 'settles an article and adjective from the noun after them'; 'never counts a break from an article, adjective and noun' |
| a noun, then an article and adjective or participle | no, it only chooses | a noun, then an article with an adjective or participle (`τῷ ἑρπετῷ τῷ ἕρποντι`): the article and its word repeat the noun's gender, number and case. Never a break: the article may begin a phrase of its own (`ἐκάλεσεν ὁ θεὸς τὸ ξηρὸν γῆν`) | 'settles a repeated article and its participle'; 'never counts a break from a link that only chooses' |
| an adjective or participle beside a noun | no, it only chooses | an adjective or participle next to a settled noun (`πάντα χόρτον χλωρόν`, Gen 1:30); never a break: `ποιοῦν καρπόν` (Gen 1:11) is a participle and its object | 'settles χλωρὸν (Gen 1:30) as the masculine accusative'; 'settles ἁγίῳ (John 1:33)' |

**What it does to the sample** (the fixtures; the test file asserts each word by reference). Of the probe's eight layer-1 and layer-2 errors in Gen 1 and
Ps 22 and John's `μένον`: `ποιοῦν` (Gen 1:11, 1:12), `αὐτοῦ` and `αὐτῷ` of `ξύλον` (Gen 1:11, 1:12), `ἕρπον[τι` (Gen 1:30) and `μένον` (John 1:33) are
demoted, with the right reading among their candidates; `χλωρὸν` (Gen 1:30) is settled as `A-ASM` by `χόρτον`; `χλόης` (Ps 22:2) goes to the model as a
name in lower case. On John 1 with John hidden, all 31 words the check settles in layer 2a are TAGNT's answer, and of the 48 layer-1 and layer-2 answers
it demotes, the one that was wrong is `μένον`. Gen 1 has 178 words pending before the check and 161 after it (26 demoted, 43 settled by agreement, mostly
articles in the genitive and dative, no breaks); Ps 22 has 24 and 25. Agreement settles an article's gender and number but not, before a neuter noun,
whether it is nominative or accusative (`τὸ φῶς`, `τὰ ὕδατα`): most of the articles left are those, for the model.

**What it does to the whole file** (`npm run lxx:derive -- --all`, 2026-11-01, about 15 seconds): of 608,427 words, 27,765 are settled in layer 2a and
22,467 demoted; 144,631 are pending after the check against 148,918 before it, 2.9% fewer, not the third to a half the probe hoped for. The demoted words
are mostly pronouns (`αὐτοῦ`, `αὐτῷ`, `αὐτῶν`, whose gender comes from what they stand for, not a neighbour) and neuter nouns, nominative or accusative;
in Genesis 14 of its 1,291 are settled again. The articles left pending are, in Genesis, 661 `τό` and `τά` before a neuter and most of the rest before a
name the New Testament shows in another case (`τῷ Ἰωσήφ`), which needs both words chosen together. There are 412 breaks, 0.7 per 1,000 words, none
above 5 per 1,000 in any book (Susanna 3.4, the Letter of Jeremiah 3.1); read in Genesis and Isaiah they are layer-1 answers the article shows wrong:
`οἱ παῖδες` given feminine, `τὴν ἵππον` (the cavalry) masculine, `τῆς ὑδρίας` accusative plural, `τὴν Ῥαχήλ` nominative, `οἱ ψευδεῖς` accusative,
`ὁ αἰώνιος` feminine, `ὁ δεσπότης` vocative.

## Swete's tokens

`scripts/lxx/swete.ts` reads the two pinned files: `00-Swete_versification.csv` (`1	Gen.1:1`: each verse's first line) and
`01-Swete_word_with_punctuations.csv` (`3	ἐποίησεν`: one token a line). A verse runs from its first line to the line before the next verse's.

- **A reference** is the verse and the word's number in it: `Gen.1:20#13`. The editor's signs (`⸆`, `⸂⸆⸃`: a token of nothing but signs and
  punctuation) are not words: they are left out, not numbered, and counted (Gen 1 has five, in 1:13, 1:14, 1:19, 1:26 and 1:31).
- **Brackets** mark letters Swete supplied where Codex Alexandrinus is damaged (`πληθυ]νέσθωσαν`, `Ἐξαγαγ[έτω`). They are stripped for look-up
  and kept in the token's display text; the word's row notes them. One bracket can open in one word and close several words later.
- Swete writes accents as oxia (U+1F71), not tonos; the key's NFC makes them one.

## The files

Written under `data/lxx/` (both git-ignored until a book is committed whole; `.gitignore`). Tab-separated, a header row, one row a word in the
text's order, a newline at the end. A word is named by its `ref` alone: **no column holds Swete's Greek**. The lemma and the candidates are Lampas's
own derived data, and Greek.

`data/lxx/derived/<book>.tsv`, the settled words:

| Column | What it holds |
| --- | --- |
| `ref` | `Gen.1:20#13` |
| `lemma` | the dictionary form, NFC, as TAGNT writes it |
| `parsing` | TAGNT's code (`N-NSM`, `V-AAI-3S`, `T-GSN`, `PREP`) |
| `layer` | 1, 2 or 2a, the agreement check (later 3) |
| `confidence` | two decimals, as in 'Layer 1 in detail' and 'Layer 2 in detail'; 0.85 for layer 2a |
| `candidates` | every analysis found, most frequent first, as `lemma/parsing/support` joined by ` \| ` (`ἀρχή/N-NSF/8 \| ἀρχή/N-DSF/5`; a lemma may hold a space or a comma, never `/` or `\|`) |
| `notes` | `;`-separated, in words: `unaccented: matched without accents`, `capitals`, `brackets: letters Swete supplied`, `spelling: ei written i`, `spelling: i written ei`, `spelling: movable nu added`, `spelling: movable nu dropped`, `not in the New Testament: for the parser`, `analogy: a sibling form in the New Testament`, `shared ending: <class>: for the agreement check or the model` (a word settled again by agreement keeps it), `agreement: <link> with <ref>` (layer 2a, one for each settled neighbour) |

`data/lxx/pending/<book>.tsv`, the words still waiting: `ref`, `candidates`, `notes`, where the notes end with why it waits:
`several analyses: for the model` (layer 1's), `several candidates: for the model` (the parser's), `no candidate: for the model to guess`, or the agreement
check's: `a name in the New Testament: lower case here, for the model`, `shared ending: <class>: for the agreement check or the model`,
`agreement break: <link> with <ref>: for the model`. A candidate the shared-ending rule added has support 0.

`<book>` is Swete's book code in lower case: `gen`, `exo`, … `psa`, … (Swete's file has 60 books; Tobit and Daniel come in two forms each).

## The commands

From a clean checkout, Node 20 or later, with network access for the first run:

```bash
npm ci
npm run lxx:derive -- --book gen               # data/lxx/derived/gen.tsv and data/lxx/pending/gen.tsv, and the counts
npm run lxx:derive -- --book gen --hide jhn    # John's rows left out of the form index and the parser: a known-answer run
npm run lxx:derive -- --word Gen.1:20#13       # one word: its candidates, their support, the rule or analogy behind each; writes nothing
npm run lxx:derive -- --all                    # every book of the file, trained once: each book's two files, and one line a book
```

The run fetches the pinned sources into `data/raw/lxx/<repo>/<commit>/<path>` (git-ignored) unless they are there (`scripts/lxx/sources.ts`), and prints
the book's words, the editor's signs left out, the parser's triples, rules and lemmas, the words settled in layers 1 and 2, then the agreement check's
lines (`settled by agreement (layer 2a)`, `demoted by the shared-ending rule`, `a name in the New Testament, lower case here`, `agreement breaks: … breaks
per 1,000 words`, `pending before the agreement check: …; after it: …`), the words pending (and how many of those have no candidate), and a count of each
note. On the whole of Genesis: 32,635 words; before the check layer 1 23,148, layer 2 1,531, pending 7,956; after it layer 1 21,822, layer 2 1,486,
layer 2a 1,470, pending 7,857 (1,017 with no candidate), 1,291 demoted, 38 breaks (1.2 per 1,000). `--all` prints a line a book: book, words, layer 1,
layer 2, layer 2a, pending, pending before the check, demoted, breaks per 1,000. A second run writes the same bytes:
the candidates are ordered by support, then lemma, then parsing, never by the order of the files.

## The sources

| Source | Pinned at | Licence | Used for |
| --- | --- | --- | --- |
| Swete's Septuagint, eliranwong/LXX-Swete-1930: `00-Swete_versification.csv`, `01-Swete_word_with_punctuations.csv`, `LICENSE`, `README.md` | https://github.com/eliranwong/LXX-Swete-1930 commit `1d3efc3c63bd384a4f3f07ed37eef54b0d45ac33` | text public domain; packaging GPL-3.0 | the words and their references |
| TAGNT, `Translators Amalgamated OT+NT/TAGNT Mat-Jhn …` and `… Act-Rev …` | https://github.com/STEPBible/STEPBible-Data commit `be4191f0082aeedddb0eff0c02c966292b2bd641` | CC BY 4.0 | layer 1; the parser's rules |
| TBESG, `Lexicons/TBESG - Translators Brief lexicon of Extended Strongs for Greek …` | same commit | CC BY 4.0 | the parser's lemmas, a lemma's part of speech and a noun's gender |
| TVTMS (fetched, not read here) | same commit | CC BY 4.0 | English Ps 23 = Greek Ps 22 (`npm run lxx:english`) |

## Checking it

- **The tests** (`tests/unit/lxx-layer1.test.ts`, in `npm test`) run layer 1 on Swete's Gen 1 and Greek Ps 22 from `tests/fixtures/lxx/` and never the
  network: Gen 1 settles 545 of its 751 words and Ps 22 78 of its 104, the probe's counts; each rule above has a test. The fixture's TAGNT rows are thinned
  (the test's header says how), so the supports in a fixture run are not the New Testament's counts.
- **A word by hand.** For `Gen.1:11#20`: find `Gen.1:11` in the pinned `00-Swete_versification.csv`, read on from that line of
  `01-Swete_word_with_punctuations.csv`, counting only tokens with a letter in them, to the 20th; look its form up in TAGNT (or any lexicon) and compare
  the row's `candidates`.
- **The parser's tests** (`tests/unit/lxx-parser.test.ts`) run layers 1 and 2 on the same chapters and on John 1, from fixtures: Gen 1 settles 28 words in
  layer 2 and leaves 178 pending, Ps 22 2 and 24, the probe's counts; each rule of 'Layer 2 in detail' has a test. The fixture's TAGNT rows for the parser
  are thinned as layer 1's are (the test's header says how): every word's answer is the one the whole of TAGNT gives, the supports are not.
- **The agreement check's tests** (`tests/unit/lxx-agreement.test.ts`) assert each shared-ending class, each link, the name rule and the probe's wrong
  words by reference (see 'The agreement check'); the tests of layers 1 and 2 count what those layers settle before the check (`beforeCheck`).
- **One word by its rules.** `npm run lxx:derive -- --word Gen.1:20#13` prints the word, what the layers made of it and each candidate with its support and
  the rule (`rule: πετομ-ενα as πετομ-αι (4 lemmas)`: the form's ending, the lemma's, and how many New Testament lemmas show the pair) or analogy behind it.
- **The known answer.** `--hide jhn` leaves John's rows out of the form index and the parser's training. On John 1 (its 829 words in NA28, from TAGNT,
  read as a book: `tests/fixtures/lxx/swete-jhn-1.csv`) layer 1 settles 673, layer 2 25, all 25 right; the parser alone, its first candidate with no
  context, is right on the lemma for 80.9% and on lemma and parsing for 69.3% of the 681 words it analyses (the probe: 80.8% and 69.2%, one tie ordered
  differently). The per-book bar comes with layer 3.

## What the move from the probe changed

Layers 1 and 2 here and the probe's (no model choices) give every word of Gen 1, Ps 22 and John 1 the same layer, lemma, parsing and candidates. The
differences, all small:

- **The spelling fallbacks run after the parser again**, as in the probe (story B1a, with no parser yet, had tried them first and settled 484 words
  wrongly across the file, such as `γενέσεις` as `γένεσις`).
- **The movable ν only where Greek has it**, after -σι, -ξι, -ψι and -ε (B1a). The probe tried it after any -ι or -ε; with its parser first that changed
  few words, and here `φαίνειν` is parsed as the infinitive.
- **A reading is tried once.** The probe pushed a compound's augment-undone reading twice when the prefix elides (`επεφερετο` from `επ-` both as the
  prefix assimilated and as the prefix written whole), so such a rule's support counted double. Here each reading is tried once: no answer changes in the
  three chapters or the whole of Genesis; such a candidate's support no longer counts that rule twice.
- **Ties are ordered by code point**, lemma then parsing, where the probe used the locale's order (and, for analogy, the order of the files). That is
  the one difference left in John 1: the parser alone scores 80.9% and 69.3% here against the probe's 80.8% and 69.2%, one word more.
