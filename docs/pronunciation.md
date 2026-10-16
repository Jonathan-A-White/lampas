# Pronunciation

The word sheet says how to pronounce the word: under the Greek, a respelling in the pronunciation chosen in
Settings > Greek pronunciation. The data's beta-code transliteration (`tr`, "cristw") is still in
`public/data` but no screen shows it.

Modern Greek is the only scheme so far; Erasmian is next. 'χριστῷ' is `khree-STO`, 'ἐντολή' is `en-do-LEE`:
syllables joined by hyphens, the stressed syllable in capitals (a one-syllable word has no capitals), English
sound-alikes for the letters.

## How it is built

`src/speech/pronunciation.ts` is the registry: a list of `Pronunciation` entries
`{ id, label, lang, scoringLang, note, respell(greekWord), sounds, loneLetterClip(word), voiceForm(text), wordForm?(word), letterForm(letter), tutorGuide(say), lessons?(say), soundRules?(say) }`. `sounds` maps each sound the respelling writes to its standard id (`o` is `/o/`, `kh` is `/x/`; see 'A standard in the middle' below); the scheme names no English word, and its lessons, rules and guide say each sound through `say`. Settings lists the entries, the word sheet calls
`pronunciationOf(chosen).respell(word.t)`, and `lang` is the language tag of the voice that speaks (Settings keeps
the chosen id under `greekPronunciation`). Each scheme is one file in `src/speech/schemes/`.

`spellings?(greekWord)` (mw-5r3p30.351) is how the scheme reads a word unit by unit: `[{from, to, sound}]` over the word's Greek letters, a letter alone or
a pair it says as one sound (οι is one unit, 'ee'; σ before μ is a unit 'z'). The idea sheet asks it so that a letter's examples are only words where the
letter is read alone as a sound the lesson teaches (`SoundLesson.sounds`), and a pair's only where the scheme reads that pair; a scheme that leaves it out
holds nothing back.

