# The Greek reading ladder

Every verse of the New Testament, ordered by how hard it is to **pronounce**: to say the letters and their sounds aloud.
It says nothing about how hard a verse is to understand. The Reading ladder (below) walks him up it, easiest first.

```bash
npm run ladder     # scripts/ladder-el.ts, ladder-en.ts and ladder-he.ts: read public/data, write public/data/ladder/el.json, en.json and he.json
```

The script is deterministic (a second run changes no byte) and is never run by the app. The generated file is committed;
`npm run data:build` leaves `public/data/ladder/` alone (and keeps the `ladders` fingerprints in `index.json`).

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

## Hebrew (mw-gdcyf98.14)

The Old Testament has a list of its own: `public/data/ladder/he.json`, written by `scripts/ladder-he.ts` (the same `npm run ladder` runs it after the other two). It has the shape of `el.json`
(`ref`, `score`, `why`; easiest first, ties in canonical order, every verse once, the same bytes on a second run): 23,144 verses (Exodus 20:14, *lō tin·ʾāp̄*, is the
easiest at 3). `scripts/ladder-shared.ts` `buildLadderWith` takes which books to walk (`'grc'` for el and en, so they stay New Testament only; `'hbo'` for he), and the scorer is
`scoreHebrewWords` in `src/data/ladderScore.ts`: one function for the script and the phone, so the two cannot disagree.

What is scored is each word's **syllabified transliteration** (`tr` in the chapter files: `way·hî`, `hag·gə·ḏō·w·lāh`; the dot is the syllable break), as the Hebrew view shows the words:

| What | Points |
| --- | --- |
| each word (a `tr` of two forms is two words) | 1 |
| each syllable after a word's first (a part between dots with a vowel in it; the lone `w` or `y` after a vowel, as in `yō·w·nāh`, is the vowel's letter and no syllable) | 1 |
| the longest word, for each syllable past 3 | 2 |
| a run of two or more consonants inside a word (a doubled consonant counts once; aleph and ayin break a run) | 1; a run of three or more, 2 |
| a shewa `ə` or a reduced vowel (a hataf: `ă ĕ ŏ`) | 1 |
| a letter doubled by a dagesh (`mit·tay`: written twice, said once) | 1 |
| each rare letter: `ḥ` (khet), `ḵ` (khaf), `ṣ` (tsadi), `ʿ` (ayin) | 2 |

Jonah 1:1 scores 20 (8 words, 15 syllables, two clusters, shewas and doubled letters); Genesis 1:1, with its long words and shewas, 26; Genesis 1:2, 63. **The weights are a first guess**
(`HEBREW_WEIGHTS`), to be tuned by hearing him read. `tests/unit/ladder-he.test.ts` pins the ten easiest verses and the rank of those three.

**What the scorer cannot syllabify.** A word with no vowel to say (an unpointed form, a ketiv, the paragraph sign `p̄`) or no `tr` at all is counted as one word and one syllable and nothing more;
the script prints the verses that hold one and `ladder-he.test.ts` pins them: 25 verses (21 hold a form with no vowel, 4 a word with no `tr`).

