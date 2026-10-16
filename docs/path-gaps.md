# Path gaps: what the ladder lacks

**PROVISIONAL**, for the Governor (map mw-foy5mb, story mw-foy5mb.3). Lampas has one path, the ladder (`src/data/grammar/ladder.ts`).
This audit asks two questions of it, as the Governor put it: is there anything in the other course (BMA Tutor) or in the grammar
book he is integrating that the ladder is *missing*, and where in the directed acyclic graph of `needs` would it go?

## How this was made

- **BMA Tutor.** `src/approaches/bma-tutor.ts` is the record of its order: 6 levels of 12 lessons, then two one-lesson stages.
  Each lesson names the ladder ideas it is built from, so a lesson whose ideas fully cover what its title says is **covered**;
  one where the title asks for more than the named ideas teach is **partly**; one with no idea at all would be a **gap**
  (there is none: the lessons were written from the ladder, so the gaps show as *partly*). Only the order is BMA's; nothing of
  its lessons is copied here.
- **The book.** David Alan Black, *Learn to Read New Testament Greek*, third edition (B&H Academic, 2009), 26 chapters. Only the
  chapter **titles** were used, from a retailer's published table of contents (Perlego's listing of the third edition); the book's
  text was not read or copied. A chapter's verdict is therefore a judgment from its title and what a chapter of that name
  teaches in any first-year course, not a reading of the chapter. (Publishers' blurbs that say "seventeen lessons" describe an
  earlier edition.) The nine appendices (accents, the alphabet song, noun paradigms, case and person suffixes, prepositions,
  look-alike words, principal parts) fall under `accents`, `alphabet`, `declension-1`/`declension-2`/`declension-3`,
  `stem-and-ending`, `preposition`, `words-sound-alike` and `principal-parts` and are not listed apart.
- **Verdicts.** *covered*: the named ideas teach it. *partly*: the forms are taught but what to do with them in a sentence is
  not, or a rarer variety is missing. *gap*: nothing in the ladder.

Counts: 74 BMA lessons, 53 covered, 21 partly, 0 gap. 26 book chapters, 20 covered, 6 partly, 0 gap. 12 ideas are proposed in
section (c); that is the gap count.

The pattern is plain: the ladder teaches every **form** both courses teach. What it lacks is the **use** of the forms: what a
participle, an infinitive or a case is doing in a sentence, and the clause patterns (purpose, result, reported speech, the
kinds of "if") a New Testament sentence is built from.

## (a) BMA Tutor, lesson by lesson

