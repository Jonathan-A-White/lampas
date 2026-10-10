# Research: the King James Version and the Greek behind it as a text pair

Story mw-5r3p30.137. Written 2026-10-10. Research only: no app code changed. Every number below was measured on 2026-10-10 from the
files named, with throw-away scripts (not committed) that parsed the real downloads.

The ask (the Governor, Postern general, 2026-10-09 21:27Z): his oldest son likes the King James; can the King James be an option, and
the Greek behind it, "in the settings", so that the tutor can switch it too. What Lampas has now ("my preference") stays the default.

## What I found

* **Both texts exist as free, machine-readable data, and they come already word-aligned.** The CrossWire KJV module tags every English
  chunk with the Strong's number, the Robinson (RP-style) parsing code and the **position of the Greek word(s) it renders** (`src="4 5"`).
  That is the same information the MSB table gives Lampas today, so the existing chapter JSON shape (`g` words, `e` chunks, `e[].g`
  links) can hold the KJV pair with almost no change.
* **The Greek those positions point at is Robinson's Textus Receptus, which agrees with Scrivener 1894 on 99.8% of Scrivener's words**
  (140,376 of 140,655 line up; 279 do not, in 186 verses). It is not a pure Scrivener file, see "The Greek behind it".
* **No single file has accented Greek, Strong's, morphology and Scrivener's text.** Robinson's files are Beta code with no accents or
  breathings. Accented spelling has to come from a second source (KJTR, then STEPBible TAGNT): 99.4% of the 140,766 Greek words get an
  accented form that way; about 860 words (495 distinct forms) need a reviewed fix-up table.
* **Licences work out.** The Greek (byztxt) is public domain. The KJV text is public domain in the US; the CrossWire module is marked
  GPL as a distribution licence (see the risk note, which the Governor should read). The accent sources are CC BY 4.0 (credit only).
  One tempting source (the CrossWire `TR` module) is CC BY-NC-SA and is based on Stephanus 1550, so it is out.
* **Size is a wash.** A whole-NT prototype in Lampas's shape came to 28.3 MB raw, 8.6 MB gzipped, against 31.9 MB / 9.3 MB for the
  MSB pair today. The phone fetches one chapter at a time, so a phone only pays for what it reads.
* **Versification differs and the story list must carry it:** Romans 14 and 16 (the doxology), and four verses the MSB lacks.
* A reader changes the pair in Settings; the words he is learning are keyed by lemma, so they carry over untouched.

## The King James Version text

### Recommended source: CrossWire `KJV` module, version 3.1 (2023-07-19)

* Home and source: https://gitlab.com/crosswire-bible-society/kjv (OSIS XML, `kjv.osis.xml`, 28 MB for the whole Bible, Old Testament too);
  raw file https://gitlab.com/crosswire-bible-society/kjv/-/raw/master/kjv.osis.xml .
  The built SWORD module (4.0 MB zip, whole Bible, compressed) is https://www.crosswire.org/ftpmirror/pub/sword/packages/rawzip/KJV.zip ;
  module page https://www.crosswire.org/sword/modules/ModInfo.jsp?modName=KJV .
* Text: the King James Version of 1769 (Blayney), "with Strongs Numbers and Morphology". New Testament Strong's data from the CrossWire
  KJV2003 Project, synchronised to a Textus Receptus; "Dr. Maurice Robinson [provided] the base Greek text with Strong's and Morphology"
  (version 3.1 uses his TR data of 2016).
* **Licence.** The module's `kjv.conf` says `DistributionLicense=GPL`. Its description says: the rights to the base text are held by the
  Crown of England; the work is "offered freely for any purpose" and "CrossWire Bible Society hereby grants a general public license to
  use this text for any purpose". The KJV text itself is public domain in the United States; in the United Kingdom the Crown holds
  letters patent over printing it. **Risk to settle before shipping:** "GPL" on a data file is unusual and its effect on the app
  that bundles it is unclear. The CrossWire statement is the intent (use for any purpose); the Governor may want one line to
  modules@crosswire.org to confirm, or to credit it the way the MSB is credited and ship the text as "public domain, with CrossWire's
  Strong's tagging". The repo has no separate licence file.

### John 1:1 in its native format (OSIS, `kjv.osis.xml`, line 29276)

