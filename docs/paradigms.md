# Paradigms (mw-5r3p30.82)

The Paradigms screen (`#/paradigms`, Settings > More > Paradigms, beside Review) holds the tables he learns by heart. The names
(Paradigms, Study mode, Review mode, Available forms) and which tenses, declensions and pronouns the tables hold are
PROVISIONAL, the Governor to confirm.

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
voice and its tense (with `tense-signs` or `reduplication` where it shows one), and a person and number where the mood has them (`persons.ts` `moodIdeas`). Their rows are blocks, one for each tense and voice, so a table never has more than three columns and each Greek form has room on a 390 px phone; a three-column table draws its Greek at `text-lg` (ParadigmsScreen `formSize`), tests/e2e/paradigms.spec.ts proves every form fits its cell.
The seven verb tables after `pronouns-interrogative-indefinite` (mw-svw421.3, the Master Verb Chart's indicative; names PROVISIONAL, the
Governor to confirm) share `persons.ts` (the six persons, and `verbIdeas`: the verb, the mood, the voice, the person and the number, then the
ideas of the tense). Where a stem and a tense sign are added to an ending the hyphen stands at the joint, and an accent that moves onto the
ending is written there (λυσ-όμεθα); where the whole form changes (contract verbs, -μι verbs, οἶδα) the form is written whole. A cell
names the tense idea it shows plus the ideas of what it is built from, so a form opens only when he has the tense, the voice and the sign.

A cell is `{form, lang, ideas}`. The form is Greek in NFC with its accents (an ending is written with its hyphen and no accent, because
the accent falls on the stem) or, for εἰμί, English. `ideas` are ids of `src/data/grammar/ladder.ts`; `tests/unit/paradigms.test.ts`
checks every table's cell count, that every Greek form is NFC and that every id is in the ladder.

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
- **`tableFor(code)`** names the one table that holds the ending of a form with this RP code: the table with a cell sharing the most ideas with `ideasOf(code)`, the earlier table
  in the list on a tie, none for a word that has no endings to learn (`PREP`, `CONJ`). `tableFor('N-GSF')` is `noun-endings`, `tableFor('V-API-3S')` is
  `aorist-and-future-passive`.
- **An ending is asked once its table is open**: see 'Ending questions' in docs/grammar.md.

## What unlocks a form

A form is available when every idea it names is `frontier` or `solid` in `grammarLevels` (`isAvailable`); an idea with no level is not
yet. A locked cell shows a lock (its accessible name says what it needs), never nothing, so the table keeps its shape.
`availableCount` gives 'Available forms: N of M' for the list and for a table.

## Study and Review

The address says the table and the mode: `#/paradigms` (the list), `#/paradigms?t=article&mode=review`. A table opens in Study mode.

- Study mode: an available cell says `reveal`; a tap shows the form, a tap on a shown form hides it. Hide all hides them all. What is
  revealed is kept in memory while the page lives (`revealed.ts`), so coming Back from the Reader finds the table as he left it.
- Review mode: every available cell shows its form.

One button switches (it names the mode it goes to).

## Drill this table (mw-svw421.6)

At the foot of a table, beside Ask the tutor: `Drill this table` puts the table on the back-off schedule as the review kind `paradigm`
(row id the table's id, step 0, due now; `ensureScheduled`), and the button then reads `In Review` (it does nothing more). Review counts
it ('Due today: 1 idea, 1 table, 2 words') and asks it as `review/kinds.ts` PARADIGM: for each due table up to `CELLS_A_ROUND` (3,
PROVISIONAL) of its available cells (`data/paradigms/cells.ts` `drawCellQuestions`, seeded, so one seed gives the same cells), each a
question of kind `cell` drawn by `GrammarCard`: the cell's name and the table ('Genitive singular masculine of the article') as the
prompt, four forms of the same table as the options (the right one and three whose text differs: other available forms first, locked
ones borrowed only when fewer than four are available; a locked cell is never asked itself). The form is said once it is answered, not
before. From `FLASHCARD_STEP` up it is a flashcard: the name, Show reveals the form, I knew it / Not yet. A table with no available
cell asks nothing and stays due. Each cell is one `recordReview('paradigm', id, right)` (a wrong cell is a wrong review) and a right
cell credits its form's letters, sounds and marks as a form read right (`noteAnswer`, docs/grammar.md).

## Ask the tutor

At the foot of a table. It opens the Reader on the open chapter with the Talk sheet on the whole chapter and sends the first question
with the bible-talk grind's focus `{table, revealed, kind: 'paradigm'}`: `table` is the table's name, `revealed` the forms showing now
(in Review mode, every available one), each with its place, such as `Genitive Singular Masculine: τοῦ` (`grinds/bible-talk.*`,
`reader-requested` action `paradigm` in `docs/events.md`).

## Out of scope

Drills tied to the chapter he reads, the reflexive, possessive and other pronouns, the vocative, and whatever else the Master Verb Chart holds that no table has yet: the optative, the participles beyond the five of the table (future, perfect middle or passive, aorist middle) and the participle's other cases and its plural, the future perfect, the aorist and future of the contract and -μι verbs, the liquid and other irregular stems.
