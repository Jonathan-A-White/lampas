# The Septuagint derivation: lemma and parsing for Swete's Greek

How Lampas derives a lemma and a parsing for each word of Swete's Septuagint, written so that anyone can rerun it and check it. The method was
measured by the probe (`docs/sources/lxx-derivation-probe.md`, story mw-cbsbw9q.3, whose script `scripts/lxx-derivation-probe.mjs` stays as its
record); this is the tested pipeline under `scripts/lxx/` (story mw-u2w5klk.1 onward). What the files may be shared under is in `data/lxx/README.md`
and `data/lxx/LICENSE` (MIT for Lampas's own data; STEPBible credited, CC BY 4.0).

<!-- toc -->

- [The layers](#the-layers)
- [Layer 1 in detail](#layer-1-in-detail)
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
| Layer 2, parser | Ending rules learned from TAGNT's (form, lemma, parsing) triples, proposing only lemmas in TBESG | to come (story B1b); in the probe |
| Layer 3, model choice | A model reads the verse and chooses among the candidates, or guesses (marked) when there are none | to come; no paid API: a Builder's own session |

Until layers 2 and 3 exist, every word that layer 1 does not settle is **pending**.

## Layer 1 in detail

`scripts/lxx/tagnt.ts` reads every word row of the two TAGNT files (`readTagnt`) and builds the form index (`formIndex`):

- **The key** (`keyOf`, `scripts/lxx/swete.ts`): punctuation and brackets dropped, lower case, a grave accent read as acute, an enclitic's second
  accent dropped (`ἐξέθρεψέν με` is looked up as `ἐξέθρεψεν`), an elision mark written `’`, NFC. A noun's semantic tags are dropped from TAGNT's code
  (`N-NSM-T` is `N-NSM`): they say what a name refers to, not how it is inflected.
- **Capitals with no accents** (`ΕΝ ΑΡΧΗ` at a book's opening) are matched on a second key with every mark dropped and final sigma as sigma (`bareOf`).
- **The 95%-of-20 rule** (`settle`): the form's first analysis is taken when it is the only one, or when it has at least 95% of 20 or more New Testament words.
  Confidence 0.97 for one analysis seen three times or more, 0.90 for one seen once or twice, the share x 0.97 for a dominant one.
- **Swete's spellings** (`spellings`): when the form is not found, other spellings are tried once each, in turn, on the second key: ει read as ι
  (`Δαυείδ`), ι read as ει (`ἴδεν` as `εἶδεν`), the movable ν added after -σι, -ξι, -ψι or -ε (`πᾶσι` as `πᾶσιν`) or dropped after them.
  The first that the New Testament has gives the candidates, and the row says which (`notes`).

A form with several analyses and none dominant, or with none, is pending with its candidates.

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
| `layer` | 1 (later 2 or 3) |
| `confidence` | two decimals, as in 'Layer 1 in detail' |
| `candidates` | every analysis found, most frequent first, as `lemma/parsing/support` joined by ` \| ` (`ἀρχή/N-NSF/8 \| ἀρχή/N-DSF/5`; a lemma may hold a space or a comma, never `/` or `\|`) |
| `notes` | `;`-separated, in words: `unaccented: matched without accents`, `capitals`, `brackets: letters Swete supplied`, `spelling: ei written i`, `spelling: i written ei`, `spelling: movable nu added`, `spelling: movable nu dropped` |

`data/lxx/pending/<book>.tsv`, the words still waiting: `ref`, `candidates`, `notes`, where the notes end with why it waits:
`several analyses: for the parser or the model` or `not in the New Testament: for the parser`.

`<book>` is Swete's book code in lower case: `gen`, `exo`, … `psa`, … (Swete's file has 60 books; Tobit and Daniel come in two forms each).

## The commands

From a clean checkout, Node 20 or later, with network access for the first run:

```bash
npm ci
npm run lxx:derive -- --book gen               # data/lxx/derived/gen.tsv and data/lxx/pending/gen.tsv, and the counts
npm run lxx:derive -- --book gen --hide jhn    # John's rows left out of the form index: a known-answer run
```

The run fetches the pinned sources into `data/raw/lxx/<repo>/<commit>/<path>` (git-ignored) unless they are there (`scripts/lxx/sources.ts`), and prints
the book's words, the editor's signs left out, the words settled in layer 1 and pending, and a count of each note. A second run writes the same bytes:
the candidates are ordered by support, then lemma, then parsing, never by the order of the files.

## The sources

| Source | Pinned at | Licence | Used for |
| --- | --- | --- | --- |
| Swete's Septuagint, eliranwong/LXX-Swete-1930: `00-Swete_versification.csv`, `01-Swete_word_with_punctuations.csv`, `LICENSE`, `README.md` | https://github.com/eliranwong/LXX-Swete-1930 commit `1d3efc3c63bd384a4f3f07ed37eef54b0d45ac33` | text public domain; packaging GPL-3.0 | the words and their references |
| TAGNT, `Translators Amalgamated OT+NT/TAGNT Mat-Jhn …` and `… Act-Rev …` | https://github.com/STEPBible/STEPBible-Data commit `be4191f0082aeedddb0eff0c02c966292b2bd641` | CC BY 4.0 | layer 1 |
| TBESG and TVTMS (fetched, not yet read) | same commit | CC BY 4.0 | the parser's lemmas (B1b); English Ps 23 = Greek Ps 22 |

## Checking it

- **The tests** (`tests/unit/lxx-layer1.test.ts`, in `npm test`) run layer 1 on Swete's Gen 1 and Greek Ps 22 from `tests/fixtures/lxx/` and never the
  network: Gen 1 settles 545 of its 751 words and Ps 22 78 of its 104, the probe's counts; each rule above has a test. The fixture's TAGNT rows are thinned
  (the test's header says how), so the supports in a fixture run are not the New Testament's counts.
- **A word by hand.** For `Gen.1:11#20`: find `Gen.1:11` in the pinned `00-Swete_versification.csv`, read on from that line of
  `01-Swete_word_with_punctuations.csv`, counting only tokens with a letter in them, to the 20th; look its form up in TAGNT (or any lexicon) and compare
  the row's `candidates`.
- **The known answer.** `--hide jhn` leaves John's rows out of the form index. Scoring John 1 against TAGNT with John hidden, as the probe's `--john` did,
  comes with the parser (B1b) and the per-book bar.

## What the move from the probe changed

On the whole of Swete's file, this layer 1 and the probe's (`--sample` run over every book, no model choices) agree on 417,434 words. They differ by
the order of two steps:

- **The spelling fallbacks run before any parser.** In the probe they were tried only when the parser found nothing; here there is no parser yet, so they
  are tried for every form the New Testament lacks. That settles 484 words the probe sent to the parser (0.08% of the file), and many are wrong:
  `γενέσεις` read as `γένεσις` N-NSF, `κατέλειπεν` (imperfect) as the aorist. In Gen 1 and Ps 22 none. **B1b must put the parser before the fallbacks again.**
- **The movable ν only where Greek has it**, after -σι, -ξι, -ψι and -ε. The probe tried it after any -ι or -ε, which without its parser would read
  `φαίνειν` (an infinitive) as `φαίνει` and `Κάιν` as `καί`. 14 words the probe settled this way are pending here: pluperfects such as `δεδώκειν`,
  futures in -σειν and `περιτεμεῖ`.