`loneLetterForm(word)` (mw-5r3p30.421) is what the scheme's voice is handed for a Greek word of ONE letter (ὁ, ἡ, ὦ, Ὃ) so that it says the
SOUND. A Greek voice handed one letter names it ('omicron'), with or without an accent: mw-5r3p30.262 handed it the stressed vowel 'ό', which
passed its tests, and his phone (and espeak-ng's `el`: 'omikron tonos') still said the name. Handed the vowel doubled, his phone's own Greek voice
says the sound: on the listening trial (public/sounds-trial.html, docs/research/letter-sounds.md) the Governor chose it over every clip ('the best
sound for the vowels is actually the double ones from the phone itself', 2026-10-15). So Modern Greek's form is the bare vowel in lower case,
doubled: `οο` for ὁ and Ὃ, `ωω` for ὦ, `ηη` for ἡ, `αα` for ἃ; a consonant has none (null: there is no bare v to double). A held word, a speaker,
Tap to hear, a one-letter run of a reading (a line of its own) and a sound question's vowel ('Tap to hear a letter, then tap it', `speakSound`)
all hand the voice the form (`src/speech/greek.ts` `loneLetterSpeech`; `readAloud.ts` `piecesOf`); a sound question's consonant and a teach tile's
letter (`speakLetter`) are named.

`loneLetterClip(word)` is the bundled clip of the same sound, played only on a phone that says it has no Greek voice (`hasGreekVoice() === false`;
from mw-5r3p30.347 to mw-5r3p30.421 it played on every phone). Modern Greek's clips are `public/sounds/modern/<sound>.mp3`, one per vowel sound its
respelling writes (`a`, `e`, `ee`, `o`: ὁ and ὦ play `o`, ἡ plays `ee`), made by `scripts/sounds-build.sh` with eSpeak NG's phoneme input
(`[[o]]`), which says a sound and cannot spell a letter; they are precached (`playLetterClip`; `readAloud.ts` `piecesOf` plays them between the
voice's pieces). A new scheme (Erasmian) gives its own form and its own clips, from its own vowel sounds, in `public/sounds/<id>/`, and the build
script a line for them.

`voiceForm(text)` (mw-5r3p30.264) is what the scheme's voice is handed for any other Greek text (a held word, a speaker, a verse read
aloud), so the voice says the sounds the respelling writes. A Greek voice reads ντ, μπ and γκ inside a word as a bare d, b, g (Πάντοτε
heard 'PA-do-te'; espeak-ng's `el` says `pˈadotˌe` too), while the respelling and the lessons keep the nasal (`PAN-do-te`). So Modern Greek
hands the voice the nasal at the end of the part before and the pair at the start of the next, where a voice says it as at a word's start:
`πάν-ντοτε`, `ἐν-ντολή`, `συμ-μπάσχω`, `ἀν-γκάλη` (espeak-ng: `pˈandˈote`). A pair at the start of a word (`ντομάτα`), and γγ, γχ, γξ, which a
voice says with their nasal, are left as they are. `src/speech/greek.ts` `greekVoiceForm` applies the chosen scheme's; nothing outside the
scheme writes the rule (`tests/unit/voice-form.test.ts` holds every bundled word to it). PROVISIONAL until heard on the Governor's phone.

### A word said alone (mw-5r3p30.357)

`wordForm(word)` is what the scheme's voice is handed for a Greek word said ALONE (Tap to hear, a speaker, a long press, Sound it out, Settings >
Reading voices' Test): `greek.ts` `greekWordSpeech` uses it, and its `voiceForm` where a scheme has none. His phone said πατήρ alone as 'PA-teer'
('the Voice goes high and then low'): a voice says a lone word as a statement, high at the start and falling, so a stress on the last syllable is heard on
the first. Modern Greek hands the word in monotonic marks (an acute, grave or circumflex is the one tonos, the first of the word only; the breathings and
the iota under a letter go; a diaeresis stays: `monotonicModern`), in its voiceForm, its last stop replaced by `!`: `πατήρ!`, `αγάπη!`, `ουδέν!`.

Measured with eSpeak NG's `el` on the factory's machine (`scripts/stress-peak/peaks.py`: the library's own phoneme times, Praat's pitch tracker):

| handed | pitch of each vowel (highest, Hz) | the peak |
|---|---|---|
| `πατήρ` | a 99, i 102, then falling to 79 | barely on the stress: heard as a fall |
| `πατήρ!` | a 99, i 115 | on the stress |
| `πατήρ,` / `πατήρ;` / `πατήρ…` | a 99, i 102-106, mean of i 88 | no clearer |
| `λέμε πατήρ` (a carrier) | e 118, e 111, a 112, i 102 | on the carrier |
| `ἀγάπη` / `ἀγάπη!` | a 97, a 104, i 82 / a 99, a 116, i 83 | on the stress, clearer with `!` |
| `λόγος` / `λόγος!` | o 103, o 82 / o 116, o 83 | on the stress, clearer with `!` |

`!` raises the stressed syllable by 12 to 15 Hz over the rest wherever the stress is, and moves no stress; a carrier puts its own word first and adds a
word he would hear. eSpeak NG reads the polytonic and the monotonic word alike; the monotonic marks are for a phone's voice that may pass over an
accent it was not made for. `tests/unit/greek-word-stress.test.ts` walks every word of Drill it, every lesson example and every word of the lexicon
through the phone's synthesiser (the honest fake): el-GR, a Greek voice (the one picked in Settings when there is one), one tonos where the respelling
stresses, and the `!`. A verse read aloud is not changed: its words stand in a sentence. PROVISIONAL until he hears it.

`letterForm(letter)` (mw-5r3p30.268) is what the scheme's voice is handed to NAME a letter, in a letter drill's Tap to hear (`speakLetter`):
Modern Greek's is the bare letter in lower case, which a Greek voice names the modern way ('vita' for β).

`tutorGuide(say)` (mw-5r3p30.268), read as `tutorGuideOf(scheme)`, is what the tutor is told of the scheme: its name and the sound rules it respells and speaks by. Every tutor ask
that may speak of a sound sends it as `pronunciation_guide` beside `pronunciation` (the id): bible-talk (`buildTalkRequest`; a full record
drops it before the history, except on a sound question), verse-ask (`buildRequest`) and verse-read (`buildReadingRequest`). The grinds'
instructions name no sound and no scheme of their own: they say to describe every sound by `pronunciation_guide`. The grind examples carry
Modern Greek's guide, in American English, word for word.

## A standard in the middle (mw-5r3p30.352)

His words: "there should be a standard ... the module explains how to get to The Standard and then the app [uses] the module". Every sound has
one standard id, its IPA between slashes, listed once in `src/speech/sounds.ts` (`/o/`, `/x/`, `/ɣ/` ...). A Greek pronunciation maps the sounds
its respelling writes to those ids (`Pronunciation.sounds`); an English accent maps each id to the hint a reader of that accent hears it in:
one table per accent in `src/speech/accents/` (`american.ts`, the default, and `british.ts`), each a `{ word?, note? }` per id ('or', 'short';
or a note alone: 'the th of “this”'). `soundWords(scheme, accent)` (`src/speech/accents/index.ts`) is the ONE accessor that puts them together:
`keyed('o')` is 'o, as in “or”, short' and `asIn('o')` 'o as in or, short' in American English, 'o, as in “lot”' and 'o as in lot' in British.
A scheme's `lessons`, `soundRules` and `tutorGuide` are functions of it, and the app reads them only through `lessonsOf`, `soundRulesOf` and
`tutorGuideOf` (`src/speech/pronunciation.ts`; `src/data/grammar/lessons.ts` for the sheets, tiles and questions), which say them in the chosen
accent (`chosenAccent()`, American until the choice in Settings sets it with `chooseAccent`: see 'The English accent setting' below).

A quiz choice is one short label (mw-5r3p30.355): `soundWords(...).choice('kh')` is 'kh, as in “loch”' (a hint may give its own `choice`, as American's o: 'as in “or”, short'),
a lesson's `choice` is that label for the idea, and `ideaChoice` (`lessons.ts`) is what `quickQuestion` (so Drill it's 'What sound does it make?') offers; the rule that goes
with a sound ('before a, o, ou') stays in the lesson's `sound` and `text`. tests/unit/quick-round.test.ts holds every choice to 32 characters, no bracket, no 'before'/'after', no two alike.

American keys the o to “or”, said short (PROVISIONAL, the Governor to confirm): the o of 'lot' is 'ah' to an American. Its r is 'a quick tap of
the tongue, like the tt of “butter”', since an American never rolls one. British keeps the words the lessons gave before (“lot”, 'lightly rolled').

The ids never reach the learner unless he chooses IPA (below): `tests/unit/no-ipa-shown.test.tsx` draws every sound idea's sheet and asks every lesson, tile, question and
rule line in each accent but IPA, and fails on an IPA-only character or a slashed id. `tests/unit/english-accents.test.ts` fails when an accent table
misses an id a scheme uses, and `tests/unit/one-english-accent.test.ts` when a file outside `src/speech/accents/`, a scheme included, keys a
sound to an English word. A third accent is one more table plus a line in `ACCENTS`; a new sound is one line in `sounds.ts` plus a hint in
every table.

## The English accent setting (mw-5r3p30.353)

His words: "can you have that as a setting American versus British". Settings > Greek pronunciation > English accent (`englishAccent`,
`src/settings/definitions/englishAccent.ts`): American (default) | British | IPA (the standard), one 48 px button a line, kept on the device. The registry
entry's `write` calls `chooseAccent` at once, `startSpeechSettingsSync` hands the saved choice to the accent module at start, and `useAccent()`
(`src/speech/accents/useAccent.ts`) makes a screen that draws hints (the idea sheet) draw again when it changes; a lesson, tile, question or choice
built afterwards is said in it. IPA is the third accent table (`src/speech/accents/ipa.ts`), made from the inventory: every hint is `{ note: id }`, so
`keyed('o')` is 'o, /o/' and a guide's vowels are 'each by its IPA symbol, with no English word' (`EnglishAccent.hintedBy`). It is the one accent that
shows the ids (PROVISIONAL label; the Governor to confirm). Teaching the standard rigorously, not only showing it, is a story of its own.

The tutor is told it: every grist (`bible-talk`, `verse-ask`, `verse-read` and the form helper's) carries `english_accent` (`american | british | ipa`), the
`pronunciation_guide` is already said in it, and the three grinds' instructions say to give sound examples and respellings for that accent
(`tests/unit/english-accent-setting.test.ts`; examples `grinds/examples/bible-talk/sound-it-out-british.json`, `verse-ask/sound-of-a-word-ipa.json`).

## One scheme for every sound (mw-5r3p30.268)

No file of `src/` or `grinds/` outside `src/speech/pronunciation.ts` and `src/speech/schemes/` says, spells or describes a Greek sound,
names a scheme by hand or imports a scheme file: callers ask the chosen scheme (`chosenPronunciation()` in `src/speech/greek.ts`, or
`pronunciationOf(id)`). `tests/unit/one-pronunciation-scheme.test.ts` scans for it ('e as in pet', 'the th of “this”', 'β is v', a respelling such
as `TAF-ta`, 'modern Greek' or 'Erasmian', an import of `schemes/`; `tests/support/sound-rules-scan.ts`), with a short allow-list of lines that are
not Greek sounds; `tests/unit/pronunciation-swap.test.ts` registers a second scheme and shows the lessons, a respelling, a letter drill, the voice and
the tutor's guide all follow it. The spelling's own rules (which pairs are one vowel, which clusters open a syllable: `src/speech/greekSyllables.ts`
`ONSETS`) are the same in every scheme and live outside the schemes.

`lessons(say)` (mw-5r3p30.229), read as `lessonsOf(scheme)`, is what the scheme TEACHES of each sound-bearing idea of the grammar ladder, keyed by idea id (`letter-beta`,
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
   word and returns the respelling; its `sounds` give the standard id (`src/speech/sounds.ts`) of each sound it writes, a new id with a hint in every accent table; its `loneLetter` gives the form
   its voice is handed for a word of one letter (Erasmian on a Greek voice: find what that voice says as the sound, not the name); its `voiceForm` gives what the voice is handed for any other Greek, so it says the respelling's sounds (the text as it is when it already does; Erasmian's `nt` on a Modern Greek voice would need a form of its own). Erasmian's table (the story's note): μπ `mp`, ντ `nt`, γκ `nk`, γχ `nk`.
2. Put it in `SCHEMES` in `src/speech/pronunciation.ts`, after Modern Greek. Settings, the saved choice and the word
   sheet pick it up; nothing else names an id.
3. Add the id's voice language: `lang` is what the utterance uses. If the phone has no voice for it, say so in `note`.
4. Set `scoringLang`: the language the Greek reading check asks the mill to score a reading in (modern Greek is `el`).
   It goes as `lang` on the verse-read grist, so the grind's `scoring.langs` (grinds/verse-read.json) must list it and the
   mill's scorers must be able to score it; a scheme the mill cannot score cannot be given a reading check until they can.
5. Give it `lessons(say)` for every letter, pair and breathing it says (copy `schemes/modernLessons.ts`, every sound through `say.keyed` or `say.asIn`, never an English word; Erasmian's rough breathing adds an h, which is where that lesson belongs, not in the ladder).
   Give it a `letterForm` (how its voice names a letter) and a `tutorGuide(say)` (its name and sound rules, for the tutor; copy `modernTutorGuide`).
6. Test it the way `tests/unit/respell-modern.test.ts` does, one row per rule.

A test adds a scheme for one scenario with `registerPronunciation(scheme)`, which returns the function that takes
it out again (features/pronunciation.feature).
