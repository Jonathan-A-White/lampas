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

1. Draw `public/pictures/<transliterated-headword>.svg` (lower case a-z only, for example `agapao.svg`);
   the next words to draw are the top of the picture queue (below).
2. Add the line `"ἀγαπάω": "agapao.svg"` to `PICTURES` in `src/data/pictures.ts` (the headword, NFC).
3. `npm test`: `tests/unit/pictures.test.ts` checks the file exists, parses, is on the 96 grid, has no
   text or image, is under 2.5 KB, and that the map and the folder agree. The picture is precached by
   `pwa-precache.ts` (`pictures/*.svg`).

A word he imports himself has a picture only if a file for its headword is added this way.

## The 63 seed words

Every seed word with a picture keeps it. These 11 have none, because they are abstract words with nothing to
draw that would not mislead: ἀλλά, ἀμήν, γάρ, δέ, εἰ μή, μου, ὁ (the article), ὅτι, οὐδέ, οὖν, οὔτε. Those
that are dictionary forms of their own are in the skip list below; εἰ μή is two words (εἰ has a picture),
μου is ἐγώ's (which has one), and the article is not in the frequency table, so none of the three is queued.

Words that share an idea but not a picture: the pronouns each show people (ἐγώ one, σύ one pointed at,
ἡμεῖς a group in amber, ὑμεῖς a group in blue pointed at, αὐτός one in grey spoken of, ἑαυτοῦ one pointing
at itself); the prepositions are a dot and a box (ἐν in, ἐκ out of, εἰς into, ἐπί on, ὑπό under, παρά
beside, ἀπό away from, πρός up to, διά through, περί around, κατά a dot rolling down a slope; μετά is two
people side by side); καί is two things joined; οὐ is a red "no" sign and μή a red raised hand, "don't"; εἰ is a fork in
the road; οὗτος points at a thing near, ἐκεῖνος at one far off.

## The picture queue

`npm run pictures:queue` (`scripts/pictures-queue.ts`) prints every New Testament dictionary form that has
no picture, the commonest first, from the bundled count of each lemma (`public/data/frequency.json`): its
rank in that table, its count, the headword to key it by in `PICTURES` (the first spelling of the lemma),
its Strong's number and gloss, and `(name)` for a proper name. `npm run pictures:queue -- --top 60` prints
the first 60. A word in the skip list below is left out; so is a word whose picture is keyed by another
form of it (εἶπεν's picture is λέγω's, the seed's εὐαγγελίζω is the table's εὐαγγελίζομαι).

### Making the next slice

A slice is the same story again: run `npm run pictures:queue -- --top 70`, then go down the list from the
top. Draw each word you can (the rules above; the key is the headword the queue prints, the file its
transliteration), and put each word you cannot draw honestly in the skip list with a one-line reason;
never pass over a word silently. Stop at 50 new pictures. `npm test` holds it: `tests/unit/pictures.test.ts`
fails when a word above the last one drawn has neither a picture nor a skip. Raise the count in its
'has drawn the slices from the top' test by 50 a slice.

Slice 1 (mw-5r3p30.383) drew the 50 from αὐτός to ὄχλος in today's style (PROVISIONAL: the Governor's
choice of style may change it for the slices after).

## Nothing honest to draw

The skip list: each line is a dictionary form as the queue prints it, then why. The queue reads it.

- **ἀλλά** — "but" turns from one thought to the next; there is no thing in it.
- **ἀμήν** — "truly, so be it" agrees with what was said; a picture would show something else.
- **γάρ** — "for, since" gives a reason; a reason has no shape apart from what it explains.
- **δέ** — a light "and, but" that links sentences; it would draw the same as καί.
- **ὅτι** — "that, because" opens a clause; there is nothing in the word itself to see.
- **οὐδέ** — "and not, not even": a red sign would read as οὐ alone.
- **οὖν** — "therefore" draws a conclusion; no object or action to show.
- **οὔτε** — "neither, nor": a red sign would read as οὐ alone.
- **ὅς** — the relative pronoun "who, which" points back at a word already said; drawn, it would be a person or thing it is not.
- **τίς** — "who? which?" asks; the only picture is a question mark, which is writing.
- **τις** — "someone, anything": any figure drawn would read as a particular person (αὐτός, ἄνθρωπος).
- **ὡς** — "as, like, when" compares; two shapes side by side read as καί or as "two".
- **ἤ** — "or" chooses; the fork in the road is already εἰ's, and two shapes read as καί.
- **ἐάν** — "if" with the subjunctive: the fork is εἰ's, and a second fork would make them one picture.
- **οὕτως** — "thus, so" points back at the way something was said; nothing to see.
- **τε** — a light "and, both" that would draw the same as καί.
- **μέν** — marks the first half of a contrast ("on the one hand"); there is no thing in it.
- **καθώς** — "just as" compares, like ὡς; nothing to draw that would not mislead.
- **ἄν** — a particle of the possible that English does not translate; nothing to draw.
