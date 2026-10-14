# Pronunciation

The word sheet says how to pronounce the word: under the Greek, a respelling in the pronunciation chosen in
Settings > Greek pronunciation. The data's beta-code transliteration (`tr`, "cristw") is still in
`public/data` but no screen shows it.

Modern Greek is the only scheme so far; Erasmian is next. 'χριστῷ' is `khree-STO`, 'ἐντολή' is `en-do-LEE`:
syllables joined by hyphens, the stressed syllable in capitals (a one-syllable word has no capitals), English
sound-alikes for the letters.

## How it is built

`src/speech/pronunciation.ts` is the registry: a list of `Pronunciation` entries
`{ id, label, lang, scoringLang, note, respell(greekWord), keyWords, loneLetterClip(word), voiceForm(text), letterForm(letter), tutorGuide, lessons? }`. `keyWords` gives each sound the respelling writes an English word that has it (`e` is the e of pet); the sound lessons say every sound as 'e as in pet' from it. Settings lists the entries, the word sheet calls
`pronunciationOf(chosen).respell(word.t)`, and `lang` is the language tag of the voice that speaks (Settings keeps
the chosen id under `greekPronunciation`). Each scheme is one file in `src/speech/schemes/`.

`loneLetterClip(word)` is the bundled clip of the sound of a Greek word of ONE letter (ὁ, ἡ, ὦ, Ὃ), played instead of any voice (mw-5r3p30.347).
A Greek voice handed one letter names it ('omicron'), with or without an accent: mw-5r3p30.262 handed it the stressed vowel 'ό', which
passed its tests, and his phone (and espeak-ng's `el`: 'omikron tonos') still said the name. So no voice is handed such a word at all.
Modern Greek's clips are `public/sounds/modern/<sound>.mp3`, one per vowel sound its respelling writes (`a`, `e`, `ee`, `o`: ὁ and ὦ play
`o`, ἡ plays `ee`), made by `scripts/sounds-build.sh` with eSpeak NG's phoneme input (`[[o]]`), which says a sound and cannot spell a letter;
they are precached. A held word, a speaker, Tap to hear and a one-letter run of a reading all play it (`src/speech/greek.ts` `loneLetterClip`,
`playLetterClip`; `readAloud.ts` `piecesOf`); a letter drill (`speakLetter`) does not, since there the letter is the thing named. A new scheme
(Erasmian) gives its own clips, from its own vowel sounds, in `public/sounds/<id>/`, and the build script a line for them.

