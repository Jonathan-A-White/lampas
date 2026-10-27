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

1. Draw `public/pictures/<transliterated-headword>.svg` (lower case a-z only, for example `agapao.svg`; when the name is taken, add a plain
   word: οὕτως is `houtosadv.svg`, because `houtos.svg` is οὗτος);
   the next words to draw are the top of the picture queue (below).
2. Add the line `"ἀγαπάω": "agapao.svg"` to `PICTURES` in `src/data/pictures.ts` (the headword, NFC).
3. `npm test`: `tests/unit/pictures.test.ts` checks the file exists, parses, is on the 96 grid, has no
   text or image, is under 2.5 KB, and that the map and the folder agree. The picture is precached by
   `pwa-precache.ts` (`pictures/*.svg`).

A word he imports himself has a picture only if a file for its headword is added this way.

## The 63 seed words

Every seed word with a picture keeps it. These 4 have none: ἀμήν, εἰ μή, μου, ὁ (the article). ἀμήν is in the skip list below;
εἰ μή is two words (εἰ has a picture), μου is ἐγώ's (which has one), and the article is not in the frequency table, so none of the
three is queued. The small link words of the seed (ἀλλά, γάρ, δέ, ὅτι, οὐδέ, οὖν, οὔτε) were skipped until mw-5r3p30.785 drew
them as one family: see Link pictures below.

Words that share an idea but not a picture: the pronouns each show people (ἐγώ one, σύ one pointed at,
ἡμεῖς a group in amber, ὑμεῖς a group in blue pointed at, αὐτός one in grey spoken of, ἑαυτοῦ one pointing
at itself); the prepositions are a dot and a box (ἐν in, ἐκ out of, εἰς into, ἐπί on, ὑπό under, παρά
beside, ἀπό away from, πρός up to, διά through, περί around, κατά a dot rolling down a slope; μετά is two
people side by side); καί is two things joined; οὐ is a red "no" sign and μή a red raised hand, "don't"; εἰ is a fork in
the road; οὗτος points at a thing near, ἐκεῖνος at one far off. The link words are a family of their own (Link pictures below).

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

The link pictures (below) are drawn as a family, out of the queue's order, so that test leaves `LINK_WORDS` out of its count.

Slice 1 (mw-5r3p30.383) drew the 50 from αὐτός to ὄχλος in today's style (PROVISIONAL: the Governor's
choice of style may change it for the slices after).

## Link pictures

He asked for pictures that tell the small link words apart (mw-5r3p30.785). A link word alone has no thing in it, so what is
drawn is the relation, and the family is the point: `LINK_WORDS` in `src/data/pictures.ts` lists them, and
`npm run pictures:sheet` (`scripts/pictures-sheet.ts`) draws them side by side at 80 px, each with its Greek and gloss, in
`docs/pictures/link-words.svg` (text is allowed on the sheet, never in a picture). Run it after changing one, and commit the sheet:
`tests/unit/pictures.test.ts` fails when it is stale.

The shared frame: two thought-blocks, rounded bars, the first white and above, the second amber and below, as two lines of
text read; the link between them is blue. Only the link changes from word to word, so the eye learns the difference, not a
new scene. A broken line (dots or dashes) is ἄν's "maybe, -ever" wherever it appears (ἄν, ἐάν, ὅταν); red is still only "not"
(οὐδέ, οὔτε). A compound draws as its parts: οὐδέ is δέ struck, ἐάν is εἰ with ἄν's broken line, ὅταν is ὅτε with it.

- **γάρ** — "for, since": a hook from the second back up into the first (the reason explains what came before). Unlike οὖν's arrow it goes back, and it is a hook on the side, not ἵνα's arrow at a target.
- **οὖν** — "therefore": a double arrow (⇒) down from the first into the second (what follows from it). Unlike ἵνα's single arrow it lands on a thought already said, not an aim.
- **ὅτι** — "that": the first opens onto the second, held in brackets (what is said, seen or known). When it means "because", picture γάρ's hook instead: the picture draws its commoner job.
- **δέ** — "and, but", light: the second one step on and aside, joined by a plain step with no arrow. Not καί's plus: δέ moves on rather than adding alongside.
- **οὐδέ** — "and not, nor": δέ's step with the second struck in red. Not οὐ's red sign: the strike falls on the second thought only.
- **οὔτε** — "neither ... nor": both thoughts struck in red. Not οὐ's ring: two strikes, one on each.
- **ἀλλά** — "but (not this, that)": the first greyed and crossed out, a strong arrow turning down to the bright second. Stronger than δέ's step, and its strike is grey, not οὐ's red.
- **μέν** — "on the one hand": a balance, the first pan holding the white thought, the second pan still dashed and grey. μέν ... δέ is a pair: the empty pan is where δέ's thought goes.
- **ὡς** — "as, like": two thoughts of the same shape with ≈ between (alike). Not καί's plus: they are compared, not added.
- **καθώς** — "just as": the same two with = between (exactly as). Closer than ὡς's ≈.
- **οὕτως** — "thus, so": both thoughts drawn as the same zigzag way, an arrow pointing back up at the first. οὗτος points at a thing; οὕτως at the way of the thought before.
- **ἤ** — "or" (also "than"): one way splits into two arrows, one to each thought, to be picked. Not εἰ's fork in the road: no road, two thoughts, and the split runs across.
- **εἴτε** — "whether ... or": ἤ's split, joined again after both into one arrow on (either way the same follows).
- **ἐάν** — "if (maybe)": εἰ's fork, with the amber road dashed (ἄν's maybe). εἰ's roads are both solid.
- **ἄν** — "would, -ever": the second thought dashed, a would-be, joined by dots. It marks a thought as possible; it is not a "not".
- **ὅτε** — "when": both thoughts on one blue line that drops to a point on a grey time line. Not ὡς: the line is time, not likeness.
- **ὅταν** — "whenever": ὅτε's picture with the blue line in ἄν's dots and more ticks on the time line (at any such time).
- **ἕως** — "until": the first runs on, above the time line, into a blue wall, the second just after it. Not εἰ or ἵνα: a stop, not a choice or an aim.

## Nothing honest to draw

The skip list: each line is a dictionary form as the queue prints it, then why. The queue reads it.

- **ἀμήν** — "truly, so be it" agrees with what was said; a picture would show something else.
- **ὅς** — the relative pronoun "who, which" points back at a word already said; drawn, it would be a person or thing it is not.
- **τίς** — "who? which?" asks; the only picture is a question mark, which is writing.
- **τις** — "someone, anything": any figure drawn would read as a particular person (αὐτός, ἄνθρωπος).
- **τε** — a light "and, both": in the link family it would draw as καί's plus or δέ's step, with no relation of its own.
- **ὥστε** — "so that, with the result that": it would draw as οὖν's arrow; the two differ in grammar (ὥστε often takes an infinitive), not in a relation a picture can hold apart.
