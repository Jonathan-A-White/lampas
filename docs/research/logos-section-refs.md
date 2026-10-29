# Research: section references by a book's own Logos data type

Story mw-rfjjzd.17 (design: docs/design/library-at-scale.md section 10 lead 1). Written 2026-10-22. Research only: no app code changed.
Read from his library listing (vault `plans/lampas-logos-library-2026-10-08.csv`, columns `ResourceId`, `Type`, `ReferenceSupersets`), from `curl` against
ref.ly on 2026-10-22, and from search-engine excerpts of the Logos forum (its pages answer 403 to a script, as docs/resources.md says).
**Nothing here was opened in Logos: the Laptop has none. Every link form below is UNVERIFIED on a device until the Governor taps the one link in HOW TO CHECK IT.**

<!-- toc -->

- [What I found](#what-i-found)
- [What the export names for each grammar, and the link form](#what-the-export-names-for-each-grammar-and-the-link-form)
  - [Built links](#built-links)
- [Sweep: every grammar in his listing](#sweep-every-grammar-in-his-listing)
- [What the sections tables (src/resources/grammarBooks.ts) would need to change](#what-the-sections-tables-srcresourcesgrammarbooksts-would-need-to-change)
- [HOW TO CHECK IT, for the Governor](#how-to-check-it-for-the-governor)

<!-- /toc -->

## What I found

* **Each book carries its own reference type in the export.** `ReferenceSupersets` is the book's own address space, the way a commentary's is
  `bible.66.1-66.16.27`. For a grammar it is the book's own numbering (BDF's paragraph numbers, Burton's section numbers), not a page.
* **A Logos link can name a book's own data type.** The form is `ref=<DataType>.<parts>` after the resource id, the one Lampas already builds for
  `Bible.Ro8.28`, `GreekStrongs.11`, `Page.p_26` and `CICR.3.24` (docs/resources.md). The forum shows the same shape for a book-specific type:
  `https://ref.ly/logosres/canmythslegtxt?ref=CTAUgariticTexts.4%3a2%3a6-7`, which a poster says "will open this particular resource to this location"
  (Logos Community, thread on `Copy location as`, search excerpt of https://community.logos.com/discussion/comment/278763 , read 2026-10-22).
* **Lampas now guesses a page where the book has its own number.** Black's table writes `Page.p_26` for Lesson 4 from the contents' page numbers
  (src/resources/grammarBooks.ts). The listing gives Black `ltrntg.1-187`, and Black's table runs to page 244, so `ltrntg` is not a page count: it is
  the book's own numbering (what it numbers is not known here). A reference of the book's own type is the same on every edition and every page layout.
* **The name of the data type may not be the export's prefix.** The export writes `louw.1-93.615` for Louw-Nida, but the one forum link found for it
  writes `LouwNida`: `https://ref.ly/logosres/louwnida?ref=LouwNida.88.211`, and the command-box form `logosres:louwnida;ref=LouwNida.90`
  (Logos Community, search excerpts of https://community.logos.com/discussion/comment/76369 and https://community.logos.com/forums/t/194032.aspx , read 2026-10-22).
  A Logos staff post says a data type has an internal name and aliases (internal `trig`, alias `BookOfConcord`). So the export's lower-case prefix is
  the internal name and the long form may be an alias: `bdf.318` is a guess from the export; `LouwNida.25` has a forum source. Whether either case works is
  what the tap settles.
* **ref.ly passes any of them on unchanged** (so the link is well formed; it cannot show whether the app lands). Measured 2026-10-22:

  ```
  curl -I 'https://ref.ly/logosres/LLS%3ABDF?ref=bdf.318'
    301 -> https://app.logos.com/refly?uri=logosres%3ALLS%3ABDF%3Bref%3Dbdf.318
  curl -I 'https://ref.ly/logosres/LLS%3A46.30.4?ref=LouwNida.25'
    301 -> https://app.logos.com/refly?uri=logosres%3ALLS%3A46.30.4%3Bref%3DLouwNida.25
  ```

  `ref=louw.25` is passed on the same way. The target page wants a Faithlife sign-in, so a script cannot see where it opens.

## What the export names for each grammar, and the link form

The link is built by `resourceLink(id, 'ref=<DataType>.<n>')` in src/resources/logosRes.ts: the scheme first, the ref.ly address as the fallback, the colon of
`LLS:` encoded `%3A` in the https path. A reference with no space needs no `_` or `+` (the space fault of mw-5r3p30.618 does not arise).

| Book | Resource ID | `ReferenceSupersets` | Reads as (inferred, not read from the book) |
| --- | --- | --- | --- |
| Black, Learn to Read NT Greek | `LLS:LRNTOREADNTGRK` | `ltrntg.1-187` | numbers 1 to 187; not pages (the book has 244+); what it numbers is not known |
| BDF, A Greek Grammar of the NT | `LLS:BDF` | `bdf.1-496.0.2` | paragraphs §1 to §496, with a sub-part (BDF is cited by §, subsections as §151.2) |
| Robertson, A Grammar of the GNT in the Light of Historical Research | `LLS:GGNTLHR` | `robertsongram.1-22.4.4` | chapter 1 to 22 and nested parts, to four levels |
| Burton, Syntax of the Moods and Tenses in NT Greek | `LLS:46.20.8` | `smtntg.1-489` | sections §1 to §489 (the book numbers its sections to 489) |
| Machen, NT Greek for Beginners | `LLS:NTGRKBGNNRSMCHN` | `bggnt.1.1-1.513` | one part, paragraphs 1 to 513 |
| Louw-Nida (a lexicon, not a grammar) | `LLS:46.30.4` | `louw.1-93.615` | domain 1 to 93, then the entry number within the domain (`93.615`); a bare `25` is the domain |

The SBL Handbook of Style cites BDF by section ("BDF §151.2", https://sblhs2.com/2017/04/20/citing-reference-works-7-greek-language-tools/), so a section number is
what a reader of BDF already uses.

### Built links

BDF §318 (the one to tap):

| | |
| --- | --- |
| scheme | `logosres:LLS:BDF;ref=bdf.318` |
| https | `https://ref.ly/logosres/LLS%3ABDF?ref=bdf.318` |

Louw-Nida domain 25:

| | |
| --- | --- |
| scheme | `logosres:LLS:46.30.4;ref=LouwNida.25` |
| https | `https://ref.ly/logosres/LLS%3A46.30.4?ref=LouwNida.25` |
| the export's spelling | `logosres:LLS:46.30.4;ref=louw.25` (try this if `LouwNida` opens nothing) |

Both are `resourceLink` output for the id and query shown; nothing here is run in the app.

## Sweep: every grammar in his listing

His listing has 30 rows of type `text.monograph.grammar` (the catalogue of design section 3.1 is not built yet; this is its grammar kind in full). **Only 10 carry a
reference type of their own; 20 carry none, so a section reference is impossible for them** (they have a table of contents and pages, so `Page.p_<n>` or a
start link is all Lampas can use). Louw-Nida is a lexicon and is listed last for the domain link.

| Book | Resource ID | `ReferenceSupersets` | Supports a section reference? |
| --- | --- | --- | --- |
| A Greek Grammar of the NT (BDF) | `LLS:BDF` | `bdf.1-496.0.2` | Yes, by §: `ref=bdf.318` |
| A Grammar of the GNT in the Light of Historical Research (Robertson) | `LLS:GGNTLHR` | `robertsongram.1-22.4.4` | Yes, by chapter and part: `ref=robertsongram.<chapter>.<part>` (the dotted levels are guessed) |
| Syntax of the Moods and Tenses in NT Greek (Burton) | `LLS:46.20.8` | `smtntg.1-489` | Yes, by §: `ref=smtntg.<n>` |
| Learn to Read NT Greek (Black) | `LLS:LRNTOREADNTGRK` | `ltrntg.1-187` | Yes, by its own number: `ref=ltrntg.<n>`; what each number is must be read from the book |
| NT Greek for Beginners (Machen) | `LLS:NTGRKBGNNRSMCHN` | `bggnt.1.1-1.513` | Yes, by paragraph: `ref=bggnt.1.<n>` |
| Syntax of Classical Greek (Gildersleeve) | `LLS:SYNTAX` | `au+gildersleeve.0001.001.1-0001.001.19.43` | Has a type, but an `au+` author type, a different form; classical, out of scope |
| Syntax of the Moods and Tenses of the Greek Verb (Goodwin) | `LLS:GOODWINMOODSENG` | `au+goodwin.0001.001.1-0001.001.926` | Same: `au+` type; classical, out of scope |
| A Biblical Hebrew Reference Grammar | `LLS:BHRG2ED` | `bhrg.1-47.3.2.2` | Yes (Hebrew; out of scope: New Testament Greek only) |
| Gesenius' Hebrew Grammar | `LLS:46.20.10` | `gesgram.1-167.c` | Yes (Hebrew; out of scope) |
| Hebrew Syntax (Third Edition) | `LLS:46.20.9` | `hebsyn.1-155` | Yes (Hebrew; out of scope) |
| A Preparatory Grammar for NT Greek (Dyer) | `LLS:PREPGRMRDYER` | none | No |
| A Short Grammar of the GNT | `LLS:SHGRMRGRKNT` | none | No |
| An Introduction to Biblical Greek (Revised) | `LLS:INTROGKGRAMEXREV` | none | No |
| Grammar of NT Greek (Blass) | `LLS:GRNTGRKBLASS` | none | No |
| Greek Is Good Grief | `LLS:GRKSGDGRF` | none | No |
| Greek New Testament Insert | `LLS:46.20.1` | none | No |
| Kairos: A Beginning Greek Grammar | `LLS:KAIROSGRAM` | none | No |
| Overview of Greek Syntax | `LLS:GKSYN` | none | No |
| Biblical Hebrew Step by Step, Vol. 1 and 2 | `LLS:BIBHEBSBS`, `LLS:BIBHEBSBS2` | none | No |
| Key to Biblical Hebrew Step by Step, Vol. 1 and 2 | `LLS:KYBIBHEBSBS1`, `LLS:KYBIBHEBSBS2` | none | No |
| Biblical Hebrew for Beginners | `LLS:BBLHEBBEGNNRS` | none | No |
| Davidson's Introductory Hebrew Grammar | `LLS:DAVDSINTROHEB` | none | No |
| Hebrew Bible Insert | `LLS:46.20.3` | none | No |
| The T&T Clark Hebrew Primer | `LLS:TTCLRKRVCNSLDTN` | none | No |
| An Introduction to Ecclesiastical Latin | `LLS:INTROECCLAT` | none | No |
| Overview of Latin Syntax | `LLS:LATSYN` | none | No |
| Syntax of Plautus | `LLS:LINDSAYSYNTAX` | none | No |
| A Shakespearean Grammar | `LLS:ABBOTT` | none | No (not Greek at all) |
| Louw-Nida (lexicon, for the domain link) | `LLS:46.30.4` | `louw.1-93.615` | Yes, by domain and entry: `ref=LouwNida.25` |

So five New Testament Greek grammars (BDF, Robertson, Burton, Black, Machen) can be reached by their own numbering; the eight other Greek NT grammar rows cannot.
Wallace's *Greek Grammar Beyond the Basics* is not in his listing (searched `wallace`, `beyond the basics`).

## What the sections tables (src/resources/grammarBooks.ts) would need to change

Nothing in `bookLink`, `resourceLink` or the `BookSection.ref` type changes: `ref` is already "a reference of a data type the book is indexed by", and
`bookLink` already writes `ref=${section.ref}` (it replaces `_` with `+` only for the https query, and these refs have none). What changes is data and one rule:

1. **A book with no table gets one written from its own numbering.** A BDF entry is `{ title: 'Tenses: …', ref: 'bdf.318', ideas: [...] }` and Burton's the same with `smtntg.<n>`.
   The `title` and `ideas` still come from the book's contents (the ideas are judged from the section's title, as Black's are). The numbers come from the book's
   own printed numbering, which is what the reader sees on the page; no page-number guess is needed. **The tables cannot be written from the export alone**: it
   gives only the range (1 to 496), not which § teaches which idea. A Builder needs each book's contents with its section numbers (the design's S1 reads them from a source).
2. **Black could move from `Page.p_N` to `ltrntg.N`** only if `ltrntg` numbers lessons or sections in a way a Builder can read; it is not known whether `ltrntg.4`
   is Lesson 4. Until then Black keeps `Page.p_N`. The tap below settles BDF first; Black needs its own tap.
3. **The `ref` field's comment** in src/resources/types.ts names `Page.p_26` as the example; it would add a section data type (`bdf.318`).
4. **A test**: tests/unit/grammar-books.test.ts would check that a ref has the shape `<data type>.<n>` or `Page.p_<n>` and that the number is inside the book's
   `ReferenceSupersets` range (so a typo is caught: BDF's 1 to 496).
5. **docs/resources.md** gains the book's rows and the data type's name as spelled; the Louw-Nida domain link is a separate change in `logos.ts` (its lexicon
   key `Domain number`, already marked UNVERIFIED there).
6. **If `bdf.318` opens nothing but another case or alias does** (`BDF.318`, `Bdf.318`), the data type's spelling goes in the book's entry, not in the code path.

None of it is started before the tap, because a wrong data type name would open a book at its start, or stay at his open tab (the fault of mw-5r3p30.618).

## HOW TO CHECK IT, for the Governor

On the phone that has the Logos app signed in to his library:

1. Open this link on the phone (paste it in a message to yourself, or the browser's address bar): `https://ref.ly/logosres/LLS%3ABDF?ref=bdf.318`
2. Choose to open it in Logos if the phone asks.
3. Right looks like: Logos opens *A Greek Grammar of the New Testament* (BDF) at paragraph **318** (I have not read the book; look for the number 318 on the paragraph), whatever page that is. Wrong looks like: the book at its first page, or the tab you already had open (Ps 19:13 last time), or "Navigation failed".
4. If it opens the right place, say "BDF works" on mw-rfjjzd.17. If not, say which of the wrong things you saw; the next try is the Louw-Nida link
   `https://ref.ly/logosres/LLS%3A46.30.4?ref=LouwNida.25` (right: Louw-Nida at domain 25, "Attitudes and Emotions").

**UNVERIFIED** until he does this: that the Logos app takes a book's own data type after `ref=` for these books, that the lower-case internal name `bdf` is accepted
(the export's spelling, not a spelling seen in a link), that §318 is the paragraph it lands on, and that `LouwNida.25` (a domain alone) is accepted. The forum
sources above are search-engine excerpts, not the pages.
