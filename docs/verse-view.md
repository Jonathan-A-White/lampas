# The Verse view (mw-5r3p30.79)

The Governor, Postern general: "I just don't like the uix of how these two elements come together. It should maybe be its own view for the
verse?" His answer: a Verse view. Tapping a verse number opens the verse on a full screen; Back returns to the Reader.

```
‹ Reader     Romans 8:11            ‹   ›      header: close, the reference, the verse before and after
And if the Spirit of Him who ...              the verse, big, woven as the Reader weaves it (words tappable)
[Listen] [Read it aloud] [Ask the tutor] [Copy link]     one row; the chosen one is filled
  what the action shows                       Listen: a line; Read it aloud: the reading check; Ask the tutor: answers, the Ask box
[ Hold to listen to verse 11 ]                ONE hold bar, Postern's, at the foot: what a hold does is the chosen action
```

| Action | What it shows | The bar | A hold does |
| --- | --- | --- | --- |
| Listen | one line of help | `Hold to listen to verse 11` | the app reads the verse aloud, on as far as Settings > Read aloud says (`readSpan`); letting go stops it |
| Read it aloud | the reading check (`ReadCheckPanel`, region 'Reading check'): status, the result with its words to fix, the walk | `Hold to read verse 11`, then `Hold to read the whole verse again` at the end of the walk, `Release to send` while held | records him, sends the verse-read grist on release |
| Ask the tutor | the kept answers (Markdown), the typed Ask box, `Talk about verse 11` (the Bible talk sheet) | `Hold to ask` | hold-to-talk: what he says goes to the tutor about this verse exactly as a typed question |
| Copy link | `Link copied` (Share beside it where the phone has it; the link by hand when the clipboard is refused) | none: a button in the row | |

* **PROVISIONAL, the Governor to confirm:** what each action's hold does (above), Listen as the first action and the one a new phone starts on, the
  bar names, and that Share sits beside Copy link. 'Quiz me' is hidden until mw-5r3p30.74 wires it.
* The chosen action is kept (`localStorage` `lampas.verseAction`), so the next verse opens on it. An arrow goes to the next verse of the chapter, and past
  a chapter's last verse to the first of the next (Romans 8:39, 9:1); there is none before Matthew 1:1 or after Revelation 22:21.
* Back: `nav/route.ts` `openVerse` pushes a history entry (state `{verseView: true}`), so the phone's Back closes the view and the Reader is where it was
  (its scroll box stays mounted underneath, `inert`). The arrows replace that entry. A link or a reopen at a verse opens the view with no step to go back
  to: the close button then only takes `v` out of the address.
* The Reader's Talk bar is not drawn while the view is open (two stacked yellow bars were what he disliked); the Bible talk about the verse is
  `Talk about verse N` under Ask the tutor, and a long press on a verse number still talks about it.
* The view is under the sheets (z-5): the word sheet, the Grammar sheet and the Talk sheet open over it.

## A passage (mw-5r3p30.73)

The Governor, Postern general: "I should be able to click on a heading and interact with it like a verse (tutor, audio, read to the tutor...)."
A tap on a section heading in the Reader (the whole heading is one button, 44 px tall, and looks as it did) opens this same view for the passage
under it: from the heading's verse to the verse before the next heading, or the chapter's end (`src/data/passage.ts`; the same span as *Passage* in
Settings > Read aloud). One view engine: the view is handed the passage as one `Verse` (`n` its first verse, `to` its last, `h` the heading, every
verse's words in order), so every action works on it as it works on a verse.

| | A verse | A passage |
| --- | --- | --- |
| Title | `Romans 8:11` | the heading, with the range under it: `Walking by the Spirit` / `Romans 8:1-11` (accessible name `Walking by the Spirit, Romans 8:1-11`) |
| Address | `#/?c=8&v=11` | `#/?c=8&p=1`, `p` the passage's first verse (`nav/route.ts` openPassage / movePassage); `v` wins when both are there |
| Text | the verse big | the verses one after another with a small number before each, in a box of its own (at most 40% of the screen, scrolls) so the row of actions stays in reach; the verse being read is highlighted and followed |
| Arrows | the verse before / after, across chapters | `Previous passage` / `Next passage` in the chapter; off at its first and last passage |
| Listen | `Hold to listen to verse 11` | `Hold to listen to verses 1-11`: reads the passage's verses only, to the passage's end, whatever the Read aloud span says; letting go stops it |
| Read it aloud | `Hold to read verse 11` | `Hold to read verses 1-11`: the reading check on the whole passage (`reference` 'Romans 8:1-11', `target_text` every verse's text; the result is kept under `rom.8.1-11`, `rom.8.1-11:el`) |
| Ask the tutor | `Hold to ask`, the Ask box | the same; the grist's `reference` is 'Romans 8:1-11' and its `greek` / `english` the whole passage; the answers are kept under `rom.8.1-11` |
| Copy link | `…/#/?ref=Rom.8.11` | `…/#/?ref=Rom.8.1-11` (a verse range; Lampas opens it at the first verse: a link cannot yet open a passage) |
| Talk about verse N | opens the Bible talk sheet | not offered: the Talk sheet is about a verse or a chapter |

* **Carried over from V:** Listen, Read it aloud, Ask the tutor, Copy link, the one hold bar, the kept chosen action, Back as a step of its own, the
  weave and tappable words in the text. **Not carried over:** *Talk about verse N* (no passage scope in the Talk sheet) and the arrows across a
  chapter's end (a chapter's last passage has no next; the next chapter's first heading is not loaded by the view).
* **PROVISIONAL, the Governor to confirm:** the title (heading over range), the 40% box, and that Listen on a passage always stops at its end.
* **Limits worth knowing:** the reading check records at most 60 seconds, so a long passage read aloud is scored as incomplete; a grist record is capped at
  10 KiB, so a very long passage asked about may be refused with 'Could not send the question'.
