# Maps

Lampas shows a chapter's maps beside its text: a quiet door, the Maps sheet and the map opened in the app (mw-zbjgn3r.2, 'The screens' below), over the module and the data under them (mw-zbjgn3r.1).
A map is a `MapCard`; where it comes from is a `MapSource`. Reading the maps needs no licence.

## The module: `src/maps/`

| File | Holds |
| --- | --- |
| `types.ts` | `MapSource`, `MapCard`, `MapRef` (`{ book, chapter, from?, to? }`, the app's book codes of `src/data/canon.ts`), and the shape of the Bible Mapper file |
| `period.ts` | `period(start, end?)`: the card's dates as a string, negative years BC. `c. 2070 BC` (one date in BC), `1010 to 970 BC`, `AD 30` (one date in AD), `AD 27 to 30`, `5 BC to AD 30`; empty for a map with no dates |
| `sources/biblemapper.ts` | Bible Mapper as a `MapSource` |
| `sources/logosatlas.ts` | the Logos Atlas and the Lexham Geographic Commentary as a link-only `MapSource` (below) |
| `logosRef.ts` | the atlas's references: `toLogosBook`, `spanHolds`, `mapsCovering`, `BASE_MAP` (below) |
| `mapsFor.ts` | `mapsForSources(sources, ref)`: every source's cards, the sources in list order, each source's cards in its own order; `rankByPlaces(cards, places)`, the ranking for a verse (below) |
| `places.ts`, `placeNames.ts` | `placesIn(ref)`, the places named in a verse, a passage or a chapter; the comparison of place names (below) |
| `sources/index.ts` | the registry `SOURCES` (re-exported by `index.ts`; apart from it so the settings registry loads under plain Node) |
| `enabled.ts` | `enabledSources(sources, read)`, pure: the sources whose switch is On (below) |
| `index.ts` | `SOURCES`, `enabledSources()` over the settings store and `mapsFor(ref)`, the door the screens take: the cards of the sources that are On, ranked within each source by the places of the verses when `ref.from` is set |
| `data/places/<book>.json` | STEPBible's TIPNR cut per book (below), each loaded by a dynamic import on first use: its own chunk, not in `pwa-precache.ts` |
| `data/biblemapper.json` | the compacted index (below), loaded by a dynamic import on first use: its own chunk, not in `pwa-precache.ts` |
| `data/logosatlas.json` | the Logos Atlas's list of 261 maps (below), loaded by a dynamic import on first use: its own chunk, not in `pwa-precache.ts` |

A `MapSource` is `{ id, name, homepage, credit, describe, default, needs?, mapsFor(ref, places?) → MapCard[], imageUrl(card, 'low' | 'medium' | 'high') → string | null }`. The `credit` is the line shown with
every map of the source; `imageUrl` answers null where the source has no picture to show at that size. `places` is `mapsFor`'s one shared, lazy read of the places the verses of `ref` name (`placesIn`): a source that centres a view on them calls it, and one that does not never loads them. Bible Mapper maps by the chapter, so a source ignores the verses of a `MapRef`; `mapsFor` ranks the cards by them (`mw-zbjgn3r.3`, 'Which maps are for this verse').

## The screens (mw-zbjgn3r.2)

- **The door**, `src/maps/MapsDoor.tsx`: a 44 px button `Maps · N` (`useMaps`, which calls `mapsFor`), drawn only while N is above 0. On the Verse view it sits in the doors line with In Logos and In another book…, for a verse (`from` its number) and for a passage (`from`, `to`);
  at the foot of every chapter, Old and New Testament, `src/reader/ChapterActions.tsx` draws it before the chapter buttons. Nothing is drawn inside `VerseText`, and with Immersive reader On the Reader draws no door (the Verse view keeps it).
- **The sheet**, `src/maps/MapsSheet.tsx`: a bottom sheet with `useSheetBack`, opened by `openMaps(ref)` (`src/maps/openMaps.ts`; the tutor story will call it too) and drawn by `<MapsHost />`, mounted once in `App.tsx`. Titled `Maps for Genesis 10:19`, `Maps for Genesis 10:1-19` or
  `Maps for Genesis 10`; the cards grouped as Events, Regions and Videos (a group absent when empty), each row 44 px with the title and its period on a second line. On a verse or a passage whose places some map shows, the sheet leads with
  those maps under `For this verse` (`For these verses` for a passage), each row's second line holding its period and then the places it shows (`c. 2070 BC · Sodom, Gomorrah, Admah, Zeboiim`), and the rest follow under `In this chapter` with the Events / Regions / Videos groups
  inside (their headings a level lower); with no map matched, and for a whole chapter, the sheet is as it was. No thumbnails (the low-res picture is about 500 KB): nothing is fetched until a map is opened. A video row is a plain `https` link
  to its article (`target="_blank"`); a map row opens the map.
- **The map**, `src/maps/MapView.tsx`, a second sheet over the first: the title, the period, the low-res picture at the box's width in a box that scrolls both ways; a tap on the picture toggles that width and twice it (`data-map-zoom` `fit` | `in`; the page locks pinch, so the box
  takes `pinch-zoom` only where the phone allows it). Under it the credit from the source (`Map by David P. Barrett, biblemapper.com`, its host a link to `MapSource.homepage`: the link back the site asks, on every map), `About this map` and `Full size` (the article, where the larger pictures are)
  and `All maps for Genesis 10 at Bible Mapper` (`MapSource.allMapsUrl`: `https://biblemapper.com/blog/mapfinder/?ref=Genesis%2010`, the book name and chapter encoded). Back returns to the sheet, then to the verse. While the picture fails to load (offline) its place says `The map needs the internet` and every link stays.
