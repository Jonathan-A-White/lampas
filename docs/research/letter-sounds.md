# Research: a lone vowel, a one-letter word and a letter drill's sound in a voice that matches the phone's Greek voice

Story mw-5r3p30.395. Written 2026-10-15 on the Desktop. Research and a listening page: no screen of the app changed.

His words (Postern general, 2026-10-15T04:09Z): "so the o Omicron sounds really bad and ... all the other letters it's very jarring ... can
you use the Greek voice phone and how do you get it to actually say the letter ... sound ... instead of saying Omicron ... it's just a totally
different voice ... it's not elegant".

<!-- toc -->

- [His pick, and what was built (mw-5r3p30.421)](#his-pick-and-what-was-built-mw-5r3p30421)
- [The short answer](#the-short-answer)
- [The listening page](#the-listening-page)
- [(a) The phone's own voice: can it be coaxed into the bare sound?](#a-the-phones-own-voice-can-it-be-coaxed-into-the-bare-sound)
- [(b) Clips baked with a free, local, licence-clean neural Greek voice](#b-clips-baked-with-a-free-local-licence-clean-neural-greek-voice)
  - [What they have in common: a word alone breaks a VITS voice](#what-they-have-in-common-a-word-alone-breaks-a-vits-voice)
  - [Piper `el_GR-rapunzelina-low`](#piper-el_gr-rapunzelina-low)
  - [Coqui `tts_models/el/cv/vits`](#coqui-tts_modelselcvvits)
  - [Chatterbox Multilingual (Resemble AI)](#chatterbox-multilingual-resemble-ai)
  - [Not tried, and why](#not-tried-and-why)
- [(c) A paid cloud neural voice, priced, not bought](#c-a-paid-cloud-neural-voice-priced-not-bought)
- [(d) Keeping the drill and the one-letter words in the winning voice](#d-keeping-the-drill-and-the-one-letter-words-in-the-winning-voice)
- [Sweep: every place the app speaks Greek with something other than the phone's Greek voice](#sweep-every-place-the-app-speaks-greek-with-something-other-than-the-phones-greek-voice)
- [Build slices, for the Mayor](#build-slices-for-the-mayor)
- [What this story did not do](#what-this-story-did-not-do)

<!-- /toc -->

## His pick, and what was built (mw-5r3p30.421)

He listened on his phone (2026-10-15T22:32Z, in an incognito tab, since the installed app captures the site's links): "so the best sound for the
vowels is actually the double ones from the phone itself". That is option D, slice 3 below: his phone's one Greek voice, "Greek (Greece)", handed the
vowel doubled. What was built:

* Every one-letter Greek word said alone (a speaker, a held word, the word sheet, Tap to hear) and every one-letter Greek run of a reading (a lone
  woven ὁ, a one-letter syllable of Sound it out, a lone ὁ in a tutor's answer) is handed to the phone's Greek voice as the scheme's
  `loneLetterForm`: Modern Greek's is the bare vowel in lower case, doubled (`οο` for ὁ and Ὃ, `ωω` for ὦ, `ηη` for ἡ, `αα` for ἃ).
* A sound question ("Tap to hear a letter, then tap it", the quick round's and Drill it's "hear") says a vowel the same way (`speakSound`), since
  the question never offers two letters of one sound.
* The eSpeak NG clips stay, unchanged, and play only on a phone that says it has no Greek voice.
* Not changed: a consonant. No string makes a voice say a bare consonant (there is no v to double) and the page offered no doubled consonant for the
  phone column, so a sound question on β, γ, θ still has the voice name the letter ("vita"), as before; a consonant's sound needs a clip (slice 2),
  which waits on his word. A teach tile still names its letter. `υυ` was not on the page (`ιι` and `ηη` were); it is handed over by the same rule.
* Not changed: a one-letter word inside a longer Greek run (the Greek view reads a verse as one run, so `Ὃ ἦν ἀπ᾽ ἀρχῆς` goes as it is): that is
  mw-5r3p30.448.

## The short answer

* **Why it jars.** A Greek voice handed a lone letter names it ("omicron"), with or without an accent: three landed fixes handed it other forms
  and his phone still named it (mw-5r3p30.226, .256, .262). So mw-5r3p30.347 stopped handing a one-letter word to any voice and plays a clip
  of the vowel, made by eSpeak NG from phoneme input. eSpeak NG is a *formant* synthesiser: a different speaker, robotic by construction,
  beside the neural Greek voice he hears everywhere else. That is the jar, and nothing in the app can make eSpeak sound like the phone.
* **The phone's own voice cannot be told a sound.** Chrome on Android strips SSML to plain text before the engine sees it (the source is
  quoted below), fires no word-boundary events, and the phoneme tag is not honoured by any route Web Speech has. What is left is the text:
  the same voice handed different strings. On eSpeak NG (the only Greek engine this box can run) a doubled vowel (`οο`, `ωω`, `αα`) and a vowel
  followed by a zero-width joiner come out as the **sound**, while every lone letter, stressed or not, with a full stop, comma, apostrophe or soft
  hyphen, comes out as the **name**. Whether his phone's Google voice does the same is the one thing this box cannot try: every such string is
  a button on the listening page, so his thumb settles it.
* **A free, local, licence-clean neural Greek voice exists, three of them**, and clips from all three are on the page beside eSpeak's and the
  phone's: Piper's `el_GR-rapunzelina-low` (CC0 voice data), Coqui's `tts_models/el/cv/vits` (BSD-3-Clause, trained on Common Voice) and
  Resemble AI's Chatterbox Multilingual (MIT, 23 languages, Greek among them). All cost nothing, run offline on the Desktop, and ship as sound
  files only. None of them is the phone's speaker either; each is a *neural* speaker, which is the question the page asks him.
* **A cloud voice is cheap but needs his account.** Azure's two Greek neural voices honour the IPA phoneme tag for el-GR, so they alone can be
  told "say [o]" outright; the whole clip set is under a thousand characters, about a cent at the list price and free on the F0 tier. Google
  and ElevenLabs cannot be told a phoneme for Greek. Nothing was bought or signed up for: spending money is the Governor's word.
* **Recommended:** let him listen, then build in this order: (1) if one neural voice passes his ear, regenerate today's four clips in it and add
  the drill's bare sounds in it, so every sound the app ever makes on its own comes from one speaker (S then M); (2) if a phone-voice trick
  passes on his phone, hand a one-letter word that form and keep the clips as the fallback for a phone with no Greek voice (S); (3) Azure clips
  only if he prefers them after hearing a sample, which needs his account (M). The slices are at the end.

## The listening page

`https://lampas.allmymind.org/sounds-trial.html` (public/sounds-trial.html, served from the site like any file in public/, deployed by the normal
after-landing rsync of dist/, linked from nothing in the app, never precached: pwa-precache.ts `globIgnores`). It opens on a phone with no
licence and no app shell, dark like the app, big buttons.

What it plays, each item in every column:

| Item | Phone voice (Web Speech) | eSpeak NG (today) | Piper, Coqui, Chatterbox |
| --- | --- | --- | --- |
| Ὃ (1 John 1:1), ὁ, ἡ, ὦ | in its phrase as the Reader hands it (lower case, polytonic), as written, in plain modern spelling; alone as written, bare, stressed; doubled; with a zero-width joiner; with a full stop; twice with a comma; an SSML phoneme tag with the XML header (Chrome strips it: a control) and the raw tag (the engine sees it); the phrase cut off at 0.4 s | the clip the app plays now (byte for byte public/sounds/modern/o.mp3 or ee.mp3) | the article cut from "ὁ λόγος" / "ἡ ζωή", the stressed vowel cut from a word, the whole phrase |
| the four vowel sounds a, e, ee, o | bare, stressed, doubled, joiner | today's clips | the vowel cut from ἅγιος, ἔργον, ἥλιος, ὅλος |
| three letter drills β, γ, θ | the bare letter (what the drill plays today: the voice names it) and a word | the sound alone from phoneme input | the name (βήτα, γάμα, θήτα), the sound cut from βάση, γάλα, θέση, and a word (βίβλος, ἀγάπη, θεός) |
| the whole voice | ὁ λόγος, ἡ ζωή, ὦ ἄνθρωπε, ὃ ἦν ἀπ᾽ ἀρχῆς, πατήρ | the same words | the same words |

The page lists the phone's Greek voices by name and lets him pick one, and a status line shows exactly what was handed to the voice and what it
reported (start, end, error, cut), so a failure on his phone comes back as words. "Play the row" plays every clip of a card in turn.

Credits: the three trial voices (Piper, Coqui TTS, Chatterbox) are credited on the listening page itself (public/sounds-trial.html, section Credits), not on About, which credits only what the app uses (mw-5r3p30.875).

Clips: public/sounds-trial/<voice>/<name>.mp3, 19 a voice, 1 to 8 KB each, about 100 KB a voice, mono 22.05 kHz MP3 at 48 kb/s with no metadata,
as the app's own clips. `scripts/sounds-trial/make-clips.py` makes them (what each voice needs is in its header); it is research tooling, not in
the gate. tests/unit/sounds-trial.test.ts holds the page to the items above, every clip to a shipped MP3, the app to linking none of it and the
worker to precaching none of it; tests/e2e/sounds-trial.spec.ts loads the built page, fetches every clip from the build and checks a phone-voice
button hands `el-GR` its Greek. `npm run build` puts the page and the four folders in dist/ (checked 2026-10-15; dist/sw.js names none of them).

## (a) The phone's own voice: can it be coaxed into the bare sound?

**What was tried, and where.** Nothing here was heard on an Android phone: this box has no Android and no Google voice. The engine it can run is
eSpeak NG 1.52 (the Piper release tarball bundles the binary and its data), which the earlier stories used as the oracle too, and it is the
engine that said "omikron tonos" for the `ό` of mw-5r3p30.262 as his phone did. Every string below is a button on the page.

| Handed to eSpeak NG `el` | Said | Reading |
| --- | --- | --- |
| `ο`, `ὁ`, `ό`, `Ὃ`, `ο.`, `ο,`, `ο!`, `ο;`, `ο'`, `'ο`, `ό.`, `ο` + soft hyphen | ˈomikrˌon / ˌomikrontˈonos | the name, every time: punctuation and marks change nothing |
| `οο`, `όο`, `ωω` | ˈoo | **the sound**, doubled: no name |
| `αα` | ˈaa | the sound |
| `οοο`, `όόό` | oˈoo, ˈoˈoˈo | the sound, three times |
| `ο` + zero-width joiner (U+200D) | ˈo | **the sound, once** |
| `ο ο`, `ο-ο` | o ˈomikrˌon | the first is a sound, the second named |
| `ο θεός`, `ὁ λόγος`, `ο ην απ αρχής` | o θeˈos, o lˈoɣos, o ˈin ˈap arçˈis | in a phrase the article is a sound |
| `ὃ ἦν ἀπ᾽ ἀρχῆς`, `Ὃ ἦν ἀπ᾽ ἀρχῆς` | ˌomikrontˈonos ˈin ˈap arçˈis | **the polytonic lone letter is named even inside its phrase**: the breathing and grave defeat its lexicon, and this is the form the Reader hands the voice |
| `ὦ ἄνθρωπε`, `ω άνθρωπε` | omˌeɣa tˈonos ˈanθropˌe, omˈeɣ ˈanθropˌe | ω before a word is named too |
| `o`, `oh` (Latin) | (en) ˈəʊ | switches to the English voice: what mw-5r3p30.256 did, and he rejected |
| `<speak><phoneme alphabet="ipa" ph="o">ο</phoneme></speak>` with `-m` | ˈomikrˌon | the tag is ignored, the text named |
| `<say-as interpret-as="characters">` | ˈomikrˌon | the same |

So on eSpeak two forms work: doubling, and a trailing zero-width joiner. A phone's voice is a different engine with a different lexicon; a Google
neural voice may well read `οο` as a long vowel, as two syllables, or as two names. The page has both forms for each of ὁ, ἡ, ὦ, α, ε, and the
in-phrase forms, so the answer is one tap away and nothing is promised. The polytonic row is a finding of its own: if his phone behaves like
eSpeak, `ὃ` is named *inside* "ὃ ἦν ἀπ᾽ ἀρχῆς" too, and the Reader's `voiceForm` (which lower-cases but keeps the marks, mw-5r3p30.264) would want
to strip the breathing and grave from a one-letter word in a phrase; the first two buttons of the Ὃ card tell which.

**SSML cannot reach the engine from Chrome.** Chromium's Android speech platform (`content/browser/speech/tts_android.cc`,
`TtsPlatformImplAndroid::Speak`) calls `TtsController::StripSSML` on every utterance before `Java_TtsPlatformImpl_speak`; `StripSSML`
(`content/browser/speech/tts_controller_impl.cc`) parses the text only when it contains `<?xml`, and if the root is `<speak>` it hands the engine
the concatenated text nodes with every tag gone; a text without the XML header goes through untouched. (Read from the Chromium main branch on
2026-10-15.) So the W3C note that "engines that do not support SSML must strip the tags" is done by Chrome itself on Android: a `<phoneme>` with
the header can never be honoured. Without the header the raw tag reaches the Android engine as text; what Google's engine does with it is not
documented anywhere I could reach, so the page tries it ("raw tag") beside the headed form ("the control: Chrome strips it to ο").

**No boundary events on Android.** Chrome for Android fires no `boundary` event (the Web Speech quirks write-up at codersblock.com and MDN's
compatibility table both say so), so the voice cannot be cut at the end of the first word of a carrier phrase. The page's "stopped after 0.4 s"
button is the crude version: `speechSynthesis.cancel()` on a timer. Expect a chopped syllable; it is there so he can hear why it is not a fix.

**`voiceForm` tricks** are the same thing as the strings above: the scheme's `voiceForm` is what the voice is handed (modern.ts keeps the nasal of
ντ by writing `πάν-ντοτε`). A one-letter voiceForm of `οο` or `ο‍` is a one-line change in the scheme *if* his phone says it as a sound.

**Licence, cost, offline:** the phone's voice is free, offline once installed, and the only voice that is *the* voice. Closeness: identical, by
definition, if any form works; none works for a consonant (there is no "v" to double), so the drill's bare sounds need a clip whatever happens.

## (b) Clips baked with a free, local, licence-clean neural Greek voice

Three were run on the Desktop (16 cores, no GPU) and their clips are on the page. A fourth kind, a cloud sample, was not (see c).

### What they have in common: a word alone breaks a VITS voice

Both Piper's and Coqui's Greek voices are VITS models with a stochastic duration predictor, and handed a word or two on their own they produce
several seconds of stretched speech: Piper says βήτα in 7.0 s and "ὁ λόγος" in 4.2 s; Coqui says βήτα in 8.8 s and a lone `ο` in 6.0 s. Both pace a
sentence normally (Piper 1.8 s, Coqui 3.0 s for "Καλημέρα, τι κάνεις σήμερα;"). So every item on the page was said *inside a carrier sentence*
("Λέω τη λέξη βήτα και πάλι.") and cut out by the voice's own alignment: Piper gives one per phoneme (`piper-tts[alignment]`), Coqui's model
gives one per token (captured through its synthesizer). A bare sound is the vowel or consonant inside a word (the stressed vowel of ἅγιος, ἔργον,
ἥλιος, ὅλος; the article of "ὁ λόγος" and "ἡ ζωή"; the first letter of βάση, γάλα, θέση), said at twice the pace's length (`length_scale` 2.2 and 2.0)
for a careful, teaching length, and a cut that still came out under 0.25 s was slowed to 0.25 s with the pitch kept (ffmpeg `atempo`). That last
step is an artefact a clip in the app would not need if the sound were made at the right length in the first place; it is marked here so a
thin-sounding vowel is not blamed on the voice.

eSpeak NG's phoneme input (`[[o]]`) needs none of this: it says a sound on request, which is why the shipped clips are 0.39 s each and clean, and
also why they sound like no one.

### Piper `el_GR-rapunzelina-low`

* **What:** rhasspy/piper-voices on Hugging Face; 63 MB ONNX, 16 kHz, quality "low", one speaker, finetuned from the US English Ryan voice.
  Phonemes by espeak-ng `el`. The engine: `rhasspy/piper` (MIT, archived 2025-08-26); the maintained fork `OHF-Voice/piper1-gpl`, which is what
  `pip install piper-tts` (1.8.0) installs, is GPL-3.0. The voice data: a Greek single-speaker set on Kaggle, CC0.
* **Tried:** phoneme input (`PiperVoice.phonemes_to_ids` on `['ˈ','o']`) gives a quiet, 1 to 5 s smear (peak 0.05 against 0.44 for a word): not
  usable. Carrier cuts at length 1 give the names in 0.19 to 0.27 s and the vowels in 0.03 to 0.14 s; at 2.2 the vowels are 0.22 to 0.62 s. The
  unstressed article is pushed by the alignment into the word gap beside it, so the cut takes the gap too.
* **Licence:** clean to ship as sound (CC0 voice, nothing of the engine in the app). **Cost:** none. **Offline:** yes, on the Desktop at build
  time; in the app only the clips. **Closeness:** a neural voice, but a "low" 16 kHz one made from an English speaker; a phoneme recogniser
  (Meta's wav2vec2 espeak-phoneme model, the mill's scorer's) hears its sentence as "k e ʎ i m e r a t i k a n i s i m e r a" (right) and its short
  cuts mostly as noise, so the ear must judge.

### Coqui `tts_models/el/cv/vits`

* **What:** a VITS voice trained on Common Voice Greek, 22.05 kHz, listed BSD-3-Clause in Coqui's model list (coqui-ai/TTS `.models.json`); the
  engine is the maintained fork `idiap/coqui-ai-TTS` (`pip install coqui-tts`, MPL-2.0), which needs torch and espeak-ng for phonemes. XTTS v2,
  the Coqui voice-cloning model, was not tried: Greek is not among its 17 languages (and its licence is the CPML, non-commercial).
* **Tried:** `coqui-tts 0.27.5` on Python 3.12 needs `transformers>=4.57,<5` and `coqui-tts[codec]` (torchcodec) before it imports, and
  espeak-ng on PATH. Words from carriers come out 0.26 to 1.1 s (it is a slow, deliberate voice; βίβλος is 1.1 s); the vowel cuts are short
  (0.08 to 0.38 s) and the shortest were slowed to 0.25 s. The verse "ο ην απ αρχής" inside a carrier is heard by the recogniser as
  "o j i n a p a k i s": right.
* **Licence:** clean to ship as sound (BSD-3 model; MPL engine and GPL espeak-ng used only to make the clips). **Cost:** none. **Offline:** yes.
  **Closeness:** a 22 kHz neural voice trained on crowd recordings; to the ear to judge.

### Chatterbox Multilingual (Resemble AI)

* **What:** `ResembleAI/chatterbox` on Hugging Face, MIT, 0.5 B parameters, 24 kHz, 23 languages with Greek (`el`); `pip install chatterbox-tts`
  with torch 2.6; about 3 GB of weights download on first use. A zero-shot voice cloner: it speaks in the voice of a reference clip, or in a
  built-in English speaker's without one.
* **Tried:** on this CPU 8 to 40 s an item. With the built-in voice, βήτα, βίβλος, ἀγάπη and the verse are heard right by the recogniser, but
  "ὁ λόγος" and "η θύρα" ran to 4.8 and 5.6 s of babble. With a Greek reference (8 s of Piper reading a Greek passage, so the reference is CC0-derived
  and no one's recording) every word comes out 1.0 to 1.3 s and is heard right (βήτα "v i t a", θεός "θ e o s", the verse "oː i n ɐ p a r x i s").
  It hallucinates on short inputs: one take of "η ζωή" said it twice (4.3 s), so the script keeps the shortest of three takes; two carrier words
  grew babble tails. Handed a lone `ο` it crashes (an empty token sequence), so it cannot be asked for a bare sound at all: its sounds are cut out
  of carrier words by the recogniser's frames (the CTC output is peaky, a phone shows as one or two frames, so a sound runs from its own spike to the
  next phone's), 0.11 to 0.23 s, slowed to 0.25 s.
* **Licence:** MIT; the Greek reference is synthetic, so no speaker is cloned. **Cost:** none. **Offline:** yes, slowly, on the Desktop.
  **Closeness:** the most modern of the three (an LLM-and-flow model, 24 kHz) and the only one whose voice can be *chosen* by a reference clip:
  if he liked a particular speaker it could be steered toward one, which is also where it stops being licence-clean (a reference must be a
  recording one is allowed to clone: not Google's voice).

### Not tried, and why

| Voice | Why not |
| --- | --- |
| Meta MMS-TTS `ell` | CC BY-NC 4.0: Lampas is sold |
| Piper `el_GR-joy-medium` | voice data CC BY-NC 4.0 |
| Mimic 3 `el_GR/rapunzelina_low` (also in sherpa-onnx) | the same CC0 data as Piper's, an older model of it |
| XTTS v2, Kokoro, Fish OpenAudio, Qwen3-TTS, Orpheus, F5-TTS, Zonos | no Greek |
| Edge's read-aloud endpoint (the `edge-tts` package) | it is Azure's Athina voice used without a licence: not clean, so not even sampled |

## (c) A paid cloud neural voice, priced, not bought

| Service | Greek voices | Can it be told a phoneme? | List price | Free tier | This clip set (about 40 items, under 600 characters) |
| --- | --- | --- | --- | --- | --- |
| Azure AI Speech | `el-GR-AthinaNeural` (f), `el-GR-NestorasNeural` (m) | **Yes**: the SSML `phoneme` element with `alphabet="ipa"`, and the phonetic-sets page lists el-GR | Neural standard US$15 per 1 M characters; Neural HD US$22; (Azure retail prices API, eastus, 2026-10-15) | F0: 0.5 M characters a month | under US$0.01, or US$0 on F0 |
| Google Cloud Text-to-Speech | `el-GR-Standard-B`, `el-GR-Wavenet-B` (f), about thirty `el-GR-Chirp3-HD-*` (m and f); no Neural2 | **No**: the phoneme page lists no Greek, and Chirp 3 HD's custom pronunciations exclude `el-gr` | Standard and WaveNet US$4 per 1 M; Neural2 US$16; Chirp 3 HD US$30; Studio US$160 (pricing page, 2026-10-15) | 4 M (Standard, WaveNet), 1 M (Chirp 3 HD) a month | US$0.02 at most, US$0 within the free tier |
| ElevenLabs | Multilingual v2 speaks Greek | **No** for Greek: phoneme tags work only with `eleven_flash_v2` (English) | Starter US$6 a month, 30 k credits, commercial use from this plan | 10 k credits a month, no commercial use | a few hundred credits |

What the price buys: Azure alone can be told "say [o]", "say [v]", so its clips would be the bare sounds without any cutting, in a studio
neural voice; Google's and ElevenLabs' would need the same carrier-and-cut method as the free voices, or the doubling trick, with no promise.
None of them is the phone's speaker either. Offline: the clips are made once and shipped; the app stays offline. **Nothing was signed up for and
nothing was spent**: each needs an account under the Governor's name (Azure and Google want a card even for the free tier), so a sample of Athina
or Nestoras is his to ask for; the page has no cloud column.

## (d) Keeping the drill and the one-letter words in the winning voice

What the app does today, in order of how often he meets it:

1. A one-letter word (ὁ, Ὃ, ἡ, ὦ, ἤ, ὅ, ᾧ, ἃ) said alone: the pronunciation's eSpeak clip (`loneLetterClip`, public/sounds/modern/{a,e,ee,o}.mp3).
2. A one-letter word inside a reading (Listen, a tutor's answer read aloud, Sound it out's one-letter syllable): the same clip between the voice's
   pieces (`readAloud.ts piecesOf`).
3. A letter drill's "Hear a letter and pick it" and the quick round's "hear" (`speakLetter`): the phone's Greek voice *names* the letter ("vita"):
   the same voice as the rest of the app, but a name where the question is about a sound; the "see it and pick its sound" side shows the sound
   as text and plays nothing.
4. A teach tile: the phone's voice names the letter.

So the only foreign voice today is eSpeak's, in 1 and 2; the drills are not in a foreign voice, they are in no sound at all. The ways to one voice:

* **One neural speaker for everything the app says on its own.** Regenerate the four vowel clips in the winning free voice (the same file names,
  the same `loneLetterClip`), and add that voice's bare sounds for the letters and pairs the drills ask about (about 40 clips, 100 KB), so a drill's
  "hear its sound" plays a sound and the name stays the phone's. Everything else stays the phone's voice. Two speakers in the app, both neural,
  the clips used only where the phone's voice cannot say the thing.
* **The phone's own voice, if a trick passes.** If his phone says `οο` (or `ο` + joiner) as the sound, Modern Greek's `voiceForm` hands a one-letter
  word that form and the clips stay only as the fallback for a phone with no Greek voice. One speaker for words; consonant sounds still need clips.
* **Azure clips**, same shape as the first, with his account.

## Sweep: every place the app speaks Greek with something other than the phone's Greek voice

| Where | What speaks | Source |
| --- | --- | --- |
| `speak()` / `speakWord()` on a one-letter word: the idea sheet's example speakers, the word sheet's Hear it, Tap to hear (Quick test, flashcards, grammar questions), a long press on a word (Reader, Words, any prose), the reading check's word speakers, every SpeakButton | eSpeak NG clip | src/speech/greek.ts `loneLetterClip`, `playLoneLetter`; src/speech/schemes/modern.ts `loneLetterClipModern` |
| a reading with a one-letter Greek run (Listen on a verse, passage or chapter with the weave on; a tutor's answer read aloud; Sound it out's one-letter syllable) | eSpeak NG clip between the voice's pieces | src/speech/readAloud.ts `piecesOf`, `playPieces` |
| a letter drill's "hear" question, the quick round's "hear", a teach tile, Tap to hear in letter mode | the phone's Greek voice, naming the letter (not a sound) | src/speech/greek.ts `speakLetter`; src/speech/speakQuestion.ts; src/data/grammar/drillItems.ts `hearLetter`; src/data/grammar/quickRound.ts; src/TeachTiles.tsx; src/TapToHear.tsx |
| a phone with no Greek voice: a word said alone still goes to the phone's default voice with `lang` set | a non-Greek voice reading Greek letters | src/speech/greek.ts `speakWord` (its comment); the speaker buttons carry the help line; HearAnyWord shows a notice instead |
| the tutor's Latin-letter respellings in an answer read aloud ("PNEV-ma") | the English voice | src/speech/answerRuns.ts (Latin runs go to English; mw-5r3p30.272's story) |
| Play my reading, Me | his own recording, not a voice | src/ReadCheck.tsx, src/audio/clipPlayer.ts |

A build slice that changes the clip voice covers the first two rows with no code change (the same file names) and the third with a new clip set
and a `soundClip` beside `loneLetterClip`; the fourth and fifth are not about the Greek voice.

## Build slices, for the Mayor

All after he has listened; each names the Governor's decisions it waits on.

1. **S: the winning free voice's clips in place of eSpeak's.** `scripts/sounds-trial/make-clips.py` already makes them; the slice moves the
   chosen voice's `a`, `e`, `ee`, `o` (or the article forms, his choice) to public/sounds/modern/, points scripts/sounds-build.sh (or retires it)
   at the script, updates the eSpeak credit to the new voice's, and the existing tests (tests/unit/lone-letter-clip.test.ts holds the files, not
   the voice) stay. Waits on: which voice.
2. **M: a bare-sound clip for every letter and pair the drills ask about, in that voice**, and the drill's "hear" question playing the sound
   with the name kept in the phone's voice: a `soundClip(id)` on the scheme beside `loneLetterClip`, about 40 clips (the 24 letters' sounds, the
   vowel pairs, the consonant pairs), `speakQuestion` playing it for kind 'sound', a scenario per drill kind, the credits. Waits on: 1, and whether
   he wants the drill to say the sound, the name, or both.
3. **S: a one-letter word in the phone's own voice, if a trick passes on his phone.** Modern Greek's `voiceForm` hands a one-letter word the form
   that worked (`οο` or `ο` + joiner), `loneLetterClip` stays as the fallback for a phone with no Greek voice, the honest-fake steps of
   features/one-letter-greek-voice.feature learn the form. Waits on: his report from the page (which button said the sound). If the polytonic
   phrase button names the letter, the same slice strips the breathing and grave from a one-letter word inside a phrase.
4. **M, money: Azure clips.** An Azure Speech resource under his account, a script that asks Athina or Nestoras for each sound by IPA phoneme
   and each word by text, the same encode step, a credit. Waits on: the Governor's word on the account and a sample he has heard.

## What this story did not do

* No phone was listened to, and this box cannot run a Google or Samsung Greek voice: everything about Android is from Chromium's source and the
  documentation named above, and the page exists because only his phone can answer (a).
* No cloud voice was sampled: each needs an account in his name.
* No clip was judged by ear here. The phoneme recogniser is a sanity check (it hears the neural voices' sentences as Greek, and no clip as
  "omikron"), not a judge of naturalness; the eSpeak clips it hears as `aː` and `l i t ɑ`, which says more about it than about them.
* Chatterbox's reference voice is Piper's synthetic Greek, chosen for licence cleanliness; a real CC0 Greek recording as the reference would likely
  sound better and was not sought.
* The app's behaviour is unchanged: the same eSpeak clips play, `speakLetter` still names a letter, and no screen links to the page.