```xml
<verse osisID="John.1.1" sID="John.1.1"/><w src="1" lemma="strong:G1722 lemma.TR:εν" morph="robinson:PREP">In</w> <w src="2" lemma="strong:G746 lemma.TR:αρχη" morph="robinson:N-DSF">the beginning</w> <w src="3" lemma="strong:G1510 lemma.TR:ην" morph="robinson:V-IAI-3S">was</w> <w src="4 5" lemma="strong:G3588 strong:G3056 lemma.TR:ο lemma.TR:λογος" morph="robinson:T-NSM robinson:N-NSM">the Word</w>, <w src="6" lemma="strong:G2532 lemma.TR:και" morph="robinson:CONJ">and</w> <w src="7 8" lemma="strong:G3588 strong:G3056 lemma.TR:ο lemma.TR:λογος" morph="robinson:T-NSM robinson:N-NSM">the Word</w> <w src="9" lemma="strong:G1510 lemma.TR:ην" morph="robinson:V-IAI-3S">was</w> <w src="10" lemma="strong:G4314 lemma.TR:προς" morph="robinson:PREP">with</w> <w src="11 12" lemma="strong:G3588 strong:G2316 lemma.TR:τον lemma.TR:θεον" morph="robinson:T-ASM robinson:N-ASM">God</w>, <w src="13" lemma="strong:G2532 lemma.TR:και" morph="robinson:CONJ">and</w> <w src="16 17" lemma="strong:G3588 strong:G3056 lemma.TR:ο lemma.TR:λογος" morph="robinson:T-NSM robinson:N-NSM">the Word</w> <w src="15" lemma="strong:G1510 lemma.TR:ην" morph="robinson:V-IAI-3S">was</w> <w src="14" lemma="strong:G2316 lemma.TR:θεος" morph="robinson:N-NSM">God</w>.<verse eID="John.1.1"/>
```

Reading it: each `<w>` is one English chunk, in English order. `src` lists the 1-based positions of the Greek word(s) it renders in the
verse's Greek word list (here 17 words). `lemma="strong:… lemma.TR:…"` gives, parallel to `src`, each Greek word's Strong's number and its
form in the TR, lower case and **without accents**. `morph` gives the Robinson code per word. Note "God was the Word" at the end: English
order differs from Greek order (`src="16 17"` then `15` then `14`), as the MSB does too.

### Other markup in the module

* `<transChange type="added">man</transChange>`: a word the translators supplied (italic in print). 3,317 spans, 4,218 words in the
  New Testament. They carry no Greek, which is the same idea as the MSB's `[bracketed]` supplied words.
* `<w … src="12" type="x-split-393">to make</w> … <w … src="12" type="x-split-393">a publick example</w>`: one Greek word rendered by two
  separate stretches of English (Matthew 1:19). 2,658 verses repeat a `src` for this reason.
* `<w … src="17"/>`: a Greek word with no English (mostly the article): 6,330 of them.
* `src="13n"`, `src="29p"`: 37 positions with a suffix, where the TR has a word order or reading that differs between editions.
* `<q who="Jesus">` (the words of Jesus, 2,026 verses) and `<milestone type="x-p" marker="¶"/>` (a paragraph mark, 432 verses).
  **There are no section headings** (0 `<title>` in the New Testament verses), so the Section headings setting has nothing to show on
  this pair.
* Two glitches: in Mark 14:17 and Acts 20:37 the `morph` attribute misses its `robinson:` prefix on the second code.

### Other KJV sources looked at

