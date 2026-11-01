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
- [The bar](#the-bar)
- [The known-answer run](#the-known-answer-run)
- [The choices file](#the-choices-file)
- [A model session](#a-model-session)
- [Morpheus, the second method](#morpheus-the-second-method)
- [The annotation file](#the-annotation-file)
- [The report](#the-report)
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
| Layer 3, model choice | A model reads the verse and chooses among the candidates, or guesses (marked) when there are none; where Morpheus (below) knows a form that has no candidate, its analyses are the candidates | the choices file is read, scored and joined (`scripts/lxx/choices.ts`, 'The choices file'); the runner that lists a book's pending words in batches and takes the choices back is built (`scripts/lxx/batches.ts`, `pending.ts`, `choose.ts`, 'A model session'); no paid API: a Builder's own session |

A word that layers 1 and 2 and the agreement check do not settle, and that no choice has settled, is **pending**, with its candidates. A book's annotation file is written only when none is pending and the rest of the bar is met ('The bar').

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

## The bar

A book's annotation file is written only when the book passes the bar of the probe (`docs/sources/lxx-derivation-probe.md`, 'Error checks for the full run', 1). The bar is data in
`scripts/lxx/bar.ts` (`BAR`), and `verdict` in the same file is the one place a book is held against it, for `npm run lxx:release` (which writes the file or refuses) and
`npm run lxx:report` (which says where every book stands). Five lines, each with its number and why:

| Line | The number | Why |
| --- | --- | --- |
| Known-answer lemma | at least 99% of the words of each known-answer chapter | The probe's John 1 scored 99.9%. A model that misses one word in a hundred makes a mistake a reader meets in every few verses |
| Known-answer full parsing | at least 98% of the same words (lemma and the whole parsing) | The probe's John 1 scored 99.5%. Parsing is where two cases share an ending, which is where the probe found its errors |
| Pending | none: no word of the book left without an answer | A word with no answer is not an annotation; the build fails while any waits for a choice (probe, check 4) |
| Guesses | at most 3% of the book's words | A guess is the model's own lemma and parsing where the candidates held none, or none of them fit. A guessed lemma is not a dictionary form until checked; the app draws it with a mark and never quizzes it (probe, check 3) |
| Agreement breaks | at most 5 per 1,000 words of the book | The agreement check finds a settled article, adjective or participle that does not agree with its settled noun. Genesis has 1.2 (probe, check 2) |

**The known-answer chapters of a build** are two: John 1, and one other New Testament chapter that changes with the build. The other chapter is taken from `SECOND_CHAPTERS` in
`bar.ts` by the build number (`secondChapter(build)`: the build number counts round the list), so no build is held to the same second chapter as the last and a model cannot be tuned to it.
The list is Rom.8 (the chapter the first model story, M0, measures), Mat.5, Mrk.4, Luk.15, Act.2, 1Co.13, Eph.2, Php.2, Heb.11, Jas.2, 1Pe.1 and Rev.21: none of John. The build number is the patch of
`package.json`'s version (0.7.55 is build 55), which each landed batch raises by one; `--build <n>` names another. Each chapter's book is hidden from layers 1 and 2 as John is, and each
needs a choices file of its own in `data/lxx/known/` made by a model session without TAGNT's answers: a chapter with none scores its pending words as wrong, the build falls short on the
known-answer lines, and no book is SHIPPABLE until it has one. Adding a chapter to the list means someone has to make that file.

## The known-answer run

`npm run lxx:known -- --chapter Jhn.1 --chapter Rom.8` runs each chapter through layers 1, 2 and 2a with its whole book hidden from the form index and the parser (TBESG stays as the lemma list: a lexicon is not an answer key),
and scores the result against TAGNT's own rows for the same words. The words are TAGNT's NA28 words of the chapter (an `N` in the row's edition code), read as a book of Swete's would be, so the references are
the derivation's own (`Jhn.1:33#23`). **Lemma** is right when it equals TAGNT's exactly, in NFC, so accents count; **full** is right when the lemma and the whole parsing are, a noun's semantic tags (`-T`, `-P`, `-L`) dropped.

The run prints, for each chapter: layers 1 and 2 alone before the agreement check (the probe's table: on John 1 layer 1 settles 673 words, 672 right on the lemma and 670 on full parsing, layer 2 25 of 25); then the
words each layer answers after the check (1, 2, 2a); then layer 3, the words a choices file settled; and the whole chapter. A word still pending with no choice has no answer and is counted wrong. Flags:

```bash
npm run lxx:known -- --chapter Jhn.1                                # the choices file data/lxx/known/jhn-1.tsv when there is one
npm run lxx:known -- --chapter Jhn.1 --choices <file>               # a model session's choices, scored the same way
npm run lxx:known -- --chapter Jhn.1 --choices-dir <dir>            # another directory of known-answer choices
npm run lxx:known -- --chapter Jhn.1 --choices <file> --keep-demoted  # the probe's reading
```

`--keep-demoted` is for comparing with the probe, whose choices were made before the agreement check existed: a pending word with no choice scores as the answer layer 1 or 2 gave it before the check demoted it.
On John 1 with the probe's choices (`tests/fixtures/lxx/choices-jhn-1.tsv`, copied from the probe's `MODEL_CHOICES_JOHN`) that reading scores 828 of 829 on the lemma and 825 on full parsing, the probe's
numbers; the check demotes 48 words the probe's choices do not cover, which a model session now chooses, and scored without the flag (as the bar scores) they count wrong. The bar never uses the flag.

## The choices file

Layer 3 is a model's choice, made by a Builder's own session reading a pending word in its verse (no paid API). A choices file has a header and one line per word, tab-separated: `ref`, `parsing` (TAGNT's code),
`lemma` (left empty when the candidates have one lemma for that parsing) and `mark` (empty, `unsure` or `guess`). A line starting with `#` is a comment.

- A choice among the word's candidates takes confidence 0.8, an `unsure` one 0.5; layer 3.
- A choice outside the candidates is refused unless it is marked `guess`, and a word left with no candidate takes any choice as a guess; a guess is 0.4 sure, names its lemma (or the candidates have one lemma between them), carries the note `guess: ...`, and is
  counted against the guesses line of the bar. A refused choice leaves its word pending.
- A reference twice in a file or in two files of a book is an error. A choice for a word that is not pending (settled by layers 1, 2 or 2a) is ignored.

Where the files live: `data/lxx/choices/<book>-<batch>.tsv` for a Swete book (`gen-01.tsv`), all of a book's files joined by `lxx:release` and `lxx:report`; `data/lxx/known/<book>-<chapter>.tsv` for a known-answer chapter (`jhn-1.tsv`);
`data/lxx/recheck/<book>.tsv` for the second pass's choices on a sample (`lxx:choose --recheck`; `lxx:report` reads this and any `<book>-*.tsv` there). `lxx:choose` writes the file in the reader's shape, `ref`, `parsing`, `lemma`, `mark`
(`scripts/lxx/choices.ts`), with two columns after them that the reader leaves be: `confidence` (0.80, 0.50 or 0.40) and `note` (`model: unsure`, `guess: ...`).

## A model session

A model story gives a Builder one batch of one book. **The Builder's own session is the model of layer 3**: no script calls a paid API, and the Builder reads each verse itself. A batch is about 700 pending words, cut at a chapter
boundary (a chapter that would take a batch past 700 is taken in when it overshoots by less than the batch falls short without it; a chapter of 700 or more is a batch alone). A batch has one choices file, so the stories of
one book never touch the same file and different books run in parallel.

**The Mayor**, to file the stories:

```bash
npm run lxx:batches -- --book gen     # batch, chapters, pending, no candidate: a row a batch, then the total
```

**The Builder**, for its batch `n` of book `b` (`gen`, batch 1; the files are `gen-01`):

```bash
npm run lxx:pending -- --book gen --batch 1                 # prints the batch and writes data/lxx/pending/gen-01.md (git-ignored: it holds Swete's Greek)
npm run lxx:choose -- --book gen --batch 1 --from <file>    # checks the choices and writes data/lxx/choices/gen-01.tsv
```

1. Run `lxx:pending` and read it. Each verse is printed whole with the words to choose marked ⟦like this⟧; under it, a line for each of them: its reference, its form, and its candidates as `lemma parsing (support)`, most frequent first, or `no candidate`.
2. Write the choices in a file outside the repo (`/tmp/gen-01.txt`), one line a word, in the order of the listing: `ref parsing`, then the lemma when two candidates share that parsing, then `?` when unsure or `guess`:
   `Gen.1:2#16 V-IPI-3S ?` · `Gen.1:7#15 R-ASN ὅς, ἥ` · `Gen.1:14#5 V-APM-3P γίνομαι guess`. A line starting `#` is a comment.
3. Run `lxx:choose`. It refuses, naming each reference, a line whose lemma and parsing are not among the word's candidates and that does not say `guess`; a reference that is not in the batch; a reference twice; a word of the batch with no line; a word
   with several lemmas for the parsing you chose and none named; a word with no candidate answered without `guess`; a guess that names no lemma. Nothing is written until none is left: fix the file and run it again.
4. Commit the one file, `data/lxx/choices/gen-01.tsv`, and nothing else. (The confidence is 0.8 for a plain line, 0.5 for `?`, 0.4 for `guess`.)

**The rules:**

- **Only from the candidates.** Choose the candidate the verse supports. Do not reach outside the list because another reading seems nicer.
- **Read the verse.** The candidates are not ranked by the verse: the support is a New Testament count. Check the word's neighbours: an article, adjective or participle agrees with its noun in case, number and gender; a verb agrees with its subject.
- **Mark unsure.** When the verse does not settle it between two candidates, choose the likelier and add `?`.
- **A guess only when there is no candidate.** A word with `no candidate` takes `guess` and names its lemma (look it up; a rare word is checked against TBESG or any lexicon). Mark `guess` on a choice outside the candidates only when none of them can be right, and say why in the closing comment.
  A book is released only with at most 3% guesses ('The bar').
- **Name the lemma** only when two candidates have the same parsing under different lemmas; otherwise leave it out.
- **No paid API.** Nothing in this session calls one. Anything that is wrong with the listing (a candidate that seems missing, a word that is not Greek) goes in the closing comment with its reference, for the Mayor; it is not fixed in passing.

**The recheck**, one story a book after its batches are in: a second session, which must not read `data/lxx/choices/`, lists a blind 5% of the book's chosen words (at least one; seeded by the book, so it is the same words each time, in the text's order, with nothing of the first choices)
and chooses them again the same way:

```bash
npm run lxx:pending -- --recheck --book gen                 # prints the sample and writes data/lxx/pending/gen-recheck.md
npm run lxx:choose -- --recheck --book gen --from <file>    # writes data/lxx/recheck/gen.tsv, committed
npm run lxx:report                                          # the book's row now shows the second pass's disagreement rate
```

The rate (the share of the second pass's choices that differ from the first's in the parsing, or in the lemma when both name one) is the book's error check: the story reports it, and a book whose rate is high is reread before it is released.

**The story template** (M1 and the model stories after it follow it):

- *Title:* `Lampas Septuagint, <Book> batch <n> (chapters <a>-<b>): the model's choices for <N> pending words`
- *Path:* rig `lampas`; files: `data/lxx/choices/<book>-<nn>.tsv` and nothing else; size M.
- *What:* run `npm run lxx:pending -- --book <book> --batch <n>`, read every verse, write the choices, run `npm run lxx:choose -- --book <book> --batch <n> --from <file>`, commit `data/lxx/choices/<book>-<nn>.tsv`. The rules of 'A model session' apply.
- *Acceptance:* (1) `data/lxx/choices/<book>-<nn>.tsv` exists, was written by `lxx:choose`, and has a row for each of the <N> pending words of the batch (`lxx:batches` gives the count); (2) the diff touches that file only; (3) the closing comment gives the counts chosen, unsure and guessed,
  lists the guesses with their lemma, and says what the session left in doubt; (4) `npm run lxx:report` still runs and the book's pending count has fallen by <N>.
- *Recheck story:* the same, with `--recheck`, the file `data/lxx/recheck/<book>.tsv`, and the disagreement rate from `lxx:report` in the closing comment.

## Morpheus, the second method

From the probe's 'Lampas's paradigm data, or an open analyzer?' and 'Error checks', 2(d) (story mw-u2w5klk.6). [Morpheus](https://github.com/perseids-tools/morpheus)
is the Perseus Project's analyzer of Greek and Latin, pinned at commit `ab6898ffed335fc6169fa02c9940657a9b5a78e0` and licensed **MPL-2.0**. It is a **build tool**, run from its Docker image at
derive time; **nothing of it is in the app**. MPL-2.0 is a file-level copyleft: it reaches Morpheus's own files, which Lampas does not copy, change or ship, and not what
the analyzer prints about a word (the probe's reading). What reaches Lampas's data is **its analyses as candidates (`morpheus` in the support column), never its code or its tables**.
`ATTRIBUTION.md` credits it as a build tool, not an app dependency. No paid API is called; Docker is never needed by the gate or the tests.

**What `scripts/lxx/morpheus.ts` does.** `npm run lxx:derive -- --book <code>` (or `--all`), when `docker` is in PATH and the image is there:

1. derives the book (layers 1 and 2 and the agreement check) as always, and takes its **forms with no candidate** and the forms of its **guesses** (the rows marked `guess` in `data/lxx/choices/<book>-*.tsv`);
2. asks Morpheus about each form the cache does not hold yet: `docker run --rm -i -e MORPHLIB=stemlib lampas-morpheus bin/cruncher -S`, the forms in Perseus beta code, one to a line
   (`LAMPAS_MORPHEUS_IMAGE` names another image). The image is the pinned commit built from the repository's own Dockerfile, once:
   `docker build -t lampas-morpheus https://github.com/perseids-tools/morpheus.git#ab6898ffed335fc6169fa02c9940657a9b5a78e0`;
3. maps what it prints to TAGNT's codes and writes `data/lxx/morpheus/<book>.tsv` (git-ignored, a derived cache; unlike the other files it holds the forms, in Greek, so it is never released): `form`, then `lemma/code` readings joined by ` | `,
   and one `unmapped` for each reading the mapping leaves out. A form Morpheus does not know has an empty second column. The cache is asked only for forms it lacks, and rewritten in a fixed order;
4. derives the book again: a word that had **no candidate** takes Morpheus's mapped readings as its candidates (`ἐκτρέφω/V-AAI-3S/morpheus`, the note `morpheus: candidates from the second method, for the model`), so a guess becomes a choice among candidates
   where Morpheus knows the form. The word stays pending: Morpheus settles nothing by itself, the model still chooses. (The agreement check may settle it as layer 2a when exactly one of Morpheus's candidates agrees with the settled words around it, as with any pending word.) A word where Morpheus gave nothing, or only readings the mapping leaves out, keeps `no candidate`.

**When Docker or the image is absent** the step prints one line, `Morpheus skipped: <why>` (for a whole `--all` run, once), and the output is byte-identical to a run with `--no-morpheus`. A cache from an earlier run is still read.
`lxx:release`, `lxx:report`, `lxx:batches`, `lxx:pending` and `lxx:choose` never run Docker: they read the cache that is there.

**The mapping** (`mapAnalysis`; the tests are `tests/unit/lxx-morpheus.test.ts`, one for each line). One Morpheus reading is one TAGNT code, or a code for each gender or case it lists together (`masc/neut gen sg` is `GSM` and `GSN`; at most six), or `unmapped`:

| Part of speech | Morpheus prints | TAGNT code | Left unmapped |
| --- | --- | --- | --- |
| verb, finite | tense, mood, voice, person, number (`pres ind mp 3rd pl`) | `V-` tense (`P` present, `I` imperfect, `F` future, `A` aorist) voice (`A`, `M`, `P`, `E` for `mp`) mood (`I`, `S`, `O`, `M` imperative), `-3P` | a perfect, pluperfect or future perfect; an imperfect that is not indicative; the dual |
| verb, aorist | the same | `A` for the ending table `aor1` or `aor_pass`, `2A` for `aor2` or `aor2_pass` (`V-2AAI-3S`) | any other table (`ath_secondary`) |
| infinitive | `pres inf act` | `V-PAN` | |
| participle | `pres part act fem gen pl` | `V-PAP-GPF` (case, number, gender) | |
| noun | gender, case, number (`fem acc sg`) | `N-ASF` | the dual; a comparative; a form with a flag beyond `contr` and `enclitic` (`irreg_comp`, `indeclform`) |
| adjective | the same, from an adjective's ending table (`os_h_on`, `hs_es`, …: `ADJECTIVE_TABLES`) | `A-GSM` | |
| article | `indeclform`, class `article` | `T-GSM`, `T-GSN` | |
| indeclinable | `indeclform`, class `conj`, `particle`, `adverb`, `prep` | `CONJ`, `PRT`, `ADV`, `PREP` | a pronoun, a numeral, any other class |

Always unmapped: a reading in a dialect without Attic (`doric aeolic`, `epic`), an unaugmented form, an English gloss (`E`, which is not another reading and is not counted). A Morpheus lemma is Morpheus's headword in beta code read back as Greek
(`gi/gnomai` is `γίγνομαι`, where TAGNT writes `γίνομαι`): lemmas are compared by their letters without accents, not by spelling, and a spelling difference shows as 'differed'. Deponents are not told apart: the passive of a deponent verb maps to `P`
where TAGNT writes `O` (`γενηθήτωσαν`), and that too shows as 'differed'. These are the mapping's known weak spots, and the count below is how to see their size.

**The count.** `lxx:release` and `lxx:report` read the cache and count, for each book, its guesses (layer 3 rows marked `guess:`) that Morpheus **agreed with** (a reading has the guess's parsing and the lemma's letters), **differed from**
(it has mapped readings and none is the guess) or **did not know** (no cache row, or no reading the mapping covers). `lxx:release` prints `Morpheus: A agreed, D disagreed, U unknown (the guesses)`; the report has a column, `Morpheus agreed / differed / unknown`, with a dash for a book that has no cache. A guess it differs from is looked at, in the second pass's way.

**Checking it.** The tests give Morpheus's output as a fixture (`tests/fixtures/lxx/morpheus-sample.tsv`, for the 7 forms of Gen 1 and Ps 22 that layers 1 and 2 leave with no candidate: `Γενηθήτωσαν`, `ζωσῶν`, `ἐξέθρεψεν`, `αὐταί`, `ἐλίπανας`, `καταδιώξεται`, `μακρότητα`), never the image or the network.
The fixture is written in the shape of Morpheus's own `test/fixture.json`, not captured from a run: the builder's host had no Docker. To see the real thing, build the image and run `npm run lxx:derive -- --book gen`, then `cat data/lxx/morpheus/gen.tsv`.

## The annotation file

`npm run lxx:release -- --book gen` derives the book, joins its rows with every choices file of the book, runs the known-answer chapters of the build, and holds the book against the bar. If it passes, it writes
`data/lxx/annotations/gen.tsv`; otherwise it refuses, names each failing line (`pending: 1 word left without an answer (the bar: none)`), and writes nothing. **The annotation file is the MIT release**
(`data/lxx/LICENSE`) and is committed: a header row and one row a word in the text's order, tab-separated, with `ref`, `lemma`, `parsing`, `layer` (1, 2, 2a or 3), `confidence` (two decimals) and `notes` (in words, `; `-separated).
**It never holds Swete's own words**: a word is named by its reference, and the only Greek in it is the lemma, which is Lampas's own derived data. A second run writes the same bytes.
The files of `derived/` and `pending/` stay git-ignored; they are working files.

## The report

`npm run lxx:report` writes `docs/lxx-report.md` between its markers: this build's known-answer scores, and one row for each of the 39 books of Swete's Old Testament (the other 21 books of his file are not assessed): its words, the share each layer settled, the words still
pending, guesses, agreement breaks per 1,000 words, the second pass's disagreement rate (the share of the recheck files' choices that differ from the first pass's on the same word, a dash when there are none), and
SHIPPABLE or NOT with the failing lines named. It is the build's one place to see a book fall short. A second run on the same inputs changes nothing. No book is SHIPPABLE yet: the model's choices (B4, then the model stories) are what is missing.

## The files

Written under `data/lxx/` (`derived/` and `pending/` are git-ignored working files; `.gitignore`). Tab-separated, a header row, one row a word in the
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

`data/lxx/morpheus/<book>.tsv` (git-ignored, a derived cache), Morpheus's analyses of a book's no-candidate forms and guesses: `form`, `analyses` ('Morpheus, the second method'). A candidate it gave has `morpheus` in the support column.

`data/lxx/annotations/<book>.tsv`, the MIT release: `ref`, `lemma`, `parsing`, `layer`, `confidence`, `notes`, committed, written by `lxx:release` only when the book passes the bar ('The annotation file'). `data/lxx/choices/`, `data/lxx/known/` and `data/lxx/recheck/` hold the choices files ('The choices file'); they are committed too.

`<book>` is Swete's book code in lower case: `gen`, `exo`, … `psa`, … (Swete's file has 60 books; Tobit and Daniel come in two forms each).

A released book is turned into the app's chapter files by `npm run data:build:lxx` (`scripts/data-build-lxx.ts`, `public/data-lxx/`; docs/data.md 'The Septuagint data'): it joins the annotation file's rows to Swete's tokens by reference, so the MIT file never holds his Greek and the chapter files, which do, ship with eliranwong's GPL-3.0 notice beside them.

## The commands

From a clean checkout, Node 20 or later, with network access for the first run:

```bash
npm ci
npm run lxx:derive -- --book gen               # data/lxx/derived/gen.tsv and data/lxx/pending/gen.tsv, and the counts
npm run lxx:derive -- --book gen --hide jhn    # John's rows left out of the form index and the parser: a known-answer run
npm run lxx:derive -- --word Gen.1:20#13       # one word: its candidates, their support, the rule or analogy behind each; writes nothing
npm run lxx:derive -- --all                    # every book of the file, trained once: each book's two files, and one line a book
npm run lxx:derive -- --book gen --no-morpheus # the same with the second method off (with no Docker it prints "Morpheus skipped: ..." and does the same)
npm run lxx:known -- --chapter Jhn.1           # a New Testament chapter with its book hidden, scored against TAGNT ('The known-answer run')
npm run lxx:batches -- --book gen              # the book's pending words in batches of about 700: the table the model stories are filed from ('A model session')
npm run lxx:pending -- --book gen --batch 1    # a batch's pending words with their verses and candidates: for a model session
npm run lxx:choose -- --book gen --batch 1 --from <file>  # a model session's choices, checked, as data/lxx/choices/gen-01.tsv
npm run lxx:release -- --book gen              # data/lxx/annotations/gen.tsv, only when the book passes the bar ('The bar')
npm run lxx:report                             # docs/lxx-report.md: where every book of the Old Testament stands
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
| Morpheus, a build tool run from its Docker image (not fetched by the scripts) | https://github.com/perseids-tools/morpheus commit `ab6898ffed335fc6169fa02c9940657a9b5a78e0` | MPL-2.0 | its analyses of the forms with no candidate, as candidates ('Morpheus, the second method') |

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
  differently).
- **The bar's tests** (`tests/unit/lxx-bar.test.ts`) hold `BAR` to the probe's numbers, run John 1 with the probe's choices to its 828 of 829 and 825, and check that `lxx:release` refuses a book with a word pending or guesses at 4%
  and writes the same bytes twice when every line is met, and that `lxx:report` has a row for each of the 39 books and names another second chapter for another build.

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
