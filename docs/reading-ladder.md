# The Greek reading ladder

Every verse of the New Testament, ordered by how hard it is to **pronounce**: to say the letters and their sounds aloud.
It says nothing about how hard a verse is to understand. The Reading ladder (below) walks him up it, easiest first.

```bash
npm run ladder     # scripts/ladder-el.ts and scripts/ladder-en.ts: read public/data, write public/data/ladder/el.json and en.json
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

## English

A verse easy to say in Greek may be hard in English, so English has a list of its own: `public/data/ladder/en.json`, written by
`scripts/ladder-en.ts` (the same `npm run ladder` runs both). It has the shape of `el.json` (`ref`, `score`, `why`; easiest first, ties in
canonical order, every verse once, the same bytes on a second run) and the two files never read each other. What is scored is the English
**as the Reader shows it**: the verse's chunks (`e[].t`, in English order) joined by a space. The two scripts share `scripts/ladder-shared.ts`
(the entry, the reasons and the walk over the verses).

```json
[{"ref":"jhn.11.35","score":3,"why":["2 words","3 syllables"]}]
```

| What | Points |
| --- | --- |
| each word (a hyphenated word is its parts) | 1 |
| each syllable after a word's first (a vowel-group count with the usual corrections: silent final e, -ed, -es, -le, Uri-ah; `syllablesOf`) | 1 |
| the longest word, for each syllable past 3 | 2 |
| a name or loanword: a capitalised word that does not open a sentence or a quotation (Zerubbabel; a possessive 's is ignored) | 3 for three syllables, 2 for two, 2 more for each syllable past three; one syllable costs nothing extra |
| a spelling that breaks the usual sounds: ph gh ch, a silent first letter (kn wr gn ps pn), a silent final mb | 1 |
| ough, augh, eigh | 2 |

The common capitals (God, Lord, Jesus, Christ, Spirit, Father, Son, Holy, the divine pronouns, Jews, Gentiles, Sabbath and a few more; `COMMON`)
are not names. A verse's first word is never charged as a name, because a capital there says nothing.

John 11:35, Jesus wept.: 2 words, 1 syllable past the first (Jesus), no name (it opens the sentence), so 3, the easiest tenth.
Matthew 1:8 and 1:13, lists of begettings (Jehoshaphat, Zerubbabel, Eliakim), score in the 50s and are in the hardest tenth.

**The weights and the syllable count are a first guess** (`WEIGHTS` in the script), to be tuned by hearing him read.
`tests/unit/ladder-en.test.ts` pins the syllables of fourteen words, a few scores by hand and the two ranks above.

## The Reading ladder on the phone (mw-neuq78.4)

He said: "start with the easiest to pronounce verse and work from there ... keep track of where I'm at and keep offering me the next one", for Greek and for English each on its own.

* **Where it starts.** A `Reading ladder` button in the Verse view's Read it aloud panel (`src/ReadCheck.tsx`, one per language he reads in: the Greek view's is the Greek ladder, the English view's the English one) and two on the Goal screen, `Reading ladder: Greek` and `Reading ladder: English` (`src/GoalScreen.tsx`; they open the Verse view on Read it aloud, in that language). A tap opens the first verse on `public/data/ladder/<lang>.json` he has not read well.
* **The panel.** On a ladder verse the reading panel says `Reading ladder, Greek: Verse N of M` (N is the verse's place on the list, M the list's length).
  After a reading that is `Well read` it offers `Next verse`, which opens the next verse he has not read well. After `Words to fix`, `Part of the verse` (a partial reading, mw-neuq78.7) or `Read the whole verse` it offers `Try again` (sets the result aside; the verse stays) and `Skip for now`. A verse with no result yet offers `Skip for now`.
* **The place is not stored twice.** It is the first verse of the list with no `well-read` in the reading history of that language (`readingHistory`, `src/data/repositories/readings.ts`), so a reading made any other way counts too, a well-read moves it at once, and reopening the app resumes it. `src/data/readingLadder.ts` `ladderPlace` is the pure rule; the Dexie `ladder` table (v18, `src/data/repositories/ladder.ts`) keeps per language `showing` (the verse the ladder last opened, whose panel is the ladder's) and `skipped` (`{ref, at}`).
* **Skipped.** A skip is remembered with its time. The verse is passed over and comes back (as the place) after he has read `SKIP_GAP` (5, PROVISIONAL) other verses well since the skip; skipped again, its wait starts afresh; when nothing else is left the oldest skipped verse is the place.
* **The list loads lazily.** `loadLadder` fetches `/data/ladder/<lang>.json` when the ladder is started or a ladder verse is on screen, never at startup. The files are not in the precache (`pwa-precache.ts` names its data files); the worker's `/data/` route keeps one once fetched. Offline and not yet fetched, the button says `The ladder is not on this phone yet, and you are offline.`
* Only a verse is on the ladder: a passage (a section heading's view) shows no ladder. A Greek pronunciation other than modern has no list, so no button.
* Tests: `features/reading-ladder.feature`, `tests/unit/reading-ladder.test.ts`, `tests/e2e/reading-ladder.spec.ts` (`shot(page, 'reading-ladder')`).