On the phone the Hebrew list is a language like the other two (`LADDER_LANGS` is `el`, `en`, `he`; `he` is the Hebrew scheme's `scoringLang`, `src/speech/pronunciation.ts`). He reads a Hebrew verse in the
Hebrew view of an Old Testament chapter; the Verse view's Read it aloud offers it there, `Reading ladder` in the panel starts the Hebrew list, and the Goal screen has `Reading ladder: Hebrew`
where Hebrew is the language in hand (the Greek | Hebrew segment when he chose both). The reading check, its drill and the place work as the others do (`docs/read-aloud.md` 'A Hebrew reading').
The drill of a Hebrew reading is the words he missed, as in English (the word itself is the unit; a diphthong is a Greek idea).
Tests: `features/hebrew-reading-ladder.feature`, `tests/unit/hebrew-read-check.test.ts`, `tests/e2e/hebrew-reading-ladder.spec.ts` (`shot(page, 'hebrew-reading-ladder')`).

## The Reading ladder on the phone (mw-neuq78.4)

He said: "start with the easiest to pronounce verse and work from there ... keep track of where I'm at and keep offering me the next one", for Greek and for English each on its own.

* **Where it starts.** A `Reading ladder` button in the Verse view's Read it aloud panel (`src/ReadCheck.tsx`, one per language he reads in: the Greek view's is the Greek ladder, the English view's the English one) and two on the Goal screen, `Reading ladder: Greek` and `Reading ladder: English` (`src/GoalScreen.tsx`; they open the Verse view on Read it aloud, in that language). A tap opens the first verse on `public/data/ladder/<lang>.json` he has not read well. The list is fetched at the first tap (650 KB, seconds on a slow connection), so until that verse opens the tapped button reads `Loading the ladder…`, is busy and takes no second tap (mw-neuq78.17).
* **The panel.** On a ladder verse the reading panel says `Reading ladder, Greek: Number N of M on the ladder` (N is the verse's place on the list, M the list's length).
  After a reading that is `Well read` it offers `Next verse`, which opens the next verse he has not read well. After `Words to fix`, `Part of the verse` (a partial reading, mw-neuq78.7) or `Read the whole verse` it offers `Try again` (sets the result aside; the verse stays) and `Skip for now`. A verse with no result yet offers `Skip for now`.
* **The place is not stored twice.** It is the first verse of the list with no `well-read` in the reading history of that language (`readingHistory`, `src/data/repositories/readings.ts`), so a reading made any other way counts too, a well-read moves it at once, and reopening the app resumes it. `src/data/readingLadder.ts` `ladderPlace` is the pure rule; the Dexie `ladder` table (v18, `src/data/repositories/ladder.ts`) keeps per language `showing` (the verse the ladder last opened, whose panel is the ladder's) and `skipped` (`{ref, at}`).
* **Skipped.** A skip is remembered with its time. The verse is passed over and comes back (as the place) after he has read `SKIP_GAP` (5, PROVISIONAL) other verses well since the skip; skipped again, its wait starts afresh; when nothing else is left the oldest skipped verse is the place.
* **The list loads lazily.** `loadLadder` fetches `/data/ladder/<lang>.json?v=<fingerprint>` (`ladderUrl`; the fingerprint is `ladders.<lang>` in `public/data/index.json`, which `npm run ladder` stamps: the first 12 hex characters of the SHA-256 of the list's bytes) when the ladder is started or a ladder verse is on screen, never at startup. The files are not in the precache (`pwa-precache.ts` names its data files); the worker keeps one once fetched under that address, as it does a chapter (`isVersionedLadder`, `serveChapter`), so a rescored list, which has a new fingerprint, is fetched once and replaces its old copy (mw-9ji6ek0.10). Offline and not yet fetched, the button says `The ladder is not on this phone yet, and you are offline.`
* Only a verse is on the ladder: a passage (a section heading's view) shows no ladder. A Greek pronunciation other than modern has no list, so no button.
* Tests: `features/reading-ladder.feature`, `tests/unit/reading-ladder.test.ts`, `tests/e2e/reading-ladder.spec.ts` (`shot(page, 'reading-ladder')`).

## Drills (mw-neuq78.5)

He said: "maybe there are drills that I need or things that I really need to remember ... build out that machinery just like you have the paradigms". The miss tally (mw-neuq78.3, `missTally`) says what he keeps getting wrong; a drill is the machinery that does something about it.

* **When it is offered.** The tally counts, for his last `TALLY_READINGS` (5) readings in a language, **the readings** in which a misread word holds the sound (Greek: a diphthong or consonant pair of `src/data/grammar/ladder.ts`, found in the chunks of the word) or is the word (English). A unit counts once a reading, however many of that reading's words hold it. When one has `DRILL_MISSES` (2, PROVISIONAL) or more, the reading panel (`src/ReadCheck.tsx`) offers `Drill this sound` (Greek, the most missed sound) or `Drill these words` (English, his misread words, the most missed first, at most five), with a line saying what the tally found. One miss offers nothing. The pure rule is `src/data/readingDrill.ts` `drillOffer`.
* **The drill** is a sheet (`src/ReadingDrill.tsx`, dialog `Reading drill`, a Back step like every sheet): a card with the one thing to remember, then the words, then `Back to the ladder`.
  * Greek: the card says the sounds tier's own rule ('ου says oo, as in “moon”': `ruleOf`, so a sound is said only through the scheme's key words) with a speaker, then `drillWords`: up to five dictionary words (the lemma) of the New Testament that hold the sound, the ones most made of it first (the sound's letters as a share of the word, then the commoner; names and words that differ only by their marks are left out), shown **easiest first by the ladder's own score** (`src/data/ladderScore.ts` `scoreWords`, which `scripts/ladder-el.ts` uses too; the weights are the same first guess). The words come from `public/data/frequency.json`.
  * English: the card lists his misread words and each is a practice word.
  * Each word is read aloud with the same verse-read grist at word size (the reading check's own recorder and request, `useReadChecks` with a `keep` that holds the answer in the sheet instead of the history: a drill reading is **not** added to `readingHistory`, `readings` or the tally). Its verdict, note and chunks show under the word; `Skip this word` / `Next word` / `Finish` move on.
* **On the schedule.** Reaching the end (`Finish`, or skipping the last word) puts the drilled unit on the back-off schedule as a review of kind `sound` (`src/data/repositories/reviews.ts` `scheduleSounds`): id `el:diphthong-ou` or `en:blessed`, step 0, due after `STEP_DAYS[0]` (a day); a unit already scheduled starts again from step 0. Review (`src/review/kinds.ts` SOUNDS, between the grammar ideas and the words; 'Due today: 1 sound') asks a Greek sound as the placement's quick round does (heard and picked, or seen and its sound picked; a flashcard from the flashcard step) and an English word as a flashcard to say aloud (`src/SoundWordCard.tsx`), and each answer moves the schedule like any other item.
* Tests: `features/reading-drill.feature`, `tests/unit/reading-drill.test.ts`, `tests/e2e/reading-drill.spec.ts` (`shot(page, 'reading-drill')`).
