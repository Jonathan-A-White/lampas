# The Greek reading ladder

Every verse of the New Testament, ordered by how hard it is to **pronounce**: to say the letters and their sounds aloud.
It says nothing about how hard a verse is to understand. A later screen can walk him up it, easiest first.

```bash
npm run ladder     # scripts/ladder-el.ts: reads public/data, writes public/data/ladder/el.json
```

The script is deterministic (a second run changes no byte) and is never run by the app. The generated file is committed;
`npm run data:build` leaves `public/data/ladder/` alone.

## The file

`public/data/ladder/el.json` is one compact JSON list, easiest first, ties in canonical order (book, chapter, verse):

```json
[{"ref":"1th.5.16","score":8,"why":["6 syllables","2 words","1 consonant cluster"]}]
```

`ref` is the book's code, chapter and verse number (`jhn.11.35`; a verse the Byzantine text omits is not listed, so
every verse in `public/data` appears exactly once). `score` is a whole number, lower is easier. `why` is up to three short
reasons, the ones that cost the most points first.

## What the score counts

The score is the sum of these, over the verse's Greek words (the "el" in the file name is the Modern Greek sounds that
`src/speech/schemes/modern.ts` `respellModern` writes; the same letters are read the same way here):

| What | Points |
| --- | --- |
| each word | 1 |
| each syllable after a word's first (the syllables are `respellModern`'s) | 1 |
| the longest word, for each syllable past 3 | 2 |
| a run of two or more consonants inside a word (a doubled consonant counts once) | 1; a run of three or more, 2 |
| a pair of vowels said as one sound: αι ει οι υι ου αυ ευ ηυ (not when the first letter is accented or the second has a diaeresis) | 1 |
| a diaeresis | 2 |
| each rare letter: ξ ψ ζ | 2 |
| each rare pair: γγ γκ γξ γχ | 2 |

John 11:35, Ἐδάκρυσεν ὁ Ἰησοῦς: the words cost 4 (3 syllables past the first and the cluster κρ), 0, and 3 (2 syllables past the first and
ου), their number 3, and the 4-syllable longest word 2, so 12. A long verse of names and clusters scores in the hundreds.

**The weights are a first guess** (`WEIGHTS` in the script). They are meant to be tuned by hearing him read, not argued from the page.
`tests/unit/ladder-el.test.ts` pins a few scores by hand; change a weight and those pins say what moved.