| Source | Verdict |
| --- | --- |
| https://github.com/kaiserlik/kjv (JSON, Strong's tags, italics) | Judged from its description only (JSON, Strong's tags, italics): no Greek word positions, so no word alignment to the Greek. Not opened. |
| `kennethreitz/kjvstudy.org` and similar study apps | Applications, not data sources. |
| Door43 `STR_el-x-koine_trs` (a Greek source, listed here because it turned up in the same search: Scrivener 1894 with morphology, Strong's, lemma; CC BY-SA 4.0 by its manifest) | The page was behind a bot check (Cloudflare) and I could not open it; the licence is from a search summary, so unverified. Share-alike would bind the data. Not recommended. |

## The Greek behind it: Scrivener's 1894 Textus Receptus

Nobody publishes one clean file with every property Lampas needs. Four free sources, what each gives:

| Source | URL | Licence | Accents | Strong's | Morphology | Is it Scrivener 1894? |
| --- | --- | --- | --- | --- | --- | --- |
| byztxt `greektext-scrivener` | https://github.com/byztxt/greektext-scrivener | Public Domain ("Copy freely", README) | no (Beta code) | no | no | **Yes, text only** (Robinson's keying of Scrivener 1894) |
| byztxt `greektext-textus-receptus` (`parsed/*.UTR`) | https://github.com/byztxt/greektext-textus-receptus | Public Domain ("Copy freely", README) | no (Beta code) | yes | yes (RP codes) | Robinson's own TR; contains Scrivener's words plus marked alternatives |
| CNTR KJTR | https://github.com/Center-for-New-Testament-Restoration/KJTR | CC BY 4.0 (Alan Bunning) | **yes** | yes (extended, x10) | yes (Bunning's own codes, not RP) | No: a TR rebuilt to match the 1769 KJV; 99.3% of Scrivener's words |
| STEPBible TAGNT | https://github.com/STEPBible/STEPBible-Data (folder `Translators Amalgamated OT+NT`) | CC BY 4.0 (credit STEPBible / Tyndale House; already credited for TBESG) | yes (NA28 spelling where it has the word) | yes | yes (RP-like) | Each word says which editions have it; `TR` is tagged "Scrivener's 1894" |
| CrossWire `TR` module | https://www.crosswire.org/sword/modules/ModInfo.jsp?modName=TR | **CC BY-NC-SA 4.0** | n/a | yes | yes | **No: Stephanus 1550 with Scrivener variants** |

The CrossWire `TR` module is out (non-commercial, share-alike, and the wrong base text). Everything else is usable.

### Recommended: the KJV module's own Greek, accented from KJTR then TAGNT

The Greek of the pair is the Greek **the KJV module points at** (its `src` positions and `lemma.TR` forms): Robinson's TR, parsed, public domain.
Measured against byztxt's Scrivener 1894 text (140,655 words): 279 Scrivener words (0.2%), in 186 verses, are not matched
by the KJV module's Greek sequence. For the Governor's wording, "Scrivener's 1894 Textus Receptus (Robinson's parsed edition)" is honest;
"exactly Scrivener" is not, and the 186 verses can be listed in the About text, or fixed to Scrivener by a reviewed table.

Accents come from outside:

| Step | Source | Words accented | Left |
| --- | --- | --- | --- |
| 1 | KJTR, matched to the KJV module's Greek by sequence alignment per verse (unaccented forms compared) | 139,578 (99.2%) of 140,766 | 1,188 |
| 2 | STEPBible TAGNT (rows whose editions include `TR`), same alignment, only for words step 1 left | 329 more, 139,907 in all (99.4%) | 859 |
| 3 | A reviewed table in the repo, one line per leftover form | 495 distinct forms cover the 859 words | none |

The leftovers are mostly spelling variants: Δαβίδ (the TR) against Δαυίδ (KJTR and the critical texts) is 59 of them. A table of 495
forms is a reasonable, reviewable thing; the alternative, taking all 140,766 forms from KJTR and ignoring a handful of spelling
differences, is simpler but then the Greek is KJTR's, not Scrivener's.

### John 1:1 in native format

**byztxt parsed Textus Receptus** (`JOH.UTR`, Beta code, no accents; `q` is theta, `v` final sigma):

```text
1:1 en 1722 {PREP} arch 746 {N-DSF} hn 1510 5707 {V-IAI-3S} o 3588
 {T-NSM} logov 3056 {N-NSM} kai 2532 {CONJ} o 3588 {T-NSM} logov 3056
 {N-NSM} hn 1510 5707 {V-IAI-3S} prov 4314 {PREP} ton 3588 {T-ASM}
 qeon 2316 {N-ASM} kai 2532 {CONJ} qeov 2316 {N-NSM} hn 1510 5707
 {V-IAI-3S} o 3588 {T-NSM} logov 3056 {N-NSM}
```

Each word is: form, Strong's number, (a second number such as 5707, the Robinson tense-voice-mood code, on verbs), `{RP code}`. A `|`
mark (783 in the New Testament) opens alternative readings, e.g. `| hmeteran 2251 {S-1PASF} | umeteran 5212 {S-2PASF} |` in 1 Corinthians
15:31: those are the places where editions differ, and choosing the one that matches Scrivener needs the plain text below (488 extra words).

**byztxt Scrivener 1894 text only** (`JOH.SCV`; here `y` is theta and `q` is psi, the opposite of the parsed file):

```text
          1:1         [EUAGGELION TO KATA IWANNHN]
              en arch hn o logov kai o logov hn prov ton yeon kai
     yeov hn o logov
```

**KJTR** (`KJTR.tsv`, tab separated: verse id, accented form with punctuation, unaccented form, lemma, extended Strong's x10, role, morphology):

```text
43001001	¶Ἐν	εν	ἐν	17220	P	.......
43001001	ἀρχῇ	αρχη	ἀρχή	7460	N	....DFS
43001001	ἦν	ην	εἰμί	15100	V	IIA3..S
43001001	ὁ	ο	ὁ	35880	E	....NMS
43001001	Λόγος,	λογοσ	λόγος	30560	N	....NMS
```

**STEPBible TAGNT** (`TAGNT Mat-Jhn …txt`, tab separated: reference and word type, accented Greek with transliteration, English, dStrong=grammar,
dictionary form, editions):

```text
Jhn.1.1#01=NKO	Ἐν (En)	In [the]	G1722=PREP	ἐν=in/on/among	NA28+NA27+Tyn+SBL+WH+Treg+TR+Byz
Jhn.1.1#02=NKO	ἀρχῇ (archēa)	beginning	G0746=N-DSF	ἀρχή=beginning	NA28+NA27+Tyn+SBL+WH+Treg+TR+Byz
```

Compared with the TR's own words, TAGNT is a weaker base: the TR-tagged rows match Scrivener's words exactly for 95.7% of them
(6,049 of 140,538 differ), because TAGNT spells with NA28 where it can and records TR readings that differ only as notes.

## How Lampas loads and aligns text now

`npm run data:build` (scripts/data-build.ts, docs/data.md) reads **one** table, the MSB New Testament tables
(https://majoritybible.com/msb_nt_tables.tsv, public domain): each row is one Greek word in the Byzantine text (Robinson-Pierpont
2005, "RP") with its Strong's number and RP parsing code, **and the MSB English that renders it**, in the same row; rows are sorted
twice (`Greek Sort`, `MSB Sort`) so the English order is recoverable. The build adds the lemma, gloss and definition of each Strong's
number from STEPBible's TBESG lexicon and writes `public/data/<book>/<chapter>.json`.

* A chapter holds `verses[].g`, the Greek words in Greek order (`t`, `tr`, `s`, `l`, `p`, `e`), and `verses[].e`, the English chunks
  in English order (`t`, `g` = indexes of the Greek words, optional `s` = which words are supplied).
* The link is two-way: `g[i].e` names the chunk, `e[j].g` names the words, and the build checks `e[g[i].e].g` contains `i`.
* The Reader's English | Greek view, the Weave (chunk by chunk, `src/data/weave.ts`), "tap an English word to see its Greek" and the tutor
  requests (`services/talk.ts`: `greek` and `english` of the verse) all read only this shape, through `src/data/chapter.ts`.
* John 1:1 today, from `public/data/jhn/1.json`: `[{"t":"In","g":[0]},{"t":"the beginning","g":[1],"s":[0]},{"t":"was","g":[2]},{"t":"the","g":[3]},{"t":"Word,","g":[4]}, …,{"t":"God,","g":[11]},{"t":"and","g":[12]},{"t":"the","g":[15]},{"t":"Word","g":[16]},{"t":"was","g":[14]},{"t":"God.","g":[13]}]`

## Word-by-word alignment for the KJV and TR pair (d)

The KJV module's `src` attribute **is** the MSB table's Greek Sort / MSB Sort relation, in a different shape: a chunk is a `<w>`, and
its `src` is the list of Greek positions. So the alignment does not have to be computed (no word-matching of two texts, no
Strong's-number heuristics); it is read, as it is from the MSB.

| Lampas chapter JSON | MSB build today | KJV module |
| --- | --- | --- |
| `verses[].g` Greek word, in Greek order | MSB rows ordered by `Greek Sort` | the set of positions named by `src`, ordered by number (suffix `n`/`p` keys sorted after their number) |
| `g[].s` Strong's | `Str Grk` column | `lemma="strong:G…"`, one per `src` entry |
| `g[].p` RP code | `Parsing` column | `morph="robinson:…"`, one per `src` entry |
| `g[].l` lemma | TBESG, by Strong's number | the same (all 5,415 Strong's numbers in the KJV NT are in TBESG; 45 are not in today's `lexicon.json` and must be added) |
| `g[].t` Greek form | MT Greek (accented) | **not in the module** (unaccented only): accents from KJTR and TAGNT, as above |
| `g[].tr` transliteration | Translit column | not needed: no screen shows it (docs/data.md), drop for the new pair |
| `e[]` chunk, `t` | MSB English with punctuation | a `<w>` with text, plus the punctuation after it |
| `e[].g` | Greek words of the chunk | `src`, mapped to indexes |
| `g[].e` | the chunk | the chunk whose `src` names it; a word with no English: an empty `<w …/>` or none |
| `e[].s` supplied words | `[square brackets]` | `<transChange type="added">` (becomes a chunk of its own, see below) |
| `verses[].h` heading | `Hdg` column | none in this module (the field is optional already) |
| `verses[].p` paragraph | `Par` column | `<milestone type="x-p">` (432 verses; the Reader treats a chapter's first verse as a paragraph anyway) |

Three places where the KJV does not drop in without a decision (each one a line in a story below):

1. **A supplied word has no Greek.** `man` in `being a just <transChange>man</transChange>` stands between two `<w>`. The chunk shape is
   already tolerant: `weave.ts` returns null for a chunk with `g.length === 0`, and `s` can mark every word of it. Proposed: write it
   as its own chunk `{"t":"man","g":[],"s":[0]}`; `Reader.tsx` `lookEnglish` must show "no Greek word" for it, and the tutor's
   `markSupplied` already italicises it.
2. **Two stretches of English for one Greek word** (`x-split-N`). Chunks hold a Greek word once (`g[i].e` is a single number). Proposed:
   the first stretch owns the word; the second becomes a chunk with `g: []` and its words not supplied. (One could allow `g` to repeat;
   that changes the "links are mutual" rule, `features/data.feature` and the weave.) About a third of the verses (2,658) are affected, so this is the common case, not an edge.
3. **Greek word order is not always verse order** (`src="16 17"`, `15`, `14`): the same as the MSB, handled today.

Parsing codes: 14 of the 1,061 distinct codes in the KJV NT are not in today's chapter files and not understood by `src/data/parseCode.ts`
(`A-NUI-ABB`, `D-APM-K`, `D-DPM-K`, `F-2ASM-K`, `F-3ASN`, `K-GPM`, `Q-GPN`, `S-1PASM`, `V-2ADM-2P`, `V-FAP-GPM`, `V-INI-2P-ATT`,
`V-PAO-2S`, `V-PEP-DSM`, `V-RDI-3S`). The build fails on an unknown code on purpose (docs/data.md), so it will name each one.

Versification, measured against today's `public/data/index.json`:

| Chapter | MSB verses | KJV / TR verses | Why |
| --- | --- | --- | --- |
| Luke 17 | 36 | 37 | Luke 17:36 is in the TR |
| Acts 8 | 39 | 40 | Acts 8:37 |
| Acts 15 | 40 | 41 | Acts 15:34 |
| Acts 24 | 26 | 27 | Acts 24:7 |
| Romans 14 | 26 | 23 | the doxology (Romans 16:25-27) sits at 14:24-26 in the Byzantine text, and at 16:25-27 in the TR |
| Romans 16 | 24 | 27 | the same doxology |

(7,953 verses against 7,957.) So the pair needs its **own `index.json`**, and everything that looks up a verse count
(`src/data/books.ts`, `bookIndex.ts`, `neighbours.ts`, `nav/links.ts`, the chapter picker, Verse view arrows) must ask the open pair.

The words he learns are keyed by NFC lemma (`words` table), which is the TBESG headword of the Strong's number in both pairs, so his
solid and learning words, his review schedule and the Quick test carry over; the frontier picker needs a `frequency.json` per pair (the
counts differ a little) and `lexicon.json` must be the union of both.

## Size of the data (e)

Sources, as downloaded:

| File | Size |
| --- | --- |
| `kjv.osis.xml` (KJV, whole Bible, OSIS) | 28.0 MB (the New Testament verses alone come to 16.2 MB) |
| `KJV.zip` (SWORD module, whole Bible) | 4.0 MB |
| byztxt `parsed/*.UTR`, 27 files | 3.0 MB (0.74 MB gzipped) |
| byztxt `textonly/*.SCV`, 27 files | 1.1 MB |
| `KJTR.tsv` | 7.8 MB (140,591 words) |
| TAGNT, two files | 14.2 MB + 15.9 MB |
| TBESG (already used) | 4.7 MB |

None of these ships in the app; the build reads them from `data/raw` (git-ignored), like the MSB table today.

What ships: one JSON file per chapter, built in Lampas's shape. I built a prototype of the whole New Testament (260 chapters, 7,957
verses, 122,324 English chunks, 140,766 Greek words, `lex` with TBESG gloss and definition in every file, no `tr` field, no
headings):

| | Raw | Gzipped (what the VPS sends) |
| --- | --- | --- |
| KJV + TR prototype, all chapters | 28.3 MB | 8.6 MB |
| MSB + RP today (`public/data/*/*.json`) | 31.9 MB | 9.3 MB |
| one chapter (Romans 8 today, for scale) | 138 KB | 38 KB |

Plus an `index.json` (2 KB), a `lexicon.json` (about 0.3 MB; one shared union is better than a second) and a `frequency.json` (about 0.45 MB)
per pair. The repo grows by about 28 MB of committed JSON (docs/data.md: "~30 MB" today), unless the files are generated in the deploy;
that is a decision for the first story. The phone caches a chapter when first read (`src/sw.ts` CacheFirst on `/data/`), and only
four small files are precached, so a phone that never switches pays nothing, and one that does pays about 38 KB per chapter read.

## Risks and decisions for the Governor

1. **The KJV licence line** (above): CrossWire says GPL; their text says "any purpose". One email may settle it.
2. **"Scrivener 1894" is Robinson's parsed TR**, 99.8% the same words. Say so on About and in the Preface; or ask for the 186 verses to
   be forced to Scrivener's text (a bigger story).
3. **The pair is one switch (KJV + TR1894 as one choice), not two** (his own wording: "the text pair"). Mixing MSB English with TR Greek
   would break the word links; the story list keeps them together.
4. **No section headings on the KJV pair.** Add them from the MSB headings? They describe the MSB's verse numbers and Byzantine text.
   Proposed: leave the Section headings setting inert for the KJV pair and say so in its hint.
5. **The tutor must know which text it is looking at.** Today its instructions say "the Byzantine text" and "the Majority Standard Bible"
   in many places; a reading that exists in only one text must not be explained as the other.

## Proposed stories (f)

Order matters: 1 to 3 are data, 4 to 7 are the app, 8 to 9 are honesty, 10 is the demo. Each story is small enough for one Builder
session; the file lists are where I looked.

### 1. Parse the KJV OSIS into aligned chunks (data, pure)

A pure function `parseKjvOsis(xml)` giving, per verse, the Greek word list (Strong's, RP code, unaccented form) and the English
chunks with their `src` links, supplied words and split chunks as proposed above. Fixtures: John 1:1-3, Matthew 1:19 (split), Romans
1:3 (`13n`), Mark 14:17 (missing `robinson:`).
Files: `scripts/kjv-osis.ts` (new), `tests/fixtures/data/kjv-slice.osis.xml` (new), `tests/unit/kjv-osis.test.ts` (new),
`features/data-kjv.feature` and `features/steps/data-kjv.steps.ts` (new).

### 2. Accented Greek for the TR words (data, pure)

`accentFor(verse words, KJTR rows, TAGNT rows, fixes)`: sequence alignment per verse, KJTR first, TAGNT second, then the reviewed table
of the 495 leftover forms; fails the build on a word with no accented form. Also a check that lists the verses where the KJV module's Greek
differs from byztxt's Scrivener text (the 186) for the About text.
Files: `scripts/tr-accents.ts` (new), `scripts/tr-accents-fixes.json` (new, 495 lines), `tests/fixtures/data/kjtr-slice.tsv` and
`tagnt-slice.txt` (new), `tests/unit/tr-accents.test.ts` (new).

### 3. Build and commit the KJV + TR1894 chapter files

`npm run data:build:kjv` downloads the three sources (like `fetchTo` for the MSB), builds `public/data/kjv/<book>/<chapter>.json` in the
existing shape, its own `index.json` (new verse counts), a union `lexicon.json` and a `frequency.json` for the pair; a second run changes
nothing. `parseCode.ts` learns the 14 codes. `features/data.feature` walks the new chapters for the same rules as the MSB ones (every
word has a lemma, a gloss, a decodable code; links mutual). Credits for each source.
Files: `scripts/data-build.ts` (export shared helpers), `scripts/kjv-build.ts` (new), `package.json` (a script; never the version),
`src/data/parseCode.ts`, `tests/unit/parse-code.test.ts`, `features/data.feature`, `features/steps/data.steps.ts`, `public/data/kjv/**`
(generated, committed), `public/data/lexicon.json`, `docs/data.md`, `ATTRIBUTION.md`, `src/tutor/credits.ts`,
`tests/support/credits.ts` (a rule for `public/data/kjv`), `.gitignore` if needed.

### 4. A text-pair module the loaders ask

`src/data/textPair.ts`: the list of pairs (`msb-rp`, `kjv-tr`; id, name, Greek and English names, data folder, short credit), the open
pair, and loaders keyed by pair: `loadChapter(book, n)` and `loadIndex()` read `/data/…` or `/data/kjv/…`; the in-memory cache key
includes the pair; `lexicon` and `frequency` likewise; screens that used `BOOK_INDEX` or the counts in `books.ts` ask the pair. The
default stays MSB + RP2005; nothing changes on screen.
Files: `src/data/textPair.ts` (new), `src/data/chapter.ts`, `src/data/lexicon.ts`, `src/data/frequency.ts`, `src/data/bookIndex.ts`,
`src/data/books.ts`, `src/data/neighbours.ts`, `src/data/readerChapter.ts`, `src/nav/links.ts`, `src/ChapterPicker.tsx`,
`src/data/grammar/needs.ts`, `src/data/grammar/goalNeeds.ts`, `src/review/kinds.ts`, `src/speech/readAloud.ts`,
`tests/support/chapter-fetch.ts`, `tests/unit/chapter.test.ts`, `features/text-pair.feature` (new) with steps.

### 5. Settings: "Text" with MSB + RP2005 | KJV + TR1894, switchable by the tutor

A registry entry `textPair` (a section of its own or the Layout one; hint at most 90 characters; `help` says what each pair is), a line in `SettingsScreen`
CONTROLS, `getTextPair`/`setTextPair` in the settings repository, a `text-pair-changed` event on the bus, and the Reader remounting
(`ReaderBody` is keyed by book and chapter; add the pair). Then `npm run grind:build` so the bible-talk grind knows the setting and the
tutor can change it with `settings_changes`. Also: the Reader's saved place when a verse is missing in the other pair (Romans 14:24-26
or Acts 8:37 asked in the other text opens the nearest verse with the Reader's existing notice).
Files: `src/settings/registry.ts`, `src/settings/rows.ts`, `src/SettingsScreen.tsx`, `src/data/repositories/settings.ts`,
`src/data/repositories/index.ts`, `src/events/bus.ts`, `docs/events.md`, `tests/unit/bus.test.ts`, `src/Reader.tsx`,
`src/nav/lastRoute.ts`, `src/nav/links.ts`, `tests/unit/settings-rows.test.tsx`, `tests/unit/settings-registry.test.tsx`,
`grinds/bible-talk.answer.schema.json`, `grinds/bible-talk.instructions.md` and `grinds/examples/bible-talk/` (generated or edited by
`grind:build`), `features/text-pair.feature`.

### 6. Draw chunks that have no Greek, and the other pair's quirks

The Reader, Verse view, passage view and weave on `g: []` chunks (a supplied word, the second stretch of a split), the word sheet from an
English word with no Greek ("no Greek word of its own, supplied by the translators"), Section headings and Layout on a pair with no
headings, paragraph marks from `p`. A Playwright shot of Matthew 1:19 and John 1:1 at 390 px in the KJV pair.
Files: `src/Reader.tsx`, `src/data/weave.ts`, `src/data/chapter.ts` (`englishRuns`, `markSupplied`), `src/data/passage.ts`, `src/VerseView.tsx`,
`src/layout/layouts.ts`, `src/WordSheet.tsx`, `features/text-pair.feature`, `tests/e2e/kjv-reader.spec.ts` (new; phone width, `shot()`),
`tests/unit/weave.test.ts`.

### 7. Other screens in the other pair

Quick test, Review, the Parsing drill, the Goal (`passageNeeds`) and Placement all load the open chapter; the Goal text ("Read 1 John 1:1")
and the saved goal text (`getSavedGoalText`) must survive a switch; the New words strip uses the pair's `frequency.json`. One feature
walks each screen on a KJV chapter, including a verse that exists only in this pair.
Files: `src/QuizScreen.tsx`, `src/ReviewScreen.tsx`, `src/review/kinds.ts`, `src/DrillScreen.tsx`, `src/IdeaSheet.tsx`,
`src/PlacementScreen.tsx`, `src/data/goal.ts`, `src/data/grammar/needs.ts`, `src/useNewWords.ts`, `src/data/frontier.ts`,
`src/data/repositories/goalSaved.ts`, `features/text-pair.feature`, `features/steps/text-pair.steps.tsx` (new).

### 8. Tell the tutor which text it holds

Each tutor request carries `text` (the pair's id and its two names); the instructions say what the Greek and English are by that field,
not "Byzantine" and "Majority Standard Bible"; a reading found in one text but not the other is explained as such. Examples for a
KJV + TR1894 request in each grind; the credits the tutor is told include the new sources.
Files: `src/services/talk.ts`, `src/services/tutor.ts`, `grinds/bible-talk.input.schema.json`,
`grinds/verse-ask.input.schema.json`, `grinds/verse-read.instructions.md`, `grinds/bible-talk.instructions.md`,
`grinds/verse-ask.instructions.md`, `grinds/examples/bible-talk/` and `grinds/examples/verse-ask/` (new scenarios),
`tests/unit/grind-examples.test.ts`, `src/tutor/credits.ts`, `tests/unit/credits-for-tutor.test.tsx`.
(Mind the 6500-byte request cap for the lists the credits are sent in.)

### 9. About and the Preface for the new pair

His standing ask (2026-10-09 21:31Z): About (`ATTRIBUTION.md`) and the Preface (`src/preface.ts`) updated with the change: the KJV (1769,
CrossWire tagging, public domain) and the Textus Receptus (Scrivener 1894, Robinson's parsed edition, KJTR and STEPBible for accents),
with PREFACE_LINKS each fetched and answering 200 first. About names the pair he is reading.
Files: `ATTRIBUTION.md`, `src/preface.ts`, `src/Preface.tsx`, `src/About.tsx`, `src/attribution.ts`, `src/tutor/credits.ts`,
`tests/unit/credits.test.ts`, `tests/unit/credits-for-tutor.test.tsx`, `tests/unit/about-screen.test.tsx`, `README.md`.

### 10. Offline and the deploy

A change to the data folder layout: `src/sw.ts` already serves everything under `/data/` CacheFirst; confirm `/data/kjv/…` is covered and
bump `DATA_CACHE_VERSION` only if the chapter shape changes (a chunk with `g: []` is a new case for readers that assume at least one
Greek word: the old cached app would see it). Precache the pair's `index.json` only if it is opened on first launch; an offline switch to the pair shows the
Reader's existing "is not on this phone yet" per chapter. Check the VPS deploy (rsync of `dist/`, the Laptop's `after_landing`) copes with
the extra ~28 MB.
Files: `src/sw.ts`, `src/dataCache.ts`, `pwa-precache.ts`, `tests/unit/precache-guard.test.ts`, `tests/e2e/offline.spec.ts` (new),
`docs/data.md`.

### 11. Demo story (closes the epic: "Looks good")

The Governor switches Settings > Text to KJV + TR1894, reads John 1 and Romans 8, taps a word, hears it, asks the tutor to switch back
("change the text to the Majority Standard Bible"), and sees his words and place kept. Playwright shots for the closing comment.
Files: `tests/e2e/kjv-demo.spec.ts` (new), `shots/` output only.

Stories 1 to 3 can start now and do not touch the app. Story 4 must land before 5 to 7. If the epic is to be cut, 1 to 6 give a working
reader in the KJV pair; 7 to 10 are the rest of Lampas catching up with it.