| Stage | Level | Lesson | Ladder ideas | Verdict | Gap (section c) |
| --- | --- | --- | --- | --- | --- |
| Foundations | Letters, sounds and first sentences | The Greek letters | `alphabet`, the 24 letters | covered |  |
| Foundations | Letters, sounds and first sentences | Saying words aloud | `diphthongs`, `consonant-pairs`, `syllables` | covered |  |
| Foundations | Letters, sounds and first sentences | Marks over the letters | `breathings`, `accents`, `iota-subscript`, `words-sound-alike`, `punctuation`, `movable-letters`, `marks-change-word`, `enclitics` | covered |  |
| Foundations | Letters, sounds and first sentences | Your first words | `noun`, `number-singular`, `number-plural` | covered |  |
| Foundations | Letters, sounds and first sentences | Joining and refusing | `conjunction`, `negative` | covered |  |
| Foundations | Letters, sounds and first sentences | Who acts and who is acted on | `case-nominative`, `case-accusative`, `stem-and-ending` | covered |  |
| Foundations | Letters, sounds and first sentences | Being: I am, you are, he is | `person-1st`, `person-2nd`, `person-3rd`, `verb`, `eimi` | covered |  |
| Foundations | Letters, sounds and first sentences | The present active statement | `tense-present`, `voice-active`, `mood-indicative`, `contract-verbs` | covered |  |
| Foundations | Letters, sounds and first sentences | A past action in progress | `tense-imperfect` | covered |  |
| Foundations | Letters, sounds and first sentences | The completed action | `tense-aorist`, `augment` | covered |  |
| Foundations | Letters, sounds and first sentences | Of and belonging to | `case-genitive` | covered |  |
| Foundations | Letters, sounds and first sentences | To, for, and calling out | `case-dative`, `case-vocative` | covered |  |
| Foundations | Articles, pronouns and describing words | A sentence takes shape | `gender-masculine`, `gender-feminine`, `gender-neuter`, `declension-1`, `declension-2` | covered |  |
| Foundations | Articles, pronouns and describing words | The little word “the”, and names | `article`, `proper-name` | covered |  |
| Foundations | Articles, pronouns and describing words | Letters that change at a joint | `crasis` | partly | `consonant-changes` |
| Foundations | Articles, pronouns and describing words | Stems that shift | `attic-form` | partly | `consonant-changes` |
| Foundations | Articles, pronouns and describing words | I, you, he and she | `pronoun`, `pronoun-personal` | covered |  |
| Foundations | Articles, pronouns and describing words | This and that | `pronoun-demonstrative` | covered |  |
| Foundations | Articles, pronouns and describing words | Himself | `pronoun-reflexive` | covered |  |
| Foundations | Articles, pronouns and describing words | Who, which and that | `pronoun-relative` | covered |  |
| Foundations | Articles, pronouns and describing words | Who? and anyone | `pronoun-interrogative`, `pronoun-indefinite` | covered |  |
| Foundations | Articles, pronouns and describing words | Each other, such as, how great | `pronoun-reciprocal`, `pronoun-correlative`, `pronoun-correlative-interrogative` | covered |  |
| Foundations | Articles, pronouns and describing words | Small words that take a case | `preposition`, the twelve prepositions one by one, `compound-verbs` | covered |  |
| Foundations | Articles, pronouns and describing words | Describing words | `adjective`, `dictionary-entry` | covered |  |
| Foundations | More nouns, and the passive and middle | The nouns with other patterns | `noun`, `case-genitive`, `case-dative`, `declension-3` | covered |  |
| Foundations | More nouns, and the passive and middle | Acting for oneself | `voice-middle` | covered |  |
| Foundations | More nouns, and the passive and middle | Being acted upon | `voice-passive` | covered |  |
| Foundations | More nouns, and the passive and middle | One form for two voices | `voice-middle-or-passive` | covered |  |
| Foundations | More nouns, and the passive and middle | More and most | `comparative`, `superlative` | covered |  |
| Foundations | More nouns, and the passive and middle | Counting | `numeral` | covered |  |
| Foundations | More nouns, and the passive and middle | A middle sense in an active form | `voice-middle-significance` | covered |  |
| Foundations | More nouns, and the passive and middle | Verbs that look passive or middle | `voice-middle-deponent`, `voice-passive-deponent`, `voice-middle-or-passive-deponent` | covered |  |
| Foundations | More nouns, and the passive and middle | Unusual verbs | `voice-impersonal-active`, `voice-none` | covered |  |
| Foundations | More nouns, and the passive and middle | Words that never change | `indeclinable` | covered |  |
| Foundations | More nouns, and the passive and middle | Small words that colour a line | `particle`, `adverb` | covered |  |
| Foundations | More nouns, and the passive and middle | Mine and yours | `pronoun-possessive` | covered |  |
| Foundations | More tenses and moods | What will happen | `tense-future` | covered |  |
| Foundations | More tenses and moods | A finished action with a lasting result | `tense-perfect`, `reduplication`, `tense-signs`, `principal-parts`, `oida` | covered |  |
| Foundations | More tenses and moods | That result, in the past | `tense-pluperfect` | covered |  |
| Foundations | More tenses and moods | Verbs with their own endings | `tense-present`, `second-tenses`, `mi-verbs` | covered |  |
| Foundations | More tenses and moods | What may happen | `mood-subjunctive` | covered |  |
| Foundations | More tenses and moods | If and unless | `conditional` | partly | `conditional-classes` |
| Foundations | More tenses and moods | A wish | `mood-optative` | covered |  |
| Foundations | More tenses and moods | A command | `mood-imperative` | covered |  |
| Foundations | More tenses and moods | No, not and do not | `negative` | covered |  |
| Foundations | More tenses and moods | Asking a question | `interrogative` | covered |  |
| Foundations | More tenses and moods | Cries and calls | `interjection` | covered |  |
| Foundations | More tenses and moods | The verb as a whole | `tense-future`, `tense-perfect`, `mood-subjunctive`, `mood-imperative` | covered |  |
| Foundations | Participles, infinitives and clauses | The verb as a noun | `mood-infinitive` | partly | `infinitive-uses` |
| Foundations | Participles, infinitives and clauses | The verb as a describing word | `mood-participle` | partly | `participle-uses` |
| Foundations | Participles, infinitives and clauses | A participle that commands | `mood-participle-imperative` | covered |  |
| Foundations | Participles, infinitives and clauses | Being plus a participle | `tense-perfect`, `mood-participle` | partly | `participle-uses` |
| Foundations | Participles, infinitives and clauses | Clauses of condition and purpose | `conditional`, `mood-subjunctive` | partly | `conditional-classes`, `purpose-result-clauses` |
| Foundations | Participles, infinitives and clauses | Clauses that say who or which | `pronoun-relative`, `mood-indicative` | covered |  |
| Foundations | Participles, infinitives and clauses | Purpose and result with the infinitive | `mood-infinitive`, `mood-subjunctive` | partly | `purpose-result-clauses`, `infinitive-uses` |
| Foundations | Participles, infinitives and clauses | Clauses built on a participle | `mood-participle`, `case-genitive` | partly | `genitive-absolute`, `participle-uses` |
| Foundations | Participles, infinitives and clauses | Long sentences | `conjunction`, `particle` | partly | `sentence-patterns` |
| Foundations | Participles, infinitives and clauses | Reading Paul: the opening of a letter | `voice-passive`, `mood-participle` | partly | `case-uses`, `verbal-aspect` |
| Foundations | Participles, infinitives and clauses | Reading Paul: an argument | `conditional`, `preposition` | partly | `conditional-classes`, `indirect-discourse` |
| Foundations | Participles, infinitives and clauses | Reading Paul: an appeal | `mood-imperative`, `negative` | partly | `purpose-result-clauses`, `sentence-patterns` |
| Foundations | Reading the letters of John | 1 John 1:1-4 | `pronoun-relative`, `tense-perfect`, `tense-aorist`, `tense-imperfect` | covered |  |
| Foundations | Reading the letters of John | 1 John 1:5-10 | `conditional`, `mood-subjunctive`, `negative`, `attic-form` | partly | `conditional-classes` |
| Foundations | Reading the letters of John | 1 John 2:1-11 | `mood-imperative`, `tense-perfect`, `conditional`, `pronoun-indefinite` | partly | `conditional-classes` |
| Foundations | Reading the letters of John | 1 John 2:12-17 | `tense-perfect`, `tense-aorist`, `pronoun-demonstrative`, `mood-imperative` | covered |  |
| Foundations | Reading the letters of John | 1 John 2:18-29 | `tense-pluperfect`, `pronoun-relative`, `voice-middle`, `mood-participle` | covered |  |
| Foundations | Reading the letters of John | 1 John 3:1-10 | `pronoun-reflexive`, `mood-subjunctive`, `mood-participle`, `tense-perfect` | partly | `purpose-result-clauses` |
| Foundations | Reading the letters of John | 1 John 3:11-24 | `tense-future`, `pronoun-interrogative`, `mood-infinitive`, `comparative` | partly | `indirect-discourse` |
| Foundations | Reading the letters of John | 1 John 4:1-12 | `mood-imperative`, `pronoun-reciprocal`, `tense-perfect`, `comparative` | partly | `purpose-result-clauses` |
| Foundations | Reading the letters of John | 1 John 4:13-21 | `pronoun-indefinite`, `mood-infinitive`, `conditional`, `tense-perfect` | partly | `conditional-classes` |
| Foundations | Reading the letters of John | 1 John 5:1-12 | `mood-participle`, `tense-perfect`, `pronoun-demonstrative`, `voice-passive` | covered |  |
| Foundations | Reading the letters of John | 1 John 5:13-21 | `tense-future`, `pronoun-interrogative`, `mood-imperative`, `pronoun-indefinite` | partly | `indirect-discourse`, `purpose-result-clauses` |
| Foundations | Reading the letters of John | 2 John and 3 John | `comparative`, `voice-passive-deponent`, `mood-infinitive`, `pronoun-reciprocal` | covered |  |
| Wider reading | Reading | Reading | `poetic`, `aramaic`, `hebrew` | covered |  |
| Fluent reading | Reading | Reading | `mood-participle`, `mood-infinitive` | partly | `participle-uses`, `reading-the-text` |

