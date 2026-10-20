# Links into Lampas

Lampas takes links in, as Logos does (logos4:, ref.ly). The https form always works; web+lampas: works only where the browser supports it.

## The https form

`https://lampas.allmymind.org/#/?ref=<reference>` opens the reader on a verse. `https://lampas.allmymind.org/#/?word=<word>` opens a word's sheet.
The verse panel (under a tapped verse) and the word sheet each have **Copy link**, and **Share** where the phone has `navigator.share`; they give
this form. A phone that refuses the clipboard shows the link in a box to copy by hand.

### `ref=` — a verse, a chapter or a book

Case does not matter; spaces, dots and colons are all accepted between the parts; a verse range ("Heb 7:1-3", "1John.1.1-4") opens the Verse view on those verses (mw-z370x5.2); a one-verse range is the verse.

| Written | Opens |
| --- | --- |
| `#/?ref=Rom.8.28` (OSIS) | Romans 8, verse 28 selected |
| `#/?ref=Rom 8:28`, `#/?ref=Romans%208:28`, `#/?ref=romans+8:28` | the same |
| `#/?ref=1John.1.9`, `#/?ref=1Jn.1.9`, `#/?ref=1 John 1:9` | 1 John 1, verse 9 selected |
| `#/?ref=Rom.8.28-30` | the Verse view on Romans 8:28-30 |
| `#/?ref=Rom 8`, `#/?ref=Rom.8` | Romans 8, no verse selected |
| `#/?ref=Jude` | Jude 1 |

The books are the 27 of `public/data/index.json`, named by their OSIS code (`Matt Mark Luke John Acts Rom 1Cor 2Cor Gal Eph Phil Col 1Thess 2Thess 1Tim 2Tim Titus Phlm Heb Jas 1Pet 2Pet 1John 2John 3John Jude Rev`), by their full English name
(`Romans`, `1 Corinthians`), or by a common short form (`Mt`, `Jn`, `1Jn`, `Phlm`, `Re` …; the list is `src/nav/links.ts`). `view=greek` and `weave=…` may ride along
(`#/?ref=Rom.8.28&view=greek`). `as=<words>` (`#/?ref=Gen.1.28&as=Gen.%201%3A28`) carries the words the reference was printed in, which Share to Lampas adds when a listed reference is tapped; a notice then names the reference so ("Gen. 1:28"), not by its code.

A reference Lampas does not hold never gives a blank screen. It opens the nearest place it does hold, with a one-line notice (Dismiss closes it) that says what was asked for:

| Asked for | Opens |
| --- | --- |
| a verse past the end of the chapter (`Rom.8.99`) | the chapter's last verse, selected |
| verse 0 | verse 1 |
| a chapter past the end of the book (`Romans 99:1`) | the book's last chapter, no verse |
| chapter 0 | the book's first chapter |
| a book not in the index (`Tobit 3:1`) | the chapter he last had open |
| a book of the Old Testament (`Gen.1.28`, `Genesis 1:1`) | the chapter he last had open, and the notice says `“Genesis 1:28” is not in Lampas yet`, with Open in Logos when Logos is on in Settings (else Link Logos in Settings), as the tutor's reference card does |

A notice names what was asked for in words (`“Romans 8:99”`, never the code `Rom.8.99`); on Share to Lampas a tap on an Old Testament reference opens that same card over the list (src/share/ShareReferences.tsx), not the Reader.

### `word=` — a word

| Written | Opens |
| --- | --- |
| `#/?word=G3551`, `#/?word=g3551`, `#/?word=3551` | the word sheet of νόμος (Strong's number) |
| `#/?word=νόμος` (percent-encoded in a real link), `#/?word=νομος` | the same, by lemma (accents optional) |

The sheet is the word as its lemma stands, with its meaning and Strong's number; it has no Parsing (no verse is around it). A word the text never uses opens the reader
with a notice, as a reference does.

### `setting=` — a setting (Settings)

`https://lampas.allmymind.org/#/settings?setting=<key>` opens Settings at one setting (mw-5r3p30.502). The key is a setting of the registry (`src/settings/registry.ts` SETTINGS: `textSize`, `theme`, `greekRate`, `resource.logos` …); `src/settings/link.ts` `settingLink(key)` writes the address and gives nothing for a key that is not one (so a mistyped or invented key opens plain Settings, nothing marked). Settings scrolls to that row and marks it (`data-highlighted`, an outline and a tint) until his next tap; the page of the row's group opens (Settings is a home and pages, mw-3ased2.1: `#/settings?group=reading` is one page, `#/settings` the home that lists them), the row is drawn though its dependency would hide it, and when it is a detail of a setting that is off (Bible in Logos while Logos is Off) a line says `“Bible in Logos” is shown once “Logos” is on. Turn “Logos” on first.` and the setting it needs is drawn beside it. Nothing is changed by opening it. `#/settings?section=resources` (a whole section, not marked) opens the page holding that section, scrolled to it, not where Settings was last scrolled: `openSettingsSection(id)` (`src/settings/link.ts`) forgets the offset kept for that address, and `scrollAddress` (`src/nav/scrollMemory.ts`) keeps a section address apart from the plain Settings one (mw-5r3p30.427).

Where Lampas makes one: a `{kind: 'setting', key}` link in a tutor answer (docs/ask-tutor.md) is a chip, `Open Text size in Settings`. The settings-search sheet that once made these (a magnifier in each header, mw-5r3p30.502) is gone (mw-5r3p30.617): Settings keeps its own search field, pinned at the top.

## web+lampas:

The manifest declares `protocol_handlers` for `web+lampas` (url `/#/?ref=%s`). Where the browser supports it (Chrome and Edge on Android and on the desktop, once Lampas is installed),
`web+lampas:Rom.8.28` opens the installed app on that verse. The browser puts the whole link in `ref=`; Lampas strips the scheme. Because the url is fixed, a word is written
`web+lampas:word:G3551` (or `web+lampas:word/G3551`).

**Where it does not work:** iOS Safari does not support custom protocol handlers (nor does Firefox for an installed app). There, use the https form, which always works.

## How it is wired

`src/nav/links.ts` is the pure part (parse, resolve against the index, find a word, write the https form). `src/nav/LinkOpener.tsx` shows while a link in the address is resolved, announces the
result on the bus (`link-opened`, docs/events.md) and replaces the address with the chapter's reader address (`#/?b=rom&c=8`), so the link itself is never kept in the trail, and a verse or range opens the Verse view on top of it as its own Back step (route.ts `openVerseAt`, `openVerseRange`): Back closes the view and shows the Reader, not the screen the link was tapped on (mw-s1dc0n.11); Back and a reload keep the place. The Reader meets the announcement once, as it opens (`src/nav/linkRequest.ts`).
