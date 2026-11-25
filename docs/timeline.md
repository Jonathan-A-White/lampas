# The timeline's data

The data under the timeline (mw-fnvjof.17.317.1; the screens are later stories of the epic mw-fnvjof.17.317): the dated events of the Bible, the people in them and where they happen, one file per book.
His choice (grilling mw-fnvjof.17.288): Theographic's open data, one corrections file with each fix's reason and source, the raw data never edited, and sure fixes sent upstream.

<!-- toc -->

- [The source, and the credit](#the-source-and-the-credit)
- [The build](#the-build)
- [A book's file](#a-books-file)
- [Reading it](#reading-it)
- [Adding a correction](#adding-a-correction)
- [Sending a sure fix upstream](#sending-a-sure-fix-upstream)

<!-- /toc -->

## The source, and the credit

[Theographic Bible Metadata](https://github.com/robertrouse/theographic-bible-metadata) by Robert Rouse, CC BY-SA 4.0, read at one pinned commit (`THEOGRAPHIC_COMMIT` in `scripts/timeline-import.ts`, a22047f of 2026-11-25).
Its dates are traditional: Floyd Nolen Jones's chronology (after Ussher) for the Old Testament and the Gospels, Todd Atwood's timelines for Acts (upstream's `docs/chronology-and-dates.md`). Many scholars date these events differently.

Wherever the data is shown, show the line `TIMELINE_CREDIT` (`src/timeline/types.ts`), which is also each file's `credit`:

> Theographic Bible Metadata, Robert Rouse, CC BY-SA 4.0; traditional dating (Floyd Nolen Jones, after Ussher)

CC BY-SA 4.0 is share-alike: the files in `src/timeline/data/` are an adaptation and stay under that licence. About (`ATTRIBUTION.md`), the Preface (`src/preface.ts`) and the tutor's credits (`src/tutor/credits.ts`) name the source; `tests/support/credits.ts` holds the files to it.

## The build

`npm run timeline:build` (`scripts/timeline-import.ts`):

1. Fetches `CSV/Events.csv`, `People.csv` and `Places.csv` of the pinned commit into the git-ignored `data/raw/theographic/` when absent, and checks each against its sha256 (`scripts/data/pins.ts`). Other bytes stop the build.
2. Lays `data/timeline/corrections.json` over the rows in memory.
3. Writes `src/timeline/data/<book>.json` for every book that has an event or a dated person (committed; a book with neither has no file). A second run writes nothing.

To move to a newer upstream: change `THEOGRAPHIC_COMMIT` and the three sha256s (`sha256sum` of the new files), delete `data/raw/theographic/`, run the build. A correction that upstream has since made stops the build; delete it from the file.

The tests run the import on small real cuts of the three files (`tests/fixtures/timeline/`) and never use the network.

## A book's file

```json
{"book":"isa","credit":"Theographic Bible Metadata, ...",
 "events":[{"id":217,"title":"Prophecies of Isaiah","year":-759,"duration":"62Y","verses":[[1,1,31],[2,1,22]],"people":["isaiah_617"],"places":[]}],
 "people":{"isaiah_617":{"name":"Isaiah"}},
 "places":{}}
```

- `year` is an integer, negative for BC, with **no year 0** (as `src/maps/period.ts` counts). Upstream counts 1 BC as year 0, so every BC year in our files is one less than upstream's (`-758` there is `-759`, 759 BC, here).
- `date` ('0030-05-01') is there only where upstream gives a day.
- `duration` is upstream's: `D` days, `W` weeks, `M` months, `Y` years, sometimes two (`7Y6M`). `yearsOf` and `endYearOf` read it; an end date made from months or years is a position on a timeline, not an exact date.
- `verses` are this book's only, as `[chapter, from, to]`. An event told in several books (the Gospels, Kings and Chronicles) is in each book's file with that book's verses, under the same `id`.
- Events are in order of year, then of their first verse in canon order.
- `people` holds the people of the events (upstream's `participants`; the name is its `displayTitle`, which tells the two Johns apart) and every dated person the book's verses name, with `born` and `died` where upstream dates them (about 70 of 3,067).
- `places` names the events' places (upstream's `locations`).

## Reading it

`src/timeline/timelineData.ts`: `loadTimeline(book)` loads a book's file on first use, as its own chunk (a book with no file answers an empty timeline with the credit); `eventsOfChapter(timeline, chapter)`, `spanOf(events)` and `chapterSpan(timeline, chapter)` give a period as `{ from, to }` years. Nothing in the app imports it yet, so it is not in the build until a screen does.

Not every chapter has an event (the Psalms, most letters): `chapterSpan` is `null` there. Where a chapter holds events centuries apart (the genealogy of Luke 3), its span runs from the oldest; which year a strip opens at is the screen's to choose.

## Adding a correction

All fixes are in the ONE file `data/timeline/corrections.json`, a list. Never edit a file in `data/raw/theographic/` or in `src/timeline/data/` by hand.

```json
{
  "id": "event:129",
  "field": "verses",
  "from": "Gen.34.1,Deut.34.1,...",
  "to": "Deut.34.1,...",
  "reason": "why the file is wrong and this is right",
  "source": "who says so: the verse, a book and page, an upstream issue's address"
}
```

- `id`: `event:<eventID>`, `person:<personLookup>` or `place:<placeLookup>`, as the CSV has them.
- `field`: the CSV's column (`startDate`, `duration`, `verses`, `participants`, `locations`, `displayTitle`, `birthYear`, `deathYear`, ...). Years here are upstream's (0 is 1 BC).
- `from`: the whole cell exactly as the file has it. The build stops if it differs, so a fix cannot silently outlive an upstream change.
- `to`: the whole cell as it should read.
- Every part is required.

Then run `npm run timeline:build`, and commit the corrections file with the changed data. Add a fix only when it is sure: the text or the dating's own source shows it. A disagreement about chronology is not a slip: the dates are Jones's, and that is said in the credit.

A slip in a column the import does not read needs no correction here. Upstream's issue #49 (the `Disambiguation (temp)` column is misaligned, two Johns swapped) is such a one: the app takes names from `displayTitle`.

## Sending a sure fix upstream

A sure correction goes upstream too, as a GitHub issue (their `data-correction` template) or a pull request. It goes out under the Governor's name, so:

- the first one is drafted and shown to the Governor before it is sent, and nothing is sent without that;
- the draft says the record, the field, what it has, what it should have and why (the correction's own `from`, `to`, `reason` and `source`), and the commit it was read at;
- upstream makes data fixes in Airtable and exports them monthly, so an issue is usually better than a pull request that edits `CSV/` by hand;
- once sent, add the issue's address to the correction's `source`. When upstream's export has the fix, move the pin and delete the correction.