## (b) The grammar book, chapter by chapter

Black, *Learn to Read New Testament Greek*, 3rd edition (2009). Chapter titles only.

| Chapter | Title | Ladder ideas | Verdict | Gap (section c) |
| --- | --- | --- | --- | --- |
| 1 | The Letters and Sounds of Greek | `alphabet`, `diphthongs`, `consonant-pairs`, `syllables`, `breathings`, `accents`, `iota-subscript`, `punctuation` | covered | |
| 2 | The Greek Verb System | `verb`, `person-1st`, `tense-present`, `voice-active`, `mood-indicative`, `tense-signs` | partly | `verbal-aspect` |
| 3 | Present and Future Active Indicative | `tense-present`, `tense-future`, `voice-active`, `mood-indicative`, `stem-and-ending` | covered | |
| 4 | Nouns of the Second Declension | `declension-2`, `case-nominative`, `case-genitive`, `case-dative`, `case-accusative`, `article` | covered | |
| 5 | Nouns of the First Declension | `declension-1`, `gender-feminine`, `article` | covered | |
| 6 | Adjectives of the First and Second Declensions | `adjective`, `declension-1`, `declension-2` | covered | |
| 7 | Imperfect and Aorist Active Indicative | `tense-imperfect`, `tense-aorist`, `augment`, `second-tenses` | covered | |
| 8 | Additional Prepositions | `preposition`, `compound-verbs` | covered | |
| 9 | Personal Pronouns | `pronoun`, `pronoun-personal`, `pronoun-possessive` | covered | |
| 10 | Perfect and Pluperfect Active Indicative | `tense-perfect`, `tense-pluperfect`, `reduplication` | covered | |
| 11 | Demonstrative Pronouns | `pronoun-demonstrative` | covered | |
| 12 | Present Middle and Passive Indicative | `voice-middle`, `voice-passive`, `voice-middle-or-passive` | covered | |
| 13 | Perfect Middle and Passive, Future Middle Indicative | `voice-middle-or-passive`, `tense-perfect`, `tense-future` | covered | |
| 14 | Imperfect Middle and Passive, Aorist Middle, and Pluperfect Middle and Passive Indicative | `voice-middle`, `voice-passive`, `tense-imperfect`, `tense-aorist`, `tense-pluperfect` | covered | |
| 15 | Aorist and Future Passive Indicative | `voice-passive`, `tense-signs`, `voice-passive-deponent` | covered | |
| 16 | Review of the Indicative Mood | `mood-indicative`, `principal-parts` | covered | |
| 17 | Nouns of the Third Declension | `declension-3`, `dictionary-entry` | covered | |
| 18 | Adjectives, Pronouns, and Numerals of the First and Third Declensions | `adjective`, `comparative`, `superlative`, `numeral`, `declension-3` | covered | |
| 19 | Contract and Liquid Verbs | `contract-verbs`, `tense-signs` | partly | `liquid-verbs`, `consonant-changes` |
| 20 | Participles (Verbal Adjectives) | `mood-participle`, `mood-participle-imperative` | partly | `participle-uses`, `genitive-absolute` |
| 21 | Infinitives (Verbal Nouns) | `mood-infinitive` | partly | `infinitive-uses` |
| 22 | Additional Pronouns | `pronoun-relative`, `pronoun-interrogative`, `pronoun-indefinite`, `pronoun-reflexive`, `pronoun-reciprocal`, `pronoun-correlative` | covered | |
| 23 | The Subjunctive Mood | `mood-subjunctive`, `conditional` | partly | `purpose-result-clauses`, `conditional-classes` |
| 24 | The Imperative and Optative Moods | `mood-imperative`, `mood-optative`, `negative` | covered | |
| 25 | The Conjugation of -μι Verbs | `mi-verbs`, `second-tenses`, `oida`, `eimi` | covered | |
| 26 | Reading Your Greek New Testament | `dictionary-entry`, `punctuation`, `enclitics` | partly | `reading-the-text`, `sentence-patterns`, `case-uses` |

