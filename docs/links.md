# Links into Lampas

Lampas takes links in, as Logos does (logos4:, ref.ly). The https form always works; web+lampas: works only where the browser supports it.

<!-- toc -->

- [The https form](#the-https-form)
  - [`ref=` — a verse, a chapter or a book](#ref--a-verse-a-chapter-or-a-book)
  - [`word=` — a word](#word--a-word)
  - [`setting=` — a setting (Settings)](#setting--a-setting-settings)
- [The blog's tagger](#the-blogs-tagger)
- [Share to Lampas: what the share sheet accepts](#share-to-lampas-what-the-share-sheet-accepts)
- [web+lampas:](#weblampas)
- [How it is wired](#how-it-is-wired)
  - [Every way in to a ref= link](#every-way-in-to-a-ref-link)

<!-- /toc -->

## The https form

`https://lampas.allmymind.org/#/?ref=<reference>` opens the reader on a verse: the chapter, with the verse at the top. `https://lampas.allmymind.org/#/?word=<word>` opens a word's sheet.
The word sheet has **Copy link**, and **Share** where the phone has `navigator.share`; they give this form. The Verse view has **Copy** and **Share**: the verse, passage
or chapter in the format of Settings > Reading > When you copy (docs/layout/reader.md), the link on its last line while Link is On. A phone that refuses the clipboard shows the
link (the word sheet) or the text (the Verse view) in a box to copy by hand.

### `ref=` — a verse, a chapter or a book

Case does not matter; spaces, dots and colons are all accepted between the parts; a verse range ("Heb 7:1-3", "1John.1.1-4") opens the chapter at its first verse (it names where to start, nothing is selected or highlighted; mw-z370x5.2, changed by mw-5r3p30.1025); a one-verse range is the verse.

| Written | Opens |
| --- | --- |
| `#/?ref=Rom.8.28` (OSIS) | the Reader on Romans 8, verse 28 at the top, nothing selected |
| `#/?ref=Rom 8:28`, `#/?ref=Romans%208:28`, `#/?ref=romans+8:28` | the same |
| `#/?ref=1John.1.9`, `#/?ref=1Jn.1.9`, `#/?ref=1 John 1:9` | 1 John 1, verse 9 at the top |
| `#/?ref=Rom.8.28-30` | Romans 8, verse 28 at the top (a range only names where to start) |
| `#/?ref=Rom 8`, `#/?ref=Rom.8` | Romans 8, no verse selected |
| `#/?ref=Jude` | Jude 1 |

The books are the 27 of `public/data/index.json`, named by their OSIS code (`Matt Mark Luke John Acts Rom 1Cor 2Cor Gal Eph Phil Col 1Thess 2Thess 1Tim 2Tim Titus Phlm Heb Jas 1Pet 2Pet 1John 2John 3John Jude Rev`), by their full English name
(`Romans`, `1 Corinthians`), or by a common short form (`Mt`, `Jn`, `1Jn`, `Phlm`, `Re` …; the list is `src/nav/links.ts`). `view=greek` and `weave=…` may ride along
(`#/?ref=Rom.8.28&view=greek`). `as=<words>` (`#/?ref=Gen.1.28&as=Gen.%201%3A28`) carries the words the reference was printed in, which Share to Lampas adds when a listed reference is tapped; a notice then names the reference so ("Gen. 1:28"), not by its code.

**What a verse link opens (mw-5r3p30.1025, his words of 2026-11-03: "it should bring you to the non-immersive reader with the first verse at the top (if possible)"; the non-immersive part was withdrawn by mw-5r3p30.1028).** The normal Reader on the chapter, in the view and weave he has (a `view=` or `weave=` in the link wins): no Verse view, no sheet, nothing selected or highlighted. The Immersive reader is left as it is (mw-5r3p30.1028, his words of 2026-11-03: "clicking a link shouldn't affect your immersive reader settings"): On stays On, Off stays Off, and a link changes no setting. The verse stands at the top of the reading box, and when a section heading sits directly above it (it is the first verse of its heading's block) the heading is the first thing below the bars and the verse follows it (`#/?ref=John.5.16-30`: "The Father and the Son", then 16). Where the chapter's end is too near to scroll that far (`#/?ref=John.5.47`) the box is scrolled to its end with the verse in view. With Turn pages the page holding the verse opens (the page is cut by the columns, so the verse stands wherever they put it: 8 px below the top at 390x844, normal text, John 5:25). An Old Testament link does the same (`#/?ref=Jon.1.10`, `#/?ref=Jon.1.4-9`), in the Reader's English unless the view says otherwise. A chapter alone (`ref=Rom 8`) and a book open the chapter at its top as before. The address is replaced by the chapter's plain reader address (`#/?b=jhn&c=5`): the link is not kept, and the verse is not in it.

A reference Lampas does not hold never gives a blank screen. It opens the nearest place it does hold, with a one-line notice (Dismiss closes it) that says what was asked for:

| Asked for | Opens |
| --- | --- |
| a verse past the end of the chapter (`Rom.8.99`) | the chapter's last verse at the top |
| verse 0 | verse 1 at the top |
| a chapter past the end of the book (`Romans 99:1`) | the book's last chapter, no verse |
| chapter 0 | the book's first chapter |
| a book not in the index (`Tobit 3:1`, a book of the Apocrypha: it is read, but Lampas holds no text of it) | the chapter he last had open, with the notice `“Tobit 3:1” is not in Lampas; showing Romans 8.`; the tutor's answer links it to his Apocrypha Bible in Logos (docs/resources.md) |
| a book of the Old Testament (`Jon.1.10`, `Jonah.1.10`, `2Kgs.14.25`, `Genesis 1:1`) | the chapter in the Reader, in English, with the verse at the top and no Verse view (mw-uqlxea.3, mw-5r3p30.1025); a chapter or verse past the end opens the nearest, with the notice `“Genesis 1:99” is not in Lampas; showing Genesis 1:31.` Copy link and Share write the OSIS code of the book (`#/?ref=Jonah.1.10`) |

A notice names what was asked for in words (`“Romans 8:99”`, never the code `Rom.8.99`); on Share to Lampas a tap on a reference, of either testament, opens a card over the list with the verse in English (src/share/ShareReferences.tsx), not the Reader; the card of an Old Testament reference the tutor names is the same card, with Open (the Reader) and, with Logos on, Open in Logos: it says `Not in Lampas yet` only for a book Lampas holds no data for (`books.ts` `isHeld`).

### `word=` — a word

| Written | Opens |
| --- | --- |
| `#/?word=G3551`, `#/?word=g3551`, `#/?word=3551` | the word sheet of νόμος (Strong's number) |
| `#/?word=νόμος` (percent-encoded in a real link), `#/?word=νομος` | the same, by lemma (accents optional) |
| `#/?word=H7225`, `#/?word=h7225` | the Hebrew word sheet of רֵאשִׁית (a Hebrew Strong's number, mw-5vvlay.2; a bare number is Greek) |
| `#/?word=רֵאשִׁית`, `#/?word=ראשית` (percent-encoded in a real link) | the same, by lemma (pointed or with the vowel points off) |

The sheet is the word as its lemma stands, with its meaning and Strong's number; it has no Parsing (no verse is around it). A word the text never uses opens the reader
with a notice, as a reference does.

### `setting=` — a setting (Settings)

`https://lampas.allmymind.org/#/settings?setting=<key>` opens Settings at one setting (mw-5r3p30.502). The key is a setting of the registry (`src/settings/registry.ts` SETTINGS: `textSize`, `theme`, `greekRate`, `resource.logos` …); `src/settings/link.ts` `settingLink(key)` writes the address and gives nothing for a key that is not one (so a mistyped or invented key opens plain Settings, nothing marked). Settings scrolls to that row and marks it (`data-highlighted`, an outline and a tint) until his next tap; the page of the row's group opens (Settings is a home and pages, mw-3ased2.1: `#/settings?group=reading` is one page, `#/settings` the home that lists them), the row is drawn though its dependency would hide it, and when it is a detail of a setting that is off (Bible in Logos while Logos is Off) a line says `“Bible in Logos” is shown once “Logos” is on. Turn “Logos” on first.` and the setting it needs is drawn beside it. Nothing is changed by opening it. `#/settings?section=resources` (a whole section, not marked) opens the page holding that section, scrolled to it, not where Settings was last scrolled: `openSettingsSection(id)` (`src/settings/link.ts`) forgets the offset kept for that address, and `scrollAddress` (`src/nav/scrollMemory.ts`) keeps a section address apart from the plain Settings one (mw-5r3p30.427).

Where Lampas makes one: a `{kind: 'setting', key}` link in a tutor answer (docs/ask-tutor.md) is a chip, `Open Text size in Settings`. The settings-search sheet that once made these (a magnifier in each header, mw-5r3p30.502) is gone (mw-5r3p30.617): Settings keeps its own search field, pinned at the top.

## The blog's tagger

`https://lampas.allmymind.org/reftagger.js` (mw-5r3p30.1043, the Governor's word of 2026-11-04: "make all links use lampus") is a script the blog loads with one `<script>` tag; it replaces Logos RefTagger, whose tap opened a NET popover. It turns each bare reference in the text of a post (Ghost's `.gh-content`) into a link to that passage in Lampas: `John 5:25` is `https://lampas.allmymind.org/#/?ref=John.5.25`, `John 5:24-29` is `ref=John.5.24-29`, `1 Kings 17:17-24` is `ref=1Kgs.17.17-24`, `John 11` is `ref=John.11`; `Romans 8:1; 10:9-10` and `John 5:24, 28` link each part. A range that crosses a chapter (`John 3:16-4:3`) links its first verse only (`ref=John.3.16`); a range that does not end after its first verse (`John 5:25-24`) is its first verse, and verse 0 (`John 5:0`) is no reference (mw-5r3p30.1046). A link is `target="_blank"`, `rel="noopener"`; what a tap does is 'The blog's popup' below (mw-5r3p30.1048). Text in a link, `code`, `pre`, a heading, a script or a style, and everything outside `.gh-content` (title, menus, footer, comments), is left as it is; an existing link is never changed, and the text a reader sees is the same.

It reads a reference as the Reader does: `findReferences`'s reading (src/nav/refsInText.ts `referenceSpans`, over the book names of src/nav/links.ts), so 'Nov 2026', 'May 5', 'Johnson 5:3' and 'Acts' alone are no reference. A chapter alone that a count follows (`Mark 5 times`, `Job 3 months`, `Acts 2 of them`, `Am 5 minutes late`) is plain English, no link; `Matthew 5-7` is one link, over the whole range, to `ref=Matt.5` (mw-5r3p30.1047; the same reading lists them on Share). `vite.config.ts` builds it as a second, plain build (src/reftagger/reftagger.ts, no framework, no hash in its name, about 18 KB gzip; the spec holds it under 40 KB), and it is not in the worker's precache. It sets no cookie, and its one network call is the popup's (below). tests/e2e/reftagger.spec.ts holds it against tests/fixtures/reftagger.html. The swap in the blog's header (Ghost code injection) is the Mayor's step.

**The blog's popup (mw-5r3p30.1048, src/reftagger/popup.ts and passage.ts).** A tap on a tagged reference (a touch, a pen, or Enter) opens a small card beside it and the page stays: the reference ('John 5:24-29'), its verses in the Majority Standard Bible (numbered when there are several; a chapter alone shows its first verse) and an 'Open in Lampas' link, the same address the text had, in a new tab. With a mouse (PROVISIONAL, the Governor to confirm) hovering opens it, leaving it closes it (the pointer may cross into the card), and a click on the link still goes straight to Lampas. A tap elsewhere or Esc closes it; one card at a time; it is kept inside the screen at both edges (under the link, or over it near the foot), and its colours follow the page's own background, dark or light. The card is in a shadow root, so the blog's styles and the card's never meet. The text is the app's chapter file, `https://lampas.allmymind.org/data/<book>/<chapter>.json`, fetched once per chapter by the blog's page from the origin the script was loaded from (a plain cross-origin GET, no credentials, 8 s): **the host must send `Access-Control-Allow-Origin` for `/data/`** (nginx on the VPS, not in this repo), or the browser refuses the fetch; then the card is still the reference and the button, never an empty box, and nothing else on the page changes. tests/e2e/reftagger.spec.ts proves both ways on two real local servers (a route's answer is not held to CORS by Playwright). The app's own tutor links (src/markdown/verseLinks.ts) are not built here and have their own card (ReferenceCard.tsx).

## Share to Lampas: what the share sheet accepts

Lampas is in the phone's share sheet (`pwa-manifest.ts` `share_target`, POST `/share-target`; docs/ask-tutor.md 'Share to Lampas'). Its `files` accept `image/*` (a picture opens the talk chooser, `#/share?s=<id>`),
`text/csv` and `.csv` (his Logos list, mw-rfjjzd.7: it opens the library import at `#/library?import=<id>`, `<id>` naming the parked share; **UNVERIFIED on a device** until he shares one, docs/resources.md). Words and a
link (`title`, `text`, `url`) open the talk chooser too.

## web+lampas:

The manifest declares `protocol_handlers` for `web+lampas` (url `/#/?ref=%s`). Where the browser supports it (Chrome and Edge on Android and on the desktop, once Lampas is installed),
`web+lampas:Rom.8.28` opens the installed app on that verse. The browser puts the whole link in `ref=`; Lampas strips the scheme. Because the url is fixed, a word is written
`web+lampas:word:G3551` (or `web+lampas:word/G3551`).

**Where it does not work:** iOS Safari does not support custom protocol handlers (nor does Firefox for an installed app). There, use the https form, which always works.

## How it is wired

`src/nav/links.ts` is the pure part (parse, resolve against the index, find a word, write the https form). `src/nav/LinkOpener.tsx` shows while a link in the address is resolved, announces the
result on the bus (`link-opened`, docs/events.md) and replaces the address with the chapter's reader address (`#/?b=rom&c=8`), so the link itself is never kept in the trail. For a verse or range it sends the Reader the request of Choose a book's Go to (`bringVerse`, `src/nav/readerRequest.ts`, with `heading`; the Immersive setting is not touched), which the Reader meets as the chapter is on screen (`src/reader/useBringVerse.ts`); nothing opens over the Reader. `src/nav/readerAddress.ts` does not write while the address is a link, so a link opened under a running Reader is not overwritten by the Reader going away. The Reader meets the announcement once, as it opens (`src/nav/linkRequest.ts`).

### Every way in to a ref= link

| Way in | Opens now | Changed |
| --- | --- | --- |
| the https form typed or tapped (a message, a page), `web+lampas:` (manifest `protocol_handlers`) | the Reader, verse at the top | yes |
| Copy link / Share in the Verse view | write the same https form | no (what they write opens as above) |
| a tutor answer's verse link, a lesson's, Share to Lampas's reference | the card over the screen (`ReferenceLink` stops the link), whose Open is `openAtVerse` (the Reader, verse at the top) | no; a long press or a new tab has the https form, which opens as above |
| Choose a book's Go to, the Paradigms' own-verse button | `openAtVerse` | no |
| Today's and the plan's Read in Lampas | `openReader` on the chapter (no ref= address) | no |
| the Verse view's doors (a verse number, a heading, the place line, Review, Goal, Try it, the hard sounds lesson, the Reading ladder) | `openVerse`, `openPassage`, `openVerseRange`, `openVerseAt`: the Verse view | no |
