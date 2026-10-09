# Paradigms (mw-5r3p30.82)

The Paradigms screen (`#/paradigms`, Settings > More > Paradigms, beside Review) holds the tables he learns by heart. The names
(Paradigms, Study mode, Review mode, Available forms) and which tenses and declensions the first four tables hold are
PROVISIONAL, the Governor to confirm.

## The tables

One file each in `src/data/paradigms/`, listed in `index.ts` (`PARADIGMS`); a new table is one file plus one line.

| id | name | cells |
| --- | --- | --- |
| `article` | The article | 24: 4 cases x 3 genders x singular and plural |
| `noun-endings` | Noun endings | 40: five kinds of first and second declension noun (λόγος, τέκνον, ἡμέρα, φωνή, προφήτης) x 4 cases x singular and plural |
| `eimi` | εἰμί | 36: present, imperfect and future indicative, 6 persons each, each with its English |
| `verb-endings` | Verb endings | 24: present and imperfect indicative, active and middle or passive, 6 persons each |

A cell is `{form, lang, ideas}`. The form is Greek in NFC with its accents (an ending is written with its hyphen and no accent, because
the accent falls on the stem) or, for εἰμί, English. `ideas` are ids of `src/data/grammar/ladder.ts`; `tests/unit/paradigms.test.ts`
checks every table's cell count, that every Greek form is NFC and that every id is in the ladder.

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

Drills tied to the chapter he reads, pronouns and further tenses, the Master Verb Chart (parked on mw-fnvjof.3).
