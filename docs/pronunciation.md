# Pronunciation

The word sheet says how to pronounce the word: under the Greek, a respelling in the pronunciation chosen in
Settings > Listening > Pronunciation (the family, below). The data's beta-code transliteration (`tr`, "cristw") is still in
`public/data` but no screen shows it.

Modern Greek is the only Greek scheme so far; Erasmian is next. Hebrew (Israeli) is in the same registry, below. 'χριστῷ' is `khree-STO`, 'ἐντολή' is `en-do-LEE`:
syllables joined by hyphens, the stressed syllable in capitals (a one-syllable word has no capitals), English
sound-alikes for the letters.

## How it is built

`src/speech/pronunciation.ts` is the registry: a list of `Pronunciation` entries
`{ id, language?, label, lang, scoringLang, note, respell(greekWord), sounds, loneLetterClip(word), voiceForm(text), wordForm?(word), letterForm(letter), tutorGuide(say), lessons?(say), soundRules?(say) }`. `sounds` maps each sound the respelling writes to its standard id (`o` is `/o/`, `kh` is `/x/`; see 'A standard in the middle' below); the scheme names no English word, and its lessons, rules and guide say each sound through `say`. Settings lists the entries, the word sheet calls
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
Tap to hear, a one-letter word anywhere in a reading's Greek (the Ὃ and ὃ inside 1 John 1:1, each a line of its own, mw-5r3p30.448) or in a word list
entry ('ἄγγελος, -ου, ὁ') and a sound question's vowel ('Tap to hear a letter, then tap it', `speakSound`) all hand the voice the form
(`src/speech/greek.ts` `loneLetterSpeech` and `loneLetterCuts`; `readAloud.ts` `piecesOf`); a sound question's consonant and a teach tile's
letter (`speakLetter`) are named.

