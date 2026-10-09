# Read aloud span (mw-5r3p30.72)

Settings > Read aloud has one choice, the **Read aloud span** (registry key `readSpan`, `src/speech/readSpan.ts`; default
**Chapter**, PROVISIONAL until the Governor confirms). It says how far the header's *Read from the top* / *Read from here*
goes before the voice stops. It starts at the verse he starts from (the selected verse, else verse 1).

| Span | The voice stops |
| --- | --- |
| Verse | after the verse it started from |
| Passage | before the next section heading: the Bible's own heading shown above a block of verses (`data-heading`, the `h` of a verse in the chapter JSON). The heading is read from the data whether or not Settings > Section headings shows it. |
| Chapter | at the chapter's end |
| Book | at the end of the book (Revelation 22 for Revelation); it does not go on into the next book |

The play button on a single verse (*Hear the verse*) always reads that verse only, whatever the span.

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
