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
| `eimi` | εἰμί | 36: present, imperfect and future indicative, 6 persons each, each with its English |
| `verb-endings` | Verb endings | 24: present and imperfect indicative, active and middle or passive, 6 persons each |
| `third-declension` | The third declension | 48: σάρξ, πνεῦμα, πίστις, πατήρ, βασιλεύς, γένος x 4 cases x singular and plural; full forms, because the stem changes (σάρξ, σαρκός) |
| `adjective-endings` | Adjective endings | 48: ἀγαθός -ή -όν (declensions 2, 1, 2) and πᾶς πᾶσα πᾶν (3, 1, 3) x 4 cases x 3 genders x singular and plural |
| `pronouns-personal` | Personal pronouns | 40: ἐγώ and σύ (4 cases x singular and plural, 8 each, the stressed forms ἐμοῦ ἐμοί ἐμέ and σοῦ σοί σέ) and αὐτός (4 cases x 3 genders x singular and plural, 24) |
| `pronouns-demonstrative-relative` | Demonstrative and relative pronouns | 48: οὗτος and ὅς, 4 cases x 3 genders x singular and plural, 24 each |
| `pronouns-interrogative-indefinite` | Interrogative and indefinite pronouns | 32: τίς and τις, 4 cases x singular and plural x masculine-or-feminine and neuter, 16 each; the accents tell them apart |

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

## Ask the tutor

At the foot of a table. It opens the Reader on the open chapter with the Talk sheet on the whole chapter and sends the first question
with the bible-talk grind's focus `{table, revealed, kind: 'paradigm'}`: `table` is the table's name, `revealed` the forms showing now
(in Review mode, every available one), each with its place, such as `Genitive Singular Masculine: τοῦ` (`grinds/bible-talk.*`,
`reader-requested` action `paradigm` in `docs/events.md`).

## Out of scope

Drills tied to the chapter he reads, the reflexive, possessive and other pronouns, the vocative, further tenses, the Master Verb Chart (parked on mw-fnvjof.3).
