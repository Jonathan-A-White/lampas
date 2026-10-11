# Demo: Lampas after the Reader and Settings splits (mw-lwvndc.6)

The epic mw-lwvndc cut Lampas's busiest files into modules so two stories can change two of them at once: the Reader into
`src/reader/` (R1), the Settings controls into `src/settings/controls/`, one file per section (R3), and a setting declared once
(`src/settings/define.ts` and `store.ts`, R2a, piloted on Theme, Weave and Tips). Nothing was meant to change on screen. This is the
Governor's check on his phone that everything works and looks exactly as it did. When it does, he says "Looks good".

Run it on the updated version (reload when the app says "Update ready, tap to reload"). The hold-to-ask step needs a phone that can
listen; without one, **Type a question** does the same job.

## The Reader

1. Open Lampas. It opens the Reader on **Romans 8** (or where you left off). The title at the top is a button with a small arrow;
   beside it are **English** and **Greek**, then the play button and the gear. Right: verse numbers, section headings and the
   verses are laid out as before, the text is large and clear, and the chapter scrolls inside its own box with the header staying put.
2. Tap **Greek**, then **English**. Right: the text changes language each time and the chosen button is filled.
3. Tap the title. Right: the chapter picker opens with **Preface** above the books; choose a book and a chapter and that
   chapter opens from the top. Press the phone's Back and you return to the chapter you left.
4. Tap a Greek word (in the Greek view). Right: a sheet slides up with the word, **Hear it**, its parsing, **Grammar**, **Sound it
   out**, **Ask the tutor** and **Done**. Tap **Grammar**: a Grammar sheet opens over it. Tap **Done**: the sheet closes.
5. Tap a verse number (**Verse 3**). Right: the Verse view fills the screen with the verse big at the top, **‹ Reader** at the left,
   arrows to the neighbouring verses, and a row of actions: **Listen**, **Read it aloud**, **Ask the tutor**, **Quiz me**.
6. Choose **Ask the tutor**. Right: the foot of the screen shows the big **Hold to ask** bar with **Type a question** under it. Hold
   the bar and ask something short about the verse, such as "What does the first word mean?", and let go. Right: your question
   shows above **Waiting for the tutor…** and then the answer is drawn under the verse.
7. Choose **Quiz me**, then tap **Start the quiz**. Right: the Talk sheet opens, titled "Quiz on Romans 8:3" (or the verse you
   chose), and the tutor asks its first question. Press **Back** to close the sheet, then **‹ Reader** to leave the Verse view.
8. Open the Quick test: tap the gear, **Words** (under **More**), then **Test**. Right: **Quick test** shows a Greek word with
   four meanings to tap; after you tap one it says right or wrong, says the word aloud, and offers **Next** and **Ask the tutor**.
   Tap **‹ Reader** to go back to the chapter.

## Settings

1. In the Reader tap the gear, **Settings**. Right: the **Settings** screen opens with **‹ Reader** at the left, a field
   **Search settings** at the top, then the sections (**Appearance**, **Layout**, **Section headings**, **Weave**, and so on).
2. Tap **Search settings** and type `text`. Right: only the rows that match stay, and **Text size** is one of them; clear the
   field and the whole list returns. Type `zzz`: the screen says "Nothing in Settings matches “zzz”." Clear it again.
3. Under **Appearance**, in the **Theme** row, tap **Dark**. Right: the whole screen turns dark at once and **Dark** is filled.
   Tap **Light**: it turns light. Tap **Phone** to follow the phone's own setting.
4. In the **Text size** row, tap **Largest**. Right: the text on the Settings screen grows (the header keeps the phone's own
   size, and the buttons stay at least as big as a thumb). Tap **Normal** to put it back.
5. Tap **‹ Reader**. Right: the Reader follows what you set: the colours of the theme you left on, and the Greek and English
   text at the size you chose (try **Largest** and **Dark** once more and open the Reader to see it, then set them back).
6. Close Lampas and open it again. Right: the theme and the text size are still as you left them.

## Right

Everything in both lists behaves and looks as it did before the split: the chapter, the word sheet, holding to ask, the quiz, the
search, the theme and the text size all work, and nothing has moved. Then: "Looks good."

## If something is off

Say which step and what you saw (a screenshot helps). The splits were meant to change no behaviour, so anything different from the
**Right** lines above is a bug in the split, not a new feature.
