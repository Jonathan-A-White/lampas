# Lampas's Septuagint data: lemma and parsing for Swete's Greek

This directory holds Lampas's own data for the Greek Old Testament: for each word of Swete's Septuagint, a lemma (the dictionary form) and a parsing,
with how each was reached and how sure it is. It is made by a script anyone can rerun (`npm run lxx:derive`), from sources pinned to a commit, and
its method is written down in [docs/lxx-derivation.md](../../docs/lxx-derivation.md).

**The files hold no Greek of Swete's.** A word is named only by its reference in the pinned Swete file (`Gen.1:20#13`: Genesis 1:20, its 13th word,
counting Swete's words and not his editor's signs). To see the word, join the reference to that file (docs/lxx-derivation.md says how). The Greek in
these files is Lampas's own derived data: the lemma and the candidate analyses.

## The files

| File | What it is | In git |
| --- | --- | --- |
| `LICENSE` | MIT, for Lampas's derived data in this directory | yes |
| `README.md` | this file | yes |
| `annotations/<book>.tsv` | **the release**: the words of a book that passed the bar, `ref`, `lemma`, `parsing`, `layer`, `confidence`, `notes`, one row a word; written by `npm run lxx:release -- --book <code>` only when the book meets the bar | yes, a book at a time (none yet) |
| `choices/<book>-<batch>.tsv`, `known/<book>-<chapter>.tsv`, `recheck/<book>-<batch>.tsv` | the model's choices (layer 3): for a book's pending words, for a New Testament chapter's known-answer run, and the second pass on a sample; `ref`, `parsing`, `lemma`, `mark` | yes |
| `morpheus/<book>.tsv` | Morpheus's analyses (mapped to TAGNT's codes) of the book's forms with no candidate and of its guesses: `form`, `analyses`; made by `npm run lxx:derive` when Docker and the Morpheus image are there | no (git-ignored cache; it holds the forms, so it is never released) |
| `derived/<book>.tsv` | the words of a book that are settled: `ref`, `lemma`, `parsing`, `layer`, `confidence`, `candidates`, `notes` | no (git-ignored working file) |
| `pending/<book>.tsv` | the words still waiting for a later layer: `ref`, `candidates`, `notes` | no (git-ignored working file) |

`<book>` is Swete's book code in lower case (`gen`, `psa`). The columns are described in docs/lxx-derivation.md, 'The files'.

**What there is so far, and what is to come.** Layers 1 and 2: a word whose form the New Testament has with one analysis (or one with at least 95% of 20
or more words) is settled in layer 1; a form it lacks is parsed by ending rules learned from the New Testament, with lemmas only from TBESG, and settled in
layer 2 when one candidate has at least 90% of the support; every other word is pending with its candidates. The model's choice among them (layer 3) is
read from a choices file (docs/lxx-derivation.md, 'The choices file'). A book's `annotations/<book>.tsv` is committed once the book meets the bar in
docs/lxx-derivation.md, 'The bar' (the probe's numbers): known-answer lemma at least 99% and full parsing at least 98% on John 1 and one other New Testament chapter that changes with the build,
no word pending, guesses at most 3% of the book's words, agreement breaks at most 5 per 1,000. `docs/lxx-report.md` says where every book stands.

## How they are made

```bash
npm ci
npm run lxx:derive -- --book gen               # writes data/lxx/derived/gen.tsv and data/lxx/pending/gen.tsv
npm run lxx:derive -- --book gen --hide jhn    # the same with John left out of the New Testament's forms, for a known-answer run
npm run lxx:known -- --chapter Jhn.1           # a New Testament chapter with its book hidden, scored against TAGNT
npm run lxx:release -- --book gen              # annotations/gen.tsv, only if the book meets the bar; otherwise it names each failing line and writes nothing
npm run lxx:report                             # docs/lxx-report.md
```

The first run fetches the pinned sources into `data/raw/lxx/<repo>/<commit>/` (git-ignored; a file already there is not fetched again). Nothing else
touches the network, and no paid service is called: the model of layer 3 is a Lampas Builder's own session. Two runs on the same sources write
the same bytes.

## Sources and credit

- **Lemmas and parsing codes derived from STEPBible's TAGNT and TBESG** ([www.STEPBible.org](https://www.stepbible.org), Tyndale House Cambridge),
  [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), changed: applied to the Septuagint by Lampas's derivation.
  TAGNT (Translators Amalgamated Greek NT) gives the New Testament's form, lemma and parsing for layer 1; TBESG (Translators Brief lexicon of
  Extended Strongs for Greek) will give the parser its lemmas. Pinned at [STEPBible/STEPBible-Data](https://github.com/STEPBible/STEPBible-Data)
  commit `be4191f0082aeedddb0eff0c02c966292b2bd641`. Lampas does not redistribute TAGNT or TBESG themselves; get them from github.com/STEPBible.
- **Swete's Greek** (*The Old Testament in Greek according to the Septuagint*, ed. H. B. Swete, 1909-1912; public domain) as packed by
  [eliranwong/LXX-Swete-1930](https://github.com/eliranwong/LXX-Swete-1930) (GPL-3.0), commit `1d3efc3c63bd384a4f3f07ed37eef54b0d45ac33`. The
  references here count its tokens. Its text is not in these files; where Lampas ships Swete's Greek it ships in files of its own with eliranwong's
  `LICENSE` and `README.md` beside them.

- **Morpheus** ([perseids-tools/morpheus](https://github.com/perseids-tools/morpheus), the Perseus Project's analyzer), commit `ab6898ffed335fc6169fa02c9940657a9b5a78e0`, **MPL-2.0**. A build tool: `npm run lxx:derive` runs it from
  its Docker image over a book's forms with no candidate and its guesses, and its analyses become candidates in `morpheus/<book>.tsv` (a git-ignored cache) and in the words' candidate columns. Only what it prints about a
  word reaches this data, never its code or its tables, and MPL-2.0 is a file-level copyleft on Morpheus's own files, which Lampas does not copy or ship. With no Docker the step is skipped and nothing else changes
  ([docs/lxx-derivation.md](../../docs/lxx-derivation.md), 'Morpheus, the second method').

MIT on Lampas's part does not stop anyone meeting CC BY 4.0 for what was derived from STEPBible's data: keep the credit above with the data.
