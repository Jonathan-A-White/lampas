# Read aloud span (mw-5r3p30.72)

Settings > Read aloud has one choice, the **Read aloud span** (registry key `readSpan`, `src/speech/readSpan.ts`; default
**Chapter**, PROVISIONAL until the Governor confirms). It says how far the header's *Read from the top* / *Read from here*
goes before the voice stops. It starts at the verse he starts from (the header's Play: verse 1; the Verse view's Listen: its verse, held, and it stops at that verse's end even if still held, mw-5r3p30.79, .92).

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

`ReaderBody` (keyed by chapter) does not stop a reading that is crossing when it unmounts; `ReaderAt` (the screen) does, so
leaving the Reader still stops it. A chapter that cannot be fetched ends the reading before the Reader turns. Stop ends a
reading in every span, crossing included.

The verse being read keeps doing what it did: `verse-reading` on the bus per verse, the highlight, the scroll that keeps it in
view, and the wake lock.

## The tutor's responses (mw-5r3p30.93)

Settings > The tutor's responses has one choice, **Read the tutor's responses aloud** (registry key `readTutor`, On by default, so the tutor can change it
when asked). On, a response is spoken the moment it arrives, with no tap (`src/speech/tutorVoice.ts`, the one engine of `startAnswer`, English in the
English voice and Greek words in the Greek voice):

- the reading check's verdict (`ReadCheck.tsx`): the heading, the note, and each word to fix with its tip in full ("blessed: say it as one beat, blest");
  never the verse, the chunks or the words of "Read these again", which are for him to read;
- the answer to Ask the tutor in the Verse view (`Ask.tsx` AnswerCards, an answer stored while the cards are on screen), and the answers of the Talk sheet and of
  Ask the tutor from any screen (as the Talk sheet already read them, now through the setting). 'Sound it out' still sounds the syllables out: he asked for that.

A new question or message (`useAsks`, `useTalk`), leaving the panel or the cards, and a tap on the response (not on a button in it, `stopOnTap`) stop the speech
at once. Off, nothing is spoken by itself; the speaker on an answer ('Hear the answer') still reads it.

## Hebrew in the tutor's text (mw-5r3p30.97)

A Hebrew word in a response is for his eyes: `answerRuns` (and so `startAnswer`) leaves Hebrew letters out of what the English voice is given
(`withoutScripts`, `src/script/scripts.ts`); the transliteration beside it is read as English. A Hebrew voice (he-IL) and tap-to-speak are a later story.
