# Memory pictures

A small hand-drawn picture helps a Greek word stick. Each is an SVG in `public/pictures/<name>.svg`,
drawn by hand (the way `public/icon.svg` was; no image model, no key, no raster). The Words card shows
it beside the Greek word, and the Quick test shows it beside the word asked. The picture is decorative
(`alt=""`): the Greek and the gloss are always on screen next to it. A word with no picture shows none.

`src/data/pictures.ts` maps a word's headword (the key of the words store, `src/data/lemma.ts`) to its
file. `src/WordPicture.tsx` draws it, or nothing.

## The rules for a picture

- `viewBox="0 0 96 96"`, the `xmlns`, nothing else sized; under 2.5 KB (they run about 0.5 KB).
- No `<text>`, no `<image>`, no `<script>`, no `href`, no data URIs.
- Flat fills and strokes only. Every picture is a rounded tile with its own dark background
  (`<rect width="96" height="96" rx="16" fill="#16203a"/>`), because an SVG shown through `<img>` cannot
  read the page's CSS variables or `currentColor`; with its own tile it reads the same on the light and
  the dark theme. Palette: white `#e7ebf3`, amber `#f2b544`, blue `#7fb2e5`, grey `#9aa5ba`, red `#ef6a6a`
  (only for "not"), tile `#16203a`.
- Draw the thing the word means; a verb shows its action (a hand writing, an eye), a noun its object.
  Keep strokes about 4 wide and shapes big: it is shown at 56 px on a card and 80 px in the test.

## Adding one

1. Draw `public/pictures/<transliterated-headword>.svg` (lower case a-z only, for example `agapao.svg`).
2. Add the line `"ἀγαπάω": "agapao.svg"` to `PICTURES` in `src/data/pictures.ts` (the headword, NFC).
3. `npm test`: `tests/unit/pictures.test.ts` checks the file exists, parses, is on the 96 grid, has no
   text or image, is under 2.5 KB, and that the map and the folder agree. The picture is precached by
   `pwa-precache.ts` (`pictures/*.svg`).

A word he imports himself has a picture only if a file for its headword is added this way.

## The 63 seed words

52 have a picture. These 11 have none, because they are abstract words with nothing to draw that would
not mislead: ἀλλά, ἀμήν, γάρ, δέ, εἰ μή, μου, ὁ (the article), ὅτι, οὐδέ, οὖν, οὔτε.

Words that share an idea but not a picture: the pronouns each show people (ἐγώ one, σύ one pointed at,
ἡμεῖς a group in amber, ὑμεῖς a group in blue pointed at); ἐν and ἐκ are a dot in and out of a box;
καί is two things joined; οὐ is a red "no" sign; εἰ is a fork in the road.
