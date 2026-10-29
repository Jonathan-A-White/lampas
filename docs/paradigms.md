# Paradigms (mw-5r3p30.82)

The Paradigms screen (`#/paradigms`, Settings > More > Paradigms, beside Review) holds the tables he learns by heart. The names
(Paradigms, Learn, Drill, Available forms) and which tenses, declensions and pronouns the tables hold are
PROVISIONAL, the Governor to confirm. The parts this screen shares with the rest of the app, and what the epic's later stories reuse, are in docs/paradigm-components.md.

<!-- toc -->

- [The tables](#the-tables)
- [The Hebrew tables (mw-gdcyf98.13)](#the-hebrew-tables-mw-gdcyf9813)
- [What a table says about itself](#what-a-table-says-about-itself)
- [Where a table is linked (mw-svw421.5)](#where-a-table-is-linked-mw-svw4215)
- [This word (mw-irpgqi.4)](#this-word-mw-irpgqi4)
- [What unlocks a form](#what-unlocks-a-form)
- [Learn and Drill (mw-irpgqi.2)](#learn-and-drill-mw-irpgqi2)
- [How much of a table (mw-irpgqi.2)](#how-much-of-a-table-mw-irpgqi2)
- [Drill this table (mw-svw421.6)](#drill-this-table-mw-svw4216)
- [Ask the tutor](#ask-the-tutor)
- [Out of scope](#out-of-scope)
- [The cell and label layout (mw-svw421.40)](#the-cell-and-label-layout-mw-svw42140)

<!-- /toc -->

## The tables

One file each in `src/data/paradigms/`, listed in `index.ts` (`PARADIGMS`); a new table is one file plus one line.

| id | name | cells |
| --- | --- | --- |
| `article` | The article | 24: 4 cases x 3 genders x singular and plural |
| `noun-endings` | Noun endings | 40: five kinds of first and second declension noun (λόγος, τέκνον, ἡμέρα, φωνή, προφήτης) x 4 cases x singular and plural |
| `eimi` | εἰμί | 70: present, imperfect and future indicative, 6 persons each, then the present subjunctive (6), imperative (4), infinitive (1) and participle (nominative and genitive singular of each gender, 6); 35 rows, each form with its English; every cell names `eimi` beside its mood |
| `verb-endings` | Verb endings | 24: present and imperfect indicative, active and middle or passive, 6 persons each |
| `third-declension` | The third declension | 48: σάρξ, πνεῦμα, πίστις, πατήρ, βασιλεύς, γένος x 4 cases x singular and plural; full forms, because the stem changes (σάρξ, σαρκός) |
| `adjective-endings` | Adjective endings | 48: ἀγαθός -ή -όν (declensions 2, 1, 2) and πᾶς πᾶσα πᾶν (3, 1, 3) x 4 cases x 3 genders x singular and plural |
| `pronouns-personal` | Personal pronouns | 40: ἐγώ and σύ (4 cases x singular and plural, 8 each, the stressed forms ἐμοῦ ἐμοί ἐμέ and σοῦ σοί σέ) and αὐτός (4 cases x 3 genders x singular and plural, 24) |
| `pronouns-demonstrative-relative` | Demonstrative and relative pronouns | 48: οὗτος and ὅς, 4 cases x 3 genders x singular and plural, 24 each |
| `pronouns-interrogative-indefinite` | Interrogative and indefinite pronouns | 32: τίς and τις, 4 cases x singular and plural x masculine-or-feminine and neuter, 16 each; the accents tell them apart |
| `future-and-aorist` | Future and aorist | 24: λύω, future and first aorist, active and middle, 6 persons each; the tense sign σ is shown (λύσ-ω, ἔλυσ-α); every cell names `tense-signs`, every aorist cell `augment` |
| `aorist-and-future-passive` | Aorist and future passive | 12: ἐλύθη-ν … and λυθήσ-ομαι …, 6 persons each; the sign θη; aorist cells name `augment` |
| `perfect-and-pluperfect` | Perfect and pluperfect | 18: λέλυκ-α …, λέλυ-μαι … and ἐλελύκ-ειν …, 6 persons each; every cell names `reduplication`, the κ forms `tense-signs`, the pluperfect `augment` |
| `second-aorist` | Second aorist | 12: βάλλω, ἔβαλ-ον … and ἐβαλ-όμην …, 6 persons each; cells name `second-tenses` and `augment` |
| `contract-verbs` | Contract verbs | 18: ἀγαπάω, ποιέω, πληρόω, present active, 6 persons each; the merged vowel is written out (ἀγαπᾷ, ποιοῦμεν) |
| `mi-verbs` | Verbs in -μι | 36: δίδωμι, τίθημι, ἵστημι, present active and aorist active, 6 persons each; the aorist of ἵστημι (ἔστην) names `second-tenses`, those of δίδωμι and τίθημι (ἔδωκα, ἔθηκα) `tense-signs` |
| `oida` | οἶδα | 12: οἶδα and ᾔδειν, 6 persons each; the forms are written whole |
| `subjunctive` | The subjunctive | 30: λύω, present active, present middle or passive, aorist active, middle and passive, 6 persons each (a block of rows for each, the persons down and singular and plural across); no augment, the aorist cells name `tense-signs` |
| `imperative` | The imperative | 20: the same five blocks, 2nd and 3rd person singular and plural (no 1st person) |
| `infinitive` | The infinitive | 9: present, aorist and perfect x active, middle, passive; the middle and passive share the present form λύεσθαι and the perfect form λελύσθαι |
| `participle` | The participle | 30: present active, present middle or passive, aorist active, aorist passive, perfect active (a block of rows for each) x nominative and genitive singular x masculine, feminine, neuter across; each cell names its declension (`declension-1`, `-2` or `-3`) |

The four mood tables after `oida` (mw-svw421.4: the subjunctive, imperative, infinitive and participle of λύω, and the moods of εἰμί; names PROVISIONAL, the
Governor to confirm) write every form whole, with no hyphen, so the form he learns is the form he reads (`λῦσον`, `λυθεῖσα`); each cell names `verb`, its mood, its
voice and its tense (with `tense-signs` or `reduplication` where it shows one), and a person and number where the mood has them (`persons.ts` `moodIdeas`). Their rows are blocks, one for each tense and voice, so a table never has more than three columns and each Greek form has room on a 390 px phone; tests/e2e/paradigms.spec.ts proves every form fits its cell.
The seven verb tables after `pronouns-interrogative-indefinite` (mw-svw421.3, the Master Verb Chart's indicative; names PROVISIONAL, the
Governor to confirm) share `persons.ts` (the six persons, and `verbIdeas`: the verb, the mood, the voice, the person and the number, then the
ideas of the tense). Where a stem and a tense sign are added to an ending the hyphen stands at the joint, and an accent that moves onto the
ending is written there (λυσ-όμεθα); where the whole form changes (contract verbs, -μι verbs, οἶδα) the form is written whole. A cell
names the tense idea it shows plus the ideas of what it is built from, so a form opens only when he has the tense, the voice and the sign.

A cell is `{form, lang, ideas}`. The form is Greek in NFC with its accents (an ending is written with its hyphen and no accent, because
the accent falls on the stem) or, for εἰμί, English. `ideas` are ids of `src/data/grammar/ladder.ts`; `tests/unit/paradigms.test.ts`
checks every table's cell count, that every Greek form is NFC and that every id is in the ladder.

## The Hebrew tables (mw-gdcyf98.13)

Four tables, in `src/data/paradigms/hebrew/` (one file each, listed in `hebrew/index.ts` `HEBREW_PARADIGMS`, which `PARADIGMS` ends with; names PROVISIONAL, the Governor to confirm). A cell is the same `{form, lang, ideas}` with `lang: 'he'`, the form pointed and in NFC, and `ideas` are ids of the Hebrew ladder (`he-qal`, `he-perfect`, `he-person-gender-number` ...; `tests/unit/hebrew-paradigms.test.ts` checks every one is in `ladderFor('hbo')` and every form is pointed). A Hebrew cell also has `tags` ('tense:perfect', 'person:3', 'gender:m', 'number:s', 'noun:p', 'article:plain'), the fine grain the ladder's ideas lack (he-gender is masculine and feminine alike), which is how a word finds its own cell.

| id | name | cells |
| --- | --- | --- |
| `he-qal-strong` | The qal verb | 24: קָטַל in the perfect and the imperfect (3rd masculine, 3rd feminine, 2nd masculine, 2nd feminine, 1st common x singular and plural, 10 each; the 3rd person plural of the perfect is common, so its two cells hold קָטְלוּ twice) and the imperative (masculine and feminine x singular and plural, 4) |
| `he-pronouns-personal` | Hebrew personal pronouns | 10: אֲנִי … הֵן, 5 persons x singular and plural |
| `he-noun-suffixes` | Pronominal suffixes | 20: סוּס with the 10 suffixes (1st common, 2nd and 3rd masculine and feminine, one owner then several) on a singular noun (סוּסִי) and on a plural noun (סוּסַי) |
| `he-article` | The Hebrew article | 6: a noun and the noun with the article before a plain letter (יוֹם → הַיּוֹם), a guttural (אֶרֶץ → הָאָרֶץ) and a qamats-first noun (עָנָן → הֶעָנָן); the bare noun is no word's own cell |

A first-person cell names no `he-gender` (the first person is common), so under Solid only, with the gender idea still at the frontier, the qal perfect shows its first persons alone; every other verb cell names it.

**Right to left.** `layout.ts` `tableDirection(table)` is `'rtl'` for a table whose cells are Hebrew: the Paradigms screen sets `dir="rtl"` on its `<table>`, so the row label (the person) is the column at the right and the first column of forms stands beside it; a Hebrew cell is `.script-he` (1.25em of the table's `text-xl`) with `lang="he"`. `columnNeedRem` counts a Hebrew form by its consonants (a point is no letter), so `blocksOf` and `columnsThatFit` fit the columns of every Hebrew table on a 390 px phone (tests/e2e/hebrew-paradigms.spec.ts).

**Which table a Hebrew word has.** `tableFor(parse, word, 'hbo')` (the language is the third argument, 'grc' when not given) reads the parsing as the chapter decodes it ('Conjunctive waw | Verb - Qal - Consecutive imperfect - third person masculine singular'). `hebrew/ideas.ts` `ideasOf(parse)` names its Hebrew ladder ideas (each term through `ladderFor('hbo').ideaOfTerm`; a person on a verb is `he-person-gender-number`, not the pronoun's; a consecutive imperfect is also `he-imperfect`; a person, gender and number after a noun is `he-suffix-pronominal`) and `tagsOf(parse, form)` its tags. A cell is where a word lands (`landsOn`) when it names an idea of a kind of word (`BOUND_IDEAS`: `he-qal`, a tense, `he-article`, `he-suffix-pronominal`, `he-pronoun-personal`) that the word has, and its tags agree with the word's (a common gender is either). The table is the one with the most ideas shared in a cell that lands, the earlier on a tie; none for a word no table is for (a noun with no article or suffix, a Hifil verb, a participle, a relative pronoun). `paradigmOfHebrewWord(word, parse)` gives the table and the cell: the cell is lit by the parsing, not by the form (וַיְהִי is lit on 'Imperfect 3rd masculine Singular' though the table's form is יִקְטֹל), and `holds` says whether the cell's form is the word's own. The article's row is found from the vowel under the ה of the word's own form (`articleKindOf`).

**The screen.** The list shows the tables of the language in hand (`useLanguageInHand`): Hebrew when only Hebrew is chosen, or when both are and the Greek | Hebrew segment (`src/ui/SourceSegment.tsx`, drawn on the list only where both are chosen) is on Hebrew; Greek otherwise. No table is drawn until the choice is read, so the other language's never flashes. A table opened by its address (`#/paradigms?t=he-qal-strong`) opens whatever language is chosen. Learn, Drill, How much of a table and the lock's Needs line work as for the Greek (a lock names the Hebrew ideas: `needs.ts` reads the ladder of the idea's own language), over the levels of the Hebrew ideas. A Hebrew table has no 'Drill this table': Review draws Greek cells only, so the Hebrew table is drilled in its own Drill. The word sheet of a Hebrew word has the Paradigm row under Parsing (`WordSheet.tsx` `HebrewCard`, `data-testid="sheet-paradigm"`), drawn only when `paradigmOfHebrewWord` finds a table; the address carries `cell`, `w` and `p` (the parsing in plain words, which the word line draws as it is) and no lemma, so there is no This word view of a Hebrew table.

## What a table says about itself

Besides its columns and rows, a `Paradigm` has two fields of its own:

- `ideas`: the ids of the ladder ideas the table teaches (`article` for the article; `declension-3` for the third declension;
  `pronoun-interrogative` and `pronoun-indefinite` for the last table). At least one, every one in `LADDER`. This is the link the idea
  sheet uses to name the tables that teach an idea. It is not the same as a cell's `ideas`, which is what a reader needs before that one
  form is his.
- `tier`: the ladder tier the table belongs to (`nouns`, `pronouns`, `verbs`); the Paradigms list groups by it.

## Where a table is linked (mw-svw421.5)

A table is never a dead end, and an ending is never asked before the table that holds it has been seen. Names and wording are PROVISIONAL, the Governor to confirm.

- **The idea sheet** shows `Table: <name>` under its examples for each table whose `ideas` name the idea (`paradigmsOf(ideaId)`; 'The aorist tense' shows
  'Table: Future and aorist'). A tap opens `#/paradigms?t=<id>` in Study mode as a new Back step. The Paradigms screen is a page of its own, so the screen under the sheet
  goes with the sheets over it; the idea sheet holds its idea and the address it was over (`src/ideaReturn.ts`) and `IdeaReturn` (`src/IdeaReturn.tsx`, in App) opens that
  idea's sheet again, over the screen it was over, when Back brings him to that address. The word and Grammar sheets under it are not brought back; Back then closes it as it
  closes any sheet.
- **The list** is grouped by the table's `tier`, under the tier's title (`TIER_TITLES`, src/approaches/ladder.ts): Nouns, Pronouns, Verbs; a tier with no table is left out.
- **Opening a table is kept**: ParadigmsScreen writes the table's id to the settings store key `paradigmsOpened` (a JSON list, oldest first;
  `src/data/repositories/paradigmsOpened.ts` `markParadigmOpened` / `listOpenedParadigms`; no Dexie version, outside the settings registry).
- **`tableFor(code, word?)`** names the one table that holds the ending of a form with this RP code: the table with a cell sharing the most ideas with `ideasOf(code)`, the earlier table
  in the list on a tie, none for a word that has no endings to learn (`PREP`, `CONJ`). `tableFor('N-GSF')` is `noun-endings`, `tableFor('V-API-3S')` is
  `aorist-and-future-passive`. A code names no declension, so given the word (`{ l, t? }`) it also weighs the declension its lemma has (`patternsOf`): `tableFor('N-GSM', πατήρ)` is `third-declension`, not `noun-endings` (mw-svw421.37; tests/unit/paradigm-links.test.ts sweeps every word of the text).
- **The word sheet** has a `Paradigm` row under Parsing (`WordSheet.tsx`, `data-testid="sheet-paradigm"`) that names the table of the tapped word and opens it (mw-irpgqi.1; names PROVISIONAL, the Governor to confirm). `paradigmOfWord(word)` (`src/data/paradigms/index.ts`) gives the table and the cell that is the word's own: a table that holds the word's own form wins (ἀγαπῶ is in Contract verbs, ἐστίν in εἰμί), else `tableFor`'s table, with the cell that lands on the word's parse (`lands`: a cell names nothing of case, number, gender, person, tense, voice or mood that the word does not have, names what the word has unless it is silent on that kind, is of the word's kind of word, and a cell of particular verbs (`eimi`, `contract-verbs`, `mi-verbs`, `oida`) is for those verbs only; most ideas shared, then the longest ending the word ends with, then the earlier). A word no table fits (a conjunction, an adverb, a preposition, a particle) has no row; a form the table does not hold (a participle in the accusative) opens the table with no cell lit ('The table has no cell for this form yet.'). The address carries `cell=<cellName>`, `w=<form>` and `p=<RP code>` (`route.ts` `paradigmOf`/`paradigmHash`): the cell is outlined (`data-lit`, a ring inside its box) and brought into view in the screen's own box (`ui/reveal.ts` `bringIntoScrollBox`: left where it is when it shows), the word and its parse in plain words stand under the table's name (`WordLine`), and a locked cell is lit all the same with its lock and its Needs line open. The word sheet is held with what it showed (`src/wordReturn.ts` `holdWord`) and `WordReturn` (`src/WordReturn.tsx`, in App) opens it again over the screen it was over when Back brings him to that address, as `IdeaReturn` does for the idea sheet; the header's back button reads `‹ Word` and steps Back, `‹ Paradigms` when the sheet is gone (a reload). The returned sheet has no Help with this word row (the Reader's tutor is not in App).
- **An ending is asked once its table is open**: see 'Ending questions' in docs/grammar.md.

## This word (mw-irpgqi.4)

A table opened from a word's sheet carries the word's lemma (`l=` in the address, with `w` and `p`; names PROVISIONAL, the Governor to confirm). Where the New Testament text uses
forms of that lemma that land in the table, a switch **This word | The pattern** (the chips group 'Forms') appears beside Learn | Drill; the table opens to The pattern, as
before, and `own=1` in the address is This word. `ParadigmWord` (`src/ParadigmsScreen.tsx`) fetches the lemma's forms (`useLemmaForms`) and lays the table with them (`ownTable`, `src/data/paradigms/ownForms.ts`):

- **The forms** come from `public/lemma-forms/<lemma>.json` (`scripts/build-lemma-forms.mjs`, made from the chapters Lampas loads, so never ahead of or apart from them; one file a lemma, the Greek ones under 4 KB, about 1 MB in all; the Hebrew lemmas of the Old Testament have files too, docs/data.md). `{"l": lemma, "f": [[form, RP code, how many times, book, chapter, verse of the first use] ...]}`. They are generated, not committed (`public/lemma-forms` is
  git-ignored): `npm run build` makes them first, `npm run forms:build` makes them alone (a dev server needs it once); `it is outside `public/data`, whose every file is a chapter. A form is the text's own with its first letter lower-cased
  (a name keeps its capital) and a grave accent turned acute: nothing is ever generated, and tests/unit/own-forms.test.ts checks every form shown against the index and the index against the text. The app asks for a file as
  `/lemma-forms/<lemma>.json?v=<version>`, the version folded from the chapters' fingerprints, so the worker keeps it until some chapter changes. A lemma with no file has no forms.
- **The cell of a form** is the one its RP code lands on (`cellsLanding`, the same rule that finds the word sheet's cell: a cell names nothing the form is not). In a table of models (`MODEL_TABLES`: Noun endings,
  The third declension, Adjective endings, the three pronoun tables, Contract verbs, Verbs in -μι) only the group of rows the word is like stays, chosen by how its forms end like the group's (`formFit`) and named for the word; in every other table the row groups are
  tenses and voices, and all stay. Several forms for one cell (ἐστίν, ἐστιν) show the pattern's own spelling, else the one used most; the rest are listed in the form's note. A table the text has no form of the word in has no switch.
- **A cell the text never uses** is `absent`: it says 'not in the NT' (`data-state="absent"`), is never a button, never asked, and not counted ('Available forms: 6 of 6' counts the forms there are). The pattern's form is never put in its place; the English cells of εἰμί stay as meanings.
- **A tap on a form** (Learn) or its reveal (Drill) draws `OwnNote` under its row: its parsing in plain words, how often and where the text first uses it, 'In the pattern: …' (the pattern's form one tap away), and `Open John 14:31`, which opens the Reader there (`openAtVerse`).
- **Learn and Drill** work as on any table (the extent decides which cells are shown and asked; the Drill's run is kept per table and lemma, `drillKeyOf`); a miss still puts the table in Review. A word's irregular forms are only what the text has (εἶπον under λέγω in Second aorist, ἦλθον under ἔρχομαι).
- **The tutor** is told a fact 'Forms' on a table showing a word's own forms.

The lemmas whose forms fit no table (`fitsNoTable`: `tableFor` gives none for any of them) are 370 of 5,374, all uninflected: adverbs 264, conjunctions 30, prepositions 28, particles 23, Hebrew names 9, Aramaic words 8, conditionals 5, interjections 3; they have no Paradigm row on the word sheet.

## What unlocks a form

A form is available when every idea it names is `frontier` or `solid` in `grammarLevels` (`isAvailable`); an idea with no level is not
yet. A locked cell shows a lock (its accessible name says what it needs), never nothing, so the table keeps its shape. A lock is a button: a tap draws a line in words under its row ('Needs the plural', `needsText`, `data-testid="lock-needs"`; the ideas are `needsOf`, `src/data/paradigms/needs.ts`, the lowest on the ladder first) with a 'Go to <idea title>' button for each, which opens that idea's sheet over the table (Back closes it; mw-svw421.25), a second tap on the same lock, or a tap on another, takes it away; nothing else changes (mw-svw421.18).
`availableCount` gives 'Available forms: N of M' for the list and for a table.

## Learn and Drill (mw-irpgqi.2)

The address says the table and the mode: `#/paradigms` (the list), `#/paradigms?t=article&mode=learn`. A table opens to Drill. The modes were Study and
Review before mw-irpgqi.2: `mode=study` still opens Drill and `mode=review` Learn (`src/nav/route.ts` paradigmOf), so a kept or linked address keeps its view.

- Learn: every shown cell shows its form (under Any, the ones not his are marked not yet: a small lock beside the form, a tap says what it needs).
- Drill: each shown cell is blank until he taps it. The tap shows the form and, under its row, the cell in plain words (`cells.ts` cellPrompt) with
  `Had it` | `Missed` (`src/ui/SelfGrade.tsx` Grades, the flashcards' grade buttons with these words). One cell is open at a time: a tap on another
  blank puts the first back, ungraded; a tap on the open cell does nothing. A graded cell stays shown, tinted good or bad. After the last cell of the
  run, `N of M` (`drill-score`) and, while any was missed, `Drill the missed again`, which asks only the missed cells and keeps the rest shown. `Start
  again` (beside the Learn | Drill switch once a cell has been tapped) blanks every cell. The run is kept in memory while the page lives
  (`src/data/paradigms/drill.ts`), so coming Back from the Reader finds the table as he left it; a change of How much of a table starts it over.
- A run's first `Missed` puts the table in Review: `recordDrillMiss('paradigm', id)` (`src/data/repositories/reviews.ts`) writes a wrong answer to the
  table's row as a missed Review cell does (the step drops, a lapse is counted, the rights go) and makes it due now, so Review counts it today. One
  write a run, as a Review round's row takes one outcome; `Had it` writes nothing.
- The line under the title: Learn says 'Learn: every available form is shown.' (under Any, '… the ones you do not have yet marked not yet.'); Drill says
  'Drill: tap a blank cell to see its form, then say whether you had it.' only while some cell is shown; with every cell locked it says 'Every form is
  locked. Mark the grammar ideas a form needs to open it.' (a tap on a locked cell names the ideas it needs), and under Solid only with his forms all at the
  frontier 'No form is solid yet. Solid only hides the forms at the frontier.'

The Learn | Drill switch is the app's segmented chips (`src/ui/Chips.tsx`, group 'Mode'); choosing the mode he is in does nothing, so a double tap ends where one does.

## How much of a table (mw-irpgqi.2)

The setting `paradigmExtent` (Settings > Greek > Paradigms, **How much of a table**: Any | Solid and frontier | Solid only, default Solid and frontier;
`src/settings/definitions/grammarExtent.ts`), also a switch in the header of every table (`ExtentChips`, the same chips). It is a grammar extent
(`src/data/grammar/extent.ts`: the one rule `withinExtent(level, extent)`, which the Weave's Grammar dial and the picker's New words at read too). A cell's
standing under it (`standingOf` in `src/data/paradigms/index.ts`):

| standing | when | Learn | Drill |
| --- | --- | --- | --- |
| `open` | within the extent and his (every idea solid or frontier) | the form | blank, asked |
| `notYet` | within Any, not his | the form, muted, a small lock; a tap says what it needs | blank with a small lock, asked; the grade line says what it needs |
| `outside` | his, but Solid only (the form has a frontier idea) | an empty cell (the table keeps its shape) | the same |
| `locked` | not his and not within | a lock; a tap says what it needs | the same |

`isAvailable(cell, levels, extent = 'solid+frontier')` keeps its meaning with no extent given (his to learn): Review's draw (`cells.ts`), `live` in
`reviews.ts` and Drill this table read it so, whatever the extent shows. `availableCount(table, levels, extent)` counts the `open` cells and
`availableText` says it as the extent would: 'Available forms: 12 of 24'; under Any 'All 24 forms shown, 12 available'; under Solid only 'Solid forms: 6 of 24'.
The list and the table read one line; the list's bar is the `open` share.

## Drill this table (mw-svw421.6)

At the foot of a table, beside Ask the tutor: `Drill this table` puts the table on the back-off schedule as the review kind `paradigm`
(row id the table's id, step 0, due now; `ensureScheduled`), and the button then reads `In Review` (it does nothing more). Review counts
it ('Due today: 1 idea, 1 table, 2 words') and asks it as `review/kinds.ts` PARADIGM: for each due table up to `CELLS_A_ROUND` (3,
PROVISIONAL) of its available cells (`data/paradigms/cells.ts` `drawCellQuestions`, seeded, so one seed gives the same cells), each a
question of kind `cell` drawn by `GrammarCard`: the cell's name and the table ('Genitive singular masculine of the article') as the
prompt, four forms of the same table as the options (the right one and three whose text differs: other available forms first, locked
ones borrowed only when fewer than four are available; a locked cell is never asked itself). The form is said once it is answered, not
before. From `FLASHCARD_STEP` up it is a flashcard: the name, Show reveals the form, I knew it / Not yet. A table with no available
cell asks nothing: `Drill this table` is disabled on it ('Unlock a form first'), and a row already on the schedule for one is kept but not due (`live`/`namesSomething` in `src/data/repositories/reviews.ts`, mw-svw421.28), so the Reader's Due chip and Review's line never count what a round cannot ask. When Start draws no item, Review says 'Nothing is due and there is no word to ask.' Each cell is one `recordReview('paradigm', id, right)` (a wrong cell is a wrong review) and a right
cell credits its form's letters, sounds and marks as a form read right (`noteAnswer`, docs/grammar.md).

## Ask the tutor

On the list (under the line of words at its top) and at the foot of a table (mw-irpgqi.3). It is the round control's sheet (`src/AskTutor.tsx`, `Ask the tutor: Paradigms`) opened
over the screen, not the Reader: the button calls `askTheTutor` (`src/tutor/askNow.ts`). The screen reports its facts with `useReportScreen` (`screen.name` Paradigms): on the
list `Showing: The list of the paradigm tables`; on a table `Table`, `Mode` (Learn or Drill), `Cell in focus` (`Genitive Singular Feminine: τῆς`, the last cell he tapped or,
before any tap, the word's own; its form only when the table shows it) and `Word he came from` (`ἀγαπῶ (present active indicative, 1st person singular)`), so every question
of the table's talk is told where he is now. The first question of a table's talk (sent only when the talk has no turn, so coming back shows what was said) carries the
bible-talk grind's focus `{table, revealed, kind: 'paradigm', mode, cell?, word?}` (`paradigmTalk` in `src/ParadigmsScreen.tsx`, `ParadigmFocus` in `src/services/talk.ts`):
`revealed` the forms showing now (in Learn every shown one, in Drill the ones he has tapped), each with its place, such as `Genitive Singular Masculine: τοῦ`; `cell` is
`{parse, form?}` and `word` `{form, parse}` (`grinds/bible-talk.*`). The talk is kept per table, under `screen.paradigms.<table id>` (`ScreenContext.kept`, which is never sent);
the list's is the Paradigms screen's own, `screen.paradigms`.

## Out of scope

Drills tied to the chapter he reads, the reflexive, possessive and other pronouns, the vocative, and whatever else the Master Verb Chart holds that no table has yet: the optative, the participles beyond the five of the table (future, perfect middle or passive, aorist middle) and the participle's other cases and its plural, the future perfect, the aorist and future of the contract and -μι verbs, the liquid and other irregular stems.

## The cell and label layout (mw-svw421.40)

One layout for every table (`Table` in ParadigmsScreen, the arithmetic in `src/data/paradigms/layout.ts`): the Greek is `text-xl` (`text-2xl` for a
table of one or two columns), the labels around the cells `text-xs` in a `w-[5.5rem]` column (rem, because tailwind spacing stays in pixels as the
Text size grows), and a label wraps only at its spaces (never `break-words`). A table whose widest forms do not fit the box in one row of cells is drawn
as blocks, one under the other, each with the columns that fit (whole headings kept together: Singular, Plural) and the row labels repeated; the box is
measured in a layout effect, so the first paint is already blocked. Nothing is shrunk and nothing scrolls sideways.
tests/e2e/paradigms.spec.ts proves it for every table in `PARADIGMS` at Normal, Large and Largest (Greek whole in its own cell, inside the table; no word of a
label broken or wider than its cell).
