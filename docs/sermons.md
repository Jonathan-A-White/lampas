# Sermons

Lampas lists sermons against the passage each was preached on, and links out to them: nothing of a sermon's words is held. This file is for the free, offline **index** (the epic mw-qtu3zvz,
story B1, mw-qtu3zvz.1): where its facts come from, how they are built, what the files hold and how a phone keeps them. The screen that shows them (a Sermons door beside Maps) is a later story.
Why the index is shaped this way (a static file per book, no server of our own) is in `docs/sources/sermon-index.md` section 5; what a Logos sermon book would need is in section 2 of the same file.
Reading needs no licence.

<!-- toc -->

- [The index](#the-index)
- [The build](#the-build)
- [The files](#the-files)
- [On the phone](#on-the-phone)
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

## The sources

| id | Name | Rows | Books | Licence and credit | Pinned at |
| --- | --- | --- | --- | --- | --- |
| `spurgeon-ccel` | Spurgeon's sermons (CCEL) | 3,467 listed of 3,543 read (76 have no preaching text) | 65 | CCEL's copyright policy, quoted in `index.json`; the words are public domain, the pages are CCEL's. Credit: Christian Classics Ethereal Library, Calvin University | sermon-index `08484ad3` |

Size at that commit: about 997 KB of JSON in 65 book files, 126 KB gzipped as one stream (148 KB when each file is gzipped on its own, as a server serves them).

`henry-sermons` (Matthew Henry's sermons) is named by the story that began this file and **is not in the sermon-index repository yet**, so it is not bundled; add its id to `sources.json` once the repository has it.

Each bundled source needs the four credits (CLAUDE.md 'Conventions'): an entry in `ATTRIBUTION.md` quoting the licence line from `source.toml`, a line in `src/preface.ts`, a `CREDITS` entry in `src/tutor/credits.ts` and a rule in
`tests/support/credits.ts` for `public/sermons/<id>/`. `tests/unit/credits.test.ts` fails until each exists.

## Tests

`tests/unit/sermons-build.test.ts` holds the OSIS parse, the TOML subset, the split by book, the fingerprint, the pinned addresses and the second-run bytes on a 20-row cut of the Spurgeon source
(`tests/fixtures/sermons/spurgeon-20.jsonl` and `.toml`, the sermon-index repository's own fixture); `tests/unit/offline-copy.test.ts` the offline copy's files and fingerprint check.