`loneLetterClip(word)` is the bundled clip of the same sound, played only on a phone that says it has no Greek voice (`hasGreekVoice() === false`;
from mw-5r3p30.347 to mw-5r3p30.421 it played on every phone). Modern Greek's clips are `public/sounds/modern/<sound>.mp3`, one per vowel sound its
respelling writes (`a`, `e`, `ee`, `o`: ὁ and ὦ play `o`, ἡ plays `ee`), made by `scripts/sounds-build.sh` with eSpeak NG's phoneme input
(`[[o]]`), which says a sound and cannot spell a letter; they are precached (`playLetterClip`; `readAloud.ts` `piecesOf` plays them between the
voice's pieces). An elided word of one consonant, δ' (δέ before a vowel, Luke 9:24), is a word of one letter too: a voice handed it names it
('Delta'), and no form makes a voice say a consonant alone, so it plays its clip on EVERY phone, `dh.mp3` (the th of 'this', `[[D:D:]]` made louder;
`src/speech/elision.ts` names the marks of a dropped vowel, ' ’ ʼ ᾽ ᾿; mw-5r3p30.449). Held or tapped alone only: inside a verse read aloud δ' stays with
the words around it (`loneLetterCuts`). `tests/unit/lone-letter-clip.test.ts` holds every elided form in the text and the lexicon to its clip or the whole
word. A new scheme (Erasmian) gives its own form and its own clips, from its own vowel sounds, in `public/sounds/<id>/`, and the build
script a line for them.

`voiceForm(text)` (mw-5r3p30.264) is what the scheme's voice is handed for any other Greek text (a held word, a speaker, a verse read
aloud), so the voice says the sounds the respelling writes. A Greek voice reads ντ, μπ and γκ inside a word as a bare d, b, g (Πάντοτε
heard 'PA-do-te'; espeak-ng's `el` says `pˈadotˌe` too), while the respelling and the lessons keep the nasal (`PAN-do-te`). So Modern Greek
hands the voice the nasal at the end of the part before and the pair at the start of the next, where a voice says it as at a word's start:
`πάν-ντοτε`, `ἐν-ντολή`, `συμ-μπάσχω`, `ἀν-γκάλη` (espeak-ng: `pˈandˈote`). A pair at the start of a word (`ντομάτα`), and γγ, γχ, γξ, which a
voice says with their nasal, are left as they are. `src/speech/greek.ts` `greekVoiceForm` applies the chosen scheme's; nothing outside the
scheme writes the rule (`tests/unit/voice-form.test.ts` holds every bundled word to it). PROVISIONAL until heard on the Governor's phone.

The same form writes the υ of αυ, ευ and ηυ as the β or φ it is said as (mw-5r3p30.647): his phone said ηὐλίζετο 'ee ee', two vowels, because the voice was
handed the letters; handed `ηβλίζετο` it says 'eev'. The side (v before a vowel or a voiced consonant, f elsewhere) is the respelling's own
(`spellingsModern`), the υ's accent moves to the vowel before it (`εὔχομαι` is `έφχομαι`), and a pair split by a diaeresis or with its first vowel stressed
stays two vowels. `tests/unit/voice-au-eu.test.ts` holds every bundled word with the pair to it.

### A word said alone (mw-5r3p30.357)

`wordForm(word)` is what the scheme's voice is handed for a Greek word said ALONE (Tap to hear, a speaker, a long press, Sound it out, Settings >
Reading voices' Test): `greek.ts` `greekWordSpeech` uses it, and its `voiceForm` where a scheme has none. His phone said πατήρ alone as 'PA-teer'
('the Voice goes high and then low'): a voice says a lone word as a statement, high at the start and falling, so a stress on the last syllable is heard on
the first. Modern Greek hands the word in monotonic marks (an acute, grave or circumflex is the one tonos, the first of the word only; the breathings and
the iota under a letter go; a diaeresis stays: `monotonicModern`), in its voiceForm, its last stop replaced by `!`: `πατήρ!`, `αγάπη!`, `ουδέν!`.

A word of two syllables or more with no accent of its own (the New Testament's εἰμι, ἐστιν, εἰσιν, ἐστε, ἐσμεν, φημι, φησιν, τινες, τινα, τινος, τινι, τινων, τισιν,
ποτε) is given one on its last vowel first (`stressedAlone`: `ειμί!`, `ποτέ!`, a last pair as `αγαθοί!`), the stress of its orthotone form, or the voice reads
its letters apart (his phone said εἰμι 'e, i', not 'ee-mee': mw-5r3p30.701). A word of one syllable (τις, μου, εἰς, ὁ, an elided καθ') is left as it is.

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

A quiz choice is one short label (mw-5r3p30.355): `soundWords(...).choice('kh')` is 'kh, as in “chutzpah”' in American (a hint may give its own `choice`, as American's o: 'as in “or”, short'),
a lesson's `choice` is that label for the idea, and `ideaChoice` (`lessons.ts`) is what `quickQuestion` (so Drill it's 'What sound does it make?') offers; the rule that goes
with a sound ('before α, ο, ω, ου or a consonant') stays in the lesson's `sound` and `text`. tests/unit/quick-round.test.ts holds every choice to 32 characters, no bracket, no 'before'/'after', no two alike.

American keys the o to “or”, said short (PROVISIONAL, the Governor to confirm): the o of 'lot' is 'ah' to an American. Its r is 'a quick tap of
the tongue, like the tt of “butter”', since an American never rolls one. Its χ is 'kh, as in “chutzpah”, the throaty ch' (mw-5r3p30.475, PROVISIONAL,
the Governor to confirm): many Americans say 'loch' as 'lock', a k. British keeps the words the lessons gave before (“lot”, 'lightly rolled', “loch”).

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
shows the ids (PROVISIONAL label; the Governor to confirm). Teaching the standard rigorously, not only showing it, is the optional course Learn the IPA sounds (below).

The tutor is told it: every grist (`bible-talk`, `verse-ask`, `verse-read` and the form helper's) carries `english_accent` (`american | british | ipa`), the
`pronunciation_guide` is already said in it, and the three grinds' instructions say to give sound examples and respellings for that accent
(`tests/unit/english-accent-setting.test.ts`; examples `grinds/examples/bible-talk/sound-it-out-british.json`, `verse-ask/sound-of-a-word-ipa.json`).

## Learn the IPA sounds, the optional course (mw-5r3p30.356, PROVISIONAL)

His words: "if the user does choose the option of trying to learn the standard make sure that it's rigorous ... explain the benefits ... but I don't want to put that
burden on people unless they want to ... make it clear to them that they won't need it for the app unless they want it". `src/ipa/` teaches the standard sounds
of the chosen scheme (one lesson per id its `sounds` write, from its `soundGuide`): the symbol, the English accent's key word (American's when the chosen accent is
IPA, which has none), the Greek letters, the voice saying a Greek word that has it; a drill both ways with the confusable pairs of `speech/sounds.ts` CONFUSABLE together
(a miss comes back until it is right twice running); a pass check of every sound both ways with no hint (90% to pass, `PASS_FRACTION`), which on a pass offers 'Show IPA in
hints' (the English accent set to IPA) and on any result names the symbols to practise. It is reached only from the 'Optional' entry on the Goal screen, which opens on
'Why learn it?' (first line: not needed for Lampas or for reading Greek; Start and Not now the same size); nothing else prompts for it (`tests/unit/ipa-course.test.ts`
reads `src/` and `grinds/`). Layout notes: `docs/layout/grammar.md` (src/ipa/).

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
`schemes/modernLessons.ts` (the breathings are silent: ὁ is 'o'), and `tests/unit/sound-lessons.test.ts` holds each to `respellModern`. The rules a reader applies (σ as z, αυ/ευ as v or f by the next sound) and the pairs a scheme says alike (`words-sound-alike`: ἡμεῖς/ὑμεῖς, λύομεν/λύωμεν, λύει/λύῃ) are lessons too, with an example each held to the respeller by `tests/unit/sound-rules.test.ts`; a scheme teaches them only if its own rules hold them. How an accent is said (louder, in Modern Greek) and whether a mark that changes a word is heard (`accents`, `marks-change-word`: Modern Greek says a pair the same unless the accent moves to another syllable, as in ἀλλά/ἄλλα) are the scheme's lessons too (mw-5r3p30.312): the ladder's text of both names no pronunciation, the lesson is a short passage (`SoundLesson.also`) added after it, and on the idea sheet that passage is How it sounds.

## Sounds that change by the next letter (mw-i7xe0n.7)

A scheme may name its **sound rules** (`Pronunciation.soundRules`): a sound that changes by the letter after it, one rule per ladder idea, each with two **sides** (`id`,
a short `label`, the `line` a wrong pick in Drill it shows, and New Testament `words` of that side), `sideOf(word)` (the side a word stands on, or null) and `misread(word)`
(the word respelled with the rule turned the other way: the near miss Drill it offers). Modern Greek's are in `modern.ts` (`modernSoundRules`): the respeller writes
down each place a rule decided (χ hard or soft, γ, σ before a consonant, αυ ευ ηυ voiced or not, μπ ντ γκ at the start or inside, γχ) and can read one rule the other way,
so a rule's sides and its misreading never disagree with the respelling. tests/unit/sound-rule-sides.test.ts holds every side word to the text and to its side; a scheme with none leaves it out
and Drill it reads words as before.

A side also has `examples` (real words that stand on it: its `words`, and for the side no word of the text has, a modern word: μπάλα, ντουλάπι, γκάζι) and a `choice` (its sound as one quiz choice: 'ng, as in “finger”', 'ev, with v as in vase'). A **pair** with a rule (αυ ευ ηυ μπ ντ γκ γχ) is never asked alone (mw-5r3p30.646): its sheet's How it sounds is written from its sides (`positionLessons` in `modern.ts`: the rule in plain words, each side's line, an example word and its respelling), and its sound questions (`src/data/grammar/ruleWord.ts` `ruleWordQuestion`, used by `quickQuestion` and Drill it's first step) show a real word of one side with the pair marked (`GrammarQuestion.span`, drawn `[data-marked]` by GrammarCard) and ask its sound in THAT word; the right answer is the side's `choice` and the other side's is the near miss. A letter with a rule (σ is z before β γ δ ...) never has the other side's sound among the wrong choices of its bare question (it is right for a word), and its sheet says the rule too. tests/unit/position-sounds.test.ts holds all of it to the scheme, word by word.

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
| γ | gh before α, ο, ω, ου or a consonant; y before ε, ι, η, υ, αι, ει or οι | `modernLessons.ts` BACK and FRONT hold the two lists: the cards, the drill's rule lines and the tutor guide all read them (mw-i7xe0n.27) |
| χ | kh before α, ο, ω, ου or a consonant; hy before ε, ι, η, υ, αι, ει or οι | χάρις is `KHA-rees`, χριστῷ `khree-STO`, χαίρετε `HYE-re-te` (the Governor's choice B, 2026-10-12) |
| μπ ντ γκ γγ | mb nd ng(g) inside a word; b d g at its start | the n or m ends the syllable, the b d g opens the next |
| γχ γξ | ng+kh (hy before ε, ι, η, υ, αι, ει or οι), nks | `ἐλέγχω` is `e-LENG-kho` |
| σ | s; z before β γ δ ζ λ μ ν ρ | the z ends the syllable: `κόσμος` is `KOZ-mos`, `Ἰσραήλ` is `eez-ra-EEL` |
| double consonants | said once | |

χ's two sounds are held to three things at once by `tests/unit/chi-sounds.test.ts` (mw-5r3p30.648): the respelling, the Greek the voice is handed (`wordForm`: the η of ἀρχῇ and its χ stay together, `αρχή!`, so the voice's own rule applies) and the χ sheet's one sentence ('χ has two sounds, by the letter after it: kh in χάρις, “KHA-rees” and hy in χεῖρες, “HYEE-res”'), over every form of the text. The scheme's soft χ is the German ich-laut, [ç]; if a phone's voice says the ch of Bach for it (his report on ἀρχῇ, 2026-10-19), that is the voice's own letter rule, not the text it is handed, and the code cannot hear it: PROVISIONAL until he has heard another Greek voice say it.

A hard g after a nasal is written `gh` when it opens the stressed syllable before e or i (`εὐαγγέλιον` is
`ev-an-GHE-lee-on`, but `ἄγγελος` is `AN-ge-los`), so an English reader does not soften it to j.
Breathing marks, the iota under a letter and elision marks say nothing. Syllables are cut after each vowel,
moving to the next syllable the longest group of consonants that can open a Greek word.

## Adding a scheme (Erasmian next, not built yet)

1. Write `src/speech/schemes/<id>.ts` exporting a `Pronunciation` (see `modern.ts`): its `respell` takes the Greek
   word and returns the respelling; its `sounds` give the standard id (`src/speech/sounds.ts`) of each sound it writes, a new id with a hint in every accent table; its `loneLetter` gives the form
   its voice is handed for a word of one letter (Erasmian on a Greek voice: find what that voice says as the sound, not the name); its `voiceForm` gives what the voice is handed for any other Greek, so it says the respelling's sounds (the text as it is when it already does; Erasmian's `nt` on a Modern Greek voice would need a form of its own). Erasmian's table (the story's note): μπ `mp`, ντ `nt`, γκ `nk`, γχ `nk`.
