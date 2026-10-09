# Links into Lampas

Lampas takes links in, as Logos does (logos4:, ref.ly). The https form always works; web+lampas: works only where the browser supports it.

## The https form

`https://lampas.allmymind.org/#/?ref=<reference>` opens the reader on a verse. `https://lampas.allmymind.org/#/?word=<word>` opens a word's sheet.
The verse panel (under a tapped verse) and the word sheet each have **Copy link**, and **Share** where the phone has `navigator.share`; they give
this form. A phone that refuses the clipboard shows the link in a box to copy by hand.

### `ref=` — a verse, a chapter or a book

Case does not matter; spaces, dots and colons are all accepted between the parts; a verse range keeps its first verse.

| Written | Opens |
| --- | --- |
| `#/?ref=Rom.8.28` (OSIS) | Romans 8, verse 28 selected |
| `#/?ref=Rom 8:28`, `#/?ref=Romans%208:28`, `#/?ref=romans+8:28` | the same |
| `#/?ref=1John.1.9`, `#/?ref=1Jn.1.9`, `#/?ref=1 John 1:9` | 1 John 1, verse 9 selected |
| `#/?ref=Rom.8.28-30` | Romans 8, verse 28 selected |
| `#/?ref=Rom 8`, `#/?ref=Rom.8` | Romans 8, no verse selected |
| `#/?ref=Jude` | Jude 1 |

The books are the 27 of `public/data/index.json`, named by their OSIS code (`Matt Mark Luke John Acts Rom 1Cor 2Cor Gal Eph Phil Col 1Thess 2Thess 1Tim 2Tim Titus Phlm Heb Jas 1Pet 2Pet 1John 2John 3John Jude Rev`), by their full English name
(`Romans`, `1 Corinthians`), or by a common short form (`Mt`, `Jn`, `1Jn`, `Phlm`, `Re` …; the list is `src/nav/links.ts`). `view=greek` and `weave=…` may ride along
(`#/?ref=Rom.8.28&view=greek`).

A reference Lampas does not hold never gives a blank screen. It opens the nearest place it does hold, with a one-line notice (Dismiss closes it) that says what was asked for:

| Asked for | Opens |
| --- | --- |
| a verse past the end of the chapter (`Rom.8.99`) | the chapter's last verse, selected |
| verse 0 | verse 1 |
| a chapter past the end of the book (`Romans 99:1`) | the book's last chapter, no verse |
| chapter 0 | the book's first chapter |
| a book not in the index (`Tobit 3:1`, `Genesis 1:1`) | the chapter he last had open |

### `word=` — a word

| Written | Opens |
| --- | --- |
| `#/?word=G3551`, `#/?word=g3551`, `#/?word=3551` | the word sheet of νόμος (Strong's number) |
| `#/?word=νόμος` (percent-encoded in a real link), `#/?word=νομος` | the same, by lemma (accents optional) |

The sheet is the word as its lemma stands, with its meaning and Strong's number; it has no Parsing (no verse is around it). A word the text never uses opens the reader
with a notice, as a reference does.

## web+lampas:

The manifest declares `protocol_handlers` for `web+lampas` (url `/#/?ref=%s`). Where the browser supports it (Chrome and Edge on Android and on the desktop, once Lampas is installed),
`web+lampas:Rom.8.28` opens the installed app on that verse. The browser puts the whole link in `ref=`; Lampas strips the scheme. Because the url is fixed, a word is written
`web+lampas:word:G3551` (or `web+lampas:word/G3551`).

**Where it does not work:** iOS Safari does not support custom protocol handlers (nor does Firefox for an installed app). There, use the https form, which always works.

## How it is wired

`src/nav/links.ts` is the pure part (parse, resolve against the index, find a word, write the https form). `src/nav/LinkOpener.tsx` shows while a link in the address is resolved, announces the
result on the bus (`link-opened`, docs/events.md) and replaces the address with the plain reader address (`#/?b=rom&c=8&v=28`), so the link itself is never kept in the trail and
Back and a reload keep the place. The Reader meets the announcement once, as it opens (`src/nav/linkRequest.ts`).
