# Read aloud span (mw-5r3p30.72)

Settings > Read aloud has one choice, the **Read aloud span** (registry key `readSpan`, `src/speech/readSpan.ts`; default
**Chapter**, PROVISIONAL until the Governor confirms). It says how far the header's *Read from the top* / *Read from here*
goes before the voice stops. It starts at the verse he starts from (the header's Play: verse 1; the Verse view's Listen: its verse, by a tap on Play, and it stops at that verse's end, mw-5r3p30.79, .92, .130).

| Span | The voice stops |
| --- | --- |
| Verse | after the verse it started from |
| Passage | before the next section heading: the Bible's own heading shown above a block of verses (`data-heading`, the `h` of a verse in the chapter JSON). The heading is read from the data whether or not Settings > Section headings shows it. |
| Chapter | at the chapter's end |
| Book | at the end of the book (Revelation 22 for Revelation); it does not go on into the next book |

The play button on a single verse (*Hear the verse*) always reads that verse only, whatever the span. The Verse view of a passage (a tapped section heading, mw-5r3p30.73) has Listen read that passage only, whatever the span.

## Crossing into another chapter

Book always, and a Passage that reaches the chapter's end when the next chapter's first verse has no heading before it, go on into the
next chapter of the same book. (The MSB data heads every chapter's first verse today, so for now a Passage stops at a chapter's end.) The reading (`src/speech/readAloud.ts`):

1. starts loading the next chapter while the last verse is spoken;
2. when the last verse ends, asks the Reader to turn to the next chapter (`openReader`, a new Back step) and waits as
   `crossing` (the reading bar says *Reading*, with no verse; Pause and Stop work);
3. the Reader that opens that chapter builds its plan (its own view and weave) and calls `continueReading`: the voice starts
   verse 1 at once, the highlight and following on screen work as in any chapter, and the open chapter
   (`src/data/readerChapter.ts`) becomes it.

`ReaderBody` (keyed by chapter) does not touch a reading that is crossing when it unmounts; leaving the Reader for another screen
pauses it (the speaking bar below offers Resume there and on coming back), and opening another chapter ends it. A chapter that cannot be fetched ends the reading before the Reader turns. Stop ends a
reading in every span, crossing included.

The verse being read keeps doing what it did: `verse-reading` on the bus per verse, the highlight, the scroll that keeps it in
view, and the wake lock.

## The speaking bar (mw-m7v5kc.3)

Everything read aloud goes through bsv-kit's speech package (`bsv-kit/speech`, the engine Postern's read-aloud was lifted into, pinned by commit with the rest
of bsv-kit): the text is spoken a sentence at a time, each sentence in the language of its letters (`el-GR` for Greek, `he-IL` for Hebrew, the English voice
for Latin letters), and **Pause** keeps the sentence reached, **Resume** goes on from it, **Restart** goes back to the first and **Stop** clears it. A page
that hides pauses it. One bar, `<SpeakingBar />` of `bsv-kit/speech/react`, shows whenever a verse, a chapter or the tutor's answer is read, and is the same as
Postern's and SpellForge's; its colours are Lampas's (`--bk-speech-*` in `src/index.css`).

- A verse is ONE speech under the key `read-aloud` (`greek.ts` READ_KEY): `readAloud.ts` joins its runs with a line break (a run is one language, so the package
  cuts a sentence at the end of every run too and tells the Greek from the English by its letters) and goes on to the next verse when the speech ends. It follows
  the package: a Pause, Resume or Stop made on the bar moves the reading's state (`syncWithEngine`). `Listen` on a verse stops at the verse end (`span` 'verse'), on a passage at the passage's end.
- Where the bar is drawn (`src/speech/SpeakingBarSlot.tsx`): a screen with a bottom edge leaves a `<BarSlot level>` and the one bar is drawn into the highest on screen:
  the foot of the shell (0, every screen but the Reader), the Reader above its Talk bar (1), the Verse view above its hold bar (2), the Talk sheet above its foot (3).
  It is in flow, never over text, and the round *Ask the tutor* button rides above it. The header's own Pause / Stop are gone while the bar holds the reading.
