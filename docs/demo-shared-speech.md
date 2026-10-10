# Demo: one read-aloud bar in Postern, Lampas and SpellForge (mw-m7v5kc.5)

The epic mw-m7v5kc moved read-aloud into bsv-kit's speech package (`bsv-kit/speech`) and its bar, `<SpeakingBar />`
(`bsv-kit/speech/react`). This is the Governor's check on his phone: in each app start something reading aloud, Pause it,
go to another screen and back, Resume (it carries on from the same sentence), Restart, then Stop. The bar looks and
behaves the same in all three: big buttons in a row, **Pause** (which turns into **Resume**), **Restart**, **Stop**, each at
least 44 px tall, in the app's own colours. When all three do, he says "Looks good".

Needs a phone with a voice for English (and, in Lampas, Greek). Run each app's steps on the updated version (reload when the
app says "Update ready, tap to reload").

## Postern

1. Open **Channels**, then **Talk to the Mayor**, hold the button and ask something, so the Mayor's answer is spoken
   (or tap the speaker, "Read the answer aloud", under an answer).
2. While it speaks, tap **Pause**. The voice stops, the button turns to **Resume**, and the line says "The answer is paused."
3. Tap **Channels** in the bottom bar. A bar appears above it with **Resume**, **Restart** and **Stop**.
4. Tap **Resume**: the answer carries on from the sentence it stopped at, not from the top.
5. Tap **Restart**: it starts again from the first sentence. Tap **Stop**: it goes quiet and the bar goes away.

## Lampas

1. Open Romans 8 and tap the play button at the top, **Read from the top**. A bar appears above the big Talk button with
   **Pause**, **Restart** and **Stop**.
2. Tap **Pause**: the voice stops and the first button says **Resume**.
3. Tap the gear, **Settings**: the bar is now at the foot of Settings and says **Resume**. Tap **‹ Reader**: it still says
   **Resume**.
4. Tap **Resume**: the reading goes on from the sentence it stopped at.
5. Tap **Restart**: the reading starts again from the beginning. Tap **Stop**: it goes quiet and the bar goes away.
6. Listen on a verse: tap the verse number (**Verse 3**) to open the Verse view, with **Listen** chosen tap **Play verse 3**.
   The same bar shows with **Pause**, **Restart** and **Stop**; let the verse finish and the bar goes away.

## SpellForge

1. Turn on the Tutor (sf-tutor) and open **Tutor** with a session that shows a word to re-read.
2. Tap **Say it again**. While the tutor talks, a bar shows above **Read the word** with **Pause**, **Restart** and
   **Stop**.
3. Tap **Pause**: the voice stops and the button turns to **Resume**. Leave to another screen and come back to Tutor
   (the tutor's speech pauses when you leave): the bar offers **Resume**.
4. Tap **Resume**: it speaks on from the same sentence, not from the start.
5. Tap **Restart**: it speaks again from the first sentence. Tap **Stop**: it goes quiet and the bar disappears.
6. Tap **Say it again** while it is still talking: the new sentence replaces the old one, nothing waits behind it.

## Right

In all three apps the bar has the same buttons in the same order, the same size, and the same behaviour: Pause keeps the
sentence, Resume goes on from it, Restart goes back to the first sentence, Stop clears it and the bar. Only the colours
differ (each app's own). Then: "Looks good."

## Known differences (his word decides which become stories)

- Lampas: a long press on a word says it at once and shows no bar; the Talk bar stops a chapter reading outright (no Resume),
  where leaving for Settings pauses it.
- Lampas: a double tap on a verse's small play button starts and stops it at once.
- Lampas on its side (844x390): the reading box is short and the Talk bar's bottom edge is cut off.