2. Put it in `GREEK_SCHEMES` in `src/speech/pronunciation.ts`, after Modern Greek. Settings, the saved choice and the word
   sheet pick it up; nothing else names an id.
3. Add the id's voice language: `lang` is what the utterance uses. If the phone has no voice for it, say so in `note`.
4. Set `scoringLang`: the language the Greek reading check asks the mill to score a reading in (modern Greek is `el`).
   It goes as `lang` on the verse-read grist, so the grind's `scoring.langs` (grinds/verse-read.json) must list it and the
   mill's scorers must be able to score it; a scheme the mill cannot score cannot be given a reading check until they can.
5. Give it `lessons(say)` for every letter, pair and breathing it says (copy `schemes/modernLessons.ts`, every sound through `say.keyed` or `say.asIn`, never an English word; Erasmian's rough breathing adds an h, which is where that lesson belongs, not in the ladder).
   Give it a `letterForm` (how its voice names a letter) and a `tutorGuide(say)` (its name and sound rules, for the tutor; copy `modernTutorGuide`).
6. Give it a `soundGuide`: for each standard id its `sounds` write, the Greek letters that make it and a Greek word its voice says that has it (`at` 'start' or 'inside'), for the optional course (`src/ipa/course.ts` `courseSounds` throws, naming the sound, for one it lacks; copy `MODERN_SOUND_GUIDE`).
7. Test it the way `tests/unit/respell-modern.test.ts` does, one row per rule.

A test adds a scheme for one scenario with `registerPronunciation(scheme)`, which returns the function that takes
it out again (features/pronunciation.feature).

## Hebrew (mw-5vvlay.1, mw-gdcyf98.5)

Hebrew is in the same registry as the Greek (`src/speech/pronunciation.ts`, mw-gdcyf98.5). Each `Pronunciation` says which language it speaks, `language: 'grc' | 'he'`
(the Greek schemes say `'grc'`; one that leaves it out is Greek's), and the registry keeps one list for each: `PRONUNCIATIONS` is the Greek list (so Settings, the
saved choice and the hard-sounds schema iterate Greek only), `pronunciationsOf('he')` the Hebrew one, `pronunciationOf(id)` finds a scheme of either, and
`registerPronunciation(scheme)` files a scheme under its language. `src/speech/hebrewPronunciation.ts` is only re-exports of the Hebrew names (`HEBREW_PRONUNCIATIONS`,
`DEFAULT_HEBREW_PRONUNCIATION`, `hebrewPronunciationOf(id?)`, `hebrewVoiceForm(text)`, `hebrewPointedForm(text)`), so what imported them still does. The speech code
(`src/speech/greek.ts` `wordSpeech` for a held word or a speaker, `readAloud.ts` `textOf` for a verse read aloud) hands every Hebrew text through the chosen scheme's `voiceForm`
(`hebrewVoiceForm`, which reads the scheme `src/speech/settingsSync.ts` told `setHebrewPronunciation`; the default's until a saved choice is read);
`src/script/hebrewSpeech.ts` `hebrewRespelling(word, tr?)` gives a Hebrew word's respelling.

### One setting for both languages (mw-gdcyf98.6)

Settings > Listening > Pronunciation is a **family** (`pronunciation`, src/settings/definitions/pronunciation.ts `PRONUNCIATION_FAMILIES`): one choice that sets both languages, **Modern** being
Modern Greek and Israeli Hebrew. Writing the family writes `greekPronunciation` and `hebrewPronunciation` (a choice of `pronunciationsOf('he')`, saved under that key and told as `setting-changed`).
**Set each language on its own** (`pronunciationSeparate`, Off to start) swaps the family row for the two rows, Greek pronunciation and Hebrew pronunciation; turning it Off puts the family back and
writes both languages from it again. Each row sits behind its language's dial too: the family and the switch show from Curious on either dial, the Greek row from Greek Curious and the Hebrew row from
Hebrew Curious (a row has one `dependsOn`, so `readValues` answers the keys `pronunciationSeparate.grc` and `.he`, On while the switch is On and that dial is at 1 or above; they are no settings).
A second family (Erasmian Greek with a Tiberian Hebrew) is one more line in `PRONUNCIATION_FAMILIES`. The Hebrew word sheet shows the chosen Hebrew scheme's respelling (`sheet-respelling`) where it
first showed the data's scholarly transliteration, which is no longer drawn. The tutor is sent the Hebrew scheme's guide as `hebrew_pronunciation_guide`, beside the Greek's `pronunciation_guide`,
from Hebrew Curious up and for every Old Testament verse (src/services/interestField.ts `hebrewGuideField`).

The one scheme is **Israeli** (`schemes/hebrew-israeli.ts`, `israeli`, language `he-IL`, `scoringLang` `he`): the text is spoken as written, pointed, to the phone's he-IL voice,
which says the points as modern Hebrew does. Its `voiceForm` is `stripCantillation`, which takes off the cantillation marks (the Masoretic accents) so a voice
does not stumble on them: U+0591 to U+05AF, the meteg U+05BD, the rafe U+05BF, the paseq U+05C0, the sof pasuq U+05C3, the upper and lower dots U+05C4 and U+05C5 and the nun hafukha U+05C6.
It keeps every vowel point (U+05B0 to U+05BB), the dagesh U+05BC, the maqaf U+05BE, the shin and sin dots U+05C1 and U+05C2 and the qamats qatan U+05C7 (a vowel, so it
is not in the accents' range U+05C3 to U+05C7 that the story first named). `tests/unit/hebrew-pronunciation.test.ts` lists both sets and holds the whole of Genesis 1 to them,
and holds the scheme to the whole interface.

### The Hebrew respelling

`respell(pointedWord, tr?)` is the sound-alike respelling in the Greek's style: syllables joined by hyphens, the stressed one in capitals (a word of one syllable has no
capitals): `בְּרֵאשִׁית` is `be-reh-SHEET`, `נִינְוֵה` is `nee-neh-VEH`, `הָאָרֶץ` is `ha-A-rets`. `tr` is the data's transliteration of the word (`public/data` and the fixtures have one on
every Hebrew word); it is the guide that settles a shewa the pointing leaves open (below). `tests/unit/hebrew-respell.test.ts` pins twenty words of Genesis 1 and Jonah 1, one row each, and holds every word of both chapters
to the shape of a respelling. The rules (the code is `respellHebrew`):

| Part | Respelt |
| --- | --- |
| patach, qamats | `a` (a qamats in a closed syllable with no stress and no meteg is the qamats qatan, `o`: `כָּל` is `kol`) |
| segol, tsere | `eh` at the end of a syllable, `e` before a consonant (`reh`, `rets`) |
| hiriq | `ee`, a yod after it only lengthens it |
| holam, vav with a holam | `o` |
| qubuts, shuruq (vav with a dot inside) | `oo` |
| hataf segol, hataf patach, hataf qamats | `e`, `a`, `o` |
| shewa | `e` when it is said (at the start of a word, after a long vowel, the second of two, under a dagesh-doubled letter), written `eh` inside a word so it is not read `ee`; nothing when it only closes a syllable |
| patach or qamats with a yod, tsere with a yod | `ai`, `ay` (`ָיו` is `av`: `אֵלָיו` is `eh-LAV`) |
| a patach before a final ח, ע or ה with a mappiq | said before the letter, as its own syllable (`רוּחַ` is `ROO-akh`) |
| alef, ayin | not said, only the vowel on them; a bare alef and a final he are silent |
| bet, kaf, pe | `b`, `k`, `p` with a dagesh; `v`, `kh`, `f` without (a final kaf `ך` is `kh`, a final pe `ף` is `f`) |
| vav (a consonant), gimel, dalet, zayin, tet, lamed, mem, nun, samekh, qof, resh, tav, yod, he, chet | `v`, `g`, `d`, `z`, `t`, `l`, `m`, `n`, `s`, `k`, `r`, `t`, `y`, `h`, `kh` |
| tsade, shin with its dot at the right, sin | `ts`, `sh`, `s` |
| a dagesh in any other letter | a doubling, which is not said |

Syllables are cut after each vowel (a silent shewa and a bare consonant close the syllable before them). The stress is the syllable the cantillation marks: a word with one accent
mark takes it; the same mark twice (the pashta, on the stress and again on the last letter) is the first; two different marks (a munach for a secondary stress, then a zaqef) are the last;
the silluq (a meteg in the last word of a verse, before the sof pasuq) marks it; the accents written on the first letter whatever the stress (yetiv, geresh muqdam, telisha gedola, dehi) say nothing.
A word with no sign has its last syllable stressed, and the first if it ends as a segolate does (`סֵפֶר` is `SEH-fer`). A word with a maqaf (`אֶל־`, `עַל־`) joins the next and has no capitals.
Whatever follows a sof pasuq (the פ and ס that close a section) is not read. The Tetragrammaton is respelt as it is written, `יְהוָה` is `yeh-VA`; the voice, not the respelling, may say it another way.

The guide settles the shewa this way: the rule above counts the shewas it says; the guide's `ə` marks count the ones the data says; where the two differ, the shewas the rule left silent are said
(earliest first), or the ones it said are made silent (latest first), until they agree. In Genesis 1 and Jonah 1 this changes `לְאָכְלָה` only (`le-okh-LA` for the guide, `le-a-kheh-LA` for the rule),
the qamats qatan the pointing cannot tell from a qamats.

### The Hebrew sounds and lessons

`sounds` maps the symbols the respelling writes to the standard ids of `src/speech/sounds.ts` (`kh` is `/x/`, `y` is `/ʝ/`, `eh` and `e` are `/e/`), so the English accent tables name them (`ee, as in “see”`) and
`missingHints` holds. The ids the standard has none for yet (`h`, `r`, `sh`, `ts`) are named in the lessons without an English key word; the standard is the Greek's list and was left as it is. `lessons(say)` gives a
`SoundLesson` for each letter, ids `he-letter-alef`, `he-letter-bet`, `he-letter-gimel`, `he-letter-dalet`, `he-letter-he`, `he-letter-vav`, `he-letter-zayin`, `he-letter-chet`, `he-letter-tet`, `he-letter-yod`,
`he-letter-kaf`, `he-letter-lamed`, `he-letter-mem`, `he-letter-nun`, `he-letter-samekh`, `he-letter-ayin`, `he-letter-pe`, `he-letter-tsade`, `he-letter-qof`, `he-letter-resh`, `he-letter-shin`, `he-letter-tav`
(`HEBREW_LETTER_IDS`), and for each vowel, `he-vowel-patach`, `-qamats`, `-segol`, `-tsere`, `-hiriq`, `-holam`, `-qubuts`, `-shuruq`, `-shewa` (`HEBREW_VOWEL_IDS`), in `schemes/hebrew-israeli-lessons.ts`,
which also holds `letterNames` (by the letter ids), `heardAs` and the `tutorGuide`. A Hebrew word of one letter (a prefix) has no sound of its own: `loneLetterForm` and `loneLetterClip` are `null`.

### Adding the Academic family (Erasmian and Tiberian)

One scheme each, the way a Greek one is added: write `src/speech/schemes/hebrew-<id>.ts` exporting a `Pronunciation` with `language: 'he'` (copy `hebrew-israeli.ts`: its `respell` takes the pointed word and the data's `tr`; its
`sounds` map to the standard ids, a new id with a hint in every accent table; its lessons keep the ids above, so the idea sheets and drills need nothing new); put it in `HEBREW_SCHEMES` in `pronunciation.ts`
after Israeli; give it a `lang` and `scoringLang` and say in its `note` if the phone may have no voice for it. Neither is built.