- A word said alone (a long press, a speaker, Hold to hear) is not a reading and has no bar (`isWordSpeech`).
- **Listen is a Listen** (mw-5r3p30.130, `docs/verse-view.md` 'Listen is a player'): a reading started with `listen: <key>` is paused by an in-app interruption and goes on by itself when it ends
  (`readAloud.ts` `interruptListen`; a word beside it, a Hold to ask, a recording, a tutor's answer); the speaking bar's Restart on it goes back to the first verse (`restartListen`); one that ran
  to its end by itself is remembered (`useListenCompleted`) so the Verse view's foot says Play again.
- **An interruption pauses, it does not end (mw-5r3p30.122).** A word, speaker or Hold to hear that speaks while a reading or a tutor's answer is under way (playing or
  paused) pauses it where it is (the package keeps the sentence, `greek.ts` `speakBeside`) and is said BESIDE it, straight to the phone's synthesiser: the bar stays,
  showing Resume, Restart and Stop, and Resume goes on from the sentence the answer was in (not from the start, not from the next). This covers the tapped Greek or Hebrew
  word, the speaker beside a flagged word of the reading check, the word sheet's and the guide's Hear it, and a hold on a Talk bar to talk (`useVoice.press` and the Reader's
  Talk bar `onPress` call `pauseReading`). The word has its own key for `useSpeakingKey` (its speaker shows Stop), `watchWordEnd`, `stopSpeaking` and a second tap, which end
  only the word. A second word cuts the first off; Resume tapped while a word still sounds goes on after it; Stop on the bar ends everything. The word sheet and the Hebrew
  guide, which sit over the screen's own bar, leave a `<BarSlot level={4}>` so Resume stays in view. Only a new question, the panel being left (below) or Stop ends an answer.
- What the package lacks stays in `src/speech/greek.ts`: his **speed** for a language and the **voice he picked** (the package names a language and takes the phone's
  voice; the app puts the rate and the chosen voice on each utterance as it is handed to the phone, by wrapping `speechSynthesis.speak` once), the slow speed of a
  word being sounded out, the no-voice help line and the word said alone (`speakWord`). A phone that lists no voices yet is waited for up to a second by the package
  before the first sentence (`warmVoices` ahead of a tap avoids it).
- Leaving the Reader for another screen **pauses** the chapter's reading and coming back offers Resume; the tutor's answers still stop when their panel goes (the story
  mw-5r3p30.122 kept this as it was; the Governor's rule, pwa-best-practices section 12, would pause them too, for a later story to decide). A page that hides pauses both
  (the package), and Resume continues from the same sentence on coming back.

## Pages of prose (mw-5r3p30.128)

About, My study way and the Preface have two round 44 px buttons in their header (`src/PageActions.tsx`, `usePageActions(hash, title)`: `buttons` for the
header's `action`, `notice` under the header):

- **Read aloud** (aria-label `Read aloud`, `aria-pressed` while its own reading is on; a second tap stops it) reads the page top to bottom. The page marks each
  paragraph, heading or line worth reading with `data-read-block`; each block is one "verse" of a plan handed to `startReading` under the answer id
  `PAGE_READING_ID`, so the speaking bar (Pause, Resume, Restart, Stop) and the package's sentence-keeping are the ones above, and Resume goes on from the same
  sentence. Greek and Hebrew stretches are runs of their own (`src/speech/pageRuns.ts`, the cut a long press and `answerRuns` make). The block being read has
  `data-reading` (the highlight in `src/index.css`) and is scrolled into view; leaving the page stops its reading, and only its own. A new page of prose is
  `usePageActions` plus `data-read-block` on its text.
- **Share** (aria-label `Share`) calls `navigator.share({ title, text, url })` with the page's name, its first block and its own link
  (`https://lampas.allmymind.org/#/about`, `#/studyway`, `#/preface`); with no `navigator.share` (or one that fails for a reason other than the sheet being
  closed) it copies the link and says 'Link copied', or shows the link in a field to copy by hand when the clipboard refuses.

## The tutor's responses (mw-5r3p30.93)

Settings > The tutor's responses has one choice, **Read the tutor's responses aloud** (registry key `readTutor`, On by default, so the tutor can change it
when asked). On, a response is spoken the moment it arrives, with no tap (`src/speech/tutorVoice.ts`, the one engine of `startAnswer`, English in the
English voice and Greek words in the Greek voice):

- the reading check's verdict (`ReadCheck.tsx`): the heading, the note, and each word to fix with its tip in full ("blessed: say it as one beat, blest");
  never the verse, the chunks or the words of "Read these again", which are for him to read;
- the answer to Ask the tutor in the Verse view (`Ask.tsx` AnswerCards, an answer stored while the cards are on screen), and the answers of the Talk sheet and of
  Ask the tutor from any screen (as the Talk sheet already read them, now through the setting). 'Sound it out' still sounds the syllables out: he asked for that.

A new question or message (`useAsks`, `useTalk`), leaving the panel or the cards, and a tap on the response (not on a button in it, `stopOnTap`) stop the speech
at once; a tapped word, a speaker or a hold to talk only pause it (above). Off, nothing is spoken by itself; the speaker on an answer ('Hear the answer') still reads it.

## Hebrew in the tutor's text (mw-5r3p30.97)

A Hebrew word in a response is for his eyes: `answerRuns` (and so `startAnswer`) leaves Hebrew letters out of what the English voice is given
(`withoutScripts`, `src/script/scripts.ts`); the transliteration beside it is read as English. A Hebrew voice (he-IL) and tap-to-speak are a later story.
