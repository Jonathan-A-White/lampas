# The Septuagint data of Lampas (public/data-lxx)

The Greek Old Testament as the app reads it: Swete's Septuagint, one JSON file per Greek chapter (`<book>/<n>.json`), an `index.json` of the books shipped here, and
`lexicon-grc-lxx.json` (every lemma of those books with its gloss and definition). It is written by `npm run data:build:lxx`
(`scripts/data-build-lxx.ts`) and, for the live site, at deploy by `npm run lxx:ship` (`scripts/lxx/ship.ts`), and described in `docs/data.md`, 'The Septuagint data'.
A chapter is here only when it passed the chapter bar of the derivation (`docs/lxx-derivation.md`, 'The chapter bar'); a book ships chapter by chapter, so a book here may be partial
(`shipped` in `index.json` names its chapters). In the repository's own copy there are no chapters yet.

## What is under which licence

| What | Whose | Licence | Where |
| --- | --- | --- | --- |
| The Greek text of every word (`t` in a chapter file) and its transliteration (`tr`) | Swete's *The Old Testament in Greek* (1909-1912), as packaged by [eliranwong/LXX-Swete-1930](https://github.com/eliranwong/LXX-Swete-1930) | The text is public domain; **the packaging is GPL-3.0** | `LICENSE-swete.txt` and `README-swete.md` here are that repository's `LICENSE` and `README.md` at the commit Lampas pins (`1d3efc3c63bd384a4f3f07ed37eef54b0d45ac33`), byte for byte |
| The lemma (`l`), the parsing (`p`), the layer (`y`) and the confidence (`c`) of every word | Lampas's own derived data (`data/lxx/annotations/<book>.tsv`) | **MIT**, `data/lxx/LICENSE` in this repository | the annotation file holds references and these values and **never Swete's Greek**; the method is written down in `docs/lxx-derivation.md` so anyone can rerun it and check it |
| The English of each verse | Brenton's translation (1851) as eBible's `eng-lxx2012`, American spelling by Michael Paul Johnson | public domain | `docs/sources/septuagint-and-webster.md` |
| Which verse of Lampas's Old Testament a Greek verse is (`ref`) | STEPBible's TVTMS, Tyndale House Cambridge | CC BY 4.0 | `ATTRIBUTION.md` |
| The gloss and definition of a lemma | STEPBible's TBESG, Tyndale House Cambridge | CC BY 4.0; changed: applied to the Septuagint by Lampas's derivation | `ATTRIBUTION.md` |

The chapter files hold Swete's words, so they are shared with his text under the GPL-3.0 notice beside them. The annotation files in `data/lxx/` are MIT and hold none
of his Greek. No paid service is called by any script here: the model of layer 3 is a Claude Code session whose choices are committed in `data/lxx/choices/`.

`y` and `c`, and the `ref` of a verse, are PROVISIONAL: the app does not read them yet.
