# Pronunciation

The word sheet says how to pronounce the word: under the Greek, a respelling in the pronunciation chosen in
Settings > Greek pronunciation. The data's beta-code transliteration (`tr`, "cristw") is still in
`public/data` but no screen shows it.

Modern Greek is the only scheme so far; Erasmian is next. 'χριστῷ' is `hree-STO`, 'ἐντολή' is `en-do-LEE`:
syllables joined by hyphens, the stressed syllable in capitals (a one-syllable word has no capitals), English
sound-alikes for the letters.

## How it is built

`src/speech/pronunciation.ts` is the registry: a list of `Pronunciation` entries
`{ id, label, lang, scoringLang, note, respell(greekWord) }`. Settings lists the entries, the word sheet calls
`pronunciationOf(chosen).respell(word.t)`, and `lang` is the language tag of the voice that speaks (Settings keeps
the chosen id under `greekPronunciation`). Each scheme is one file in `src/speech/schemes/`.

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
   word and returns the respelling. Erasmian's table (the story's note): μπ `mp`, ντ `nt`, γκ `nk`, γχ `nk`.
2. Put it in `SCHEMES` in `src/speech/pronunciation.ts`, after Modern Greek. Settings, the saved choice and the word
   sheet pick it up; nothing else names an id.
3. Add the id's voice language: `lang` is what the utterance uses. If the phone has no voice for it, say so in `note`.
4. Set `scoringLang`: the language the Greek reading check asks the mill to score a reading in (modern Greek is `el`).
   It goes as `lang` on the verse-read grist, so the grind's `scoring.langs` (grinds/verse-read.json) must list it and the
   mill's scorers must be able to score it; a scheme the mill cannot score cannot be given a reading check until they can.
5. Test it the way `tests/unit/respell-modern.test.ts` does, one row per rule.

A test adds a scheme for one scenario with `registerPronunciation(scheme)`, which returns the function that takes
it out again (features/pronunciation.feature).