- **About** lists Bible Mapper from `ATTRIBUTION.md` (the credit of mw-zbjgn3r.1); the Preface (`src/preface.ts`) says what the door does.
- **Tests**: `features/maps.feature` (`features/steps/maps.steps.tsx`) and `tests/unit/maps-door.test.tsx` run on a source of the tests' own (`tests/support/test-maps.ts`, registered with `setMapSources` in `src/maps/index.ts`: Bible Mapper's identity and links over a few cards, no data file read, no picture fetched);
  `tests/e2e/maps.spec.ts` shoots the Verse view with the door, the sheet and the map at 390x844, the picture stubbed by Playwright's `route`.

## Bible Mapper's data

[Bible Mapper](https://biblemapper.com) is David P. Barrett's atlas. Its collection publishes two lists, which `npm run maps:build` (`scripts/maps-build.ts`, the parse in `scripts/maps/biblemapper.ts`) reads:

- `https://biblemapper.com/blog/mapfinder/MapList.json`, the maps (227 on 2026-10-26: 134 events, 82 regions, 11 videos);
- `https://biblemapper.com/blog/mapfinder/MapRefList.json`, the maps of each chapter of the 66 books.

They are downloaded into the git-ignored `data/raw/biblemapper/` when absent (with a User-Agent header, since the site refuses a request that names no client) and compacted into
`src/maps/data/biblemapper.json`, which is committed (about 140 KB; `tests/unit/maps-for.test.ts` holds it under 150 KB). To refresh, delete the two files in `data/raw/biblemapper/`,
run `npm run maps:build` and commit the result; a second run on an unchanged download writes nothing. Tests use the small real cuts in `tests/fixtures/maps/` and never the network.

```json
{"updated":"2022-10-22","ids":["AbijahAttacksJeroboam","…"],
 "maps":{"PaulsVoyageToRome":{"title":"Paul's Voyage to Rome","kind":"event","start":60,"end":60,"article":"https://biblemapper.com/blog/…","image":{"low":"PaulsVoyageToRome_low.jpg","medium":"PaulsVoyageToRome.jpg","high":"PaulsVoyageToRome_high.jpg","width":7.88},"places":["Adramyttium","…"]}},
 "chapters":{"act":{"27":[0,12,40]}}}
```

- `maps` is keyed by the site's basename, in alphabetical order. `kind` is `event`, `region` or `video`; `start` and `end` are integers (negative for BC) and are there only where the site gives them
  (a region often has none; the site lists a few spans the wrong way round, and `period` puts the earlier year first); `image` is the first image of the map (the site gives a few maps several) with its three file
  names and its width in inches; `places` are the names in every image's `locationIDs`, once each, in the site's order of their ids; a video has `video` (the file name) and no image or places.
- `ids` is the basenames in order, and `chapters` holds a map by its place in `ids`: written as basenames the chapter lists were 70 KB of the 185 KB, and as numbers they are under 20 KB.
  `chapters` is keyed by the app's book code, then the chapter number, and lists the chapter's `MapBasenames` in the site's order, then its `AudioVisualReadings` (videos). A chapter with no map is left out.
  `mapIdsOf(data, book, chapter)` in `sources/biblemapper.ts` gives the basenames.
- The Apocrypha, if the site ever lists it, is dropped (books are matched to the canon by `BookDisplayName`). A basename a chapter names and `MapList.json` lacks is dropped from the chapter and printed as a
  warning: on 2026-10-26 these are `JudahAlone` (Jeremiah 1 to 5) and `Mesoptamia` (Nahum 1 to 3, a misspelling of Mesopotamia).

The images are not copied. `imageUrl('low')` is `https://biblemapper.com/blog/images/lo-res/<low>`; the medium and high files are not served under `/blog/images`, so those answer null and the article (`MapCard.article`) has them.

## Which maps are for this verse (mw-zbjgn3r.3)

`mapsFor(ref)` with `from` set (a verse, or a passage with `to`) asks `placesIn(ref)` for the places the verses name and ranks the chapter's cards by them (`rankByPlaces` in `mapsFor.ts`): the cards that show a place of the passage come first,
the most places first and a tie in the source's order, each card carrying `matched`, the passage's place names it shows, in the order the passage names them; the other cards follow in the source's order with `matched: []`. For a whole chapter nothing is asked, the order is
the source's and every `matched` is `[]`. If the places cannot be read the chapter's maps are answered unranked. The door's count is the chapter's maps either way.

A map's place and a place of the passage are the same place by `src/maps/placeNames.ts`. In the first step the names are compared whole, normalised: lower case, accents stripped, a bracketed or parenthesised suffix dropped
(`Bethel [al-Bira]` is `bethel`, `Jericho (OT)` is `jericho`), a trailing `?` dropped, a hyphen or a run of spaces one space. A passage place has every form in its `names`, so `Zidon` finds Sidon. Only where a map place finds no passage place that way is it
compared in its loose form, without a head word (`mount`, `mt`, `sea of`, `lake`, `river`, `brook`, `valley of`, `wilderness of`, `land of`, `city of`, `plain of`, `wadi`) or a trailing `river`, against the loose forms of the passage's names: `Mount Hermon` finds Hermon, `Jordan River` finds Jordan,
and `Sea of Galilee` finds Galilee only when no place of the passage is itself named Sea of Galilee. The names Bible Mapper writes that this does not find (a modern or an unbiblical name: Scythopolis, Sebaste, Persepolis, Masada) wait for an alias table.

## The places: STEPBible's TIPNR

TIPNR (Translators Individualised Proper Names with all References, Tyndale House Cambridge and STEPBible.org, CC BY 4.0, the coordinates from OpenBible.info) lists every proper name of the Bible with every verse that names it.
`npm run places:build` (`scripts/places-build.ts`, the parse in `scripts/places/tipnr.ts`) downloads it into the git-ignored `data/raw/tipnr/tipnr.txt` when absent
(`https://raw.githubusercontent.com/STEPBible/STEPBible-Data/master/Proper%20Nouns/TIPNR%20-%20Translators%20Individualised%20Proper%20Names%20with%20all%20References%20-%20STEPBible.org%20CC%20BY.txt`; the story's name with `All References` is a 404, the listing of the repository's Proper Nouns folder has `with all References`)
and writes `src/maps/data/places/<book>.json` for each of the 66 books that has places (62 do), committed (the biggest, Joshua, is about 67 KB; `tests/unit/places-build.test.ts` holds each under 120 KB). To refresh, delete `data/raw/tipnr/`, run it and commit; a second run on an unchanged download writes nothing.
Tests use the real cut `tests/fixtures/places/tipnr-slice.txt` and never the network.

Only the `PLACE` and `PLACE+PERSON` records are taken (a `PERSON` record of the same name, Sidon the son of Canaan, is not a place). A book's file is a list of places; a place is in the file of every book that names it, with that book's verses:

```json
{"id":"Gerar@Gen.10.19-2Ch","name":"Gerar","names":["Gerar"],"strongs":["H1642"],"lat":31.39129,"lng":34.56057,"region":"Philistia","verses":[[10,19],[20,1],[20,2],[26,1]],"pos":[5,11,10,16]}
```

- `id` is TIPNR's UniqueName, `name` its ESV form, `names` every form of the 'All names' field and of the KJV and NIV forms (a lower-case or bracketed form, 'stone' or '[ ]', is left out), once each, `strongs` the disambiguated Strong's numbers (`H1642`; `H6721H` is Sidon the city).
- `lat` and `lng` are read from the Google Maps address (OpenBible.info's position, five decimals) and are absent where the address has none (`@,14z`, `@0,14z`): 970 of the 1,006 places have them. `region` is the Geographical area field, absent for `>` or empty.
- `verses` is the Total line's reference list expanded (`Gen.10.19; 20.1,2; 26.1,6` and ranges such as `Gen.1.10-12`) together with the lists of every sub-record (which hold the verses an `ff` stands for), in this book, in order. TIPNR's marks `(?)` and `(d)`, a verse of the Greek Old Testament's own numbering (`LXX.`) and the letters after a verse number are dropped.
- `pos` is where the place stands in each of those verses: the index of the first word of the committed chapter (`public/data`) whose Strong's number is one of the place's, `-1` where the chapter does not show it. `placesIn` answers a verse's places in this order (the order the verse names them), then by the file's. It is absent when no verse shows it.

`placesIn(ref)` answers the places with a verse in `from..to` (the whole chapter when no verse is given; `from` alone is that verse), each once, loading the book's file on its first use. `setPlaceLoader` is the tests' seam (`tests/support/test-maps.ts` puts a few places of its own in its place, Genesis 10:10 and 10:11 and Romans 8:3).

## The site's terms, and the credit

The About page of biblemapper.com says: "You are welcome to use these maps for any non-commercial purposes. The only requirement is that you cite biblemapper.com as the source of the map(s), and if you are
including them in an online resource, provide a hyperlink back to biblemapper.com. For any commercial use, please contact us first at the contact information provided here: biblemapper.com/contact.html.
All text and maps copyright (c) 2026 by David P. Barrett. All rights reserved."

So every map Lampas shows carries `MapSource.credit` ('Map by David P. Barrett, biblemapper.com') and a link to `MapSource.homepage`; the screens read both from the source, never write them out. `ATTRIBUTION.md`
has the entry (the About screen's source), `tests/support/credits.ts` the rule that holds a file in `src/maps/data/` to it (the places to STEPBible's TIPNR, credited in the TBESG bullet), and `src/tutor/credits.ts` the tutor's short form. A source's own terms may differ: a
second source gets its own entry and credit.

Open question for the Governor: Lampas is free to read and a licence unlocks the AI. Maps shown in the free part are non-commercial use; whether the paid part touches them is the Governor's to say before the maps ship.

## Choosing the sources, and several at once (mw-zbjgn3r.6)

- **The switches.** Settings > Study resources > Maps (section `maps`, after Bible in Logos; `docs/layout/settings.md`) has one On | Off row for each member of `SOURCES`, key `maps.<source.id>`, made by `mapSourceSetting(source)` (`src/settings/definitions/maps.ts`) the way the study-resource switches are made from `RESOURCES`: label `source.name`, hint `source.describe`, On or Off to start as `source.default` (Bible Mapper On). The tutor may flip them by talk like any setting.
  A source with `needs: 'logos'` rides on the Logos study resource: its row is drawn only while Logos is On (`dependsOn resource.logos`), and the source answers nothing while Logos is Off, whatever its own switch says.
- **Which sources answer.** `enabledSources(sources, read)` (`src/maps/enabled.ts`, pure; `read(key)` gives a setting's value as text) keeps the sources whose switch is On and whose `needs` are met; `enabledSources()` in `src/maps/index.ts` reads the store; `mapsFor(ref)` asks only those, `useMaps` asks again when a `maps.*` setting or `resource.logos` changes.
- **The merge.** `mapsFor` answers the sources' cards in the registry's order (Bible Mapper's first). The ranking by the verse's places is applied within each source (`rankPerSource`): a link-only source's card names places too, and must not outrank a map. The door counts every card of every source that is On, so it shows where only the second source has cover, and `Maps · N` is the sum.
- **A link-only source.** Its cards have `kind: 'link'` and `open: { url, fallback? }`, and its `imageUrl` answers null. The sheet draws one block per source that answered, in `mapsFor`'s order: Bible Mapper's as ever (unheaded), a source whose cards have `open` under its name (a group named by the source), each row 44 px with the title, the card's `period` as the second line (the source writes "Opens in Logos" or "Opens on the web" there), and `↗`.
  A row is a plain `<a href={open.url}>`: with a `fallback` it has `data-fallback` and a tap arms it (`armFallback`, `src/resources/openApp.ts`: the https address opens if the app did not), an https address alone opens in a new tab. It never opens `MapView`, and the tutor's `openCard` skips it.
  The tests' own sources are in `tests/support/test-maps.ts` (`linkSource`, `linkSourceNeedingLogos`; `registerTestMaps({ links: true })`), proved in `features/maps.feature` (two sources, one with no cover, each switched off) and `features/maps-settings.feature` (the Settings rows, with a second source mocked into `SOURCES`).

## Adding a second source

One file in `src/maps/sources/` and one line in `SOURCES` (`src/maps/sources/index.ts`); it gets its Settings switch (above) and `mapsFor` then answers the cards of both, the first source's first. Nothing else changes: the sheet reads `MapCard`s and asks the
source of each (`card.source`) for its `credit` and `imageUrl`. Add the source's credit to `ATTRIBUTION.md` and `src/tutor/credits.ts` in the same story.

The worked example is the Logos Atlas, a link-only source: it holds no pictures and copies nothing. It is one file, `src/maps/sources/logosatlas.ts`, and one line in `SOURCES`.

## The Logos Atlas (mw-zbjgn3r.7, PROVISIONAL, Governor to confirm; every link UNVERIFIED on a device until he taps it)

`logosAtlas` is `{ id: 'logosatlas', name: 'Logos Atlas', needs: 'logos', default: 'on', imageUrl: () => null }`: it answers only while Logos is On, and draws nothing itself. `mapsFor` reads the places (the shared `places()`), the shelf (`shelfOf()`)
and the list (`data/logosatlas.json`) and hands them to the pure `logosAtlasCards(ref, places, shelf, index)`, which answers two kinds of row, all `kind: 'link'` and all opening in Logos or the Logos web app, never in `MapView`:

- **Row A, the web atlas** (`https://app.logos.com/tools/atlas/<id>`, behind his Faithlife sign-in). One card per map of the list that covers the reference (`mapsCovering`, at most three), titled `Logos Atlas: <title>` with the period under it. The address carries the view when
  the verse has places with a position (TIPNR's): `?zoom=<z>&style=terrain&lat=<mean lat, 4 places>&lng=<mean lng>&layout=one`, the centre the mean of the places' positions and the zoom from `viewOf(places)`: the larger of the latitude and longitude spreads is over 3 degrees `6.36` (the zoom
  the atlas itself used in the one address checked), under 1 degree `8`, else `7` (PROVISIONAL). With no position the address is the bare map. Where no map covers the reference but its places have a position, one card on the base map (`BASE_MAP`, `BIBLICALWORLDPREPATRIARCHALPERIOD-EN`, the one id verified by
  hand), `Logos Atlas at Gerar, Admah, Lasha` (the first three places with a position in the order the verse names them, then `and N more`; a whole chapter `Logos Atlas at the places of Genesis 10`). It has no period: the base map is the Pre-patriarchal overview and does not claim the verse. No place and no map: no row.
- **Row B, the Lexham Geographic Commentary at the passage.** The first catalogue entry of the series `Lexham Geographic Commentary` (`CATALOGUE`) whose `covers` holds the book and that is On or Pinned on his shelf: `Lexham Geographic Commentary on the Pentateuch at Genesis 10:19`, `Opens in Logos`, linking
  `logosres:lxgeocommpent;ref=Bible.Ge10.19` with the fallback `https://ref.ly/logosres/lxgeocommpent?ref=Bible.Ge10.19` (`resourceLink` and `bibleRef`, the form `src/library/inLogos.ts` builds for any commentary; a range opens at its first verse; a whole chapter at `Bible.Ge10`). One row at most (Galatians is in two volumes' `covers`: the first, in the catalogue's order).
  The catalogue gives the Pentateuch volume the Psalms whole; `CHAPTERS` holds it to Psalms 78 to 105, which is what the volume covers (the Mayor's reading, PROVISIONAL).

**The list.** `src/maps/data/logosatlas.json` is the map list of the signed-in web atlas, read once by the Mayor on 2026-10-26 and copied as it was: `{ source, count, periods, maps: [{ id, title, period, order, passages }] }`, 261 maps in 13 periods, 258 with passages
(the three first-century overview maps have none). Nothing in it is written by hand: `tests/unit/logos-atlas-data.test.ts` fails on an id that is not `NAME-EN`, on a duplicate, on a missing map the code names and on a count other than 261. A map's `passages` are the verses the atlas tags it to, as Logos writes them.

**Book numbers.** The passages use Logos's bible datatype numbers, not the app's order: Genesis 1 to Malachi 39 (the 39 books in canon order), then Matthew 61, Mark 62, Luke 63, John 64, Acts 65, Romans 66, ... Hebrews 79, ... Revelation 87 (40 to 60, the deuterocanon, are unused). `toLogosBook(code)` is that table (checked: Jonah is 32, Paul's travels sit under 65).
The passage forms are `bible.B.C.V`, `bible.B.C.V-B.C.V`, `bible.B.C.V-C.V`, `bible.B.C.V-V`, `bible.B.C` (a whole chapter) and `bible.19.N.title` (a Psalm's title, counted as verse 1): `spanHolds(passage, ref)` reads them all.

**Which maps cover a reference.** `mapsCovering(ref, index)`: the maps with a passage that holds any verse of the reference, the map whose narrowest covering passage is narrowest first; a tie goes to the map tagged to fewer passages (a story map has a handful, a period's overview many) and then to the list's `order`.
That gives Jonah 1:1 `JONAHSTRAVELS-EN` before `BIBLICALWORLDDIVIDEDKINGDOM-EN`, and Genesis 11:4 `THETOWEROFBABEL-EN` before the Pre-patriarchal overview. For a whole chapter the map that covers most of the chapter leads, so a map tagged to one verse in passing does not.

**The periods** (the list's slugs, as the sheet names them under a row; `PERIOD_NAMES`): `prepatriarchalperiodera` Pre-patriarchal period, `patriarchalperiodera` Patriarchal period, `exodusfromegyptera` Exodus from Egypt, `conquestera` Conquest, `judgesera` Judges, `unitedkingdomera` United Kingdom,
`dividedkingdomera` Divided Kingdom, `assyrianexileera` Assyrian exile, `babyloniancaptivityera` Babylonian captivity, `returnfromexileera` Return from exile, `hellenisticera` Hellenistic period, `lifejesusera` Life of Jesus, `earlychurchera` Early church. Each period has one overview map,
`Biblical World — <Period>`, that leads it.

**Refreshing the list, or adding a map's id.** An id is never typed in. Sign in at `https://app.logos.com/tools/atlas`, read the map list embedded in the page (id, title, period, order and the passages each map is tagged to), write it in the same shape and update the count in
`tests/unit/logos-atlas-data.test.ts`; a map opens at `https://app.logos.com/tools/atlas/<id>`, so a new id can be opened in the browser before it is committed. Nothing else changes: the code reads the list.

**Not done, on purpose.** No "Logos maps for this chapter" list (the tags live inside Logos); no atlas-book rows (they index no passage); no Factbook place rows (the place sheet, later); no `logos4:Atlas;ref=` row until a phone has opened one. The tutor is not told these rows (`mapsForTutor` leaves out a card that has `open`).

## The tutor brings up maps (mw-zbjgn3r.4)

The Bible talk (not verse-ask) tells the tutor the maps of the passage it holds and may answer with a link to one.

- **The request**: `maps`, built by `mapsForTutor(cards, text?)` (`src/maps/forTutor.ts`) from `mapsFor` of the talk's chapter (read in `src/useTalk.ts`, handed to `buildTalkRequest`): each card as `{ id, title, period, places }`, at most `MAX_TUTOR_MAPS` (12). A video is left out (a map link opens a map in the app, a video is a page in the browser).
  `places` are the names of the card (Bible Mapper's `Sodom?`, `Jericho (OT)` read as `Sodom`, `Jericho`) that the held verse's or range's English speaks, in the order it speaks them, and the cards that name most come first; for a talk about a whole chapter `places` is empty and the cards keep the source's order.
  No field is sent in a talk from a screen, in About, or where the chapter has no map. `fitHistory` drops the whole field (`dropMaps`) right after the shelf digest is cut, before a held passage or a verse. `src/tutor/knows.ts` lists it under his progress (`maps`); verse-ask, verse-read and tips give their reason.
- **The answer**: `links` takes `{ kind: 'map', map: <id> }` (still at most three links in all, `AnswerLink` in `src/data/db.ts`). The id is a line of the request's `maps`; `src/resources/tutorLinks.ts` `mapChip(id, cards)` finds it among the maps of the talk's chapter and `src/TutorLinks.tsx` draws the chip `Map: <title>`;
  an id the chapter lacks, or a talk with no passage, draws nothing. The chip closes the Talk sheet and calls `openMaps({ book, chapter }, id)`.
- **openMaps(ref, cardId?)** (`src/maps/openMaps.ts`): with a card id the sheet opens as usual and, once the chapter's maps are read, the map of that card opens over it (`MapsSheet` `openCard`); Back returns to the sheet. A card the place lacks leaves the sheet alone.
- **The rule** is the `### Links to a map` paragraph of `grinds/bible-talk.instructions/200-links-to-his-study-resources.md`; the examples are `grinds/examples/bible-talk/map-of-the-passage.json` (Genesis 10:19, he asks 'is there a map of this?': the answer names Sodom and Gomorrah Are Destroyed and links `SodomAndGomorrah`) and `no-map-listed.json` (no `maps`, no link).
