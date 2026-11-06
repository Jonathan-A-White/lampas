# Sermons

Lampas lists sermons against the passage each was preached on, and links out to them: nothing of a sermon's words is held. This file is for the free, offline **index** (the epic mw-qtu3zvz,
story B1, mw-qtu3zvz.1): where its facts come from, how they are built, what the files hold and how a phone keeps them. The screen that shows them, the Sermons door beside Maps on the Verse view and its sheet, is story B2 (mw-qtu3zvz.2): see 'The door' and 'The sheet'. A switch per source in Settings is the next story.
Why the index is shaped this way (a static file per book, no server of our own) is in `docs/sources/sermon-index.md` section 5; what a Logos sermon book would need is in section 2 of the same file.
Reading needs no licence.

<!-- toc -->

- [The index](#the-index)
- [The build](#the-build)
- [The files](#the-files)
- [On the phone](#on-the-phone)
- [The module](#the-module)
- [Which sermons are for this verse](#which-sermons-are-for-this-verse)
- [The door](#the-door)
- [The sheet](#the-sheet)
- [Where the door stands: every Verse view state](#where-the-door-stands-every-verse-view-state)
- [The sources](#the-sources)
- [Tests](#tests)

<!-- /toc -->

## The index

The index is a set of **sources**: a source is a list of sermons by one preacher or site (Spurgeon at CCEL, Matthew Henry's sermons). A source is a directory of the
[sermon-index](https://github.com/Jonathan-A-White/sermon-index) repository, `sources/<id>/`, with `source.toml` (its name, kind, licence quoted from the site's own terms, credit, home page) and `rows.jsonl`
(one sermon a line: id, title, `ref` as an OSIS reference, `url`, `alt_url`, `preacher`, `date`, `cited`). That repository's `docs/sources.md` is the format; it is a contract with Lampas. A row is a **fact**: a title,
a reference and an address. The words of a sermon are never copied.

Only what a reader can use without a connection is bundled: the rows, by book. A sermon itself is read at its own address, which needs a connection.

## The build

`npm run sermons:build` (`scripts/sermons-build.ts`) reads `data/sermons/sources.json`:

```json
{
  "repo": "https://github.com/Jonathan-A-White/sermon-index",
  "commit": "<the full 40-hex sha>",
  "sources": ["spurgeon-ccel"]
}
```

The commit is **pinned**: the build never reads a moving branch, so a run today and a run in a year write the same files. For each source it fetches `sources/<id>/source.toml` and `sources/<id>/rows.jsonl` of that
commit from `raw.githubusercontent.com/<owner>/<name>/<sha>/…` into `data/raw/sermons/<sha>/<id>/` (git-ignored like the other raw downloads, skipped when the file is already there; **there is no other network**), then writes
`public/sermons/`. A second run on the same commit writes the same bytes and says `unchanged`. To take a newer index, change `commit` (and add a source id to `sources`), run the build, and commit the changed files.
A source id that is not in the repository at that commit stops the build, naming the source. `scripts/sermons/toml.ts` reads the subset of TOML a `source.toml` uses (strings, a multi-line licence whose line-ending backslashes join,
booleans, a date); it refuses anything else rather than reading it wrong. `kind = "themes"` sources are not built here.

**A reference** is read by `scripts/sermons/osis.ts` (`parseOsisRef`): `Rom.5.8`, `Rom.5.1-Rom.5.11`, `Rom.5.12-Rom.6.4`, a whole chapter (`Ps.23`, `Rom.5-Rom.6`) or a whole book (`Jude`), by OSIS name or Lampas's code (`src/data/canon.ts`), in
Lampas's chapters and verses (the verse counts of `public/data/index.json`; a whole chapter is its first verse to its last). A range over books is **listed under every book it touches**, in each cut at that book's ends. A reference the
canon cannot hold (a book Lampas lacks, such as Tobit; a chapter or verse past the end) leaves the row out, and the build's report lists it (`left out: <source> row <id> (<ref>): <reason>`). A row with no preaching text (`ref` absent) is counted
in the report (`no preaching text`) and not listed. **A cited reference (`cited`) is not built yet**: such a row is listed under its preaching text only.

## The files

```
public/sermons/index.json              the sources
public/sermons/<source>/<book>.json    that book's rows, for each book a source has a row in
```

`index.json` is `{"sources": [{id, name, kind, licence, credit, homepage, rows, books, fingerprint}]}`: `licence` and `credit` are `source.toml`'s own words, `rows` the sermons listed (a row over two books counts once), `books` the
Lampas codes with a file, in canon order, and `fingerprint` the first 12 hex of a SHA-256 over the source's book files (each as `<book>\n<its JSON>\n`, in canon order). A book file is `{"rows": [{id, title, ref: {book, chapter, from, to,
toChapter?}, role: 'text', url, alt, preacher, date}]}`: `ref` is where the preaching text stands (`to` is the last verse, in `toChapter` when that is given), `role: 'text'` says it is the preaching text (a `cited` reference will be
`'cited'`, listed below it), and `alt`, `preacher` and `date` are left out when the source has none. Rows are in verse order. The types are in `src/data/sermonIndex.ts`.

The files are **committed**, as `public/data` is. `src/data/sermonIndex.ts` imports `public/sermons/index.json` into the bundle (as `src/data/bookIndex.ts` does `public/data/index.json`), so the offline copy knows the files and their fingerprints
with no fetch; the book files are fetched, never bundled. A new source or a changed fingerprint is therefore **an app release**, not only a data deploy. Sizes at the pinned commit (2026-11-05): see the Sources table.

## On the phone

- **Not precached.** `pwa-precache.ts` lists no `sermons/` file: a book file is fetched on first use (as the maps' data files are loaded on first use), and `tests/unit/sw-data-route.test.ts` holds that no precache pattern names `sermons`.
- **Kept by the worker.** A book file is asked for as `/sermons/<source>/<book>.json?v=<fingerprint>` (`sermonBookUrl`); `src/sw.ts` takes that address (`isVersionedSermons`, `src/dataCache.ts`) the way it takes a chapter, into the
  data cache: served with no fetch when the very address is kept, fetched once otherwise, the older copy of the same file dropped. An unversioned address is not matched.
- **The offline copy** (`src/data/offlineCopy.ts`, `docs/data.md` 'Offline'): the scope `'nt'` also keeps each source's files for the 27 New Testament books, and `'all'` every file, after the chapters and the Hebrew lists, each by its source's
  fingerprint. What the cache holds under the very address is not fetched again, so a changed source (a new fingerprint) fetches only that source's files, and `serveChapter` drops the old ones.

## The module

`src/sermons/` is `src/maps/` for sermons, file for file (docs/maps.md 'The module'): `types.ts` (`SermonSource` {id, name, homepage, credit, describe, default, needs?, `sermonsFor(place)`}, `SermonRow` {id, source, title, preacher?, date?, ref, role, `open` {url, fallback?}, `opensIn` 'web' | 'logos'},
`SermonPlace` {book, chapter, from?, to?}), `sources/bundled.ts` (one `SermonSource` for each source of `public/sermons/index.json`; it reads `<book>.json` the first time a place in that book is asked, by `sermonBookUrl`, once: the promise is kept, and a file
that failed is asked for again; a book the source has no file for is no request), `sources/index.ts` (`SOURCES`), `sermonsFor.ts` (`sermonsForSources`, the pure ordering below), `enabled.ts` (`enabledSources(sources, read)`, switch key `sermons.<id>`, Logos for a source that `needs` it),
`index.ts` (`sermonsFor(place)` over the sources in use, `setSermonSources` for the tests, `sourceOf(row)`), `useSermons.ts`, `openSermons.ts`, `SermonsDoor.tsx`, `SermonsSheet.tsx` and `place.ts`. A second source (a modern preacher's catalogue, a Logos sermon book) is one file in
`sources/` and a line in `SOURCES`. Every bundled source is read as On until Settings has a switch for it (the next story): `index.ts enabledSources` is where those values will be read. Tests use `tests/support/test-sermons.ts`, sources of their own with rows held in the file.

## Which sermons are for this verse

A source answers `sermonsFor(place)` with the rows whose preaching text touches the chapter, in its own order (a book file's order is verse order). `sermonsForSources` splits them: for a verse or a passage (`from` set) **On this verse** (**On these verses**) is the rows whose
preaching text overlaps it (`overlaps`: a text that runs on into the next chapter, 5:12 to 6:4, overlaps a verse of chapter 6 as well), narrower first within a source (a stable sort: texts of one width stay in the source's order); **In this chapter** is the rest of the
chapter's rows in the source's order. The sources are in the registry's order, each source's rows together. For a whole chapter (no `from`) every row is In this chapter. N on the door is every row of both groups. A source that fails (a book file that
could not be read) is logged and answers nothing; the others still answer.

## The door

`Sermons · N` (`src/sermons/SermonsDoor.tsx`) is a 44 px word in the Verse view's tools line, after the Maps door (`src/VerseView.tsx`, `role=group` 'Tools'): quiet accent words with no border that wrap as a line of words does. It is drawn only while N is above 0 and only on the Verse view
(as the Maps door, mw-5r3p30.1028): never in the verse text and never at the foot of a chapter, with the Immersive reader On or Off. It is asked for the verse (`from`), the passage a section heading opens (`from`, `to`) and the whole chapter the place line opens, where the place has **no** `from`
so that the sheet is headed 'Romans 5' and not 'Romans 5:1-21' (`place.ts sermonPlaceOf`, from `copyUnitOf`'s `kind`). Reading it needs no licence and nothing goes through the mill. The count reads the committed index (a book file the worker keeps); nothing of a sermon's page is fetched.

## The sheet

`openSermons(place)` opens the Sermons sheet (`SermonsSheet.tsx`, `<SermonsHost />` mounted once in `src/App.tsx` beside `MapsHost`), a bottom sheet with Back (`useSheetBack`), Escape, the handle's swipe and Close. It is headed 'Sermons for Romans 5:8', 'Sermons for Romans 5:6-11' or 'Sermons for Romans 5',
then **On this verse** ('On these verses' for a passage) and **In this chapter** (a group is absent when it has no row; a place with none says 'No sermons here.'). Each row is 44 px: the title, and under it the preacher, the date ('14 Mar 1880', 'Mar 1880' or '1880', as far as the source knows it)
and **Opens on the web** (**Opens in Logos** for a row that opens there). A row is a plain `<a href target=_blank rel="noopener noreferrer">` to the sermon where it lives: the app fetches nothing until it is tapped. While the phone is offline (`useOnline`) the rows stay and the second line says **Needs the internet**.
Under the rows each source that answered has its credit line with a link to its home page. The proofs: `features/sermons.feature` (tagged `@uc-sermons`, Greek and Hebrew), `tests/unit/sermons-for.test.ts`, `sermons-bundled.test.ts`, `sermons-door.test.tsx`, `sermons-place.test.ts` and `tests/e2e/sermons.spec.ts` at 390x844
(`shots/sermons-door.png`, `shots/sermons-sheet.png`).

## Where the door stands: every Verse view state

| State of the Verse view | What the door does |
| --- | --- |
| Immersive reader On or Off | Drawn as ever: the Verse view's own look follows `data-immersive` but its tools line does not change; no door at the Reader's chapter foot in either |
| Memorize | The Memorize screens (Due today, a session) are not the Verse view and have no door. In the Verse view Memorize is a word of the tools line and the door follows it, unchanged by Memorizing |
| The Diagram | The Diagram is a pane under the text of a one-verse view; the tools line stays, so the door is drawn and opens its sheet over the pane (z-50, as the Maps sheet) |
| A Septuagint chapter | The index is in Lampas's chapters and verses, Swete's are not always (Greek Ps 22:1 is Psalm 23:1): the door is asked for the Lampas verses the Greek verses answer (`place.ts`, from each verse's `ref` and `refs`), for the chapter when the verses have none (a Psalm's title), and for the whole chapter as ever |
| The Hebrew (an Old Testament verse in the Hebrew view) | Drawn as in the English view, by Lampas's verse (`features/sermons.feature`, Jonah 1:1); the sermons are listed the same either way |
| The Apocrypha card | A reference into the Apocrypha opens a card, not a Verse view (Lampas holds no text of it), so it has no door; the index builds no Apocrypha book (docs/sermons.md 'The index': a book Lampas lacks leaves its rows out) |
| A passage lesson's range | A Verse view of the lesson's range: drawn for the passage, as for a heading's |
| A narrow window or large text | The tools line wraps; the door is a word of it and may take the second line |

## The sources

| id | Name | Rows | Books | Licence and credit | Pinned at |
| --- | --- | --- | --- | --- | --- |
| `spurgeon-ccel` | Spurgeon's sermons (CCEL) | 3,467 listed of 3,543 read (76 have no preaching text) | 65 | CCEL's copyright policy, quoted in `index.json`; the words are public domain, the pages are CCEL's. Credit: Christian Classics Ethereal Library, Calvin University | sermon-index `efac7003` |
| `henry-sermons` | Matthew Henry's sermons (Internet Archive scans) | 46 listed of 52 read (6 have no preaching text) | 20 | The Archive's terms of use, quoted in `index.json`; the words are public domain. Credit: Matthew Henry; Internet Archive | sermon-index `efac7003` |

Size at that commit: about 997 KB of JSON in 65 book files, 126 KB gzipped as one stream (148 KB when each file is gzipped on its own, as a server serves them).

`henry-sermons` (Matthew Henry's sermons) is bundled since mw-qtu3zvz.8: 52 rows read by hand from the Internet Archive's scans of the 1830 Miscellaneous Works and the 1847 Complete Works (sermon-index `sources/henry-sermons`, first in `efac7003`); 46 are listed under 20 books, 6 have no preaching text (the Archive's page prints none) and are left out. About 13 KB of JSON, under 3 KB gzipped. Its licence line is the Archive's terms of use, quoted in `index.json`; the words are public domain. A Henry text beyond these 52 rows would be a story on the sermon-index repository.

The sermon-index repository's other sources (`themes-tcr1934`, `themes-torrey`) are theme sources (`kind` is not `sermons`), which this build refuses, so they are not in `sources.json`.

Each bundled source needs the four credits (CLAUDE.md 'Conventions'): an entry in `ATTRIBUTION.md` quoting the licence line from `source.toml`, a line in `src/preface.ts`, a `CREDITS` entry in `src/tutor/credits.ts` and a rule in
`tests/support/credits.ts` for `public/sermons/<id>/`. `tests/unit/credits.test.ts` fails until each exists.

## Tests

`tests/unit/sermons-build.test.ts` holds the OSIS parse, the TOML subset, the split by book, the fingerprint, the pinned addresses and the second-run bytes on a 20-row cut of the Spurgeon source
(`tests/fixtures/sermons/spurgeon-20.jsonl` and `.toml`, the sermon-index repository's own fixture); `tests/unit/offline-copy.test.ts` the offline copy's files and fingerprint check.
