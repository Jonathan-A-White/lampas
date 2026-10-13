# Pronunciation

The word sheet says how to pronounce the word: under the Greek, a respelling in the pronunciation chosen in
Settings > Greek pronunciation. The data's beta-code transliteration (`tr`, "cristw") is still in
`public/data` but no screen shows it.

Modern Greek is the only scheme so far; Erasmian is next. 'χριστῷ' is `hree-STO`, 'ἐντολή' is `en-do-LEE`:
syllables joined by hyphens, the stressed syllable in capitals (a one-syllable word has no capitals), English
sound-alikes for the letters.

## How it is built

`src/speech/pronunciation.ts` is the registry: a list of `Pronunciation` entries
`{ id, label, lang, scoringLang, note, respell(greekWord), keyWords, loneLetter(word), lessons? }`. `keyWords` gives each sound the respelling writes an English word that has it (`e` is the e of pet); the sound lessons say every sound as 'e as in pet' from it. Settings lists the entries, the word sheet calls
`pronunciationOf(chosen).respell(word.t)`, and `lang` is the language tag of the voice that speaks (Settings keeps
the chosen id under `greekPronunciation`). Each scheme is one file in `src/speech/schemes/`.

`loneLetter(word)` is what the scheme's voice is handed for a Greek word of ONE letter (ὁ, ἡ, ὦ, Ὃ): a voice handed a bare
letter names it ('omicron'), so the scheme gives a form its voice reads as the word's sound (mw-5r3p30.262). Modern Greek's is
the bare vowel in lower case with a stress mark, ό ή ώ (no breathing is said; a Greek voice reads a stressed vowel as a
syllable, as it reads the word ή 'or'). A held word, a speaker and a one-letter run of a reading all go through it
(`src/speech/greek.ts` `loneLetterForm`); a letter drill (`speakLetter`) does not, since there the letter is the thing named.

`lessons` (mw-5r3p30.229) is what the scheme TEACHES of each sound-bearing idea of the grammar ladder, keyed by idea id (`letter-beta`,
`diphthong-ou`, `pair-mp`, `breathing-rough`, and the groups `diphthongs`, `consonant-pairs`, `breathings`): `{ sound?, text? }`. The idea sheet
(`IdeaSheet.tsx`), the quick round, the sound questions and the reading drill read them through `src/data/grammar/lessons.ts` (`ideaText`, `ideaSound`)
for the chosen scheme; the ladder itself holds only the spelling, so no scheme's sounds are written outside its own file. An idea the scheme has no
lesson for says a neutral text with no sound and is asked by ear or by name, never in another scheme's sounds. Modern Greek's are in
`schemes/modernLessons.ts` (the breathings are silent: ὁ is 'o'), and `tests/unit/sound-lessons.test.ts` holds each to `respellModern`.

## Modern Greek (`src/speech/schemes/modern.ts`)

| Greek | Said | Notes |
| --- | --- | --- |
| α ε η ι υ ο ω | a e ee ee ee o o | |
| αι ει οι υι ου | e ee ee ee oo | not a pair when the first letter carries the accent or the second a diaeresis |
| αυ ευ ηυ | av/af ev/ef eev/eef | v before a vowel or β γ δ ζ λ μ ν ρ, f before anything else or the end |
| β δ θ ζ | v dh th z | |
| γ | gh; y before e i (η ι υ αι ει οι υι ευ) | |
| χ | kh; h when the next vowel is e or i | χριστῷ is `hree-STO` |
| μπ ντ γκ γγ | mb nd ng(g) inside a word; b d g at its start | the n or m ends the syllable, the b d g opens the next |
| γχ γξ | ng+kh (h), nks | `ἐλέγχω` is `e-LENG-kho` |
| σ | s; z before β γ δ ζ μ ν ρ | the z ends the syllable: `Ἰσραήλ` is `eez-ra-EEL` |
| double consonants | said once | |

A hard g after a nasal is written `gh` when it opens the stressed syllable before e or i (`εὐαγγέλιον` is
`ev-an-GHE-lee-on`, but `ἄγγελος` is `AN-ge-los`), so an English reader does not soften it to j.
Breathing marks, the iota under a letter and elision marks say nothing. Syllables are cut after each vowel,
moving to the next syllable the longest group of consonants that can open a Greek word.

## Adding a scheme (Erasmian next, not built yet)

1. Write `src/speech/schemes/<id>.ts` exporting a `Pronunciation` (see `modern.ts`): its `respell` takes the Greek
   word and returns the respelling; its `keyWords` name an English word for each sound it writes; its `loneLetter` gives the form
   its voice is handed for a word of one letter (Erasmian on a Greek voice: find what that voice says as the sound, not the name). Erasmian's table (the story's note): μπ `mp`, ντ `nt`, γκ `nk`, γχ `nk`.
2. Put it in `SCHEMES` in `src/speech/pronunciation.ts`, after Modern Greek. Settings, the saved choice and the word
   sheet pick it up; nothing else names an id.
3. Add the id's voice language: `lang` is what the utterance uses. If the phone has no voice for it, say so in `note`.
4. Set `scoringLang`: the language the Greek reading check asks the mill to score a reading in (modern Greek is `el`).
   It goes as `lang` on the verse-read grist, so the grind's `scoring.langs` (grinds/verse-read.json) must list it and the
   mill's scorers must be able to score it; a scheme the mill cannot score cannot be given a reading check until they can.
5. Give it `lessons` for every letter, pair and breathing it says (copy `schemes/modernLessons.ts`; Erasmian's rough breathing adds an h, which is where that lesson belongs, not in the ladder).
6. Test it the way `tests/unit/respell-modern.test.ts` does, one row per rule.

A test adds a scheme for one scenario with `registerPronunciation(scheme)`, which returns the function that takes
it out again (features/pronunciation.feature).
