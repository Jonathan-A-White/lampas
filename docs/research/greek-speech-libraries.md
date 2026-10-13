# Research: which open-source libraries could replace what Lampas hand-built for Greek sound

Story mw-5r3p30.273. Written 2026-10-12. Research only: no app code changed. Every URL below was fetched or queried on 2026-10-12
during this story; where a claim is from a command run on the Laptop (espeak-ng 1.51, the `apt` build) the command is named, and where a
claim could not be checked it says so.

The ask (the Governor, Postern general, 2026-10-12 ~22:58Z, about the 'pnev' screenshot, mw-5r3p30.272): "are there open source libraries
that already do all this ... good ones ... are we reinventing the wheel or is this something key for us to build."

## The short answer

* **Partly reinventing, mostly not.** Good open source exists for one slice of this: *Greek spelling to IPA* (espeak-ng) and, for a
  neural Greek voice, Piper. Nothing open does the other things Lampas hand-built: a respelling an *English reader* can say
  ('hree-STO'), syllables that obey the app's diphthong and diaeresis rules in NFC polytonic Greek, or an Erasmian scheme in the same
  shape. Those are product, not plumbing, and stay ours.
* **Neither bug is a library bug.** 'pnev' (mw-5r3p30.272) happens because the tutor's *Latin-letter* respelling is handed to the English
  voice (`src/speech/answerRuns.ts` sends only Greek-script stretches to the Greek voice); the cure is in the answer's shape, not a G2P
  library. Πάντοτε (mw-5r3p30.264) is the phone's Greek voice saying what Modern Greek really says; espeak-ng's own `el` drops the nasal
  too (measured below), so a library would make the voice and the respelling disagree the same way, not agree.
* **The most useful adoption is espeak-ng as a development-time cross-check**, not as shipped code: it is GPL-3.0 and Lampas is MIT.

## What Lampas built

Lampas is MIT (`package.json` `"license": "MIT"`). All paths are in this repo unless named.

