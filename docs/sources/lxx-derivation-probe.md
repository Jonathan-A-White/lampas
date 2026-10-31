# Septuagint derivation probe: lemma and parsing for Swete's Greek, derived by Lampas

Story mw-cbsbw9q.3 (epic mw-cbsbw9q), written 2026-10-31 (UTC). It follows the sources probe (`docs/sources/septuagint-and-webster.md`),
which found no Septuagint with free word data, and settles how Lampas could derive its own. No app code changed and no data ships.
The script `scripts/lxx-derivation-probe.mjs` fetches each source at a pinned commit into a cache outside git, and writes its tables there.
No paid API was called: the model layer for the samples was the Builder's own session. 'My reading' about a licence is a reading, not legal advice.

<!-- toc -->

- [What I found](#what-i-found)
- [The pipeline](#the-pipeline)
- [The Septuagint sample: Gen 1 and Greek Ps 22](#the-septuagint-sample-gen-1-and-greek-ps-22)
- [The known-answer run: John 1](#the-known-answer-run-john-1)
- [The whole of Swete](#the-whole-of-swete)
- [Lampas's paradigm data, or an open analyzer?](#lampass-paradigm-data-or-an-open-analyzer)
- [Swete's transcription artefacts met](#swetes-transcription-artefacts-met)
- [Error checks for the full run](#error-checks-for-the-full-run)
- [The whole Old Testament: stories and tokens](#the-whole-old-testament-stories-and-tokens)
- [The licence of the derived data](#the-licence-of-the-derived-data)
- [Reproduce it](#reproduce-it)
  - [Sources](#sources)
  - [Commands](#commands)
  - [How each number was scored](#how-each-number-was-scored)
  - [Checking a word by other means](#checking-a-word-by-other-means)

<!-- /toc -->

## What I found

- **It can be done, and most of it is mechanical.** On Swete's Gen 1 and Greek Ps 22 (855 words), 72.9% of the words are forms the
  New Testament has with one analysis (layer 1), 3.5% get one answer from the parser (layer 2) and 23.6% need a model (layer 3).
  Of those, 7 words (0.8%) had no candidate at all and the model's answer is a guess, marked as one.
- **The known answer is good.** The same pipeline on John 1, with all of John hidden from layer 1, scores **99.9% on the lemma and
  99.5% on lemma and full parsing** (829 words) against TAGNT. Layer 1 is 99.6% right on full parsing, layer 2 100%, layer 3 99.2%.
  This flatters layer 3: the model knows John 1 well (see that section).
- **The weak spot is layer 1 where Greek endings coincide.** A form the New Testament shows once as accusative can be nominative here.
  Reading the sample myself, I found 7 layer-1 errors among the 71 words in those classes (ποιοῦν, αὐτοῦ and αὐτῷ referring to ξύλον,
  χλωρὸν with χόρτον), and one more of another kind: χλόης (grass) read as the name Chloe, the only χλόης in the New Testament.
  One of John's three layer-1 errors (μένον) is the shared-ending kind as well.
- **For the whole Old Testament,** measured on all of Swete's file: 68.5% of words settle in layer 1, about 7% in layer 2, about 20% need a model
  choice and about 5% have no candidate (a model guess, marked as one). In the 39 books that is about 94,000 model choices and at most
  11,000 distinct guessed forms: roughly **18 million tokens and 90 to 160 model stories**, plus about five build stories (see that section).
- **Lampas's paradigm tables cannot drive the parser alone.** The parser here learns its endings from TAGNT's own form, lemma and parsing
  triples. An open analyzer (Morpheus, MPL-2.0) would help most with the 28% of non-NT forms that get no candidate.
- **The derived annotations can be MIT** if they are kept in files apart from Swete's Greek and credit STEPBible (CC BY 4.0). No source used here
  has terms that forbid that; TAGNT's header asks people not to redistribute TAGNT itself, and Lampas would not (see the licence section).

## The pipeline

Each word of Swete is looked up in three layers, in order. The script prints which layer gave each word and a confidence.

| Layer | What it does | Confidence written |
| --- | --- | --- |
| 1, TAGNT form | The form (lower case, grave as acute, an enclitic's extra accent dropped) as TAGNT has it anywhere in the New Testament. Taken when TAGNT gives it one lemma and parsing, or one with at least 95% of 20 or more occurrences. A form in capitals with no accents (`ΕΝ ΑΡΧΗ`) is matched without accents. If nothing matches, Swete's own spellings are tried once: ει as ι, ι as ει, movable ν added or dropped. | 0.97 (one analysis, seen 3+ times), 0.90 (seen once or twice), share x 0.97 (dominant) |
| 2, parser | Ending rules (2,083) learned from TAGNT's 18,914 distinct (form, lemma, parsing) triples, after the augment, reduplication or a compound's prefix is undone (ἐπεφέρετο becomes ἐπι-φερ-). It proposes only lemmas found in STEPBible's TBESG lexicon (10,941 one-word lemmas, LXX words included), and only parsings that fit the lemma's part of speech and a noun's gender there. If no rule fits, it tries analogy: an NT form of the same stem with another ending (Γενηθήτω*σαν* beside γενηθήτω). Taken when it leaves one candidate, or one with 90% of the support. | 0.75 x share |
| 3, model choice | When layers 1 and 2 leave more than one candidate, a model reads the verse and picks one. When there is no candidate, the model gives its own lemma and parsing as a **guess**. | 0.8 chosen, 0.5 chosen but unsure, 0.4 a guess |

Two terms used below. **Ambiguous** means layers 1 and 2 left more than one candidate. **Disagreement** means a second method disagreed with the
first: the parser, run on a word that layer 1 had already settled, ranks a different lemma (or parsing) first.

Parsing codes are TAGNT's (`N-NSM`, `V-AAI-3S`, `T-GSN`, `PREP`). TAGNT's tags on proper nouns (`N-NSM-T` for a title, `-P` person,
`-L` place) are dropped from nouns, because they say what a name refers to, not how it is inflected.

## The Septuagint sample: Gen 1 and Greek Ps 22

Swete's Ps 22 is the shepherd psalm. The script reads that from STEPBible's TVTMS rather than assuming it: English `Psa.23:1` = Greek `Psa.22:1`,
`Psa.23:2-6` = Greek `Psa.22:2-6`, and the title is part of Greek 22:1.

`node scripts/lxx-derivation-probe.mjs --sample` (model choices in the script, 2026-10-31):

| | Words | Layer 1 | Layer 2 | Layer 3 (of which guesses) | No candidate |
| --- | --- | --- | --- | --- | --- |
| Gen 1 | 751 | 545 | 28 | 178 (2) | 0 |
| Ps 22 | 104 | 78 | 2 | 24 (5) | 0 |
| **Both** | **855** | **623 (72.9%)** | **30 (3.5%)** | **202 (23.6%) (7)** | **0** |

- **Ambiguity rate:** 293 of 855 words (34.3%) had more than one candidate. Layer 1's 95% rule and layer 2's 90% rule settled 98 of those.
- **Disagreement rate:** of the 494 layer-1 words the parser could also analyse, it ranked another lemma first for 71 (14.4%), and another lemma or
  parsing for 94 (19.0%). It could not analyse 129 layer-1 words, mostly irregular little words (ὁ, ἐγώ, εἰμί).
- **What the model chose:** 66 of the 202 were articles (τοῦ, τὸ, τῶν: gender and case come from the noun after them), 59 nouns (mostly
  neuter nominative against accusative), 36 adjectives, 23 verbs. 8 choices are marked unsure: TAGNT's code for the middle or passive of ἐπεφέρετο, αὐξάνεσθε and
  πληθύνεσθε (twice each), whether αὐτῶν in Gen 1:9 is masculine or neuter, κράτιστον and τὸ κατοικεῖν in Ps 22. The 7 guesses had no candidate:
  Γενηθήτωσαν, ζωσῶν, ἐξέθρεψεν, αὐταί, ἐλίπανας, καταδιώξεται and μακρότητα (TBESG lists μακρότης as masculine, so the gender check refused the feminine ending).
- **My own reading of the result** (no answer key exists for Swete): layer 2's 30 words look right except ἕρπον[τι (Gen 1:30), given masculine
  where it goes with ἑρπετῷ, neuter. Among layer 1's 71 words whose ending is shared by two genders or cases, I found 7 wrong: ποιοῦν
  in Gen 1:11 and 1:12 (nominative given, accusative needed), αὐτοῦ and αὐτῷ in 1:11 and 1:12 (masculine given, neuter: the tree, ξύλον),
  χλωρὸν in 1:30 (neuter given, masculine: χόρτον). An eighth is χλόης (Ps 22:2), which the New Testament has once, as the name Chloe (1 Cor 1:11),
  so layer 1 gave the lemma Χλόη. So Swete's layer 1 is about 98.7% right (615 of 623), not the 99.6% John shows.

The table for every word is written to `~/.cache/lampas-lxx-probe/out/lxx-sample.tsv` (columns: ref, form, lemma, parsing, layer, confidence,
candidates, notes; ref `Gen.1:20#13` is Gen 1:20, word 13, counting Swete's tokens but not his editor's signs).

## The known-answer run: John 1

`node scripts/lxx-derivation-probe.mjs --john`: all TAGNT rows for the Gospel of John are hidden from layers 1 and 2; the rest of the New
Testament trains them; TBESG stays as the lemma list (a lexicon is not an answer key). The words scored are John 1's 829 words in NA28.

| Layer | Words | Lemma right | Lemma and full parsing right |
| --- | --- | --- | --- |
| 1, TAGNT form | 673 (81.2%) | 672 (99.9%) | 670 (99.6%) |
| 2, parser | 25 (3.0%) | 25 (100%) | 25 (100%) |
| 3, model choice | 131 (15.8%), 3 of them guesses | 131 (100%) | 130 (99.2%) |
| **All** | **829** | **828 (99.9%)** | **825 (99.5%)** |

- **Ambiguity rate** 29.9% (248 words); **disagreement** 17.3% on the lemma and 25.4% on lemma or parsing, over the 560 layer-1 words the parser analysed.
- **The parser alone**, taking its first candidate with no context, is right on the lemma for 80.8% and on lemma and parsing for 69.2% of the 681
  words it could analyse. Context matters: it is layer 3 that turns 69% into 99%.
- **The four errors:** μένον (1:33), neuter nominative given for accusative, and ἴδῃς (1:33), perfect given for second aorist, both from layer 1 (the only
  other New Testament analysis of each form); ἴδε (1:46), which the New Testament elsewhere has only as the interjection but TAGNT here tags as the verb; and
  ὅπου (1:28), where TAGNT's code (`PREP`) is a convention the model did not guess.
- **Why layer 3 is flattered.** The model knows John 1 and TAGNT's style, so a model choice here is easier than in an Old Testament book. I chose
  without TAGNT's answers, which `score()` prints only for words already answered, with two exceptions. A first run, before any choices existed,
  printed TAGNT's answer for five words (1:3 πάντα and ὃ, 1:4 τὸ and φῶς, 1:5 τὸ). A run before I fixed the reading of TAGNT's numbered books
  (a pattern that skipped 1Co, 1Pe and the other numbered books) had settled ἀληθινὸν (1:9) and τι (1:46) in layer 1 and printed their answers; after the fix they came to the model. All seven
  choices agree with what TAGNT printed. The three guesses (κέκραγεν, Βηθσαϊδά as genitive, μείζω) were right.
  Read the 99.2% as the most a model can do. Swete's 98.7% for layer 1, from my own reading, is nearer what to expect.

## The whole of Swete

`node scripts/lxx-derivation-probe.mjs --coverage` runs layer 1 over the whole file and the parser over every 25th of the forms the New Testament
lacks. No model choices are made. Swete's file has 608,427 words in 60 books: the Old Testament, the Apocrypha, and the Psalms of Solomon,
the Odes and the Greek fragments of 1 Enoch. Tobit and Daniel each come in two Greek forms.

| | Words | Share |
| --- | --- | --- |
| Form in the NT with one analysis (layer 1) | 416,640 | 68.5% |
| Form in the NT with several analyses (to the model) | 88,638 | 14.6% |
| Form not in the NT (to the parser): 38,076 distinct forms | 103,149 | 17.0% |

Of the 1,524 sampled non-NT forms (4,263 words), the parser gave one answer for 41.9% of the words, several for 30.6%, and none for 27.3%. A further 0.2% were NT
forms under another spelling. Projected over the file: **layer 1 68.5%, layer 2 7.1%, model choice 19.8%, no candidate (a guess) 4.6%.**
The 39 books of the Old Testament are 476,380 of these words (Genesis to Malachi as Swete numbers them, with the Greek Esther and Daniel's
additions inside their books; the Apocrypha and the rest add 132,047).

## Lampas's paradigm data, or an open analyzer?

**Lampas's own tables cannot drive layer 2.** `src/data/paradigms/` holds 20 tables, about 700 cells (docs/paradigms.md). They are for learning
by heart: λύω for every regular verb ending, five model nouns, six third-declension nouns, and the pronouns. They have no lemma list, no
stems, and nothing on the contract futures, liquid aorists, compound augments and second aorists that make up most hard forms. The parser that worked was
learned from TAGNT's form, lemma and parsing triples: TBESG's lemmas (3,476 verbs, about 3,400 common nouns) give the lemmas, and the NT gives the endings.
It is Lampas's own code over CC BY data, and it needs no other analyzer to reach the numbers above.

**An open analyzer would help where nothing matched.** Morpheus, the Perseus Project's analyzer of Greek and Latin, is at
https://github.com/perseids-tools/morpheus (commit `ab6898ffed335fc6169fa02c9940657a9b5a78e0`, 2023-01-30, read 2026-10-31). Its `LICENSE` begins
"Mozilla Public License Version 2.0". MPL-2.0 is file-level copyleft: Lampas could run it (from its Docker image) at build time without its code
reaching the app, and what it prints about a word is not covered by the MPL (my reading). Use it as a **second method**, not a replacement, on the 4.6% of words
with no candidate, and to check the parser where they differ. I did not run it in this probe.

## Swete's transcription artefacts met

All in Gen 1 and Ps 22, from the pinned files:

- **Capitals with no accents** at a book's opening: `ΕΝ ΑΡΧΗ` (Gen 1:1). They are matched without accents, and ΑΡΧΗ then needs a model choice
  between nominative and dative, which accents would have settled.
- **Editor's signs as separate tokens:** `⸆` and `⸂⸆⸃` five times in Gen 1 (1:13, 1:14, 1:19, 1:26, 1:31). They are not words; the script leaves them out and counts them.
- **Brackets inside words.** Codex Vaticanus lacks Gen 1:1-46:28, so Swete prints Codex Alexandrinus there, and brackets mark letters he supplied where it is
  damaged: `πληθυ]νέσθωσαν`, `Ἐξαγαγ[έτω`, `[τοῖ]ς`, `ἕρπον[τι` (1:20-1:31). One bracket can open in one word and close several words later.
  The brackets are stripped for lookup; the full run should keep them in the display text.
- **Spellings of the manuscript, not the New Testament:** ἴδεν for εἶδεν (8 times in Gen 1), Δαυείδ for Δαυίδ, πᾶσι with no movable ν,
  συστέματα for συστήματα. The spelling fallbacks reached 11 of these.
- **An enclitic's accent on the word before it:** ἐξέθρεψέν με, ἐνώπιόν μου, ποτήριόν σου, καταδιώξεταί με, ἔλεός σου. That is correct Greek, but
  the form must lose the second accent before lookup.
- **A reading to check on the page:** αὐταί με παρεκάλεσαν (Ps 22:4). As written it is the pronoun αὐτός ('they'), and the model took it so; if Swete printed
  αὗται ('these', which an enclitic would make αὗταί) the transcription lost a breathing and an accent.

## Error checks for the full run

1. **A bar for each book.** A book's annotations land only if, in the same build: the known-answer run scores at least 99% on the lemma and 98% on full parsing (John 1, plus
   one other NT chapter that changes each build, its book hidden); no word is left without an answer; guesses are at most 3% of the book's words; and the agreement check below finds at most
   5 breaks per 1,000 words. The build prints each book's share per layer, so a book that falls short is easy to see.
2. **Two methods must agree, and where they differ the word is looked at.** (a) An agreement check, by script: an article, adjective or participle must match the noun it goes with in gender, number
   and case, and a neuter noun ending -ον or -α takes its case from its article. It would have caught χλωρὸν and ἕρπον[τι, and since articles are a third of the
   model's work it should be built before the model layer runs. (b) Endings shared by two genders or cases (neuter -ον and -α, the genitive and dative of αὐτός, participles) never settle in
   layer 1 on the NT's evidence alone: they go to the agreement check or the model. That rule would have sent the other six of the 7 layer-1 errors I found, and John's μένον, to the model.
   A form the NT has only as a proper name (Χλόη) goes to the model when the text uses it in lower case. (c) A second model pass, which does not see the first, rereads a random 5% of each book's model
   choices, and the rate at which the two differ is published for each book. (d) Morpheus checks the guesses.
3. **Guesses shown as guesses.** Every word keeps its layer and confidence in the data. A word below 0.5 (a guess) is drawn in the app with a mark saying
   so, and is never quizzed or scheduled. That fits his rule that a word is learned in its dictionary form: a guessed lemma is not a dictionary form until checked.
4. **Nothing silent.** A model choice that names no candidate stays a guess and is counted (the script notes `guess: the model chose outside the candidates`).
   The build fails if any word is still waiting for a choice.

## The whole Old Testament: stories and tokens

**Words for the model, the 39 books (476,380 words):** about 19.8% need a choice, about **94,000 occurrences** (each read in its verse). About 4.6% (22,000 occurrences)
have no candidate; they are about 28% of the 38,076 forms the NT lacks across the whole file, so **at most 11,000 distinct forms** to guess once each, and then check in context.
With the agreement check of 'Error checks' in place first, I expect choices to fall by a third to a half: articles were 33% of the sample's choices,
and most neuter nouns follow their article.

**Tokens, estimated from this session.** The listing the model read for the sample is 29,089 bytes for 202 words (`--pending` with no choices), and for John 21,420 bytes
for 128 words: about 150 bytes a word, which I take as roughly 60 tokens (assuming Greek runs about 2.5 bytes a token). Writing a choice is about 10 tokens, and reasoning about it
two or three times that. **About 150 tokens per choice, and about 400 per guessed form** (it needs lexicon lookups). For the Old Testament: 94,000 x 150 ≈
14 million, plus 11,000 x 400 ≈ 4.4 million: **about 18 million tokens, about 11 million with the agreement check first.** Each session's own overhead
(charter, rig memory, the script's start-up) comes on top, by my guess about 50,000 tokens a session.

**Stories.**

- **Build stories, about five:** (1) the pipeline as a tested tool, with the annotation files and their format (from this script); (2) the agreement check
  and the rule for endings shared by two cases or genders; (3) the per-book bar, the known-answer runs and the report; (4) the model-choice runner for factory sessions: it writes a
  book's pending words in chapter batches, reads the choices back and refuses a choice outside the candidates unless it is marked as a guess; (5) Morpheus as the
  second method for guesses. Each is M. Reading the Septuagint in the app is a separate set of stories.
- **Model stories:** I estimate a session can make about 700 choices well (about 100,000 tokens of listing and reasoning; this session wrote 342 alongside building the probe).
  That is about 70 to 90 stories after the agreement check (about 135 without), plus about 22 for the 11,000 guessed forms, at 500 a story. Sonnet's accuracy should be measured with the known-answer run before
  it is trusted: the first model story runs John 1 and one other NT chapter and must reach the bar of check 1.
- The Apocrypha and the other books in Swete's file add 132,047 words, about a quarter more of every number.

## The licence of the derived data

**Proposed:**

1. **Lampas's annotations are MIT**: for each word, the reference (book, chapter, verse, word number in the pinned Swete file), lemma,
   parsing, layer and confidence, and the model's choices. They sit in files of their own, apart from the Greek text. **The files hold no Greek of Swete's**: a word is
   named by its reference, and a reader joins them to the pinned text. That keeps the annotations clear of the GPL on eliranwong's packaging.
2. **Swete's Greek text** is public domain (Swete's edition, 1909-1912). If Lampas ships it, it ships in files of its own with eliranwong's GPL-3.0 `LICENSE` and
   `README.md` beside them, as the sources probe advised.
3. **Credit STEPBible.** Layer 1 copies TAGNT's lemma and parsing for a form, and the parser's lemmas come from TBESG, both CC BY 4.0. The annotation files
   and ATTRIBUTION.md say: "Lemmas and parsing codes derived from STEPBible's TAGNT and TBESG (www.STEPBible.org, Tyndale House Cambridge), CC BY 4.0, changed: applied
   to the Septuagint by Lampas's derivation." MIT on Lampas's part does not stop anyone meeting CC BY, which is what CC BY 4.0 asks of an adapter
   (Section 3(a)(4): "If You Share Adapted Material You produce, the Adapter's License You apply must not prevent recipients of the Adapted Material from
   complying with this Public License.").

**Terms that could stand in the way, quoted:**

- TAGNT and TBESG's own header (both files, at the pinned commit): "Refer others to github.com/STEPBible as the source of the data. Please do not redistribute it yourself."
  and "(You MAY make changes yourself, but you should include a note of changes that can be viewed by those who use your new data)". My reading: the first is a
  request about TAGNT itself, which Lampas does not redistribute; the derived annotations are not TAGNT. The second is met by the credit's "changed:" line and this document.
  Neither asks for more than CC BY 4.0 does, and neither forbids MIT on Lampas's own part.
- eliranwong/LXX-Swete-1930: GPL-3.0. It would reach the annotations only if they copied the packaging, which is why the annotation files carry
  references, not Swete's words.
- No CCAT, Rahlfs or CenterBLC data was used, read or compared, so their terms (the sources probe's 'The CCAT question') do not apply.

## Reproduce it

### Sources

| Source | Pinned at | Licence | Used for |
| --- | --- | --- | --- |
| Swete's Septuagint, eliranwong/LXX-Swete-1930: `00-Swete_versification.csv`, `01-Swete_word_with_punctuations.csv`, `LICENSE`, `README.md` | https://github.com/eliranwong/LXX-Swete-1930 commit `1d3efc3c63bd384a4f3f07ed37eef54b0d45ac33` | text public domain; packaging GPL-3.0 | the Greek words |
| TAGNT, `Translators Amalgamated OT+NT/TAGNT Mat-Jhn …` and `… Act-Rev …` | https://github.com/STEPBible/STEPBible-Data commit `be4191f0082aeedddb0eff0c02c966292b2bd641` | CC BY 4.0 | layer 1, the parser's training, the John answer key |
| TBESG, `Lexicons/TBESG - Translators Brief lexicon of Extended Strongs for Greek - STEPBible.org CC BY.txt` | same commit | CC BY 4.0 | the parser's lemma list, part of speech and gender |
| TVTMS, `Versification/TVTMS - Translators Versification Traditions …` | same commit | CC BY 4.0 | English Ps 23 = Greek Ps 22 |
| Morpheus (named, not run) | https://github.com/perseids-tools/morpheus commit `ab6898ffed335fc6169fa02c9940657a9b5a78e0` | MPL-2.0 | proposed second method |
| CC BY 4.0 legal code | https://creativecommons.org/licenses/by/4.0/legalcode.txt (read 2026-10-31) | | the quoted Section 3(a)(4) |

### Commands

From a clean checkout, with Node 20 or later and network access. No `npm ci` is needed: the script uses only Node's own modules.

```bash
git clone https://github.com/Jonathan-A-White/lampas && cd lampas
node scripts/lxx-derivation-probe.mjs --sample     # Gen 1 + Greek Ps 22: counts; table in ~/.cache/lampas-lxx-probe/out/lxx-sample.tsv
node scripts/lxx-derivation-probe.mjs --john       # John 1 against TAGNT, per layer; table in .../out/john-1.tsv
node scripts/lxx-derivation-probe.mjs --coverage   # the whole of Swete's file, layer 1 and a parser sample
node scripts/lxx-derivation-probe.mjs --sample --word Gen.1:20#13              # one word's candidates
LXX_PROBE_NO_CHOICES=1 node scripts/lxx-derivation-probe.mjs --sample --pending  # what the model is shown, with no choices made
```

The first run downloads about 50 MB into `~/.cache/lampas-lxx-probe/pinned/<repo>/<commit>/` (or `$LXX_PROBE_CACHE`); later runs read the cache. Each run
takes a few seconds. The model's choices are the two lists at the end of the script (`MODEL_CHOICES_LXX`, `MODEL_CHOICES_JOHN`): one line per word,
`ref parsing [lemma] [?]`. To redo the model layer another way, empty them, run with `--pending`, and write your own.

### How each number was scored

- **Layer shares** count Swete's tokens with letters in them; the editor's signs are not words. A word is in the layer that gave its answer.
- **Ambiguity** is the share of words with more than one distinct (lemma, parsing) among the candidates of layer 1, or of layer 2 when layer 1 had none.
- **Disagreement** takes the words that layer 1 settled and runs the parser on each. It counts how often the parser's first candidate has another lemma, or another lemma or parsing.
- **John's accuracy** compares each word's lemma and parsing with the TAGNT row for the same word: same verse, same order among the words whose editions include NA28.
  The lemma must match exactly (NFC, so accents count). 'Full parsing' is the lemma and the whole code, after the semantic tags on nouns are dropped (`N-NSM-T` is `N-NSM`).
  'Without accents' compares lemmas with all marks stripped; it gave the same numbers.
- **The parser alone** scores the parser's first candidate on every John word it could analyse, whatever layer gave the word.
- **The coverage projection** counts layer 1 over every word, and puts every 25th distinct non-NT form (by first appearance) through the parser. It then scales that
  sample's word shares up to all non-NT words.
- **My reading of Swete's sample** (the 8 layer-1 errors and 1 layer-2 error) is a reader's judgement, not a score. The words read closely are the layer-1 rows whose parsing
  is a genitive or dative masculine or neuter, a genitive plural, a nominative or accusative neuter, or a participle (71 rows), all 30 layer-2 rows, and the rest of the table read
  through once (where χλόης was found).

### Checking a word by other means

For a word `Gen.1:11#20` (Gen 1:11, word 20):

1. **The Greek.** In the pinned `00-Swete_versification.csv`, `Gen.1:11` starts at a line number; add 19 and read that line of
   `01-Swete_word_with_punctuations.csv` (skip lines that hold only `⸆`, `⸂⸆⸃` and like signs). Check it against Swete's printed page: Vol. I is at
   https://archive.org/details/theoldtestamenti00unknuoft.
2. **The lemma and parsing.** Look the form up in any Greek lexicon and grammar: LSJ (STEPBible's TFLSJ is the same lexicon, CC BY), Logeion or Perseus' Morpheus
   (both give every analysis of a form), or a printed paradigm. Then read the verse: which analysis fits it is the parsing.
3. **Against Lampas's derivation.** `--word Gen.1:11#20` prints every candidate the layers found and how much support each had. The layer and confidence
   say how the answer was reached, and the notes column says when a spelling fallback, analogy or a guess was used.
4. **Another tagged Septuagint**, for someone with the right to use one (the CCAT/Rahlfs morphology needs CCAT's signed user declaration, see the sources probe),
   is an independent check of a whole book. Lampas's numbers should not be built from one.
