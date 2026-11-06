# Sermons

Lampas lists sermons against the passage each was preached on, and links out to them: nothing of a sermon's words is held. This file is for the free, offline **index** (the epic mw-qtu3zvz,
story B1, mw-qtu3zvz.1): where its facts come from, how they are built, what the files hold and how a phone keeps them. The screen that shows them, the Sermons door beside Maps on the Verse view and its sheet, is story B2 (mw-qtu3zvz.2): see 'The door' and 'The sheet'. A switch per source in Settings is a later story. The index by **theme** second, story B4 (mw-qtu3zvz.4): the Themes line and 'On the same theme' on the sheet, and a Settings switch for each theme list, is 'The themes' below.
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
- [The themes](#the-themes)
  - [The build](#the-build-1)
  - [The Themes line](#the-themes-line)
  - [On the same theme](#on-the-same-theme)
  - [Settings](#settings)
  - [Credits](#credits)
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
booleans, a date); it refuses anything else rather than reading it wrong. `kind = "themes"` sources are built by the same run, from the `themes` list of `sources.json`: see 'The themes'.

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

The sermon-index repository's other two sources (`themes-tcr1934`, `themes-torrey`) are theme sources (`kind = "themes"`): they are listed under `themes` in `sources.json` and built into `public/themes` (next section). A theme source listed under `sources`, or a sermon source under `themes`, stops the build, naming it.

Each bundled source needs the four credits (CLAUDE.md 'Conventions'): an entry in `ATTRIBUTION.md` quoting the licence line from `source.toml`, a line in `src/preface.ts`, a `CREDITS` entry in `src/tutor/credits.ts` and a rule in
`tests/support/credits.ts` for `public/sermons/<id>/`. `tests/unit/credits.test.ts` fails until each exists.

## The themes

Story B4 (mw-qtu3zvz.4) joins the verses to **themes** and the themes to sermons: "indexed by Bible passage first and by theme second" (`docs/sources/sermon-index.md` sections 4 and 7 say why the join is narrow and which lists were chosen). A theme source is a list of **topics** (a name, numbered **parts** with labels, and **links** to passages) in the sermon-index repository, `sources/<id>/source.toml`, `topics.jsonl` and `links.jsonl`; there are two: `themes-tcr1934` (Thompson Chain Topics: the subject index of Frank Charles Thompson's 1934 Bible, CrossWire's TCR module, keyed and proofed by Paul Houghton) and `themes-torrey` (R. A. Torrey's New Topical Textbook, 1897, CrossWire's Torrey module). Only a topic's name, its part labels and its passages are kept; no sentence of either book.

**The name.** "Thompson Chain-Reference" is a trademark of the publisher of the current editions. The app credits Frank Charles Thompson's work and CrossWire's module by name (About, the Preface, the tutor's credits), calls the source "Thompson Chain Topics" as the module does, calls the line under a verse "Themes", and uses the trademark for no label: `tests/unit/no-trademark.test.ts` greps `src/` and everything in `public/themes` for it. `ATTRIBUTION.md` is the one file that may name it, and only to say so. For the same reason `public/themes/index.json` keeps a source's `DistributionLicense=` line and not the module's `About=` line (`themeLicence`, `scripts/sermons-build.ts`); the About line stays in the source's `source.toml` and in the sermon-index repository.

### The build

`npm run sermons:build` builds them in the same run as the sermon sources, from `themes` in `data/sermons/sources.json` (`"themes": ["themes-tcr1934", "themes-torrey"]`; the commit and the `data/raw/sermons` cache are the same), by `scripts/sermons/themes.ts`. A link is read by `parseOsisRef` (the same reader as a sermon's text) into Lampas's books and numbering and listed under every book it touches; a link the canon cannot hold is left out and counted (`left out: <source> link of <topic> (<ref>): <reason>`). A second run on the same commit writes the same bytes (`unchanged`).

```
public/themes/index.json                 {sources: [{id, name, licence, credit, homepage, topics, links, books, fingerprint}]}
public/themes/<source>/<book>.json       {topics: [{id, label, parts: [{n, label}], verses, books?}], links: [{topic, part?, ref}]}
```

`topics` counts the topics with a link Lampas can hold and `links` the links listed. A book file holds the topics with a link in that book, each with the **parts that book's links use** (a topic's part list is long; a link names one), and the links: `ref` is `chapter.verse`, `chapter.from-to` or `chapter.from-chapter.to` (`5.8`, `23.1-6`, `5.12-6.4`; the book is the file's); `part` is left out for a link to the whole topic. `verses` is how many verses **all** the topic's links cover together, in every book, a verse counted once, so the cap below needs no second file; `books` (Lampas's codes, canon order) is every book the topic has a link in, and is left out for a topic over 300 verses, which the sermon join never uses. The fingerprint is the first 12 hex of a SHA-256 over the source's book files, as the sermon sources have; a book file is asked for as `/themes/<source>/<book>.json?v=<fingerprint>` (`themeBookUrl`), is not precached, and is kept by the worker as a sermon book file is (`isVersionedSermons`, `src/dataCache.ts`). The offline copy does not keep them yet.

At the pinned commit (2026-11-06): `themes-tcr1934` 1,704 topics with a link of 1,728 read, 27,070 links listed of 27,076 read, in 66 books, 3.5 MB of JSON (606 KB gzipped as one stream); `themes-torrey` 628 topics, 38,846 links of 38,849, in 66 books, 5.5 MB (1.05 MB gzipped). A phone loads only the book files a verse asks for (below); the topics repeat in each book file that links them, which is most of the size.

**Left out, and the versification sweep (the follow-up story's list).** Ten links are left out, all in Acts and all a verse past the end of the chapter in Lampas's count (Acts 8 has 39 verses, Acts 15 40, Acts 24 26): Acts 8:40, 15:36-41 and 24:27, each named by `left out:` in the build's report. The module's Romans 16:25-27 are already refused by the sermon-index tool, which reads Lampas's count (Romans 16 ends at 24), and are in that repository's `tools/sword-themes/REPORT.md`. **Psalms: the build keeps the module's numbers and maps nothing.** Both modules number the Psalms as the KJV does (a title is not a verse), Lampas's Psalm chapters have the KJV's verse counts (all 150 files agree with `public/data/index.json`), and no Psalm link was refused, so a link lands on the verse a KJV reader means. The Psalms whose **Hebrew** count differs from the KJV's (the title counts as one or two verses; the sermon-index A4 sweep counted verse ends in Lampas's Hebrew text; KJV verses to Hebrew verses) are 3 (8 to 9), 4 (8 to 9), 5 (12 to 13), 6 (10 to 11), 7 (17 to 18), 8 (9 to 10), 9 (20 to 21), 12 (8 to 9), 18 (50 to 51), 19 (14 to 15), 20 (9 to 10), 21 (13 to 14), 22 (31 to 32), 30 (12 to 13), 31 (24 to 25), 34 (22 to 23), 36 (12 to 13), 38 (22 to 23), 39 (13 to 14), 40 (17 to 18), 41 (13 to 14), 42 (11 to 12), 44 (26 to 27), 45 (17 to 18), 46 (11 to 12), 47 (9 to 10), 48 (14 to 15), 49 (20 to 21), 51 (19 to 21), 52 (9 to 11), 53 (6 to 7), 54 (7 to 9), 55 (23 to 24), 56 (13 to 14), 57 (11 to 12), 58 (11 to 12), 59 (17 to 18), 60 (12 to 14), 61 (8 to 9), 62 (12 to 13), 63 (11 to 12), 64 (10 to 11), 65 (13 to 14), 67 (7 to 8), 68 (35 to 36), 69 (36 to 37), 70 (5 to 6), 75 (10 to 11), 76 (12 to 13), 77 (20 to 21), 80 (19 to 20), 81 (16 to 17), 83 (18 to 19), 84 (12 to 13), 85 (13 to 14), 88 (18 to 19), 89 (52 to 53), 92 (15 to 16), 102 (28 to 29), 108 (13 to 14), 140 (13 to 14) and 142 (7 to 8): 62 Psalms. Nothing is shifted, because the modules and Lampas agree; a source numbered as the Hebrew Bible is would land one or two verses late in these 62 until it is mapped, and a count can miss a Psalm whose title is counted but whose last verse the KJV splits (Psalm 13). The follow-up is a mapping, Psalm by Psalm, before a Hebrew-numbered source is written, and the Greek Psalms' numbering (`docs/sermons.md` 'Where the door stands') already goes through `place.ts`.

### The Themes line

The sheet of a verse or a passage (`from` set) has a **Themes** line under its title, `Themes Atonement: Doctrine of · Love-Hatred: Of God · God` (`src/themes/themesFor.ts`, drawn by `ThemesLine` in `SermonsSheet.tsx`): the topics, in every theme list that is On, that have a link overlapping the verse or passage, a topic once. **The rule for a part**: a topic's name is its label as the module writes it (`Love-Hatred`, `Atonement, The`); where the topic's narrowest link on the place (then the lowest part) names a part, its label follows after a colon, as the module names it: `Love-Hatred: Of God`, never `Love of God (Of God)`. A name that two lists give is said once. A whole chapter has no Themes line (a chapter touches two or three dozen topics; a line for a verse is a line a person can read), and the line scrolls inside 30% of the screen's height rather than push the rows off a small one (Torrey's part labels are phrases: `Love of God, The: Exhibited in: Christ's dying for us while sinners`). The topics are ordered by list (the registry's order), then the narrower link first, then by label.

### On the same theme

After **In this chapter** the sheet shows `On the same theme` (`sameThemeFor`, `src/sermons/index.ts`; the pure rule is `themeTier`, `src/sermons/sermonsFor.ts`), the sermons whose preaching text shares a topic with the verse. **The rule is the sermon-index service's theme tier (its A5, `docs/api.md` 'The theme tier'), and the two are to stay identical:**

- the sermon's **preaching text** (`role: 'text'`, never a cited reference) overlaps a link of a topic, and **that topic also has a link overlapping the verse or passage**;
- the topic covers **at most 300 verses** (`verses` in the file; `THEME_MAX_VERSES` in `src/data/themeIndex.ts`, `ThemeMaxVerses` in the service). The probe that set it (`docs/sources/sermon-index.md` section 4): Nave's whole-subject topics put 2,735 sermons on Romans 5, topics of 300 verses or fewer 799;
- **a sermon is listed once, with its narrowest topic** (fewest verses; then the theme source's id, then the topic's id);
- **it is not a row of the passage groups**: the service leaves out a sermon with any passage overlapping the verse; the sheet leaves out every sermon **On this verse** or **In this chapter** (a sermon of the chapter is already on the sheet);
- the order is the topic's size ascending (the narrower the topic, the closer the sermon), then the sermon's source id, then its id as a number (`9` before `10`). The one thing the sheet does that the service does not is keep the sermons of one topic together under its heading where two topics have the same size (it sorts by the topic's id before the sermon's source); the rows kept and the topic each is under are the same;
- **at most 12 rows in all**; `N more on these themes` says how many were left out. The service pages (`limit`, `offset`); the sheet does not.

Each topic is a heading, `On Atonement` (the topic's label), over its sermons, which are rows like the others (the preacher, the date, **Opens on the web**). The cost: for the topics of the verse of at most 300 verses the sheet asks each sermon source that is On for the books those topics have links in (a book file is small, and a source has none for a book it lacks), then fetches the theme files of the books that have a sermon, to read the topic's links there; the passage's own sermons and the Themes line are drawn first and the group follows them. A file that fails is logged and its source answers nothing.

### Settings

**Settings > Study resources > Themes** (section `themes`, after Maps; `src/settings/definitions/themes.ts`, `controls/themes.tsx`) has one **On | Off** row for each theme source, `themes.<id>`, both On to start, and the tutor may flip them by talk. Off, a list gives no name to the Themes line and no topic to the join. They bear on what the app offers, not on an answer: `BEARS_ON` says `screen`. The sermon sources' own switches are a later story.

### Credits

Each theme source has the four credits (below, and `tests/support/credits.ts` for `public/themes/<id>/`); Thompson's note records the renewal search the sermon-index source made (`licence_note` in its `source.toml`: the registration A72501 is in none of the four Catalog of Copyright Entries volumes of 1961 and 1962 searched).

## Tests

`tests/unit/sermons-build.test.ts` holds the OSIS parse, the TOML subset, the split by book, the fingerprint, the pinned addresses and the second-run bytes on a 20-row cut of the Spurgeon source
(`tests/fixtures/sermons/spurgeon-20.jsonl` and `.toml`, the sermon-index repository's own fixture); `tests/unit/offline-copy.test.ts` the offline copy's files and fingerprint check. The themes: `tests/unit/sermons-build.test.ts` also builds a 3-topic fixture (`tests/fixtures/sermons/tcr-three.*`: Atonement over three books, Love-Hatred with a link Lampas cannot hold, Shepherd with a whole chapter and no parts);
`tests/unit/themes-for.test.ts` the Themes line's names and the bundled sources over the committed files; `tests/unit/sermons-theme-tier.test.ts` the cap, the dedupe, the order and the cut at 12; `tests/unit/no-trademark.test.ts` the trademark;
`features/themes.feature` the sheet and the Settings rows on theme lists of the tests' own (`tests/support/test-themes.ts`); `tests/e2e/sermons.spec.ts` the real Romans 5:8 sheet at 390x844 (`shots/sermons-themes.png`).
