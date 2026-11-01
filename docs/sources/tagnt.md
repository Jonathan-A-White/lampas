# TAGNT: the Strong's numbers of the variant words

STEPBible's **Translators Amalgamated Greek New Testament** (TAGNT) is the second source of a variant word's Strong's number (mw-9ji6ek0.44). The first is the Greek text and the
lexicon; the third is a marked guess. `scripts/data/tagnt.ts` reads it, `scripts/data/variantWords.ts` lays it on the words of every reading.

<!-- toc -->

- [The source](#the-source)
- [What we take](#what-we-take)
- [The order of the sources](#the-order-of-the-sources)
- [The guess](#the-guess)

<!-- /toc -->

## The source

- Two files, <https://github.com/STEPBible/STEPBible-Data> `Translators Amalgamated OT+NT/TAGNT Mat-Jhn …CC-BY.txt` and `TAGNT Act-Rev …CC-BY.txt` (about 30 MB), fetched by
  `npm run data:build` from `raw.githubusercontent.com` into `data/raw/tagnt/` (git-ignored). Their bytes together must have `TAGNT_SHA256` (2026-10-31); upstream changing them stops the
  build, which says to delete `data/raw/tagnt` and, once the new file is read, to pin the new hash.
- Licence: **CC BY 4.0**, Tyndale House Cambridge (STEPBible.org). We read the data and change it (below), as the licence allows with a note of the changes (ATTRIBUTION.md, the TBESG bullet).
- A row is a word of NA27/28, TR, SBL, WH, Byz and others: `Rev.10.2#07=NK(o)<TAB>βιβλαρίδιον (biblaridion)<TAB>a little scroll<TAB>G0974=N-ASN<TAB>…`. Its sixth column names the other
  word the editions that differ read (`βιβλίον (o=biblion) a scroll - G0975=N-ASN in: Byz`) and the seventh the other spellings (`Tyn+TR: εἶπον ;`).

## What we take

Only the form, the number and the parsing: each row's own word, the other word of the sixth column (with its own number and parsing), and each spelling of the seventh (the row's number
and parsing). The number loses its padding (`G0974` is `G974`), the lemma is the lexicon's (TBESG) for the number, a number the lexicon lacks is left out, and the parsing loses TAGNT's own last
part for a name or title (`N-ASF-L` a place, `-LG`, `-PG`, `-T`, `-HEB`, `-ARAM`) or, if the app cannot decode it, is dropped.

## The order of the sources

For a word of a reading, in turn: the text's own forms (exact), TAGNT's forms (exact), the text's forms by letters alone, TAGNT's by letters alone (only where those letters are one number),
the lexicon's lemmas (the form is a lemma: no parsing), then the guess. `GreekWord.src` says which: `lexicon` (the first, third and fifth), `tagnt` (the second and fourth), `guess`.

## The guess

`guessLemma` (scripts/data/variantWords.ts): the lemma whose **stem** the form begins with, the stem being the lemma's letters but its last two, four or more of them; letters only (no accents,
breathings or case); at most five letters beyond the stem; an augment (ε, η) may stand in front of a stem of five or more; only lemmas the New Testament text uses (the lexicon also holds the Septuagint's and classical Greek's); a name (a capital) is guessed from a name only and a word from a word. The longest stem wins, then
the lemma the text uses most, then the lower number. The word sheet marks such a number with a small `guess` and a tap says why (`src/GuessedNumber.tsx`). The build prints
`variant words tagged: N of M (lexicon A, tagnt B, guess C)` and lists the guesses in `data/variant-guessed.txt` and the forms no source and no lemma is near enough for (numeral letters, a few
verb forms) in `data/variant-untagged.txt`, both for review.

Only the New Testament has variant words; an Old Testament chapter has no `variants`, so there is no Hebrew counterpart.
