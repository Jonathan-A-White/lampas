# Lampas grows elegantly: the library at scale

A design (mw-5r3p30.709, Fable at xhigh, the Governor's ask of 2026-10-21) for every place in Lampas that can expand: what is already known
(his Logos library, 4,795 books, about 110 of which Lampas can use now: about 200 with the devotionals and Bibles it already lists) and what is unknown (the books and asks of other readers). Design only:
no product code changes here. The mockups are ASCII below and, as a page that opens on a phone, `docs/design/library-at-scale.html`.
Everything in this file is **PROVISIONAL** unless the section 'For the Governor' names it as his choice.

His words that rule it (Postern, mw-fnvjof.5's card, 2026-10-21): "if someone could add ~1k books, the setting and import and asking for
more needs to be way more elegant. Beyond that, do B, but the ui MUST be elegant." And: "we don't want to import books just for the sake of it
but we want to really take advantage of the depth of the logos library that somebody has ... using it in novel ways that you don't necessarily
get just by being in Logos ... Lampas is probably only going to have open source resources ... be able to mostly connect into Logos." Read as:
value over volume; one Logos link for each thing Logos does better than Lampas, none for decoration; and the UI must stay elegant at 1,000.

<!-- toc -->

- [1. The one idea](#1-the-one-idea)
- [2. The inventory: every place that grows](#2-the-inventory-every-place-that-grows)
- [3. The shape at scale: one library, by kind](#3-the-shape-at-scale-one-library-by-kind)
  - [3.1 The catalogue](#31-the-catalogue)
  - [3.2 His shelf: Off, On, Pinned](#32-his-shelf-off-on-pinned)
  - [3.3 The Library screen (`#/library`, 'Your Logos library')](#33-the-library-screen-library-your-logos-library)
  - [3.4 A kind page (`#/library?kind=lexicon`, 'Lexicons')](#34-a-kind-page-librarykindlexicon-lexicons)
  - [3.5 The word sheet at scale](#35-the-word-sheet-at-scale)
  - [3.6 A verse at scale: one door, then a chooser](#36-a-verse-at-scale-one-door-then-a-chooser)
  - [3.7 The idea sheet at scale](#37-the-idea-sheet-at-scale)
  - [3.8 Settings after the change](#38-settings-after-the-change)
- [4. Value over volume: each Logos link and what it adds](#4-value-over-volume-each-logos-link-and-what-it-adds)
- [5. Import: his list, in one step](#5-import-his-list-in-one-step)
  - [5.1 Getting the list](#51-getting-the-list)
  - [5.2 Matching](#52-matching)
  - [5.3 The result screen](#53-the-result-screen)
  - [5.4 What Lampas says about the rows it cannot use](#54-what-lampas-says-about-the-rows-it-cannot-use)
- [6. Asking for more, without flooding him](#6-asking-for-more-without-flooding-him)
  - [6.1 One ask: 'Ask for a book'](#61-one-ask-ask-for-a-book)
  - [6.2 The whole list, once](#62-the-whole-list-once)
  - [6.3 How it comes back](#63-how-it-comes-back)
- [7. The tutor at scale](#7-the-tutor-at-scale)
- [8. The rest of the inventory, one line each](#8-the-rest-of-the-inventory-one-line-each)
- [9. Shared pieces and where they live](#9-shared-pieces-and-where-they-live)
- [10. Research leads (not built here; each a small docs/research story)](#10-research-leads-not-built-here-each-a-small-docsresearch-story)
- [11. Alternatives weighed, and why they lost](#11-alternatives-weighed-and-why-they-lost)
- [12. Grilling Q2 to Q8](#12-grilling-q2-to-q8)
- [For the Governor](#for-the-governor)
- [13. Sweep: SpellForge and Legend](#13-sweep-spellforge-and-legend)
- [14. The plan of build stories](#14-the-plan-of-build-stories)
  - [S1 The catalogue](#s1-the-catalogue)
  - [S2 The shelf](#s2-the-shelf)
  - [S3 The Library screen](#s3-the-library-screen)
  - [S4 Settings after the change](#s4-settings-after-the-change)
  - [S5 The library import](#s5-the-library-import)
  - [S6 Share a CSV to Lampas](#s6-share-a-csv-to-lampas)
  - [S7 The word sheet at scale](#s7-the-word-sheet-at-scale)
  - [S8 A verse at scale](#s8-a-verse-at-scale)
  - [S9 The tutor at scale](#s9-the-tutor-at-scale)
  - [S10 One ask](#s10-one-ask)
  - [S11 Your requests at scale](#s11-your-requests-at-scale)
  - [S12 The idea sheet reads the shelf](#s12-the-idea-sheet-reads-the-shelf)
  - [S13 Demo (labelled demo)](#s13-demo-labelled-demo)

<!-- /toc -->

## 1. The one idea

Today Lampas keeps six hand-written lists of Logos things, each with its own store key, its own Settings control and its own ask box:

| list | where | items now | kept as |
| --- | --- | --- | --- |
| `LEXICONS` (`src/resources/logos.ts`) | Settings > Study resources > Logos, a searchable tick list | 21 | JSON array in `resourceOption.logos` |
| `GRAMMAR_BOOKS` (`grammarBooks.ts`) | Logos > Grammar books, plain ticks under 8, then the searchable list | 1 | JSON array in `grammarBooks` |
| `WORKS` (`works.ts`) | Works in your Logos library, a flat list of On/Off switches | 3 | JSON array in `works` |
| `COMMON_BIBLES` (`logosBible.ts`) | Bible in Logos: a select of 9 plus a typed Resource ID | 9 | `logosBible` |
| `DEVOTIONALS` (`src/data/daily/devotionals.ts`) | Daily > Which devotional (a select of 37 + Random) and In the draw | 37 | `devotional`, `devotionalDraw` |
| `AUDIO_BIBLES` (`audioBible.ts`) | Study resources > Audio Bible, stacked buttons | 1 | `audioBible` |

And four ask boxes: Ask for another book (grammar-book), Request a devotional, Ask for more (approach, study-resource, text, translation), and the
tutor's Send this to the makers. Each new book is a Builder story; each ask is a typed title the Mayor must research.

The design replaces the six lists with **one library** and the four boxes with **one ask**:

- **The catalogue** is what Lampas knows how to open, and where: one typed table shipped with the app, grown by the factory. An entry is a Logos
  resource (its true Resource ID), a kind, what Lampas opens it at (a word, a parsing, a verse, a day, its start) and one line of the value it adds.
  Today's six lists become seven kinds of one table. About 110 entries to start (his fit list, the grilling's B).
- **His shelf** is which catalogue entries he has and how much he wants of each: **Off**, **On** or **Pinned** (one three-step control, the Weave's
  shape). On means Lampas may open it and the tutor may name it; Pinned means it is on the screen at a glance (the word sheet's first tiles, the
  verse's first door, the idea sheet's first books). An import puts his whole fit list On in one step and pins a sensible few; a tap moves one.
- **His list** is the import itself, kept on the phone: every row Logos exported, matched or not. Lampas re-matches it against the catalogue after
  every update, so a book the makers add appears on his shelf by itself; and the one ask, 'Ask for a book', lets him pick from the rows Lampas cannot
  use yet, so the makers receive a true Resource ID, never a typed title.

Three states, one screen (Your Logos library), one import, one ask. Everything else in this document follows from it.

## 2. The inventory: every place that grows

Each place as it stands today, and how it behaves with 3, 110 and 1,000 items. 'Items' is what the place lists: books for a list, tiles for the
word sheet, rows for a request. 'Breaks' means a reader cannot do the thing one-handed on a phone.

| # | place (file) | today | at 3 | at 110 | at 1,000 |
| --- | --- | --- | --- | --- | --- |
| 1 | Settings > Study resources > Logos > lexicon ticks (`settings/controls/resources.tsx` ChoiceList, `ui/SearchableList.tsx`) | search field, ticked first, a box five rows high | fine | works, but a five-row box inside a Settings page is where he manages his library: cramped, no counts by kind, no All on | breaks: Settings search finds rows, not books |
| 2 | Logos > Grammar books (same file, GrammarBooks) | plain ticks under 8, the searchable list from 8 | fine | the searchable list, same as 1 | same as 1 |
| 3 | Works in your Logos library (WorksControl) | a flat list, one On button per work | fine | breaks: 110 switches, a wall three screens tall | breaks |
| 4 | Bible in Logos (LogosBiblePicker) | a select of 9 and a typed Resource ID | fine | a native select scrolls, but finding 'LSB' among 110 Bibles is a hunt; the typed ID stays a developer's door | same |
| 5 | Daily > Which devotional (`controls/daily.tsx`) and In the draw | a select of 37 + Random; the searchable list | fine | the select is a hunt; the draw list is fine | breaks |
| 6 | Audio Bible | stacked buttons, Off + 1 | fine | breaks at about 6 (a column of buttons) | breaks |
| 7 | the word sheet's Study row (`WordSheet.tsx` StudyRow) | equal tiles, two to a row, under the app's name; a fade and a Close when over 6 | fine | 21 lexicons On is 22 tiles in a half-height box: 'not great' (his words, mw-5r3p30.135) | n/a (no one owns 1,000 Greek lexicons; 40 is the real ceiling) |
| 8 | the idea sheet's Read more (`IdeaSheet.tsx` ReadMore) | one line a book, three shown, More books (N) | fine | fine for 9 grammars; a book's sections multiply (Black 22) but each idea names few | fine |
| 9 | the tutor's request: `resources`, `works` (`services/talk.ts`, `resources/tutorLinks.ts`) | every ticked work as {id, title, author, kind, covers} | fine | breaks: 110 works weigh about 9 KB, over MAX_REQUEST_BYTES (8,000) | breaks |
| 10 | the tutor's chips under an answer (`TutorLinks.tsx`) | at most 3 links, one chip each per resource | fine | fine (the cap is 3) | fine |
| 11 | a verse's Open in Logos (the tutor's verse chip, Today's Psalms, the reference card, the chapter picker's Old Testament) | one link, his Bible in Logos | fine | there is no surface at all for 8 Greek texts, 45 interlinears and 25 commentaries at a verse: only the tutor can name one | same |
| 12 | Today's Devotional (`today/Today.tsx`) | one link at the day | fine | fine (one) | fine |
| 13 | the Import screen for words (`ImportScreen.tsx`) | paste, one `ul` of rows, Add N | fine | fine | 1,000 rows in one list draws in time, but the summary line matters more than the rows; the pattern (paste or file, preview, counts, Add N) is the one the library import borrows |
| 14 | the ask boxes: Ask for another book (`controls/askBook.tsx`), Request a devotional, Ask for more (`settings/AskMoreScreen.tsx`), Send this to the makers | a typed title each, one grist each, the Mayor researches each | fine | 110 single asks flood the Mayor's mail; each needs his research for the Resource ID | breaks everyone |
| 15 | Your requests (`RequestsScreen.tsx`) | newest first, no search | fine | long, no search, no grouping | breaks |
| 16 | Settings search (`settings/rows.ts` searchSettings) | rows by name and hint | fine | 'BDAG' finds nothing: a book is not a row | same |
| 17 | What's new / the changelog | one line per landing | fine | each catalogue growth is one line ('12 more Logos books open from Lampas') | fine |
| 18 | the talk's `screen.settings` (`settings/tutorSettings.ts`) | every row with its value; Works is not talkable | fine | must stay out: a shelf of 110 is not a setting | must stay out |

Rows 1 to 6 and 14 collapse into the Library screen and the one ask (sections 3, 5 and 6). Rows 7, 8 and 11 get the Pinned state and a 'More' door
(section 4). Row 9 gets a digest within the cap (section 7). Rows 15 to 18 get one line each in section 8.

## 3. The shape at scale: one library, by kind

### 3.1 The catalogue

`src/resources/catalogue/` holds one generated JSON file per kind, written by `npm run logos:catalogue` (a data tool, not in the gate, like
`data:build`) from two inputs: the factory's rules file `data/logos/catalogue-rules.json` (which ids and which series are in, with the value line and
the key form of each) and a Logos library export (the vault's `plans/lampas-logos-library-2026-10-08.csv` to start). The generated JSON is committed,
as the chapter data is. Each entry:

```ts
interface CatalogueEntry {
  resource: string;           // the Logos Resource ID, the natural key: 'LLS:46.30.18'. Never guessed (mw-5r3p30.64).
  kind: Kind;                 // 'lexicon' | 'grammar' | 'greek-text' | 'interlinear' | 'commentary' | 'bible' | 'devotional'
  title: string; short: string; author?: string; series?: string;
  opens: Opens;               // where Lampas opens it: see the table below
  value: string;              // one line, the value it adds beyond Logos alone; an entry with none is not in the catalogue
  covers?: string[];          // a commentary volume or an interlinear: our book codes, from the export's ReferenceSupersets (61 Matthew ... 87 Revelation)
  sections?: BookSection[];   // a grammar only: its parts and the ladder ideas each teaches (today's GrammarBook.sections)
  starts?: 'on' | 'pinned';   // the state the import gives it; Off is never a default
  verified?: string;          // the date the Governor tapped it on his phone; absent means UNVERIFIED on a device
}
```

| kind | opens at | key form (all `src/resources/logosRes.ts` resourceLink, scheme first, ref.ly fallback) | starts | value it adds (his test: value over volume) |
| --- | --- | --- | --- | --- |
| lexicon | a word | `hw=<lemma>`, `ref=GreekStrongs.<n>` or `hw=<Topic>` (today's `Key`) | BDAG, Louw-Nida pinned; the rest on | from the word he is learning (lemma, parse, gloss, his level) straight into the entry: Logos needs a Bible open and a long press first |
| grammar | a parsing / a ladder idea | `ref=<section>` from the book's `sections` table (`Page.p_26` today; the export's data type, `ltrntg.4`, is a lead: section 10) | the ones with a sections table on, Black pinned | the ladder's idea sheet lands on the lesson that teaches it: Logos has no ladder. **A grammar with no sections table is listed but adds nothing on screen** (it would open at its start), so it is On for the tutor only, never pinned |
| greek-text | a verse | `ref=Bible.Ro8.31` | on, none pinned | the other text at this verse (SBLGNT, TR, Scrivener, the SBLGNT apparatus) beside Lampas's Byzantine: the textual question answered where Lampas cannot |
| interlinear | a verse | `ref=Bible.Ro8.31` | the one that matches his Bible in Logos pinned; the rest on | the Greek behind *his* translation's wording (ESV 'propitiation'), which the Weave over the MSB cannot show |
| commentary | a verse, in the volume that covers the book | `ref=Bible.Ro8.31` (today's workLink) | on, none pinned | the depth of his library at the verse he is reading: the tutor names what Calvin or Lenski argues and the link is where he checks it |
| bible | an Old Testament chapter, any verse | `ref=Bible.Ge15.6` (today's logosBible) | the one he chose; one at a time | the whole Bible from a reader that holds only the New Testament |
| devotional | a day | `ref=DayOfYear.Oct_21` | the ones of his draw | Today opens the day's reading in his own copy (his 'fantastic') |

Not in the catalogue, by his test, with the reason the import gives him (section 5.4): the pronunciation datasets (Greek Lemmas Koine, Erasmian,
Modern: a link opens a dataset page, not a word's sound; Lampas has its own scheme), the interactives (Greek Alphabet Tutor, Listen & Learn Greek,
Morphology Charts: Lampas has its own; Morphology Charts is a research lead, section 10), books that open only at their start (nothing Logos does not
do better from its own library), and everything outside the New Testament in Greek. Calvin's Institutes, a `book` today, stays only because the
tutor names the part in words (a citation, not a launcher); a second book of that kind is added only with the same case.

Adding a book is one line in the rules file plus the tool: by id (`"LLS:BDF": {kind: 'grammar', ...}`), by **series** (`"Lenski's Commentary on
the New Testament": {kind: 'commentary'}`), in which case every volume of the series in the export joins, with its `covers` read from its
ReferenceSupersets, or by **type** (`lbx.reverse-interlinear` with a New Testament range is an interlinear, `text.monograph.bible` in English a
Bible, `lbx.calendar-devotional` a devotional), in which case every row of that type in any export joins. A series rule is how 408 New Testament
commentary volumes stay one line each per series, and a type rule is how a reader's import matches a Bible or an interlinear the Governor's export
lacks without an ask (section 5.2).

### 3.2 His shelf: Off, On, Pinned

One Dexie table `library` (a new version: the nine `verno` tests and the db.test.ts table list move with it, rig memory mw-5r3p30.695):

```ts
interface ShelfRow { resource: string; state: 'off' | 'on' | 'pinned'; since: number; from: 'import' | 'tap' | 'default' }
```

Read through `src/data/repositories/library.ts` only: `shelfOf(kind)`, `pinnedOf(kind)`, `setState(resource, state)`, `setKind(kind, state)`
(All on / All off), `importShelf(rows)`. Today's keys are read once into rows on the first open after the update (`resourceOption.logos` ticks
become On, `grammarBooks` On, `works` On, `devotionalDraw` On; the first lexicon tick and Black become Pinned) and then ignored; the old
`resource.logos` switch stays the one master switch (Logos Off hides the whole library, as a setting that is Off hides its details).

What each state does:

| state | the word sheet | the idea sheet | a verse | the tutor | Settings |
| --- | --- | --- | --- | --- | --- |
| Off | nothing | nothing | not in the chooser | not told | listed, grey |
| On | behind 'All N lexicons' | behind 'More books (N)' | in the chooser | told, by place (section 7) | listed |
| Pinned | a tile in the first row (at most 4) | one of the three lines shown | the first door (one per kind) | told first | listed first, a pin mark |

A reader who wants 110 on at once: Import (everything matched turns On). One at a time: the kind page's rows. Everything off: Logos Off.

### 3.3 The Library screen (`#/library`, 'Your Logos library')

Reached from Settings > Study resources > Logos (its row, when On, shows one line and a button instead of the lists it holds today), from the word
sheet's 'All N lexicons' sheet ('Manage'), and from Settings search (a book's title found there answers 'BDAG · Your Logos library'). A full screen,
not a widget: the vault's rule is that a long list is a widget inside a page of settings, and this is a page of its own, so the widget rule applies
inside it (each kind page is a searchable list) while the home stays seven rows.

```
┌──────────────────────────────────────────┐
│ ‹ Settings      Your Logos library       │
├──────────────────────────────────────────┤
│ ┌──────────────────────────────────────┐ │
│ │ 198 of your 4,795 books open from    │ │
│ │ Lampas.  Imported 8 Oct · 3 new      │ │
│ │ since.                               │ │
│ │ [ Import again ]   [ Ask for a book ]│ │
│ └──────────────────────────────────────┘ │
│ 🔍 Search your books                     │
│                                          │
│ Lexicons              19 on · 2 pinned › │
│ Grammars               9 on · 1 pinned › │
│ Greek texts            8 on            › │
│ Interlinears          45 on · 1 pinned › │
│ Commentaries          25 on            › │
│ Bibles                 1 chosen: LSB   › │
│ Devotionals           37 on            › │
│                                          │
│ 4,597 of your books Lampas cannot use    │
│ yet. What they are ›                     │
│                                          │
└──────────────────────────────────────────┘
```

Before an import the card reads 'Lampas opens a Logos library's lexicons, grammars, Greek texts, interlinears, commentaries, Bibles and devotionals.
Import your list, or tick the ones you own.' with **Import** and
**Tick by hand** (which opens Lexicons). At 3 (a reader who ticked three) the kinds with none On still show, grey, so the shape is learned once.
At 1,000: the same seven rows; the counts change. The search field searches titles, authors and series across every kind, the way SearchableList
does; a result row shows its kind and its state and a tap opens the kind page at the book.

### 3.4 A kind page (`#/library?kind=lexicon`, 'Lexicons')

```
┌──────────────────────────────────────────┐
│ ‹ Library       Lexicons        19 on    │
├──────────────────────────────────────────┤
│ Opens the word you tap at its entry.     │
│ Pinned ones are on the word sheet;       │
│ the rest are behind All lexicons.        │
│ [ All on ]  [ All off ]                  │
│ 🔍 Search 19 lexicons                    │
│──────────────────────────────────────────│
│ BDAG                      Off  On [Pin]  │
│ A Greek-English Lexicon of the NT ...    │
│──────────────────────────────────────────│
│ Louw-Nida                 Off  On [Pin]  │
│──────────────────────────────────────────│
│ Lexham Theological Wordb.  Off [On] Pin  │
│──────────────────────────────────────────│
│ DBL Greek                 Off [On] Pin   │
│──────────────────────────────────────────│
│ EDNT                      Off [On] Pin   │
│ ...                                      │
│ (scrolls; pinned first, then on, then    │
│  off; search keeps that order)           │
└──────────────────────────────────────────┘
```

The three-step control is the Weave's segmented row (`Off | On | Pin`, 44 px each, role radiogroup, one tap flips through `oneTap`); a fourth
pin is refused with one line, 'Four pinned already: unpin one first' (the word sheet's first row holds four). The list is the shared searchable list
grown by counts and a state control; sorted pinned, on, off, then title, and not re-sorted under his thumb (SearchableList's rule). The kinds differ
only in their help line and in what Pin means: Bibles has 'Chosen' in place of Pin and one at a time (the picker's radio shape); Devotionals has no
Pin (Daily > Which devotional chooses), and Daily's 'In the draw' reads this page's On set. A kind of one item (Audio Bible) stays as it is until it
has a second.

### 3.5 The word sheet at scale

```
│ Study                                    │
│ Logos                                    │
│ ┌────────────┐ ┌────────────┐            │
│ │   BDAG     │ │ Louw-Nida  │            │
│ └────────────┘ └────────────┘            │
│ ┌────────────┐ ┌────────────┐            │
│ │ Bible Word │ │ All 19     │            │
│ │  Study     │ │ lexicons › │            │
│ └────────────┘ └────────────┘            │
│ Strong's   G26                           │
```

The first row is the pinned lexicons (at most 4; Bible Word Study is a fixed fourth tile while any lexicon is on, as today). 'All 19 lexicons ›'
opens a sheet over the word sheet (a `role=dialog` child of `.fixed.inset-0`, rig decision mw-5r3p30.636): a search field, the pinned first, every
On lexicon as a full-width row 'BDAG › opens ἀγάπη', and **Manage** at its foot (the Library's Lexicons page). With 3 on and none pinned the row
shows the 3 (nothing to fold, no door). With 21 on and 2 pinned: 2 + Bible Word Study + the door. The fade-and-Close of mw-5r3p30.135 stays for
a sheet that is still long (Strong's, Accordance, and more than one resource on).

### 3.6 A verse at scale: one door, then a chooser

Every place that has 'Open in Logos' for a verse today keeps its one button, which opens the verse in his Bible in Logos. Beside it, when at least
one Greek text, interlinear or commentary covering the book is On, a second button **In another book…** opens the chooser:

```
┌──────────────────────────────────────────┐
│ Romans 8:31 in Logos                  ✕  │
├──────────────────────────────────────────┤
│ 🔍 Search 58 books                       │
│ Pinned                                   │
│   ESV reverse interlinear              › │
│ Commentaries on Romans (10)              │
│   Lenski, Romans                       › │
│   Calvin, Romans                       › │
│   BECNT, Romans ...                    › │
│ Greek texts (8)                          │
│   SBLGNT                               › │
│   SBLGNT apparatus                     › │
│   Textus Receptus 1550 ...             › │
│ Interlinears (45)                        │
│   NASB95 ...                           › │
│ Manage in Your Logos library             │
└──────────────────────────────────────────┘
```

Each group is folded to its first three with 'N more' (the idea sheet's shape), search opens all. The chooser is the same component in the Verse
view (a new 'In Logos' action beside Listen), under the tutor's verse chip (the chip row gets a second chip 'In another book'), on Today's Psalms
and Proverbs boxes, and on the reference card for an Old Testament verse (commentaries on the Old Testament are not in the catalogue, so there it
lists Bibles and interlinears only). At 3 On: no chooser button unless one of them is a verse-kind. At 1,000: the same sheet; search carries it.

### 3.7 The idea sheet at scale

Read more keeps its shape (three lines, More books (N)); the three are the pinned grammars, then On ones in the catalogue's order. A grammar with
no sections table never appears here (it has nothing to open at). Ask for another book moves to the one ask (section 6); the line under Read more
becomes 'Ask for a grammar ›', which opens the ask with the kind preset.

### 3.8 Settings after the change

Settings > Study resources > Logos, On:

```
│ Logos                              [On]  │
│ Don't have Logos?            Get Logos   │
│ Your Logos library                       │
│ 198 books on · imported 8 Oct       ›    │
│ Bible in Logos: LSB                 ›    │   (opens Library > Bibles)
```

The lexicon list, Grammar books, Ask for another book and the Works list leave Settings; Daily keeps Which devotional (a searchable picker of the
On devotionals, not a select of 37) and loses Request a devotional to the one ask. Audio Bible stays. The Settings search routes a book's title to
the Library (the found row's group reads 'Your Logos library'). `isTalkable` keeps the library out of the tutor's settings list: the tutor learns
the shelf through `works` (section 7), never as settings.

## 4. Value over volume: each Logos link and what it adds

His second message asks for each link to earn its place. The catalogue's `value` line is that test, written down. The links the design keeps,
drops and defers:

| link | keep? | why |
| --- | --- | --- |
| a lexicon at the headword (word sheet, tutor word chip) | keep | the entry for the very word he is learning, one tap from his level and gloss |
| Bible Word Study at the lemma | keep | Logos's own guide, reached from a word Lampas chose for him |
| a grammar at the section that teaches a ladder idea | keep | Logos has no ladder; the idea sheet is the index Logos lacks |
| a grammar at its start | drop | Logos's library does that better; listed On for the tutor's citations only |
| a Greek text at the verse | keep, unpinned | the textual question ('why does the ESV differ?') answered where Lampas's one text cannot |
| the SBLGNT apparatus at the verse | keep, unpinned | same, and the tutor may link it for a variant |
| a reverse interlinear at the verse | keep one pinned (his Bible's) | the Greek behind his own translation's wording |
| a commentary at the verse | keep, tutor-first | the depth of his library at the verse he is on; the tutor names the argument, the link is the check |
| a devotional at the day | keep | his 'fantastic' |
| an Old Testament chapter or verse in his Bible | keep | the rest of the Bible from a New Testament reader |
| a book at its start (Institutes) | keep, no more of its kind without the same case | the tutor cites and names the part; a launcher adds nothing |
| pronunciation datasets | drop | opens a dataset page; Lampas speaks Modern Greek itself |
| Morphology Charts, Greek Alphabet Tutor, Listen & Learn | drop now, one research lead | Lampas has Paradigms and the letter drill; a chart link at a paradigm is UNVERIFIED (section 10) |
| any of the 4,597 at its start from a browsable list | drop | 'books for the sake of it'; Logos's own library search is better |
| Factbook for a proper name, the Exegetical Guide at a verse | defer: research | the two novel ways found; link forms unsourced (section 10, For the Governor 4) |

## 5. Import: his list, in one step

### 5.1 Getting the list

Logos desktop: Library > Save as Spreadsheet (the story's words; the exact menu is the Governor's to confirm on the Laptop). The vault file is
that export: columns ResourceId, Type, AbbreviatedTitle, Title, Series, Languages, ReferenceSupersets; no BOM, CRLF line ends, RFC 4180 quoting
(commas and quotes inside titles are quoted), and **raw tab characters inside the last cell, ReferenceSupersets, unquoted**, on 306 rows: a parser
that treats the file as tab-separated, or splits on whitespace, breaks; a comma parser that keeps a cell whole until the next unquoted comma is right.
About 600 KB for 4,795 rows. The file reaches the phone as any file does (email to himself, Drive, a cable).

Two doors into Lampas, one parser:

1. **Choose file**: the Library screen's Import opens `<input type="file" accept=".csv,text/csv,text/comma-separated-values,application/vnd.ms-excel">`,
   Android Chrome's Files picker (Downloads, Drive). The primary path; nothing to install.
2. **Share to Lampas**: the manifest's `share_target` adds the same CSV types to `files.accept` (today `image/*`); `src/share/target.ts` parks it as it
   parks a picture, and `#/share?s=<id>` opens the import instead of the talk chooser when the file is a CSV. UNVERIFIED until he shares one (Windows
   may label the file `application/vnd.ms-excel`; Android may offer Lampas by extension only).

No desktop: **Tick by hand** on the kind pages (section 3.4): every catalogue entry can be turned On without an import. The Logos phone app has no
export, and `app.logos.com`'s library page has no save (unverified: copying its list would be a third door if it does; not relied on).

### 5.2 Matching

Parsed on the phone (`src/library/parseExport.ts`, pure: `parseCsv` RFC 4180 with CRLF and raw tabs inside a cell, `readExport(text) -> ExportRow[]`, a
fixture of the vault file's first 60 rows committed under `tests/fixtures/logos-export-head.csv`, including the tab-bearing and quoted-comma rows).
Then `matchExport(rows, catalogue) -> { matched, unmatched }`: a row matches by Resource ID, by Series when the catalogue has a series rule of that
name and the row's Type is the series' kind, or by Type under a type rule (its `covers` read from ReferenceSupersets then and there). A row of the wrong Testament under a series
rule (Calvin on Genesis) is unmatched with the reason 'Old Testament'.

### 5.3 The result screen

```
┌──────────────────────────────────────────┐
│ ✕                    Import your library │
├──────────────────────────────────────────┤
│ 4,795 books read from your Logos list.   │
│                                          │
│ 198 open from Lampas                     │
│   19 lexicons · 9 grammars · 8 Greek     │
│   texts · 45 interlinears · 25           │
│   commentaries · 37 devotionals · 55     │
│   Bibles (LSB chosen)                    │
│   All of these turn on. BDAG, Louw-Nida, │
│   Black and the ESV interlinear are      │
│   pinned; change any in Your Logos       │
│   library.                               │
│                                          │
│ 4,597 Lampas cannot use yet              │
│   What they are ›                        │
│                                          │
│ Your list stays on this phone. Nothing   │
│ is sent.                                 │
│                                          │
│ [ Turn on 198 books ]                    │
└──────────────────────────────────────────┘
```

'Turn on 198 books' writes the shelf (On for every match, Pinned for `starts: 'pinned'` entries, and his Bible in Logos set to the one Bible he
owns that `COMMON_BIBLES` would have listed first, LSB for him) and keeps the whole export in Dexie `exportRows` ({resource, type, title, series,
languages, refs, matched}), so it can be re-matched and searched later. A second import replaces the rows and re-matches; states he set by hand are
kept (a row's `from: 'tap'` wins over the import's default). A reader with 3 matches sees the same screen with small numbers and no pins he did not
earn; a reader with 1,000 matches sees the same screen. The screen is the Import screen's pattern (preview, counts, one button) with the row list
replaced by counts, because 4,795 rows are not for reading.

### 5.4 What Lampas says about the rows it cannot use

'What they are ›' opens a page of plain lines by Logos type, each with the reason and what would change it, so he knows what to ask for:

```
│ 4,597 books Lampas cannot use yet        │
│                                          │
│ 838 ancient manuscripts and 412          │
│ translations of them: not the New        │
│ Testament.                               │
│ 383 commentaries on the New Testament    │
│ that are not on the Greek text: the      │
│ makers add a series when a reader asks   │
│ and it fits (Ask for a book).            │
│ 287 commentaries on the Old Testament or the whole Bible:   │
│ Lampas holds the New.                    │
│ 1,319 other books, 95 collected works,   │
│ 61 of sermons, 44 journals: Lampas       │
│ links a book only where it opens at the  │
│ word, the verse or the day.              │
│ 19 lexicons of Hebrew, Aramaic, Latin or │
│ Arabic: not Greek.                       │
│ 21 grammars of Hebrew, Latin or classical│
│ Greek: not Koine.                        │
│ 6 pronunciation and 36 interactive       │
│ tools: Lampas has its own.               │
│ ...                                      │
│ [ Ask the makers about these ]           │
```

The reasons are a table in `src/library/reasons.ts`: Logos type (and, for a few, the Languages or ReferenceSupersets test) to one sentence. A type
the table lacks reads 'N books of a kind Lampas does not know'. The page lists at most 12 lines; nothing is a browsable list of 4,597 titles.

## 6. Asking for more, without flooding him

### 6.1 One ask: 'Ask for a book'

The four boxes become one sheet, opened from the Library card, the idea sheet ('Ask for a grammar'), Daily ('Ask for a devotional') and Ask for more
(its study-resource form points here). It asks for one thing: the book.

```
┌──────────────────────────────────────────┐
│ Ask for a book                        ✕  │
├──────────────────────────────────────────┤
│ Which book?                              │
│ 🔍 Search your 4,597 other books         │
│   Lenski, Interpretation of St Paul's    │
│   Epistle to the Romans                › │
│   ...                                    │
│ or type a title                          │
│ ┌──────────────────────────────────────┐ │
│ │                                      │ │
│ └──────────────────────────────────────┘ │
│ Why would it help? (optional)            │
│ ┌──────────────────────────────────────┐ │
│ └──────────────────────────────────────┘ │
│ The makers weigh each ask against what   │
│ Lampas is for. Your requests follows it. │
│ [ Send ]                                 │
└──────────────────────────────────────────┘
```

With an import kept, the search is over his unmatched rows (title, series, author), so the request carries the row's true Resource ID, Type, Series
and ReferenceSupersets: the Mayor adds it to the rules file without research. Without an import, the typed title goes as today. One request kind
`book` replaces `grammar-book`, `devotional` and the `study-resource` form: `{kind: 'book', resource?, type?, series?, refs?, title, kindWanted?,
why?, app_version}` (the feedback input schema's branches shrink by two; the examples under `grinds/examples/feedback/` follow). The tutor's own
'Send this to the makers' stays as it is (it is about anything, not a book).

### 6.2 The whole list, once

After an import, the result screen's 'Ask the makers about these' sends **one** request of kind `library`: the counts by Logos type, and the unmatched
rows of the kinds Lampas could use (commentaries on the New Testament, Greek grammars and lexicons, Greek texts, interlinears, devotionals: about
500 of his 4,597) as one attached file `library.csv` (ResourceId, Type, Title, Series, ReferenceSupersets; under 200 KB). The mill already takes
files on a feedback grist (pictures, up to four) and forwards them to the Mayor's mail; forwarding a text/csv attachment is one Postern story (named
in the plan as P1, not a blocker): until it lands the request carries no file and only the 60 heaviest rows by kind in its payload (`{id, type,
title ≤ 60}` each, under MAX_REQUEST_BYTES), so the path works from day one and gets whole when P1 lands.

Flood control, in the app, not in his mail:

- one `library` request per import, never per book; and no second one until the catalogue version has changed since the last send or 30 days have
  passed (the card says 'Asked on 21 Oct: 412 books. The makers add what fits with each update.');
- single asks go through 'Ask for a book', which refuses a book already asked (Your requests shows it) and a book already in the catalogue (it says
  'Lampas opens this one: turn it On');
- only the usable kinds go in the list; the 838 manuscripts never do;
- the Mayor's tool `npm run logos:fit -- <csv>` prints the unmatched rows of a sent list by kind with the data types, the same reading he did by
  hand on 2026-10-08, so judging a list is minutes.

Privacy: nothing leaves the phone until he taps Send; the sheet says what goes (titles of books, which say something of what he reads) in one line.

### 6.3 How it comes back

The Mayor judges fit by kind against the vision (Q3: his rule), edits `catalogue-rules.json` (an id or a series), a chore story runs the tool and
lands. On the phone: the update's What's new says 'N more Logos books open from Lampas'; the library re-matches the kept export on the first open
after an update (the catalogue carries a version stamp; `rematch()` runs when it changes) and the Library card says '3 new since'; a book he asked
for by `book` request moves in Your requests through the existing request-status records (Filed, Being built, Landed in 0.1.4xx) with nothing new to
build. A reader whose ask was declined sees 'Declined: not on the Greek text' there, in the Mayor's words.

## 7. The tutor at scale

Today the bible-talk request carries every ticked work as `{id, title, author, kind, covers}`: 110 works weigh about 9 KB, over the 8,000-byte cap
(`src/services/requestBudget.ts`) before a word of history. The rule:

**The tutor is told a digest of his shelf chosen by the place he is on, within `WORKS_BYTES` (1,200 bytes, the pattern of `GREEK_WORDS_BYTES`),
never the whole shelf.** `worksForTutor(shelf, place, question)` builds it:

1. pinned works first, every kind;
2. then the commentaries whose volume covers the chapter he is on (newest state first, then the catalogue's order), at most 8;
3. then the grammars with a sections table (at most 4) and the Greek texts and apparatus (at most 3), for a question about a form or a reading;
4. each line `{id, t: short title, k: kind}` (about 40 bytes; `covers` is dropped because the place already fits);
5. one closing line `{more: {commentary: 15, interlinear: 44}}` so the tutor can say 'your other commentaries are under In another book', never
   pretend there are none;
6. lexicons are not listed at all (the app draws the lexicon links itself from the pinned set; the tutor's `word` link needs no name);
7. `fitHistory` cuts the digest from its end before it cuts the history, after the word list.

How it chooses only what is relevant (the instruction part `200-links-to-his-study-resources.md`, section 'Links to a work he owns', rewritten):
a commentary link only when the question is about the meaning or argument of the passage he is on, and only one unless he asks to compare; a grammar
link only for a construction the book treats, and the sections table is the app's, so the link names the idea, not a page; a Greek text or the
apparatus only for a textual question; never a link to show that a book exists; and 'Say only what you know of the author's view' stays. At most
one `work` link an answer in ordinary talk, two in quiz mode when a connection rests on them. The `work` enum in the answer schema becomes the
catalogue's ids (generated by `grind:build` from the catalogue, as the setting keys are), and an id not on his shelf still draws nothing.

What is new for `knows.ts`: the shelf is classified as `works` (sent, by place) for bible-talk and verse-ask, with the reason written for verse-read and
tips; `tests/unit/tutor-knows.test.ts` holds it. The talk's `screen.settings` never carries the shelf (`isTalkable` excludes `library`).

## 8. The rest of the inventory, one line each

- Your requests (row 15): group by kind with a count ('Books (14)'), and the `library` request shows as one row with its count; a search field when
  over 20 rows (the searchable-list rule).
- Settings search (row 16): a title typed finds the book and opens the Library at it; the Settings search's `visibleRows` gains a `library` source.
- What's new (row 17): the catalogue tool writes the count of new entries into the story's What's new line; nothing by hand.
- The talk's settings (row 18): `isTalkable('library')` is false; a test says so.
- The words Import screen (row 13): unchanged; it and the library import share the parser and the preview-counts-one-button shape (section 9).
- Today (row 12) and the reference card: unchanged but for the chooser button of section 3.6.

## 9. Shared pieces and where they live

| piece | what | where | who else uses it |
| --- | --- | --- | --- |
| `@pwa-kit/searchable-list` | today's `src/ui/SearchableList.tsx` + `listFilter.ts`, grown: counts, ticked-first, a state control slot (tick, radio or the three-step), All on / All off, `noun` | pwa-kit `packages/searchable-list` (React) | SpellForge (word lists, voices), Legend (countries, currencies), Lampas (voices, lexicons, devotionals, kinds) |
| `@pwa-kit/import` | `parseCsv` (RFC 4180, CRLF, raw tabs inside a cell; no DOM), `readFile` (file input or a parked share), and `<ImportPreview>` (the counts card and one button) | pwa-kit `packages/import` (parser plain TS; preview React) | SpellForge (a word list from a CSV or paste, beside its photo and QR imports), Legend (a collection from a CSV), Lampas (words, the library) |
| the three-step control | `Off | On | Pin` segmented row, 44 px, radiogroup, `oneTap` | Lampas `src/ui/ThreeStep.tsx` until a second app wants it | the Weave rows could adopt it (they are the model) |
| the ask with Your requests | already shared: bsv-kit grist + Postern's feedback forward and request-status | bsv-kit, Postern | all three |

The kit stories are the Mayor's to file in pwa-kit; the Lampas stories below build the pieces in Lampas first (one place, tested) and the lift
is a later, separate story, as `whats-new` and `tips` were lifted.

## 10. Research leads (not built here; each a small docs/research story)

1. **Section references by the book's own data type.** The export's ReferenceSupersets names each book's reference type: Black `ltrntg.1-187`, BDF
   `bdf.1-496.0.2`, Robertson `robertsongram.1-22.4.4`, Burton `smtntg.1-489`, Machen `bggnt.1.1-1.513`, Louw-Nida `louw.1-93.615`. A link
   `logosres:LLS:BDF;ref=bdf.318` would land on BDF §318 whatever the edition's page numbers; the sections tables could then be written from a
   book's own numbering. UNVERIFIED on a device; one tap by the Governor on one such link settles it.
2. **Factbook for a proper name.** A word sheet for Μελχισεδέκ could offer 'Melchizedek in Factbook' (`logos4:Factbook;...`, form unsourced):
   a novel way into his library's people, places and things. Needs the link form from a source and one tap.
3. **The Exegetical Guide at a verse** (`logos4:Guide;t=Exegetical%20Guide;ref=Bible.Ro8.31`, by analogy with the sourced Bible Word Study form):
   one 'Study this verse in Logos' door that gathers his whole library at the verse. UNVERIFIED.
4. **Morphology Charts at a paradigm**: whether `INTERACTIVE:MORPH-CHARTS` takes a reference. Likely not; a tap settles it.

## 11. Alternatives weighed, and why they lost

Keeping six lists and giving each the searchable widget in Settings (today's path, extended) lost because Settings would be the place he manages
110 books in five-row boxes, with no counts, no All on, no import and the tutor's cap unsolved. A catalogue fetched from the VPS so it could grow
without a release lost to offline-first, a second trust path for data, and the fact that Lampas lands daily already. A browsable list of all
4,795 rows with Open at the start of any book lost to his own test (books for the sake of it; Logos's library does it better). Letting the tutor
judge fit in chat (grilling Q3 B) lost because it cannot change the catalogue and the Mayor's judgment against the vision is the rule he set. One
request per unmatched book lost to his mail. Showing every On lexicon as a tile (no Pinned state) lost to the 22-tile sheet he called not great.
A native `select` for each kind lost at 45 interlinears, and virtualised lists lost because no list here passes 5,000 rows and they make the
jsdom and Playwright proofs harder for nothing. A per-topic on/off matrix for works (Q6 A as written) lost to its own size at 110 works: a work is
Off, or a Memory note made in talk says what not to cite it on.

## 12. Grilling Q2 to Q8

| Q | answer |
| --- | --- |
| Q2 how a reader gives their list | **A** (Save as Spreadsheet, then Choose file or Share to Lampas), with **C** as the no-desktop path (Tick by hand on the kind pages). B (catalog.db) dropped: it needs a tool on a desktop. Decided, PROVISIONAL. |
| Q3 guided feedback | **A**: the list goes once, as one `library` request, and the Mayor judges fit by kind against the vision; the tutor never judges fit (it may help him word an ask). Decided. |
| Q4 the beliefs picture | **A**, and nothing new to build: it is Settings > Memory (on the device, read and corrected there, never sent but in a grist he sends). Decided. |
| Q5 the reinforce-to-challenge spectrum | the Governor's: For the Governor 1. |
| Q6 per-topic fit | per work, not per topic: Off is the control, and a topic exception is a Memory note made in talk ('do not cite Lenski on baptism') that the tutor already honours. No matrix. Decided, PROVISIONAL. |
| Q7 public-domain texts in full | **A** now (Abbott-Smith full, TBESG uncut, both verified); B (Robertson 1914, Thayer) is research first. Outside this design's stories. Decided, PROVISIONAL. |
| Q8 what stays out | **A**: only the catalogue opens; the typed Resource ID of Bible in Logos stays as the one escape hatch (a Bible he owns that the catalogue lacks), and nothing else opens by id. Decided. |

## For the Governor

At most four choices that are truly his. Everything else above is decided, PROVISIONAL, and his to amend.

1. **The tutor's stance (grilling Q5).** A: a setting, The tutor > 'With what I believe': *Reinforces* | *Balanced* | *Challenges me*, three
   steps, Balanced to start, honoured on every ask and changeable in talk like any setting. B: no setting; the tutor infers it from talk and keeps it
   in Memory. **Recommend A**: easy to use correctly, hard to use incorrectly, and a reader can see where he stands.
2. **Sending his list to the makers.** A: after an import, Lampas offers once to send the unmatched usable rows (about 500 titles for him) as one
   request, and says what goes. B: never offered; a reader asks book by book from his own rows. **Recommend A**: one request a library, the Mayor's
   tool reads it in minutes, and a reader's titles say something about him, so the offer says so and is his to take.
3. **What an import turns on.** A: every matched book turns On (the tutor may name any of the 110 by place; screens show the pinned few and a door).
   B: an import marks what he owns, Off, and he turns each kind on. **Recommend A**: 'do B' was his answer to the first slice, the whole list at
   once; Off stays one tap away per kind.
4. **The novel doors (section 10, leads 2 and 3).** A: spend two small research stories on Factbook for a proper name and the Exegetical Guide at a
   verse, each ending in one link for him to tap. B: not now; the catalogue's kinds are enough. **Recommend A**: they are the 'novel ways' his
   second message asked for, and each is a day.

## 13. Sweep: SpellForge and Legend

- SpellForge: the word lists (`src/features/word-lists/`: lists per profile, imported by photo, QR or typing, with a filter list in Settings) grow
  the same way: a list of lists with no search or counts, one import per source with its own screen, and the ask for a list goes by feedback.
- Legend: the collection and the wish list (`src/collection/`, `src/wishlist/`: items by country, 250 countries and their currencies from world
  data) grow the same way: country and currency pickers that are long lists, no file import of a collection, and the catalogue of countries is
  factory-kept data a reader cannot extend except by an ask.

## 14. The plan of build stories

For the Mayor to file, in this order; each under 120K tokens; each that changes what the app does updates About (`ATTRIBUTION.md`) and the Preface
(`src/preface.ts`) in the same story (rig decision), classifies anything new in `knows.ts`, and keeps the layout note in `docs/layout/settings.md`
or `docs/resources.md`. Every acceptance criterion is one that runs. P1 is a Postern story, not a blocker. K1 and K2 are pwa-kit stories, filed
after S3 and S5 land. 'Size' is the Builder's token budget: S under 60K, M under 120K.

| # | story | files | size |
| --- | --- | --- | --- |
| S1 | The catalogue: the rules file, the tool and the generated kinds | `data/logos/catalogue-rules.json`, `scripts/logos-catalogue.ts`, `scripts/logos-fit.ts`, `src/resources/catalogue/*.json`, `src/resources/catalogue.ts`, `tests/unit/catalogue.test.ts`, `docs/resources.md`, `docs/commands.md` | M |
| S2 | The shelf: the Dexie table, the repository, the migration of today's ticks | `src/data/db.ts`, `src/data/repositories/library.ts`, the nine verno tests, `features/library-shelf.feature` | M |
| S3 | The Library screen: home, kind pages, the three-step control, search | `src/library/LibraryScreen.tsx`, `KindPage.tsx`, `src/ui/ThreeStep.tsx`, `src/nav/route.ts`, `features/library.feature`, `tests/e2e/library.spec.ts` | M |
| S4 | Settings after the change: Logos row, Bible in Logos, Daily's picker, Settings search routes a title | `src/settings/controls/resources.tsx`, `daily.tsx`, `rows.ts`, `link.ts`, `tests/e2e/study-resources.spec.ts`, `works.spec.ts` | M |
| S5 | The library import: parser, match, file input, result and reasons, the kept export, re-match on update | `src/library/parseExport.ts`, `matchExport.ts`, `reasons.ts`, `ImportLibrary.tsx`, `tests/fixtures/logos-export-head.csv`, `tests/unit/parse-export.test.ts`, `features/library-import.feature` | M |
| S6 | Share a CSV to Lampas | `pwa-manifest.ts`, `src/share/target.ts`, `ShareScreen.tsx`, `tests/e2e/share-target.spec.ts`, `tests/unit/manifest.test.ts` | S |
| S7 | The word sheet at scale: pinned tiles and All N lexicons | `src/WordSheet.tsx`, `src/resources/logos.ts`, `src/resources/tutorLinks.ts` (wordChips reads pinned), `tests/e2e/word-sheet-many.spec.ts`, `features/word-sheet-study.feature` | M |
| S8 | A verse at scale: the chooser and its doors | `src/library/InLogosChooser.tsx`, `src/VerseView.tsx`, `src/TutorLinks.tsx`, `src/today/Today.tsx`, `src/markdown/ReferenceCard.tsx`, `features/in-logos.feature`, `tests/e2e/in-logos.spec.ts` | M |
| S9 | The tutor at scale: the digest by place, the instructions, examples, knows | `src/resources/tutorLinks.ts`, `src/services/talk.ts`, `tutor.ts`, `src/tutor/knows.ts`, `grinds/bible-talk.instructions/200-*.md`, `grinds/examples/bible-talk/*`, `tests/unit/request-budget.test.ts`, `features/tutor-works.feature` | M |
| S10 | One ask: Ask for a book, the `book` and `library` request kinds, flood control | `src/library/AskForBook.tsx`, `src/services/feedback.ts`, `grinds/feedback.input.schema.json`, `grinds/examples/feedback/*`, the four old boxes removed, `features/ask-for-book.feature` | M |
| S11 | Your requests at scale: grouped by kind, a search over 20 | `src/RequestsScreen.tsx`, `features/your-requests.feature`, `tests/e2e/your-requests.spec.ts` | S |
| S12 | The idea sheet reads the shelf; Ask for a grammar | `src/IdeaSheet.tsx`, `src/resources/grammarBooks.ts` (reads the catalogue), `features/idea-sheet-read-more.feature` | S |
| S13 | Demo: the library at scale on his phone | `docs/demo-library-at-scale.md`, `tests/e2e/library-demo.spec.ts`, `CLAUDE.md` Read by need | S |
| P1 | Postern: the feedback forward mails a text/csv attachment | Postern's mill (`grinds/feedback` forward) | S |
| K1 | pwa-kit: lift the searchable list with counts and a state control | pwa-kit `packages/searchable-list` | M |
| K2 | pwa-kit: the import parser and preview | pwa-kit `packages/import` | M |
| R1 to R4 | research: section data types, Factbook, the Exegetical Guide, Morphology Charts (For the Governor 4 gates R2 and R3) | `docs/research/logos-*.md` | S each |

### S1 The catalogue

Acceptance: (1) `npm run logos:catalogue -- <csv>` writes `src/resources/catalogue/<kind>.json` from `data/logos/catalogue-rules.json` and the export
named, and a second run changes nothing (`git diff --stat` empty). (2) The rules file names every id of today's `LEXICONS`, `GRAMMAR_BOOKS`,
`WORKS`, `COMMON_BIBLES` and `DEVOTIONALS`, the grilling's 9 grammars, 8 Greek texts and apparatus, the New Testament reverse interlinears, English
Bibles and calendar devotionals as type rules, and the four commentary series (BECNT, NIGTC, Pillar, Lenski) as series rules; `tests/unit/catalogue.test.ts` fails on a duplicate Resource ID, an
entry with no `value`, a `covers` code not in `data/books.ts`, a grammar `sections` idea not in the ladder, and on `LEXICONS` and the rest no longer
equal to the catalogue's view of them (the old exports become views over the catalogue; no screen changes). (3) `npm run logos:fit -- <csv>` prints
the unmatched rows by kind with their data types; a test runs it on the fixture. (4) `docs/resources.md` has the catalogue section and `docs/commands.md`
the two tools. (5) Gate green.

### S2 The shelf

Acceptance: (1) Dexie `library` (v+1, the stores map repeated with a `// vN:` comment); `src/data/repositories/library.ts` exports `shelfOf`,
`pinnedOf`, `setState`, `setKind`, `importShelf`, `rematch`; UI code reaches it only there. (2) On the first open after the update, today's
`resourceOption.logos` ticks, `grammarBooks`, `works` and `devotionalDraw` become rows (On; the first lexicon tick and Black Pinned), proven by
`features/library-shelf.feature` with the old keys seeded; the old readers (`tickedOf`, `getGrammarBooks`, `getWorks`) read the rows, so every screen
and test of today still passes. (3) The nine `verno` tests and the db.test.ts table list updated. (4) Gate green.

### S3 The Library screen

Acceptance: (1) `#/library` (route `library`, kept) draws the card, the search field and the seven kind rows with counts from the shelf;
`#/library?kind=lexicon` draws the kind page with the three-step control, pinned-on-off order, All on / All off and search; a fourth pin is refused
with the line. (2) `features/library.feature`: counts follow the shelf; All on turns a kind on; search finds by title and author across kinds and
a result opens its kind page at the book; Bibles is one-at-a-time; Devotionals has no Pin. (3) `tests/e2e/library.spec.ts` at 390x844: every
control 44 px, no horizontal overflow, the three-step control's hit areas, a shot of the home and of Lexicons; `tests/e2e/large-text.spec.ts` gains
both screens in MORE_SCREENS. (4) The axe check of `docs/accessibility.md` passes on both. (5) Gate green.

### S4 Settings after the change

Acceptance: (1) Settings > Study resources > Logos, On, shows 'Your Logos library · N books on' with a button that opens `#/library`, and no
lexicon list, Grammar books or Works list; the Works row leaves `ROWS`. (2) Bible in Logos opens Library > Bibles; the typed Resource ID stays on
that page. (3) Daily > Which devotional is a searchable picker of the On devotionals plus Random; 'In the draw' reads the shelf. (4) Settings search
for a book's title answers a row 'BDAG · Your Logos library' that opens the kind page at it. (5) `isTalkable('library')` is false and
`tests/unit/tutor-knows.test.ts` passes. (6) `study-resources.spec.ts`, `works.spec.ts`, `settings-search.spec.ts` updated; About and the Preface say
where the library is. (7) Gate green.

### S5 The library import

Acceptance: (1) `parseCsv` reads the fixture (CRLF, quoted commas, raw tabs inside the last cell, no BOM, and a BOM variant) into 60 rows with
7 fields each; `readExport` rejects a file whose header lacks ResourceId with one plain line. (2) `matchExport` matches by id and by series rule,
reads `covers` from ReferenceSupersets, and gives each unmatched row a reason from `reasons.ts`; the fixture's rows yield known counts. (3)
`#/library?import` opens the file input, parses on the phone, shows the result screen with the counts and the reasons page, and 'Turn on N books'
writes the shelf (On, the pins, his Bible) and keeps the export in Dexie `exportRows` (v+1); states set by hand survive a second import.
(4) `rematch()` runs on the first open after the catalogue version changes and the card says 'N new since'. (5) `features/library-import.feature`
and an e2e that uploads the fixture through `setInputFiles` and shots the result. (6) Nothing is sent: a step scans the fake Postern for grists.
(7) Gate green.

### S6 Share a CSV to Lampas

Acceptance: (1) The manifest's `share_target.params.files.accept` adds the CSV types; `tests/unit/manifest.test.ts` holds them. (2) A share POST
with a CSV parks it and opens `#/library?import=<id>`; a picture still opens the talk chooser; `tests/e2e/share-target.spec.ts` POSTs both.
(3) `docs/links.md` lists the share's new accept. (4) UNVERIFIED on a device is written in `docs/resources.md`. (5) Gate green.

### S7 The word sheet at scale

Acceptance: (1) With 2 lexicons pinned and 21 on, the Study row's Logos group draws the 2 pinned, Bible Word Study and 'All 21 lexicons ›'; with
3 on and none pinned it draws the 3 and no door. (2) The sheet 'All N lexicons' is a direct `role=dialog` child, has a search field, lists the
pinned first then every On one as a 44 px row that opens the word's entry, and ends with Manage; Back closes it. (3) `wordChips` names the first
pinned lexicon ('Open in Logos: BDAG for ἀγάπη'). (4) `tests/e2e/word-sheet-many.spec.ts` at 390x844 with 21 on: the Done and Close are reachable,
no tile is cut, shots of the row and the sheet; `large-text.spec.ts` adds the sheet. (5) Gate green.

### S8 A verse at scale

Acceptance: (1) `InLogosChooser` lists Pinned, Commentaries on <book> (N), Greek texts (N), Interlinears (N), each folded to three with 'N more',
search opens all, Manage at the foot; every row is a Logos link built by `logosRes.ts`. (2) The Verse view has 'In Logos' (his Bible) and, when a
verse-kind is On, 'In another book…'; the tutor's verse chip row, Today's Psalms and Proverbs and the reference card get the same second door; the
Old Testament card lists Bibles and interlinears only. (3) `features/in-logos.feature`: the groups and counts follow the shelf and the place; a
commentary whose volume lacks the book is absent. (4) `tests/e2e/in-logos.spec.ts` at 390x844 with 58 on: the sheet opens within the bars, rows 44 px,
a shot. (5) Gate green.

### S9 The tutor at scale

Acceptance: (1) `worksForTutor(shelf, place)` returns the digest in the order of section 7 under `WORKS_BYTES`; with 110 on and Romans 8 open it
holds the pinned, the 8 commentaries on Romans, 4 grammars, 3 Greek texts and the `more` line, under 1,200 bytes; `tests/unit/request-budget.test.ts`
keeps HEADROOM with it in. (2) `fitHistory` cuts the digest before the history and after the word list. (3) The instruction part says when a work link
is right (one an answer; two in quiz mode) and `grind:build` writes the `work` enum from the catalogue; the examples under `grinds/examples/bible-talk/`
carry a `works` digest and one answer that links a commentary at the passage and one that rightly links none. (4) `knows.ts` classifies `works`
for the four grinds and `tutor-knows.test.ts` passes. (5) `features/tutor-works.feature`: a link to a work not on his shelf draws nothing; a
commentary chip opens at the verse. (6) Gate green.

### S10 One ask

Acceptance: (1) 'Ask for a book' (a `useSheetBack` sheet) opens from the Library card, the idea sheet, Daily and Ask for more's study-resource form,
with the kind preset where it has one; with an export kept it searches the unmatched rows and a pick fills the request with the row's Resource ID,
Type, Series and ReferenceSupersets; without one the title is typed. (2) The `book` request replaces `grammar-book`, `devotional` and the
`study-resource` form in `grinds/feedback.input.schema.json` and its examples; the four old boxes are gone from Settings and the idea sheet, and
their tests moved. (3) The `library` request sends once per import with the counts and, until P1, the 60 heaviest rows in its payload under
MAX_REQUEST_BYTES; with P1 landed, the file; a second send is refused until the catalogue version changes or 30 days pass, with the card's line.
(4) A book already asked, or already in the catalogue, is refused with its line. (5) Both kinds are kept in `requests` and show in Your requests;
`features/ask-for-book.feature` walks each. (6) The sheet says in one line what is sent. (7) Gate green.

### S11 Your requests at scale

Acceptance: (1) Rows grouped by kind with counts, newest first within a group; a `library` request is one row with its count. (2) A search field when
over 20 rows, filtering by words. (3) `your-requests.spec.ts` with 30 rows at 390x844. (4) Gate green.

### S12 The idea sheet reads the shelf

Acceptance: (1) Read more's three lines are the pinned grammars then On ones; a grammar with no sections table never appears. (2) 'Ask for a grammar ›'
opens the one ask with kind grammar. (3) `features/idea-sheet-read-more.feature` updated; `grammarBooks.ts` reads the catalogue's grammar kind.
(4) Gate green.

### S13 Demo (labelled demo)

The demo bumps nothing by hand: no version, no data edited by hand (the catalogue is the tool's output), nothing seeded on his phone. It adds
`docs/demo-library-at-scale.md` and `tests/e2e/library-demo.spec.ts`, which walks the whole loop at 390x844 with the fixture export (import, the
counts, the reasons, the word sheet's door, the verse chooser, one ask through the fake Postern, Your requests moving to Filed) and ends in shots
`library-demo-1-import` to `-7-requests`. Acceptance: the spec passes in the gate's e2e project; the doc's HOW TO CHECK IT is the six steps below,
with the labels as drawn; the Governor's 'Looks good' closes it.

HOW TO CHECK IT, for the Governor:

1. On the Laptop, in Logos: Library > **Save as Spreadsheet**; send the .csv to your phone (email it to yourself).
2. In Lampas: Settings > **Study resources** > Logos **On** > **Your Logos library** > **Import**; choose the file. Right looks like: 'N books read
   from your Logos list', then '198 open from Lampas' and '4,597 Lampas cannot use yet', with **Turn on 198 books**.
3. Tap **Turn on 198 books**. Right looks like: the library home with Lexicons 19 on · 2 pinned, Grammars, Greek texts, Interlinears 45 on,
   Commentaries 25 on, Bibles 1 chosen: LSB, Devotionals 37 on.
4. Open Romans 8, tap a word: under **Study > Logos** the tiles are BDAG, Louw-Nida, Bible Word Study and **All 19 lexicons ›**; the door opens a list
   with a search field; a tap opens Logos at the word.
5. On the verse: **In another book…** lists Commentaries on Romans (10), Greek texts (8), Interlinears (45); a commentary opens Logos at Romans 8:31.
6. Back in the library: **Ask for a book**, search 'Guzik', pick one, **Send**. Right looks like: 'Sent: the factory has it' and the book under
   Settings > **Your requests** as Sent, then Filed when the Mayor files it.