`voiceForm(text)` (mw-5r3p30.264) is what the scheme's voice is handed for any other Greek text (a held word, a speaker, a verse read
aloud), so the voice says the sounds the respelling writes. A Greek voice reads ντ, μπ and γκ inside a word as a bare d, b, g (Πάντοτε
heard 'PA-do-te'; espeak-ng's `el` says `pˈadotˌe` too), while the respelling and the lessons keep the nasal (`PAN-do-te`). So Modern Greek
hands the voice the nasal at the end of the part before and the pair at the start of the next, where a voice says it as at a word's start:
`πάν-ντοτε`, `ἐν-ντολή`, `συμ-μπάσχω`, `ἀν-γκάλη` (espeak-ng: `pˈandˈote`). A pair at the start of a word (`ντομάτα`), and γγ, γχ, γξ, which a
voice says with their nasal, are left as they are. `src/speech/greek.ts` `greekVoiceForm` applies the chosen scheme's; nothing outside the
scheme writes the rule (`tests/unit/voice-form.test.ts` holds every bundled word to it). PROVISIONAL until heard on the Governor's phone.

`letterForm(letter)` (mw-5r3p30.268) is what the scheme's voice is handed to NAME a letter, in a letter drill's Tap to hear (`speakLetter`):
Modern Greek's is the bare letter in lower case, which a Greek voice names the modern way ('vita' for β).

`tutorGuide` (mw-5r3p30.268) is what the tutor is told of the scheme: its name and the sound rules it respells and speaks by. Every tutor ask
that may speak of a sound sends it as `pronunciation_guide` beside `pronunciation` (the id): bible-talk (`buildTalkRequest`; a full record
drops it before the history, except on a sound question), verse-ask (`buildRequest`) and verse-read (`buildReadingRequest`). The grinds'
instructions name no sound and no scheme of their own: they say to describe every sound by `pronunciation_guide`. The grind examples carry
Modern Greek's guide word for word.

## One scheme for every sound (mw-5r3p30.268)

No file of `src/` or `grinds/` outside `src/speech/pronunciation.ts` and `src/speech/schemes/` says, spells or describes a Greek sound,
names a scheme by hand or imports a scheme file: callers ask the chosen scheme (`chosenPronunciation()` in `src/speech/greek.ts`, or
`pronunciationOf(id)`). `tests/unit/one-pronunciation-scheme.test.ts` scans for it ('e as in pet', 'the th of “this”', 'β is v', a respelling such
as `TAF-ta`, 'modern Greek' or 'Erasmian', an import of `schemes/`; `tests/support/sound-rules-scan.ts`), with a short allow-list of lines that are
not Greek sounds; `tests/unit/pronunciation-swap.test.ts` registers a second scheme and shows the lessons, a respelling, a letter drill, the voice and
the tutor's guide all follow it. The spelling's own rules (which pairs are one vowel, which clusters open a syllable: `src/speech/greekSyllables.ts`
`ONSETS`) are the same in every scheme and live outside the schemes.

`lessons` (mw-5r3p30.229) is what the scheme TEACHES of each sound-bearing idea of the grammar ladder, keyed by idea id (`letter-beta`,
`diphthong-ou`, `pair-mp`, `breathing-rough`, and the groups `diphthongs`, `consonant-pairs`, `breathings`): `{ sound?, text? }`. The idea sheet
(`IdeaSheet.tsx`), the quick round, the sound questions and the reading drill read them through `src/data/grammar/lessons.ts` (`ideaText`, `ideaSound`)
for the chosen scheme; the ladder itself holds only the spelling, so no scheme's sounds are written outside its own file. An idea the scheme has no
lesson for says a neutral text with no sound and is asked by ear or by name, never in another scheme's sounds. Modern Greek's are in
`schemes/modernLessons.ts` (the breathings are silent: ὁ is 'o'), and `tests/unit/sound-lessons.test.ts` holds each to `respellModern`. The rules a reader applies (σ as z, αυ/ευ as v or f by the next sound) and the pairs a scheme says alike (`words-sound-alike`: ἡμεῖς/ὑμεῖς, λύομεν/λύωμεν, λύει/λύῃ) are lessons too, with an example each held to the respeller by `tests/unit/sound-rules.test.ts`; a scheme teaches them only if its own rules hold them.

## Sounds that change by the next letter (mw-i7xe0n.7)

A scheme may name its **sound rules** (`Pronunciation.soundRules`): a sound that changes by the letter after it, one rule per ladder idea, each with two **sides** (`id`,
a short `label`, the `line` a wrong pick in Drill it shows, and New Testament `words` of that side), `sideOf(word)` (the side a word stands on, or null) and `misread(word)`
(the word respelled with the rule turned the other way: the near miss Drill it offers). Modern Greek's are in `modern.ts` (`modernSoundRules`): the respeller writes
down each place a rule decided (χ hard or soft, γ, σ before a consonant, αυ ευ ηυ voiced or not, μπ ντ γκ at the start or inside, γχ) and can read one rule the other way,
so a rule's sides and its misreading never disagree with the respelling. tests/unit/sound-rule-sides.test.ts holds every side word to the text and to its side; a scheme with none leaves it out
and Drill it reads words as before.

## Sound progress is kept per pronunciation

He learns the letters, sounds and marks IN a pronunciation, so what he proved in Modern Greek he has not proved in Erasmian (mw-5r3p30.231). The ideas of the
ladder's letters, sounds and marks tiers (`src/data/grammar/soundScope.ts` `isSoundIdea`: `alphabet`, `letter-*`, `diphthong*`, `pair-*`, `consonant-pairs`, `syllables`,
`breathing*`, `accents`, `iota-subscript` and the rest of the marks tier) have a level (`grammarLevels`), a schedule row (kind `grammar`) and
evidence (`grammarEvidence`) in EACH scheme, stored under `<scheme>:<idea id>` (`storedId`). Every other idea keeps its plain id: one level for all schemes.

- Repositories take and give plain idea ids and read and write the SELECTED scheme's rows (`grammarLevels.ts`, `inference.ts`, `reviews.ts` `listDue`/`reviewsOf`, `rusty.ts`); another scheme's rows are
  kept untouched and are not due, not in `listLevels()`, not in the tutor's `learner_grammar` and not in the placement. A test that writes a sound idea's row directly uses `storedId(id, 'modern')`.