The book's clause and case-use teaching also lives inside chapters 4 to 6, 23 and 26 (a noun chapter shows what each case does;
the subjunctive chapter shows purpose and "if"); that is judged from the usual shape of such chapters, not from the book, and
the same gaps cover it.

## (c) The gaps: ideas the ladder lacks

Each proposed idea is a new `GrammarIdea` for `src/data/grammar/ladder.ts` (a later story, not this one), with the tier and
the existing ideas it `needs`, so it sits above everything it rests on and the graph stays acyclic. Rungs are not given: the
ladder numbers them by its order. The first five are the most valuable to a reader of the Greek New Testament.

| # | Proposed id | Title | Tier | Needs | Why a reader needs it |
| --- | --- | --- | --- | --- | --- |
| 1 | `participle-uses` | What a participle is doing | verbs | `mood-participle`, `article`, `case-uses` | Participles are everywhere in the New Testament, and the same form is a noun ("the one believing"), a describer, or a clause ("having heard, he went"); only the use tells which. |
| 2 | `genitive-absolute` | The genitive absolute | verbs | `mood-participle`, `case-genitive`, `participle-uses` | A noun and participle both in the genitive, apart from the main clause, is a stock way to say "when…" or "while…" and is a trap for a reader who looks for its subject in the sentence. |
| 3 | `case-uses` | What each case does in a sentence | nouns | `case-nominative`, `case-accusative`, `case-genitive`, `case-dative` | Knowing a form is genitive is not knowing whether it means "of", "from" or "belonging to"; the uses (subject, object, possession, means, indirect object, direct address) turn a parsed word into a meaning. |
| 4 | `purpose-result-clauses` | Clauses of purpose and result | joiners | `conjunction`, `mood-subjunctive`, `mood-infinitive` | "In order that" (ἵνα) and "so that" are among the commonest ways a New Testament author gives a reason; they take the subjunctive or the infinitive. |
| 5 | `verbal-aspect` | What a tense says: kind of action | verbs | `tense-present`, `tense-imperfect`, `tense-aorist`, `tense-perfect` | The Greek tenses mark the kind of action (going on, done as a whole, done with a result that remains) more than its time, so "do not keep doing" and "do not start" differ by tense and a reader who hears only time misses it. |
| 6 | `indirect-discourse` | Reported speech and thought | joiners | `conjunction`, `mood-indicative`, `mood-infinitive` | After "say", "know", "believe" and "see", ὅτι or an infinitive carries what was said or thought; without it a reader cannot tell the saying from the thing said. |
| 7 | `conditional-classes` | The kinds of "if" | joiners | `conditional`, `mood-optative`, `tense-aorist` | The ladder has one idea for the conditional; but "if (and it is so)", "if (and it may be)" and "if (and it is not)" differ by mood and tense, and Paul's and John's arguments turn on which is meant. |
| 8 | `infinitive-uses` | What an infinitive is doing | verbs | `mood-infinitive`, `article`, `case-uses` | The infinitive completes a verb ("able to"), states purpose, or with the article is a noun in a case ("by believing"); one form, several jobs. |
| 9 | `liquid-verbs` | Verbs whose stem ends in λ, μ, ν or ρ | verbs | `tense-future`, `tense-aorist`, `tense-signs`, `stem-and-ending` | These verbs lose or change the tense sign (ἀποστέλλω gives ἀπέστειλα, μένω gives μενῶ), so a reader meets forms that look like no tense sign they were taught. |
| 10 | `consonant-changes` | Letters that change where stem meets ending | verbs | `stem-and-ending`, `tense-signs`, `syllables` | A stop before σ, or a letter dropped before an ending, hides the stem (κηρύσσω, ἔπεμψα); this is the root-variation and assimilation BMA names, which `crasis` and `attic-form` only stand in for. |
| 11 | `sentence-patterns` | How a Greek sentence is put together | joiners | `case-nominative`, `case-accusative`, `eimi`, `article`, `conjunction` | Word order is free: a reader needs the subject and object found by case, a predicate after "is", apposition, and the long chained sentences Paul writes. |
| 12 | `reading-the-text` | Reading a printed Greek New Testament | joiners | `dictionary-entry`, `punctuation`, `enclitics`, `sentence-patterns` | The step from exercises to the page: the editions, the apparatus and its marks, the lexicon, and what to do with a form that is not in the paradigms. |

