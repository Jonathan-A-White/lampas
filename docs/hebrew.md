# Hebrew in the tutor (mw-5r3p30.97)

Scope: the tutor's conversations (Ask the tutor, the Talk sheet), not a Hebrew Old Testament reader. Nothing here is Hebrew-only in its
names or types: the depth setting, the font and the splitting are per language (`he` for Hebrew), so a Hebrew reader later, or another
language, reuses them. A language is one more entry in `SCRIPTS` (`src/script/scripts.ts`).

## The depth

Settings > **Hebrew in the tutor** (registry key `hebrewDepth`, a choice of three, **Hebrew and transliteration** by default):

| value | label | the tutor writes the word for righteousness as |
| --- | --- | --- |
| `transliteration` | Transliteration | tsedeq |
| `both` | Hebrew and transliteration | צֶדֶק tsedeq |
| `full` | Full | צֶדֶק (the pointed letters alone, like the Greek) |

It is a registry setting, so the Bible talk can change it when asked and he can undo it; `currentSettings()` puts it in every Bible talk
request as `settings.hebrewDepth`, and the verse-ask request carries `settings: { hebrewDepth }` (`src/script/depthSettings.ts`). Both grinds'
instructions have a "Hebrew words" section with the three examples.

## How it is drawn

`src/markdown/scriptRuns.ts` (a remark plugin in `Markdown.tsx`) wraps each stretch of Hebrew letters in an answer (words with only spaces
between them are one stretch) in `<span lang="he" dir="rtl" class="script-he">`. `dir` on an inline element isolates it from the line round
it, so right-to-left letters never turn the English order round. `.script-he` (src/index.css) sets **Noto Serif Hebrew** (400 and 700, the
@fontsource 5.3.0 woff2 builds under `src/fonts/`, SIL Open Font License 1.1, `OFL-noto-serif-hebrew.txt`; precached with the other woff2 files).
`src/script/ScriptText.tsx` draws plain text the same way (the Settings examples).

## Speech and the guide (mw-5r3p30.98)

A Hebrew word in an answer is a button (`src/script/HebrewWord.tsx`, drawn by `Markdown.tsx`; 44 px high, dotted underline). A tap:

1. says the word in the phone's Hebrew voice (`speak(text, key, undefined, 'hebrew')`, lang `he-IL`, modern Israeli, the normal speed; a second tap on
   the same word stops it). Hebrew has a voice tag (`HEBREW_LANG`, `SpeechLanguage` 'hebrew' in `src/speech/languages.ts`) but no voice or speed
   setting of its own yet: the phone picks its he voice. With no he voice on the phone nothing is spoken, never an English voice reading Hebrew
   letters, and the guide shows the line **No Hebrew voice on this phone** (`hasVoice('hebrew')`; a phone that has not listed its voices yet is
   still asked to speak, as Greek is);
2. opens the guide (`src/script/HebrewGuide.tsx`, a bottom sheet named **How to say it** over the Talk sheet): the word large, **Hear it**, and, in
   a conversation that can ask (the Talk sheet and Ask the tutor from any screen, through `HebrewAskContext`), **Syllables and sounds**.

**Syllables and sounds** sends a bible-talk question with the focus `{form, lemma: form, parse: 'Hebrew word', kind: 'sound', language: 'he'}`
(`hebrewSoundAsk` in `src/services/talk.ts`). The grind answers in Hebrew: `syllables` in pointed Hebrew letters in reading order and
`transliteration`, how each one sounds in Latin letters (the stressed one in capitals), one per syllable. `useTalk` keeps them on the turn as
`guide` {word, syllables, sounds} (no table change) and the turn draws the card (`HebrewSoundGuide`): the word, then each syllable over its sound,
each a 56 px button that says it in Hebrew. The Greek 'Sound it out' reading of syllables does not run for a Hebrew focus.

Not done: the answers read aloud still leave Hebrew out (the English voice would garble it), and the Verse view's Ask answers have the guide
without Syllables and sounds (no conversation to ask in).