- Dexie v20 moved the rows there were (all Modern Greek's) under `modern:`; the `LEGACY_SCHEME` is that id.
- Changing the pronunciation in Settings (`setGreekPronunciation`, which the tutor's settings change goes through too) leaves a note in the settings store (`pronunciationSwitch`) that the Goal screen shows once
  (`takePronunciationSwitch`): 'You switched to <label>: the sounds start again here. Your <old label> progress is kept.' Switching back restores the old scheme's levels and reviews as they were.
- Drill it proves a sound idea in the selected scheme only (`teachIdea` writes through the same scope). Drill runs (`drillRuns`) and drill plans are not yet per scheme.

## Modern Greek (`src/speech/schemes/modern.ts`)

| Greek | Said | Notes |
| --- | --- | --- |
| α ε η ι υ ο ω | a e ee ee ee o o | |
| αι ει οι υι ου | e ee ee ee oo | not a pair when the first letter carries the accent or the second a diaeresis |
| αυ ευ ηυ | av/af ev/ef eev/eef | v before a vowel or β γ δ ζ λ μ ν ρ, f before anything else or the end |
| β δ θ ζ | v dh th z | |
| γ | gh; y before e i (η ι υ αι ει οι υι ευ) | |
| χ | kh before a, o, ou and a consonant; hy before e, i (η ι υ αι ει οι υι ευ) | χάρις is `KHA-rees`, χριστῷ `khree-STO`, χαίρετε `HYE-re-te` (the Governor's choice B, 2026-10-12) |
| μπ ντ γκ γγ | mb nd ng(g) inside a word; b d g at its start | the n or m ends the syllable, the b d g opens the next |
| γχ γξ | ng+kh (h), nks | `ἐλέγχω` is `e-LENG-kho` |
| σ | s; z before β γ δ ζ λ μ ν ρ | the z ends the syllable: `κόσμος` is `KOZ-mos`, `Ἰσραήλ` is `eez-ra-EEL` |
| double consonants | said once | |

A hard g after a nasal is written `gh` when it opens the stressed syllable before e or i (`εὐαγγέλιον` is
`ev-an-GHE-lee-on`, but `ἄγγελος` is `AN-ge-los`), so an English reader does not soften it to j.
Breathing marks, the iota under a letter and elision marks say nothing. Syllables are cut after each vowel,
moving to the next syllable the longest group of consonants that can open a Greek word.

## Adding a scheme (Erasmian next, not built yet)

1. Write `src/speech/schemes/<id>.ts` exporting a `Pronunciation` (see `modern.ts`): its `respell` takes the Greek
   word and returns the respelling; its `keyWords` name an English word for each sound it writes; its `loneLetter` gives the form
   its voice is handed for a word of one letter (Erasmian on a Greek voice: find what that voice says as the sound, not the name); its `voiceForm` gives what the voice is handed for any other Greek, so it says the respelling's sounds (the text as it is when it already does; Erasmian's `nt` on a Modern Greek voice would need a form of its own). Erasmian's table (the story's note): μπ `mp`, ντ `nt`, γκ `nk`, γχ `nk`.
2. Put it in `SCHEMES` in `src/speech/pronunciation.ts`, after Modern Greek. Settings, the saved choice and the word
   sheet pick it up; nothing else names an id.
3. Add the id's voice language: `lang` is what the utterance uses. If the phone has no voice for it, say so in `note`.
4. Set `scoringLang`: the language the Greek reading check asks the mill to score a reading in (modern Greek is `el`).
   It goes as `lang` on the verse-read grist, so the grind's `scoring.langs` (grinds/verse-read.json) must list it and the
   mill's scorers must be able to score it; a scheme the mill cannot score cannot be given a reading check until they can.
5. Give it `lessons` for every letter, pair and breathing it says (copy `schemes/modernLessons.ts`; Erasmian's rough breathing adds an h, which is where that lesson belongs, not in the ladder).
   Give it a `letterForm` (how its voice names a letter) and a `tutorGuide` (its name and sound rules, for the tutor; copy `MODERN_TUTOR_GUIDE`).
6. Test it the way `tests/unit/respell-modern.test.ts` does, one row per rule.

A test adds a scheme for one scenario with `registerPronunciation(scheme)`, which returns the function that takes
it out again (features/pronunciation.feature).
