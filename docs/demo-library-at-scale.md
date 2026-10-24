# Demo: the library at scale (mw-rfjjzd.21)

The epic mw-rfjjzd made Lampas hold a whole Logos library: a catalogue of the books it can open, **Your Logos library** (one screen of seven
kinds, each book Off, On or Pinned), **Import** of the list Logos saves, a word's sheet that folds a long shelf behind **All N lexicons ›**,
**In another book…** on a verse, **Ask for a book**, and **Your requests** that follows each ask. This is the Governor's check on his phone,
with his own list. When it all behaves as written, he says "Looks good".

Needs a phone with Lampas on the updated version (reload when the app says "Update ready, tap to reload"), a connection to the tutor for the
last step, and the Logos list from the Laptop. The numbers below are his: they follow his list and the books Lampas lists, so they are
written as N. The walk is also run by a test, `tests/e2e/library-demo.spec.ts`, against the head of a list (`tests/fixtures/logos-export-head.csv`),
which writes the shots `library-demo-1-import` to `library-demo-7-requests` in `shots/`.

## HOW TO CHECK IT, for the Governor

1. On the Laptop, in Logos: **Library** > **Save as Spreadsheet**; send the .csv to your phone (email it to yourself).
2. In Lampas: Settings > **Study resources** > **Logos** On > **Your Logos library** > **Import**; **Choose your Logos list**. Right looks like:
   "N **books read from your Logos list**.", then "N **open from Lampas**" (with the kinds under it) and "N **Lampas cannot use yet**" with
   **What they are ›** (a page of plain reasons), and at the foot **Turn on N books**.
3. Tap **Turn on N books**. Right looks like: the library home, a card saying how many books are on and when you imported, and the kinds with
   their counts: **Lexicons** N on · 2 pinned, **Grammars**, **Greek texts**, **Interlinears**, **Commentaries**, **Bibles** (the one chosen),
   **Devotionals**.
4. Open Romans 8, tap a word (**condemnation**): under **Study** in Logos the tiles are BDAG, Louw-Nida, **Bible Word Study** and
   **All N lexicons ›**; the door opens a list with **Search lexicons**; a tap on a lexicon opens Logos at the word.
5. On a verse (tap its number, **Verse 31**): **In another book…** lists **Commentaries on Romans** (N) and **Greek texts** (N) (and
   **Interlinears** once the catalogue lists some); a commentary opens Logos at Romans 8:31.
6. Back in the library: **Ask for a book**, **Search your other books** (for example "Guzik"), pick one, **Send**. Right looks like:
   "**Sent: the factory has it**", and the book under Settings > **Account** > **Your requests** as Sent, then **Filed** when the Mayor files it.

Then: "Looks good."

## Known differences (his word decides which become stories)

- The catalogue lists no interlinear yet, so **Interlinears** reads "none on" and the verse's chooser has no such group until an update lists one.
- Nothing about the list leaves the phone unless he taps **Ask the makers about these** (on the result page) or **Send** on a book.