Proposed ideas as a list (the test checks that each tier is a ladder tier, that no id is already in the ladder, and that
every id in `needs` is in `ladder.ts` or is another proposed idea above it):

```text
participle-uses | verbs | mood-participle, article, case-uses
genitive-absolute | verbs | mood-participle, case-genitive, participle-uses
case-uses | nouns | case-nominative, case-accusative, case-genitive, case-dative
purpose-result-clauses | joiners | conjunction, mood-subjunctive, mood-infinitive
verbal-aspect | verbs | tense-present, tense-imperfect, tense-aorist, tense-perfect
indirect-discourse | joiners | conjunction, mood-indicative, mood-infinitive
conditional-classes | joiners | conditional, mood-optative, tense-aorist
infinitive-uses | verbs | mood-infinitive, article, case-uses
liquid-verbs | verbs | tense-future, tense-aorist, tense-signs, stem-and-ending
consonant-changes | verbs | stem-and-ending, tense-signs, syllables
sentence-patterns | joiners | case-nominative, case-accusative, eimi, article, conjunction
reading-the-text | joiners | dictionary-entry, punctuation, enclitics, sentence-patterns
```

Where they sit: `case-uses` (nouns tier) rests on the four cases and is placed after `case-vocative`, so `preposition` could
come to rest on it later. The verb ideas (`verbal-aspect`, `liquid-verbs`, `consonant-changes`, `participle-uses`,
`infinitive-uses`, `genitive-absolute`) sit after `mood-participle` / `tense-perfect` in the verbs tier; the clause ideas and
the two reading ideas go to the joiners tier, after `conditional`. BMA's lessons would name them as follows: `consonant-changes`
in place of `crasis` and `attic-form` in "Letters that change at a joint" and "Stems that shift"; `participle-uses` and
`genitive-absolute` in level 5; `purpose-result-clauses`, `indirect-discourse` and `conditional-classes` in "Clauses of
condition and purpose" and the 1 John lessons.
