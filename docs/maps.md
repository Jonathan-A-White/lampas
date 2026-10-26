# Maps

Lampas shows a chapter's maps beside its text: a quiet door, the Maps sheet and the map opened in the app (mw-zbjgn3r.2, 'The screens' below), over the module and the data under them (mw-zbjgn3r.1).
A map is a `MapCard`; where it comes from is a `MapSource`. Reading the maps needs no licence.

## The module: `src/maps/`

| File | Holds |
| --- | --- |
| `types.ts` | `MapSource`, `MapCard`, `MapRef` (`{ book, chapter, from?, to? }`, the app's book codes of `src/data/canon.ts`), and the shape of the Bible Mapper file |
| `period.ts` | `period(start, end?)`: the card's dates as a string, negative years BC. `c. 2070 BC` (one date in BC), `1010 to 970 BC`, `AD 30` (one date in AD), `AD 27 to 30`, `5 BC to AD 30`; empty for a map with no dates |
| `sources/biblemapper.ts` | Bible Mapper as a `MapSource` |
| `mapsFor.ts` | `mapsForSources(sources, ref)`: every source's cards, the sources in list order, each source's cards in its own order |
| `index.ts` | the registry `SOURCES` and `mapsFor(ref)`, the door the screens take |
| `data/biblemapper.json` | the compacted index (below), loaded by a dynamic import on first use: its own chunk, not in `pwa-precache.ts` |

A `MapSource` is `{ id, name, homepage, credit, mapsFor(ref) → MapCard[], imageUrl(card, 'low' | 'medium' | 'high') → string | null }`. The `credit` is the line shown with
every map of the source; `imageUrl` answers null where the source has no picture to show at that size. Bible Mapper maps by the chapter, so the verses of a `MapRef` are ignored;
ranking the cards by verse is a later story's.

## The screens (mw-zbjgn3r.2)

- **The door**, `src/maps/MapsDoor.tsx`: a 44 px button `Maps · N` (`useMaps`, which calls `mapsFor`), drawn only while N is above 0. On the Verse view it sits in the doors line with In Logos and In another book…, for a verse (`from` its number) and for a passage (`from`, `to`);
  at the foot of every chapter, Old and New Testament, `src/reader/ChapterActions.tsx` draws it before the chapter buttons. Nothing is drawn inside `VerseText`, and with Immersive reader On the Reader draws no door (the Verse view keeps it).
- **The sheet**, `src/maps/MapsSheet.tsx`: a bottom sheet with `useSheetBack`, opened by `openMaps(ref)` (`src/maps/openMaps.ts`; the tutor story will call it too) and drawn by `<MapsHost />`, mounted once in `App.tsx`. Titled `Maps for Genesis 10:19`, `Maps for Genesis 10:1-19` or
  `Maps for Genesis 10`; the cards grouped as Events, Regions and Videos (a group absent when empty), each row 44 px with the title and its period on a second line. No thumbnails (the low-res picture is about 500 KB): nothing is fetched until a map is opened. A video row is a plain `https` link
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

## The site's terms, and the credit

The About page of biblemapper.com says: "You are welcome to use these maps for any non-commercial purposes. The only requirement is that you cite biblemapper.com as the source of the map(s), and if you are
including them in an online resource, provide a hyperlink back to biblemapper.com. For any commercial use, please contact us first at the contact information provided here: biblemapper.com/contact.html.
All text and maps copyright (c) 2026 by David P. Barrett. All rights reserved."

So every map Lampas shows carries `MapSource.credit` ('Map by David P. Barrett, biblemapper.com') and a link to `MapSource.homepage`; the screens read both from the source, never write them out. `ATTRIBUTION.md`
has the entry (the About screen's source), `tests/support/credits.ts` the rule that holds a file in `src/maps/data/` to it, and `src/tutor/credits.ts` the tutor's short form. A source's own terms may differ: a
second source gets its own entry and credit.

Open question for the Governor: Lampas is free to read and a licence unlocks the AI. Maps shown in the free part are non-commercial use; whether the paid part touches them is the Governor's to say before the maps ship.

## Adding a second source

One file in `src/maps/sources/` and one line in `SOURCES` (`src/maps/index.ts`); `mapsFor` then answers the cards of both, the first source's first. Nothing else changes: the sheet reads `MapCard`s and asks the
source of each (`card.source`) for its `credit` and `imageUrl`. Add the source's credit to `ATTRIBUTION.md` and `src/tutor/credits.ts` in the same story.

The worked example is the Logos Atlas, a link-only source: it holds no pictures and copies nothing.

```ts
export const logosAtlas: MapSource = {
  id: 'logosatlas',
  name: 'Logos Atlas',
  homepage: 'https://www.logos.com',
  credit: 'Atlas pages open in your own Logos',
  // a card per atlas page that covers the chapter, its `article` a Logos link (docs/resources.md)
  mapsFor: async (ref) => pagesFor(ref).map((page) => ({ id: page.id, source: 'logosatlas', title: page.title, kind: 'region', period: '', article: logosLink(page), places: [] })),
  imageUrl: () => null, // link only: the sheet shows the card as a link, with no picture
};
```