| Piece | Where | What it does |
| --- | --- | --- |
| Modern Greek respelling (G2P for an English reader) | `src/speech/schemes/modern.ts` (215 lines), `docs/pronunciation.md` | `respellModern('χριστῷ')` = `hree-STO`: tokenises NFD letters, applies the Modern rules (αι→e, ει/οι/υι→ee, ου→oo, αυ/ευ/ηυ→av/af..., γ→gh/y, χ→kh/h, μπ ντ γκ γγ with a nasal inside a word, σ→z before voiced consonants, doubled consonants once), cuts syllables by the longest legal Greek onset, capitalises the stressed syllable. `MODERN_KEY_WORDS` gives each sound an English key word. |
| Scheme registry (where Erasmian plugs in) | `src/speech/pronunciation.ts` | `Pronunciation {id, label, lang, scoringLang, note, respell, keyWords}`; `SCHEMES = [MODERN]`; `registerPronunciation` for tests. Erasmian is documented as next, not built. |
| Syllabification and the app's check of the tutor's syllables | `src/speech/greekSyllables.ts` (98 lines) | `greekSyllables(word)` cuts NFC Greek into Greek-letter syllables (`ταῦτα` = `ταῦ`,`τα`), using modern.ts `ONSETS`; `checkedSyllables` keeps the tutor's list only if it spells the word and splits no diphthong. |
| Accent / breathing handling | inside `modern.ts` `lettersOf` and `greekSyllables.ts` `piecesOf` | Reads acute, grave, circumflex and diaeresis from NFD marks; breathings and iota subscript are dropped. There is no accent *placement* or accent-class logic; Lampas only reads accents already in the text. |
| The voice | `src/speech/greek.ts` (365 lines), `languages.ts`, `settingsSync.ts`, `readAloud.ts`, `answerRuns.ts` | No synthesiser of its own. It drives the phone's Web Speech voices through `bsv-kit/speech` (queueing, pause, resume), `lang` `el-GR` for the Greek pronunciation, a chosen `voiceURI` and a speed per language. Text is handed over as plain strings. `loneLetterSound` turns a one-letter word into its respelling for the English voice (mw-5r3p30.256). `answerRuns.ts` cuts a tutor answer into English and Greek runs by script, so Latin-letter text always goes to the English voice. |
| The scorer's use of espeak-ng (in millwright, not this repo) | `/home/jwhite/millwright/contrib/scorer/mw_scorer/g2p.py`, `phones.py`, `README.md` | `phonemizer`'s `EspeakBackend` with `lang` `el` (espeak-ng's Modern Greek) gives the *expected* IPA of each target word; wav2vec2 (`facebook/wav2vec2-lv-60-espeak-cv-ft`) gives the produced phones; `phones.py` folds Greek variants and makes the nasal in ντ/μπ/γκ optional because `el` says the stop alone. Runs on the mill only. |
| Tests that hold it | `tests/unit/respell-modern.test.ts`, `greek-syllables.test.ts`, `reading-sounds.test.ts`, `features/pronunciation.feature` | One row per rule. |

What does **not** exist in Lampas: G2P to IPA (the respelling is English-reader syllables, not IPA), accent *rules* (placement,
classes), any synthesiser, any Erasmian code.

## Candidates

Columns: Licence (must fit MIT: permissive is fine; GPL-3 needs a Governor decision because shipping it in the PWA makes the served app a
GPL-3 combined work), Maturity, Where it runs and size, and what it would do for 'pnev' (mw-5r3p30.272) and Πάντοτε (mw-5r3p30.264).

| Candidate | Licence | Maturity | Runs where / size | 'pnev' (.272) and 'PA-do-te' (.264) | URL |
| --- | --- | --- | --- | --- | --- |
| **espeak-ng** (Modern `el`, Ancient `grc` voices) | GPL-3.0 | v1.52.0 (2024-12-12); last push 2026-09-22; 6,937 stars; not archived | C library and CLI; mill-side today. Full data dir 13 MB on the Laptop (apt 1.51); `el_dict` 72,841 bytes, `grc_dict` 3,433 bytes | Does not fix either alone. It *confirms* the diagnosis: `espeak-ng -v el -q --ipa` gives `pnˈevma` for πνεῦμα (the 'ev' is right) and `pˈadotˌe` for Πάντοτε (nasal dropped, as the real Modern Greek and the phone voice do). `-v grc` gives `pˈantotˌe`, `pnˈeʊma`. Measured on the Laptop, 1.51. | https://github.com/espeak-ng/espeak-ng |
| **espeak-ng in WASM** | `@echogarden/espeak-ng-emscripten` GPL-3.0; `espeak-ng` (npm) GPL-3.0-or-later; `piper-phonemize` (npm) GPL-3.0-or-later | echogarden 0.3.5 (2025-08-19), repo pushed 2026-07-22, 6 stars; `espeak-ng` npm 1.0.2 (2023-11-24); `piper-phonemize` 1.5.4 (2026-10-12) | Browser/offline possible. Unpacked size: echogarden 24.9 MB, `espeak-ng` 18.7 MB, `piper-phonemize` 18.5 MB (npm `dist.unpackedSize`) | Would give IPA for any Greek form in the PWA, but IPA is not what the English voice or an English reader needs; a GPL-3 WASM blob in an MIT PWA is the licence problem. | https://www.npmjs.com/package/@echogarden/espeak-ng-emscripten, https://www.npmjs.com/package/espeak-ng, https://www.npmjs.com/package/piper-phonemize |
| **phonemizer.js** (npm `phonemizer`) | Apache-2.0 wrapper, but the 1.3 MB `dist/phonemizer.js` embeds the espeak-ng WASM and data (GPL-3) | 1.2.1 (2025-01-16); 49 stars | Browser/Node, offline, ~2.7 MB unpacked. Ran it: `list_voices()` returns 8 voices, all English, **no Greek** | Cannot do Greek at all as shipped. Ruled out. | https://github.com/xenova/phonemizer.js |
| **Epitran** `ell-Grek` | MIT (the licence file reads "MIT-Modern-Variant" on PyPI) | 1.35.3 (2026-10-08); 841 stars; actively maintained | Python, mill-side only | **There is no Greek map.** The language table in the README never mentions Greek, `epitran/data/map/` has no `ell`/`grc` file, and `…/map/ell-Grek.csv` is a 404. A request for Greek is an open issue (#144 'Greek transliteration'). The story's premise (`ell-Grek`) is wrong; ruled out. | https://github.com/dmort27/epitran, https://github.com/dmort27/epitran/issues/144 |
| **James Tauber's greek-accentuation** | MIT | 1.2.0 (2017-03-21); last push 2021-11-14; 64 stars; nothing since | Python 3 only; **no npm package of that name** (registry lookup: not found); no JS port found by a GitHub and npm search | Accent placement and syllabification of *Ancient* (polytonic) words. Lampas never places accents, so little to gain; its syllable breaks would not match the app's modern, diphthong-aware ones. Does not touch .272 or .264. | https://github.com/jtauber/greek-accentuation |
| **modern-greek-accentuation** (JS) | MIT | 1.2.1 (2023-06-28), 1 star, one maintainer | Browser/Node, 86,790 bytes unpacked. Has `modernGreekSyllabify`, accent utilities, Latin transcription | The only JS Greek syllabifier found; could be a test oracle for `greekSyllables`. It is monotonic-modern oriented and not diaeresis/diphthong-rule compatible with `greekSyllables.ts` without checking. Does not touch .272 or .264. | https://github.com/PicusZeus/modern_greek_accentuation_js, https://www.npmjs.com/package/modern-greek-accentuation |
| **Hyphenopoly** `el-monoton` / `el-polyton` patterns | MIT (package); the pattern files' own licence not checked | 6.1.0 (2026-01-01); 735 stars | Browser (WASM patterns 3.5 KB and 7.1 KB) | Line-breaking hyphenation, not phonetic syllabification: wrong tool for a respelling. | https://github.com/mnater/Hyphenopoly |
| **Piper TTS**, voice `el_GR-rapunzelina-low` | Engine: `rhasspy/piper` MIT, but **archived** (last push 2025-08-26); the maintained fork `OHF-Voice/piper1-gpl` is **GPL-3.0** (v1.8.0, 2026-09-04). Voice data: CC0 (Kaggle single-speaker set). | Voice is 'low' quality, 16 kHz, one speaker, finetuned from a US English voice | ONNX, 63,104,526 bytes (63 MB); browser build `@mintplex-labs/piper-tts-web` MIT, last push 2024-08-06, 41 stars; needs the GPL phonemizer WASM. Also runs on a server (the mill) with no browser limits | A *real, fixed* Greek voice, so the voice never differs by phone. But it phonemizes with espeak-ng `el` (`"espeak": {"voice": "el"}` in the voice's JSON), so it also says `pádote` (.264 not fixed). 63 MB would not fit the precache. 'Low' quality for a student's model of pronunciation is a risk. Does not fix .272. | https://huggingface.co/rhasspy/piper-voices/tree/main/el/el_GR, https://github.com/rhasspy/piper, https://github.com/OHF-Voice/piper1-gpl, https://github.com/Mintplex-Labs/piper-tts-web |
| Piper voice `el_GR-joy-medium` | Engine MIT/GPL as above; **voice data CC BY-NC 4.0** (non-commercial) | medium quality, 22.05 kHz, 63,516,050 bytes | as above | Lampas is licence-gated and sold; a non-commercial voice does not fit. Ruled out. | https://huggingface.co/rhasspy/piper-voices/blob/main/el/el_GR/joy/medium/MODEL_CARD |
| Meta MMS-TTS `ell` | CC BY-NC 4.0 | model on Hugging Face | transformers/PyTorch | Non-commercial: ruled out. | https://huggingface.co/facebook/mms-tts-ell |
| **CLTK** Greek phonology (for Erasmian / reconstructed) | MIT (GitHub licence; PyPI leaves the field empty) | Phonology exists only in **v1.5.0** (2025-05-04): `src/cltk/phonology/grc/transcription.py` (Attic/Probert tables → IPA, with syllabification). **The 2.x line (2.5.1, 2026-02-12) has no `phonology` directory** (master tree checked); 923 stars | Python only; needs NLTK and `greek-accentuation` | Not relevant to .272 / .264. Useful as a *source of reconstructed-Attic sound tables* (Probert 2010) to check an Erasmian scheme against, but it is Attic reconstruction, not Erasmian (Erasmian is a teaching convention, which CLTK does not implement); and it is a dead end as a dependency. | https://github.com/cltk/cltk/tree/v1.5.0/src/cltk/phonology/grc, https://github.com/cltk/cltk |
| **Web Speech API** (what the phone offers) | Platform | W3C draft | Free, offline voices vary by phone | **No phoneme input.** The spec says `text` "may be either plain text or a complete, well-formed SSML document", but engines that do not support SSML "must strip away the tags they do not support and speak the text". It lists only prosody and `mark`; nothing guarantees `<phoneme>`. Chrome's own `tts` page says engines may support only some SSML tags. Whether Google's Android voices honour `<phoneme>` was **not confirmed** by any source I could reach. So we cannot tell the phone's voice how to say a sound; we can only choose the characters we hand it. | https://webaudio.github.io/web-speech-api/, https://developer.chrome.com/docs/extensions/reference/tts, https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisUtterance |

Also noted: `k2-fsa/sherpa-onnx` (Apache-2.0, 15,246 stars, pushed 2026-10-12) is an on-device speech runtime (its GitHub description lists text-to-speech, Android and iOS), https://github.com/k2-fsa/sherpa-onnx; no
Greek model, no browser build and no size were checked, so it is only a name to look at if a real voice is ever wanted.

## What the two bugs actually need

* **'pnev' (.272).** Not a G2P problem. The tutor writes 'pnev' / 'PNEV-ma' in Latin letters inside English prose; `answerRuns.ts` routes
  Latin to the English voice, which spells an all-caps or odd token letter by letter. A library would not change that. The fix is what the
  bead already prefers: tie each respelling to its Greek in the answer (a field or marker in the bible-talk answer schema), speak the
  Greek, and skip the Latin respelling in speech.
* **Πάντοτε (.264).** espeak-ng `el` and the phone's voice agree: no nasal. Lampas's respelling keeps it on purpose (the scorer already
  accepts it either way). No library resolves a disagreement between two *correct* things: either the respelling shows what is spoken, or
  the voice is given a form that keeps the nasal (not possible through Web Speech, which gives no phoneme control). Piper would not help:
  it uses the same espeak rules.

## Recommendation

Ranked. Each is a candidate story; sizes are the Mayor's S / M / L for a Builder session. Nothing here has been started; any swap comes
back to the Governor first.

1. **Keep ours: the respelling, the scheme registry, the syllabifier.** Nothing open produces an English-reader respelling or follows the
   app's diphthong rules. They are small (about 360 lines), tested, and the right shape for Erasmian. *No story.*
2. **Fix 'pnev' in the answer's shape, not with a library.** Story: *"A respelling in a tutor answer carries the Greek it respells, so
   reading aloud speaks the Greek and skips the Latin letters."* Size **M** (grinds' schema and instructions, `answerRuns.ts`, grind
   examples, a unit test). This is already mw-5r3p30.272.
3. **Adopt espeak-ng as a development-time oracle, not shipped.** Story: *"A script that compares `respellModern` with espeak-ng `el` IPA
   over the whole lexicon and reports mismatches (report only, not in the gate)."* Size **M**. It finds a Πάντοτε-class disagreement for
   every lemma at once, runs on the Laptop where `espeak-ng` is already installed, and ships no GPL code. (The Mayor may prefer it to
   follow mw-5r3p30.264, whose χ and nasal rules it would check.)
4. **Erasmian: write our own scheme, using CLTK v1.5.0 tables as a reference only.** Story: *"Erasmian pronunciation scheme
   (`schemes/erasmian.ts`, registered, with key words and tests)."* Size **M**. Erasmian is a convention; CLTK does not implement it, its
   2.x release dropped phonology, and the reference needs a Governor choice of which Erasmian (the docs note μπ `mp`, ντ `nt`, γκ `nk`,
   γχ `nk`). A voice for it needs a sound-alike language tag; none was found, so the phone's voices would speak it as Modern Greek unless
   the respelling is read by the English voice. This is covered by mw-5r3p30.268 (every sound from one scheme).
5. **A real Greek voice: decide before building.** Story (Governor first): *"Spike: a mill-side Piper `el_GR-rapunzelina-low` reading,
   returned as audio, compared by ear with the phone's voice."* Size **L**. The licence is workable (engine MIT or GPL on the mill, voice
   CC0, and a mill process is not a PWA distribution), but it fails offline, the voice is 'low', and it would still drop the nasal. Not
   `joy` or MMS (non-commercial). On-device Piper in the PWA (63 MB, GPL phonemizer WASM) is **not recommended**.
6. **Do not adopt:** `greek-accentuation` (Ancient, Python, unmaintained since 2017, Lampas places no accents), `phonemizer.js` (no
   Greek), Epitran (no Greek map exists), Hyphenopoly (wrong problem). `modern-greek-accentuation` could serve as a test oracle for
   `greekSyllables` as a small **S** story (*"Cross-check `greekSyllables` against `modernGreekSyllabify` in a dev test"*), with low
   value.

**Licence note for the Governor.** Lampas is MIT. Shipping any espeak-ng WASM (GPL-3.0) in the PWA would make the served app a GPL-3
combined work (its source is public, so the obligation is met in practice, but it is a decision about the app's licence, not a Builder's).
Using espeak-ng on the Laptop or the mill (as the scorer does) carries no such obligation for Lampas.

## What this story did not do

* No code, test, `ATTRIBUTION.md` or Preface was changed: nothing here is adopted, so no credit is due yet. A swap or an adoption in item 3
  or 5 would add credits in the same story.
* No phone was listened to. Whether Android Chrome's Greek voice honours SSML `<phoneme>` is unknown; no source reached says so.
* Pattern-file licences for Hyphenopoly and a Greek model for sherpa-onnx were not checked.
* Star counts and dates are from the GitHub, npm, PyPI and Hugging Face APIs on 2026-10-12.
