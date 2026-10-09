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
* A heading opens the same view for its passage in mw-5r3p30.73.
