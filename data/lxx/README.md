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
| `derived/<book>.tsv` | the words of a book that are settled: `ref`, `lemma`, `parsing`, `layer`, `confidence`, `candidates`, `notes` | not yet (git-ignored while the derivation is being built) |
| `pending/<book>.tsv` | the words still waiting for a later layer: `ref`, `candidates`, `notes` | not yet (git-ignored) |

`<book>` is Swete's book code in lower case (`gen`, `psa`). The columns are described in docs/lxx-derivation.md, 'The files'.

**What there is so far, and what is to come.** Layers 1 and 2: a word whose form the New Testament has with one analysis (or one with at least 95% of 20
or more words) is settled in layer 1; a form it lacks is parsed by ending rules learned from the New Testament, with lemmas only from TBESG, and settled in
layer 2 when one candidate has at least 90% of the support; every other word is pending with its candidates. The model's choice among them (layer 3)
comes in a later story, and then the files are committed book by book, each once it meets the bar in docs/sources/lxx-derivation-probe.md, 'Error checks
for the full run'.

## How they are made

```bash
npm ci
npm run lxx:derive -- --book gen               # writes data/lxx/derived/gen.tsv and data/lxx/pending/gen.tsv
npm run lxx:derive -- --book gen --hide jhn    # the same with John left out of the New Testament's forms, for a known-answer run
```

The first run fetches the pinned sources into `data/raw/lxx/<repo>/<commit>/` (git-ignored; a file already there is not fetched again). Nothing else
touches the network, and no paid service is called: the model of layer 3 will be a Lampas Builder's own session. Two runs on the same sources write
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

MIT on Lampas's part does not stop anyone meeting CC BY 4.0 for what was derived from STEPBible's data: keep the credit above with the data.
