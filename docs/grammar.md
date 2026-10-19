# The grammar ladder

**PROVISIONAL.** The tiers, the rungs and the wording of each idea are a first draft; the Governor will change them. Other
stories key on the ids (`case-genitive`, `tense-aorist` ...), so an id is not renamed once it ships.

The Governor asked to be taken "all the way down to alphabet and it's pronunciation", and to be tested "on the grammar
required". The ladder is the one list that gives both: every idea of Greek grammar a reader of the New Testament meets, easy
first, from the letters and how they sound up to the participle and the Hebrew word. It is the list the needs of a passage,
the placement, the drills, the levels and the weave's grammar dial all key on.

Code: `src/data/grammar/ladder.ts`. It is pure: no store and no screen.

## What an idea is

`GrammarIdea` is `{ id, title, tier, rung, terms, text, needs }` and, for a letter, `glyphs` (small, capital). How a letter, a pair or a breathing SOUNDS is not in the ladder: it is the chosen pronunciation's lesson (`Pronunciation.lessons`, keyed by idea id; `src/data/grammar/lessons.ts` `ideaText` / `ideaSound`), so the idea sheet and every question that states a sound follow the scheme he chose (Modern Greek: the breathings are silent, ὁ is 'o'); a scheme with no lesson for an idea gets the ladder's neutral `text`, which names no sound, never another scheme's.

- `tier` is one of `letters`, `sounds`, `marks`, `nouns`, `pronouns`, `prepositions`, `verbs`, `joiners`, `sentences`, in that order.
- `rung` is the idea's place in the ladder, from 1, easy first. Every idea rests (`needs`) only on ideas of a lower rung; a
  test fails on a cycle or a need that points up.
- `terms` are the grammar words of `src/data/parseCode.ts` (`GRAMMAR_TERMS`) the idea covers. Every term belongs to exactly
  one idea; a term with no idea fails a test, and so does a term two ideas claim. A letter covers none.
- `text` is one short paragraph (under 80 words). Where an idea covers a term, its text is that term's explanation from
  `src/data/grammar-concepts.ts` (with its Greek note when the whole stays short), so the words are written once.
- Each idea is an item the spaced schedule can drill: its `id` is the item id of a review row of kind `IDEA_KIND`
  (`'grammar'`). No row is written yet.

## Functions

- `LADDER`: the ideas, sorted by rung. `TIERS`, `IDEA_KIND`.
- `ideaOf(id)`: one idea; throws on an unknown id.
- `ideasBelow(id)`: every idea it rests on, however far down, sorted by rung.
- `ALWAYS_NEEDED` (`alphabet`, `diphthongs`, `consonant-pairs`, `syllables`, `breathings`, `accents`, `iota-subscript`, `punctuation`, in ladder order): every goal needs these (a beginner meets them first, so Learn next walks them before any noun idea and the Weave's grammar dial holds a form to them), so `ideasOf` does not list them.
  `alphabet` is the parent of the 24 letter ideas.
- `ideasOf(code)`: the ids a word with that RP parsing code needs, sorted by rung: its part of speech, plus one idea for
  each case, number, gender, person, tense, voice, mood and suffix its parsing names (a possessive pronoun's possessor is
  one with the possessive pronoun). `ideasOf('PREP')` is `['preposition']`; `ideasOf('N-GSF')` is `noun`,
  `case-genitive`, `number-singular`, `gender-feminine`. It throws on a code `decodeParse` does not know, and a test walks
  every parse code of the 260 chapter files.
- `ideasOfWord({ l, p })` (mw-86e9r1.5): `ideasOf(p)` plus, for a word with the code `PREP` whose lemma is one of the twelve prepositions
  below, that preposition's own idea (`preposition-dia` for διά), which a parsing code cannot name, and (mw-svw421.1) `patternsOf(word)`, the
  pattern ideas its dictionary form and code show ('Patterns', below). `passageNeeds` and the idea sheet's examples use it, so a passage with
  διά needs `preposition-dia` and one with ἦν needs `eimi` and `augment`; the Weave's grammar dial (`formPasses`) still reads the code alone.
  And (mw-5r3p30.604, PROVISIONAL) `textIdeasOf(word)` (`src/data/grammar/textIdeas.ts`), the ideas the word's form shows that no code names:
  `compound-verbs` for a verb `COMPOUND_VERBS` lists (ἐξεβάλομεν, from ἐκβάλλω; a verb the list lacks is not found, so extend the list to extend the idea),
  `marks-change-word` for either word of a `MARK_PAIRS` pair, `enclitics` for a present εἰμί but εἶ, τις (not τίς) and μου, μοι, με, σου, σοι, σε,
  `words-sound-alike` for a word of `SOUND_ALIKE`, and `movable-letters` for οὐκ, οὐχ, ἐξ or a word ending in an apostrophe. So a goal's ideas hold them
  after the foundation, by rung, and Learn next walks them; a goal whose words show none does not need them. A test walks the whole text for the ladder's
  ideas no word reaches (`dictionary-entry`, `principal-parts` and a few rare ones of the voices and moods have no rule yet).

## Marks that change the word, and enclitics

`src/data/grammar/marks.ts` (PROVISIONAL, mw-86e9r1.6) is the data. `marks-change-word` ('Marks that change the word', `marks` tier, after `movable-letters`)
teaches eight pairs spelt alike but for a breathing or an accent, which Modern Greek says alike: `ἡ`/`ἤ`, `ὁ`/`ὅ`, `εἰ`/`εἶ`, `ἐν`/`ἕν`, `οὐ`/`οὗ`, `ἀλλά`/`ἄλλα`,
`αὐτή`/`αὕτη`, `τίς`/`τις`. Each word has a real New Testament phrase (`ἢ τοὺς προφήτας`, Matthew 5:17; `ἕν ἐσμεν`, John 10:30; the text's own spelling, a grave
accent being an acute before another word). `enclitics` ('Enclitics') teaches the small words that have no accent of their own and lean on the word before:
the present forms of `εἰμί` (not `εἶ`), `τις`, `μου`/`σου`/`μοι`. Both rest on `breathings` and `accents`; `pronoun-interrogative` rests on the first and
`pronoun-indefinite` on the second, since they turn on `τίς` and `τις`. The question is 'Which fits?' over a phrase with the word blanked, and the twin of
the right word is always among the four choices, so a reader who ignores the mark cannot get it right except by luck. `tests/unit/marks-change-word.test.ts`
proves every phrase is in its verse. The accents lesson no longer says the three marks need not be told apart: it says to stress the syllable that carries
one, and that a mark can change the word and a few small words have none. BMA Tutor teaches both in the lesson 'Marks over the letters'.

## The sound rules, and words that sound alike

The respeller's rules that a reader applies are taught in the lessons of the chosen scheme (`schemes/modernLessons.ts`, held to `respellModern` by `tests/unit/sound-rules.test.ts`, which also finds each example word in the text): in `consonant-pairs` σ is `z` before β γ δ ζ λ μ ν ρ (`κόσμος` is `KOZ-mos`, `Ἰσραήλ` is `eez-ra-EEL`); in `diphthongs` the υ of αυ ευ ηυ is `v` before a vowel or β γ δ ζ λ μ ν ρ and `f` before any other letter or at the end (`Παῦλος` `PAV-los`, `αὐτός` `af-TOS`). The breathing rules are spelling, true in every scheme, so they are in the ladder's own `breathings` text: a breathing sits on the second vowel of a pair (`οὗτος`, `αὐτός`) and before a capital it stands in front of the letter (`Ἰησοῦς`).
`words-sound-alike` ('Words that sound alike', `marks` tier, after `iota-subscript`; `src/data/grammar/soundAlike.ts`) teaches three pairs Modern Greek says alike: `ἡμεῖς`/`ὑμεῖς`, `λύομεν`/`λύωμεν`, `λύει`/`λύῃ`, and says to trust the spelling. That they sound alike is the scheme's claim, so the ladder's text only says a pronunciation may say them alike and the Modern Greek lesson says they do (a scheme with no lesson gets the neutral text). The question (`buildSoundAlike`, kind `letter`) is Tap to hear the word for “we”, then tap how it is spelt: the word, its twin and two words of the other pairs; when the scheme's `respell` gives the pair one sound the prompt says so, so only the spelling can answer it, and a scheme that says them apart is asked by ear. BMA Tutor teaches it in 'Marks over the letters'.

## The prepositions one by one, and compound verbs

`src/data/grammar/prepositions.ts` (PROVISIONAL) is the data: twelve prepositions (`εἰς`, `ἐν`, `ἐκ`, `ἀπό`, `πρός`, `διά`, `κατά`, `μετά`,
`περί`, `ὑπό`, `παρά`, `ἐπί`, the one-case ones first), each with the cases it takes, the meaning that goes with each case (no two uses share
one) and a real New Testament phrase in that case (`διὰ τοῦ προφήτου`, Matthew 13:35, genitive, “through”; `διὰ τοὺς λόγους`, John 10:19,
accusative, “because of”), and thirteen compound verbs (`ἐκ + βάλλω` is `ἐκβάλλω`, “throw out”, in `ἐξεβάλομεν`, Matthew 7:22).
`ladder.ts` makes an idea `preposition-<key>` of each, in the `prepositions` tier after `preposition`, resting on `preposition`, the cases
it uses and, for one that is elided or aspirated before a vowel (`δι᾿`, `κατ᾿`/`καθ᾿`, `ἐξ`), `movable-letters`; its lesson text gives each
case, its meaning and the phrase. `compound-verbs` ('Compound verbs', `verbs` tier, after `verb`) rests on `verb`, `preposition` and the
twelve. `tests/unit/prepositions.test.ts` proves every phrase is in its verse with the preposition first, tagged `PREP`, and the words
after it in the case the lesson says, and that every compound verb's form is in its verse under that lemma. BMA Tutor teaches them with
`preposition`, in the lesson 'Small words that take a case'.


## Patterns

How a form is built is thirteen ideas of the ladder (mw-svw421.1; ids and names PROVISIONAL, not renamed once shipped), each with no `terms`
(a parsing code names none of them), a text of under 80 words with a New Testament example, and a card (`src/data/grammar/teach/`):

- the `nouns` tier: `stem-and-ending` ('A word is a stem and an ending', after `case-nominative`), `declension-1` and `declension-2` (after the
  genders, so after the four cases), `dictionary-entry` ('A dictionary entry': the nominative, the ending of the genitive and the article that
  shows the gender; an adjective's `-ή, -όν`; after `article` and `adjective`) and `declension-3` (resting on the entry and the first two:
  the stem shows in the genitive);
- the `verbs` tier: `eimi` (after `verb`), `contract-verbs` (after `mood-indicative`), `augment` (after `tense-aorist`), `reduplication` and
  `oida` (after `tense-perfect`), `mi-verbs` (after `second-tenses`), `tense-signs` and `principal-parts` (after `voice-passive`).

`src/data/grammar/patterns.ts` is pure: `patternsOf({ l, p })` reads the pattern ids a word uses from its lemma and its RP code. `declension-1`,
`-2` and `-3` come from a noun's or adjective's lemma ending and gender (first: -η or -α feminine, -ης or -ας masculine, and an adjective's
feminine of an -ος lemma; second: -ος and -ον, an adjective's masculine and neuter; the rest, and a neuter in -ος, -α or -ας, third; a name
or letter that never changes has none); `augment` from the imperfect, aorist and pluperfect indicative; `tense-signs` from the future, the
first aorist (so the aorist passive) and the active first perfect; `reduplication` from the perfect and pluperfect; `contract-verbs` from a
lemma in -άω, -έω or -όω; `mi-verbs` from a lemma in -μι; `eimi` from the lemma εἰμί (which is not also a `mi-verbs`); `oida` from a perfect or a
past (ᾔδειν) of οἶδα, which the text files list under εἴδω (the aorist εἶδον is not οἶδα, and οἶδα has no `reduplication` or `tense-signs`);
`stem-and-ending` from any noun, adjective or verb (a pronoun, the article and the little words are learnt whole, as forms in a table, so ὅ and
καί use none). `dictionary-entry` and `principal-parts` are about how a dictionary lists a word, not about a form, so no word uses them and
their idea sheets show no examples (PROVISIONAL). `ideasOfWord(word)` is `ideasOf(code)` plus `patternsOf(word)`, so `passageNeeds` counts
each with its count and first example, the idea sheet (`ideaExamples`) finds its examples, and both approaches place them: the ladder by
tier, BMA Tutor in the earliest lesson after everything the idea needs (`eimi` in 'Being: I am, you are, he is', `declension-3` in 'The nouns
with other patterns', `mi-verbs` in 'Verbs with their own endings'). `formPasses` is NOT changed: no chunk is held back for a pattern.
Tests: `tests/unit/patterns.test.ts` (1 John 1's words, a walk of every token of the 260 chapter files), `tests/unit/pattern-ideas.test.ts`,
`features/pattern-ideas.feature`.

## Sentences

The `sentences` tier (mw-br588b.2; ids and names PROVISIONAL, not renamed once shipped) is the one tier that is about more than a word: fifteen ideas, one for
each use the finder `src/data/grammar/uses.ts` knows, and **each idea's id is that use's id** (`USE_IDS`; a test walks the ids `usesOf` finds and fails on one the
ladder lacks). `usesOf(verse)` reads the parsing codes and the lemmas of a verse's Greek and finds, in text order, what its words are doing together; a rule that
cannot be sure finds nothing. Each idea has no `terms`, a text of under 80 words with a New Testament example, a card (`teach/sentences.ts`) and `needs` that
are the word ideas it is built of, so it sits above them: `agreement` (the article, the adjective, the cases, the numbers, the genders), `article-substantival`,
`article-position`, `postpositive` (the conjunction, the particle), `clause-hoti`, `clause-hina` (the conjunction, the subjunctive), `participle-adverbial`,
`genitive-absolute` (the participle, the genitive), `periphrastic` (`eimi`, the participle), `infinitive-articular` (the infinitive, the article, the
preposition), `infinitive-complement`, `subjunctive-hortatory`, `prohibition`, `ou-me` and `condition` (the conditional, the indicative, the subjunctive).

- **What a passage needs.** `passageNeeds` runs `usesOf` over each verse and counts a sentence idea once for each use, its example the use's head word (its first
  word when the head is not among its words) with the verse's ref: 1 John 1 needs `clause-hina` three times (1:3, 1:4, 1:9), `condition` five and `clause-hoti` four.
- **The idea sheet.** `ideaExamples` gives a sentence idea up to three uses, each as the whole verse with the use's words marked (`parts`, a part for each word and
  each space; the Example row marks them `data-use`), a different verse for each use first, the verse's English for the use's words as the gloss, and the use's
  words on the speaker. A tap opens the head word's sheet. No Try it is offered (no word's parsing names a sentence idea).
- **Drill it.** A sentence idea has no form to spot, so Drill it asks what it is (`buildConcept`) until a story makes questions about the verses.
- **The approaches.** The ladder approach's last level is 'Sentences' (`TIER_TITLES`), a lesson for each idea. BMA Tutor's level 5 lessons name them
  ('Clauses of condition and purpose': `condition`, `clause-hina`; 'Clauses that say who or which': `agreement`, `article-substantival`; and so on), each after the
  ideas it needs (`tests/unit/ladder-sentences.test.ts`).

## What a passage needs

`src/data/goal.ts` and `src/data/grammar/needs.ts` (mw-hqd5bz.2). A goal is `{ book, chapter?, verse? }`: "Read 1 John", "Read 1
John 1" or "Read 1 John 1:1". Pure data work from the chapter files and the RP code on every token: no tutor, no network
beyond `loadChapter`.

- `parseGoal(text, index)`: reads '1 John 1:1', '1 John 1', '1 John', the same with a leading 'Read', or a book code
  ('1jn 1:1'); case and spacing are loose. It is `undefined` for a book that is not one of the 27 (`books.ts`), or a chapter or
  verse the index does not have ('1 John 9', 'Romans 8:99').
- `goalText(goal)`: the canonical text to save ('1 John 1:1'; `parseGoal` reads it back to the same goal).
  `goalTitle(goal, index)`: 'Read 1 John 1:1'.
- `passageNeeds(goal, loadChapter, index)`: loads the chapter, or every chapter of the book in canonical order (one request
  each; the index gives the count), and returns
  - `words`: `{ lemma, gloss, count, firstRef }`, the lemma in its dictionary form (NFC), commonest first and then in order of
    first use;
  - `ideas`: `{ id, count, example: { form, code, ref } }`, `ALWAYS_NEEDED` first and then up the ladder by rung (so a
    passage with no subjunctive lists no subjunctive); `count` is the number of words that need the idea, `example` the first (for a sentence idea, 'Sentences' below: the number of uses, the first use's head word);
  - `tokens`: the words of the passage, repeats counted.
  A `ref` is 'book.chapter.verse', as in the answers table ('1jn.1.1').
- `progressToward(needs, wordStates, levels)`: `{ words, grammar }`, each `{ solid, frontier, notYet, total }`. A solid word is
  solid, a learning word is frontier, a dropped or unlisted word is not yet; an idea with no level is not yet. `Level`
  (`'solid' | 'frontier' | 'notYet'`) is exported from `needs.ts` until the levels story moves it to its repository.

## Questions that drill an idea

`src/data/grammar/questions.ts` (pure, seeded like `quiz.ts`) turns an idea and a passage into one `GrammarQuestion`; `buildIdeaQuestion(idea, passage, random)` always gives one. The passage is the goal's chapters, or the chapter the Reader has open when there is no goal (a whole-book goal reads at most six of its chapters). The kinds, and which ideas get them:

| kind | what it asks | ideas |
|---|---|---|
| `ending` | the form with its ending blanked (`ἀρχ_`), four endings; the wrong three are the same word's other endings in the passage first (its other cases or tenses: the near misses, mw-i7xe0n.7), then the endings of other inflected words of the same part of speech in the passage (the common endings when it has too few). The stem is what the lemma and the form share, a stem vowel goes to the ending; a movable ν (-σιν, a verb's -εν) is shown in brackets and is one ending with or without it, `ουσι(ν)` | any word idea whose forms share a stem with their lemma and whose prompt can name them in taught terms (below) |
| `tap-form` | the Greek words of one verse as buttons: 'Tap the dative article'. The prompt names the fewest terms that leave exactly one word of the verse, and the word's text is not repeated in the verse. With graded verses (Review) the verse is drawn from the easiest third of those at his level that have a form (then the rest of those at his level; any verse when none is at his level) | any word idea the passage has a form of |
| `letter` | four glyphs, small or capital (mw-86e9r1.11: 'Which capital letter is Beta?' over four capitals): by name or by sound (a letter that sounds like the right one is never offered), vowel pairs, consonant pairs, the iota under a letter, the marks, and for `movable-letters` the form that fits a New Testament phrase (οὐ, οὐκ or οὐχ; ἐκ or ἐξ; ἀπ᾿ or ἀφ᾿; a word that takes a movable ν), and for `marks-change-word` and `enclitics` the word that fits a New Testament phrase, with its twin (the same letters, the other mark) always among the four, and for `words-sound-alike` Tap to hear a word by its meaning, then its spelling, the twin among the four | a letter, the alphabet, `diphthongs`, `consonant-pairs`, `iota-subscript`, `punctuation`, `movable-letters`, `marks-change-word`, `enclitics`, `words-sound-alike` |
| `sound` | Tap to hear says a letter (`speakWord`), four glyphs, small or capital | a letter, the alphabet |
| `stress` | the syllables of a word from the chosen pronunciation's respell, the stressed one right | `accents` |
| `preposition` | 'What does διά mean here?' over a real phrase (`διὰ τοὺς λόγους`, John 10:19): four meanings, the right one is the meaning of the case the phrase is in; the other cases' meanings of the same preposition are among the wrong ones | each `preposition-<key>` |
| `compound` | 'ἐκ + βάλλω (“throw”) makes ἐκβάλλω, as in ἐξεβάλομεν. What does ἐκβάλλω mean?': four meanings | `compound-verbs` |
| `syllables`, `breathing` | how many syllables; rough or smooth | `syllables`, `breathings` |
| `meaning` | 'What does this say?' (mw-emk3xt.2, `buildMeaning`): the Greek of one chunk, or of a clause of two to four chunks in a row, of a verse that has a form needing the idea, large with Tap to hear, and four of the verse's own English chunks (`EnglishChunk.t` as the MSB has it, never made up; a clause: the same number of chunks in a row, read as one). `form` is the chunk's Greek words in text order, `right` its English, `marked` its Greek words, `code` the parsing of the form that needs the idea, `ref` the verse. The wrong three are other chunks of the same verse first, then of the verse before and after it that render at least one Greek word and read differently, then the commonest English of the passage; a clause draws only when the verse has three or more chunks after the form's, and falls back to a single chunk when it cannot make four choices. With graded verses (below) the verse is drawn from the easiest third of those at his level that have such a form (all of them when none is at his level); with none, any verse with one. A flashcard shows the Greek and Show reveals the English. A right answer credits the letters, sounds and marks of the chunk's forms (`formOfQuestion`, word by word) | any word idea the passage has a form of, in Review |
| `parse` | 'Parse ἀκηκόαμεν' (mw-emk3xt.3, `buildParse`): the Parsing drill's steps (`drill.ts` `buildSteps`: the part of speech, then what the code goes on to say, each a feature with four choices) as one question. The word is one of a verse **at his level** (`graded`: its forms all pass, so every idea of the word is frontier or solid) that needs the idea and has a feature to parse, in the easiest third of such verses. `steps` are the Parsing drill's `DrillStep`s (`ParseStep`), `form` the word, `ref` its verse, `code` its parsing, `lemma` its headword, `right` the whole parsing in plain words (`decodeParse`) and `options` that alone. The card (`GrammarCard`) asks the steps one at a time ('2 of 5: tense', what is right so far above the four choices); a right step goes on at once, a wrong one ends the question with the full parsing in plain words and the wrong step marked, and the question is right only when every step was. Each step answered is written to the `drills` table as the Parsing drill writes it (`recordDrillStep(lemma, step id, right)`, `kinds.ts` `recordParseStep`), the question as a whole to the idea that was due (`recordGrammarAnswer`, with the form's letters credited on a right one). Never a flashcard: it is asked by steps at any schedule step | any word idea the passage has such a word for, in Review, for an idea at a step of `SOLID_STEP` or more (PROVISIONAL: the strong get the full parsing) |
| `roles` | 'Who does what to whom' (mw-emk3xt.3, `buildRoles`): the words of a verse at his level as buttons, and one of 'Tap the one who does it' (the subject), 'Tap what is done' (the verb) and, when the verse has one, 'Tap what it is done to' (the object), drawn by the question's random. The verse has exactly one finite verb (a verb whose parsing has a person: no participle or infinitive), exactly one nominative noun or pronoun of the verb's number (its subject) and, for the third prompt, exactly one accusative noun or pronoun (its object); each word asked is the only one of its text in the verse, and one of the three needs the idea. A verse with two finite verbs is never chosen. The card is `tap-form`'s | `case-nominative`, `case-accusative`, `verb`, `person-1st`, `person-2nd`, `person-3rd`, in Review |
| `use` | 'What is ἵνα doing here?' / 'What are these words doing?' (mw-br588b.3, PROVISIONAL, `buildUse`): a verse of the passage with a use of the idea (`uses.ts` `usesOf`), its Greek drawn as text with the use's words marked (`words`, `markedAt`; the card gives each marked word `data-marked`, the ref under it), and four titles of sentences-tier ideas as choices: the idea's own and three others (`right` the idea's title). A use opened by a word of its own (`clause-hoti`, `clause-hina`, `condition`) names it when it stands once in the verse. The verses at his level (`graded`) are all candidates, not the easiest third, since a passage has few uses of one idea. A flashcard shows the verse and the question, Show reveals the title | the sentences-tier ideas (`USE_IDS`) |
| `tap-use` | the word a use hangs on (mw-br588b.3, `buildTapUse`): the verse's words as buttons under 'Tap the noun that πιστός agrees with' (`agreement`, `article-position`: 'stands beside'), 'Tap the verb that ἀγνοεῖν completes' (`infinitive-complement`), 'Tap the participle that goes with ἐστίν' (`periphrastic`), 'Tap the participle that goes with <noun>' (`genitive-absolute`) and 'Tap the verb that ἵνα brings' (`clause-hina`). Right is the use's head (the participle for `periphrastic`), asked only when it and the named word stand once in the verse. A use with no such word (the postpositive, ὅτι, the conditions) is only asked as `use` | the sentences-tier ideas whose use has a head |
| `concept` | which idea this text is, four titles; the idea's own title, terms and pronunciation hint are blanked (`___`) from the text | only an idea the passage has no form of |

A sentences-tier idea (`idea.tier === 'sentences'`) is drawn as `use` or `tap-use` by its first random draw and falls back to the other, then to the `concept` (the placement and Drill it draw it the same way).

**A question uses only terms he has been taught** (mw-5r3p30.379, `src/data/grammar/taughtTerms.ts`; tests/unit/question-terms.test.ts): the terms of a question are those of its own idea and the ideas before it on the ladder (ladder.ts order), and no others. A `tap-form` names only taught terms, so 'The singular' asks 'Tap the singular noun' and never 'Tap the accusative singular personal pronoun' (a pronoun of any kind is 'the pronoun' until its kind is taught); a verse that no taught terms can single a word out of is not used. An `ending` names every feature of the form in the prompt ('genitive singular of ἀρχή'), except a noun's gender, which never changes the ending of a noun, so a verb or an adjective is asked an ending only once all its features are taught and the noun, the numbers and the genders are asked none. A `concept` shows the idea's own text without the sentences that use a later term (the card's first paragraph if none is left) and offers only titles that name no later term.

**An ending is asked only once its table has been opened** (mw-svw421.5, PROVISIONAL, docs/paradigms.md 'Where a table is linked'): `buildEnding(idea, passage, random, tablesOpen)` skips a form whose table (`tableFor(code, word)`) is not in `tablesOpen`, a set of table ids, and the question carries `table`, the id of the table that holds its form. Review's grammar draw (`kinds.ts` GRAMMAR) passes the tables in the settings store's `paradigmsOpened`, so until he has opened the table an idea is asked as `tap-form`; the placement and Drill it pass every table (`EVERY_TABLE`, the default), so they still test endings. After an ending is answered Review's card shows 'See the table' (`GrammarCard` `onSeeTable`, Review only): it opens that table in Study mode as a new Back step, and Back returns to Review with the round as it stood (`src/review/heldRound.ts`, held for at most 30 minutes; the wrong pick's red mark is not kept).

Every question about the passage is drawn from the verses at his level when Review hands the graded verses (mw-emk3xt.4: `ending`, `tap-form`, `meaning`, `parse` and `roles` alike, each from the easiest third of the verses at his level that have a form it can ask, falling back to any verse with one when none is at his level); the placement and Drill it hand none and still draw from the whole passage (the placement is finding his level).

A word idea draws `ending` or `tap-form` by its first random draw and falls back to the other; when Review hands over the graded verses (`buildIdeaQuestion(..., tablesOpen, graded)`, from `kinds.ts` `gradedVersesOf`: his levels at the picker's level and the lemmas he has solid or is learning) the first draw picks where a rotation of `ending`, `tap-form` and `meaning` starts, each falling back to the next in order; `roles` joins the rotation for its six ideas and, for an idea at `SOLID_STEP` or more (Review passes `strong`), `parse` joins it for any word idea (the placement and Drill it hand none, so they still test the form alone). Review (`src/review/kinds.ts` GRAMMAR, kind `grammar`, item id the idea id) draws the due ideas before the due words (PROVISIONAL), asks each as multiple choice below `FLASHCARD_STEP` and as a flashcard (the prompt and the form, Show reveals the answer, I knew it / Not yet) from it up, and records through `recordGrammarAnswer`. `grammarRandom(random)` is the random a round's grammar questions use: a test finds the seed that gives the question it needs through it.

## Drill it, the engine

`src/data/grammar/drillIt.ts` (mw-i7xe0n.1, PROVISIONAL, pure: no store, no screen; the screen is the next story). The Governor's want: start easy in the concept and work up
step by step, back off by halves when it is too hard, "kind of like a binary search", to find where the person is and what their gaps are.

- `drillSteps(ideaId, {passage, scheme, seed})` gives the idea's questions in **steps** of rising difficulty (1 = easiest), each question tagged with a **facet**
  (`{id, label}`, `GrammarQuestion.facet`): the thing a miss shows he has not got. A noun-like idea is asked by what it is (`meaning`), by finding it in a short and a
  long verse of the passage (`spot`) and by its ending (`ending`); a preposition by its meaning against other prepositions, then against its own other cases (facet = the
  case); a compound verb by its prefix. With no passage only what an idea says of itself can be asked. Every idea of the ladder has at least one step.
- The ideas of the letters, sounds and marks tiers are built from their **items** (`drillItems.ts`), so a miss names the letter. The alphabet's five steps: see a
  letter and pick its name; see a name and pick the letter; match a capital to its small letter; hear it (or see it and pick its sound, quickRound.ts) in the
  chosen pronunciation; read a short New Testament word and pick how it is said. Its facets are the 24 letters and five pairs of look-alikes (ν/υ, ρ/π, η/ν, χ/ξ, ο/ω)
  asked with both among the choices. Vowel pairs and consonant pairs: see, hear, read a word; the breathings: a plain word, then one with the mark on the second letter.
  A scheme that gives no sound is asked by ear.
- **A sound that changes by the next letter** (mw-i7xe0n.7, his Chi drill: 'How is this word said?' set χάρις against other words, so the first letter answered it). The
  scheme names its rules (`Pronunciation.soundRules`, docs/pronunciation.md): χ, γ, σ before a consonant, αυ, ευ, ηυ, μπ, ντ, γκ and γχ in Modern Greek, each with
  two sides, the line that names each, and New Testament words of each. Drilled for its own idea, the read-a-word step reads words of **both** sides, each side its own
  facet (`letter-chi:soft`, labelled by the scheme), and offers the word **misread by the rule** as a wrong answer (χάρις: KHA-rees right, HYA-rees wrong; χεῖρες:
  HYEE-res right, KHEE-res wrong); a wrong pick shows the side's line under the answer (`GrammarQuestion.rule`, `GrammarCard` [data-testid=rule-line]); and the idea is
  **proved** only when a word of each side with words was answered right, unhinted (`DrillWalk.sides`; at the top step the side still missing is asked first). Any word
  read, in any drill, offers its misreading by each rule it stands on (κόσμος beside KOS-mos in the alphabet). No New Testament word begins with μπ, ντ or γκ, so their
  'start' side has no word: only their 'inside' side is drilled and needed.
- **Wrong choices** (mw-i7xe0n.7, `src/data/choices.ts`, the Governor's "fix it at the level it's at"): every quiz builds its choices with `choicesOf`, near misses of
  the point the item tests first, then fillers of the same kind, and a question keeps its near misses (`GrammarQuestion.near`) so a **Hint** takes the far ones away
  first (`hint.ts`). The near misses by kind: a letter's look-alike (ν/υ, ρ/π, η/ν, χ/ξ, ο/ω) and its sound; a pair's mates that share a letter (αυ: ευ, ηυ, αι) or
  its rule (μπ, ντ, γκ); a word misread by its sound rule; the same word's other ending; a verse's word with all the prompt names but one; the letter without its iota;
  the other Greek mark; the same word's other forms (οὐ, οὐκ, οὐχ); the twin with the other mark or accent, or the other word that sounds alike; the preposition's other
  cases (Drill it's second step only); the verb without its preposition; the syllables beside the loud one; one syllable more or fewer; the other breathing; an idea of
  the same tier; in the Parsing drill the value a reader takes for the right one (aorist and imperfect, middle and passive, noun and adjective ...) or the answer with one
  feature changed; in the Quick test a gloss of the same part of speech. With none: the movable ν (the others never take one). tests/unit/choices.test.ts holds each.
- `start(ideaId, levels, options)` returns a walk, or `{needs: id}` when a prerequisite (ladder `needs`, not the group an item belongs to) is not solid: the lowest such idea.
  A drill's facets are its own idea's; no question tests a prerequisite, and every question assumes the prerequisites are solid.
- `answer(walk, right, hinted)`: up one step on a right answer; on a miss, back to halfway (rounded down) between the highest step he holds below the missed one and the
  missed one (the facet just missed is asked again at the easier step); a hinted right changes nothing and breaks the run. It ends **proved** (two unhinted rights in a
  row at the top step), at the **edge** (the step he holds has the one above it failed, or he misses step 1 twice: edge 0) or at the **limit** (`MAX_QUESTIONS`, 14).
- The result: `{ideaId, proved, edgeStep, topStep, strong, weak, answers, ended}`; a facet is **weak** when missed at least once and right fewer than twice, **strong**
  when right at least once and not weak (a hinted right counts as neither).

## The idea sheet

`src/IdeaSheet.tsx`, data in `src/data/grammar/ideaSheet.ts` (mw-hqd5bz.7). A bottom sheet that teaches one idea; it opens from the
**Learn this idea** button of a Grammar sheet (the term's idea: `ideaOfTerm(term)`; on 'preposition' of one of the twelve prepositions, that preposition's own idea, `ownIdeaOfWord(word)`, mw-86e9r1.36), over the Grammar sheet and the word sheet.

- **Read more (mw-5r3p30.381, PROVISIONAL).** With Logos on and a ticked grammar book (Settings > Study resources > Logos > Grammar books) that teaches the
  idea, the sheet ends with Read more: one line a book, a link to each of its sections that opens Logos there, three books in view and the rest under
  `More books (N)` (`src/resources/grammarBooks.ts`, docs/resources.md 'Grammar books in Logos'). The same lines show whichever approach's lesson the idea came from.
- **Teach tiles (mw-5r3p30.232).** An idea of the letters, sounds and marks tiers shows its items as tiles (`src/TeachTiles.tsx`, data in `src/data/grammar/teachTiles.ts` `teachTiles(idea, scheme)`) between its title and its text, because a beginner learns a letter by seeing and hearing it, not by reading that it exists. The alphabet is its 24 letters in order (capital and small 'Α α', the name, the sound in the chosen pronunciation, the seven vowels marked 'vowel'; a tap says the letter, `speakLetter`, and the name opens that letter's own idea sheet over this one); syllables are the seven vowels; the vowel pairs, consonant pairs and breathings are their items (the form, the scheme's sound, and a New Testament word with its play button); a letter, a pair or a breathing is one tile; accents, the iota under a letter, punctuation, movable letters, the words a mark tells apart and the enclitics are tiles written in `teachTiles.ts` with a real word of the text. Every sound is the chosen pronunciation's (`ideaSound`), shown up to its first semicolon as the quick round shows it; a scheme that teaches none leaves the tile with no sound line, never Modern Greek's. Four across for the alphabet (44 px tiles at 390x844 and 844x390), two for tiles that carry a word. A grammar idea has no tiles. The text stays below the tiles.
- **The examples come first (mw-5r3p30.369).** 'plural' over 1 John 2 looked as if it left out Τεκνία: the examples sat under the teaching, so
  on opening none was in view, and scrolled down a row could sit under the slider. They now sit straight under the title and the level chip, above
  'This builds on', the tiles and the teaching; three are drawn and any more wait under one 'Show N more' (`SHOWN_EXAMPLES`), so all of them are in
  view when the sheet opens, upright and on its side. On its side (a short window, `short:`) the slider, Mark known and the buttons are a column
  at the right of the sheet, which then takes the whole height, so the examples keep it; the Grammar sheet does the same, and draws its three
  examples straight under the explanation. `tests/e2e/sheet-rows-in-view.spec.ts` holds every row in view at 390x844 and 844x390. Sideways 'How it sounds' (`data-testid="idea-sounds"`) is drawn at the top of the right column, above the slider (one element, moved by `useShort`, `src/ui/useShort.ts`; mw-5r3p30.483): a letter's sound is what the sheet is for, and the text's box keeps its examples. `tests/e2e/idea-sheet-landscape.spec.ts` holds it, and
  `tests/e2e/sheets-landscape.spec.ts` holds that the word, Grammar, Talk and chapter picker sheets keep their scrolling text over half their height at 844x390.
- **Where the examples come from.** `ideaPassage(goalText, openChapter, loadChapter, index)`: the saved goal (the `goal` row of
  the settings store, any text `parseGoal` reads): its chapter, its one verse, or the first five chapters of a book goal; with no
  goal, or one that names nothing, the open chapter (`getOpenChapter()`).
- **When the goal has none (mw-5r3p30.350).** `ideaExamplesFor(id, passage, load)`: the goal's own examples first; with none, a verse goal's
  pericope (the heading's verses, labelled '1 John 1:1-4'), then its chapter ('1 John 1'), then its book ('1 John', PROVISIONAL: he named the
  pericope or the chapter, the Governor is to confirm the book); the sheet says 'Examples from <that place>', and only when nothing is found
  anywhere does it say 'No word of <goal> ...'.
- **A letter's or a sound's examples make its sound (mw-5r3p30.351).** His words about the Omicron, Upsilon and Phi sheets on 1 John 1:1: the examples
  must match what the card teaches, and a different sound is shown on purpose. `isSoundIdea(id)` (the 24 letters, each vowel pair and consonant pair,
  their two groups) holds its examples to the chosen pronunciation's own reading, `Pronunciation.spellings(word)`: units `{from, to, sound}`, a letter
  alone or a pair said as one sound. A letter is marked only where the scheme reads it ALONE as a sound its lesson teaches (`SoundLesson.sounds`:
  'gh' and 'y' for γ), a pair only where the scheme reads exactly that pair; a word with ONE occurrence that is not (ο in τοῖς is half of οι, σ in
  κόσμος is z) is no example of the letter, so the underline is never on a letter that says something else. Nothing in the sheet knows a sound: it asks
  the scheme, and a scheme with no `spellings` holds nothing back. The search for them (`ideaExamplesFor`, PROVISIONAL, the Governor to confirm)
  widens verse, pericope, chapter, book until it has `SOUND_EXAMPLES` (4) easy words (`ladderScore.ts` score at most `EASY_SCORE`, about three
  syllables), and ranks them: easy first, then words made of letters he has met or is learning, then the nearest to the goal, the commonest in the
  New Testament (`ExampleRanking`, read once by the sheet), the shortest; a long cluster like ὀφθαλμοῖς comes last or not at all. The heading names the
  widest place an example came from, and each row its verse. Under the examples a LETTER sheet may add ONE line, 'In a pair it sounds different:
  τοῖς, οι = ee' (`pairCaseOf`: the easiest word in range where the letter sits inside a pair; the wording is PROVISIONAL), whose word opens the pair's
  own idea sheet; with no such word in range, no line. `tests/unit/idea-sound-examples.test.ts` re-derives every marked stretch of every one of these
  sheets from the scheme, over 1 John 1 and over all 260 chapters.
- **The teaching (mw-5r3p30.234).** Every card teaches a total beginner who has proved the cards below it, from the card alone; the parts are
  data, one file per tier in `src/data/grammar/teach/` (`teachOf(id)`), never in the component, and `docs/card-audit.md` judges what each card
  lacked before. Under the title (and the tiles): **What it is**, plain English with an English example; **How to spot it**, the Greek form or
  ending to look for, with a **table** where the idea is a set of endings or forms (the article's 24 forms; a case's endings in four model nouns,
  λόγος, ἀρχή, τέκνον and χείρ, singular and plural, labelled by the noun since gender comes after the cases; a tense's endings by person; each
  kind of pronoun; the pairs; the prepositions with their cases); **How it sounds**, for an idea of a sound only, the chosen pronunciation's lesson
  (`lessons.ts soundLesson`; the teaching names no sound); and a **Worked example**: one New Testament word taken apart in steps, the first of the
  card's worked words that stands in the passage he reads (`workedFor`; 1 John 1:1 and John 1:1 first), else its first, with its meaning, its
  verse, a speaker and its respelling in the chosen scheme. Before the marks are taught a worked word is written in capitals with no marks, as
  the oldest copies wrote it (ΛΟΓΟΣ), and the voice and respelling take the word as the text has it (`say`). `tests/unit/teach-cards.test.ts`
  holds every card to it: the three parts, a table on each set of forms, a worked word spelt only with letters, sounds and marks taught at or
  below the card, a worked word that names its verse is in it, and **no term before it is taught** (each GRAMMAR_TERM and title key word maps
  to the idea that teaches it; a card may use only its own and those below it). The noun teaches the words stem, ending, case and dictionary
  form; the imperfect, the augment; the perfect, reduplication. The ladder's `needs` say what a card rests on: the noun on the breathings, the
  accents and the iota under a letter; the iota under a letter on the breathings and accents; punctuation on the breathings; the nominative on
  the plural; the neuter on the feminine; the passive on the aorist.
- `ideaExamples(id, chapters, verse?)`: up to three words the card can explain, one for each lemma (the article: one per form, up to
  `MAX_FORM_EXAMPLES` 4), in text order, each with its chapter and verse ('1 John 1:1'). A word is explained (`cardExplains`) when its parsing
  needs the idea (`ideasOfWord`), its part of speech is taught at or below the card (or named in the card's `examplesAs`: the persons read a
  verb's ending before the verb has a card), and, when the card has a table, its form is in it (`tableHas`: a cell's whole form, or an ending it
  ends in, with the marks taken off). So the genitive on 1 John 1:1 is ἀρχῆς, λόγου, ζωῆς, not the pronoun ἡμῶν or the article τοῦ, and the
  article is τοῖς, αἱ, τοῦ, τῆς, never the relative ὃ. Each row shows the ending its table names marked, its one sense here (`exampleGloss`: the
  article is 'the'; else its verse's own English, else the first sense of the dictionary gloss, never 'the/this/who'), and its parsing in the
  card's own terms (`exampleNote`: 'genitive singular'; for the article also the noun it goes with, 'goes with ὀφθαλμοῖς “eyes”').
  `tests/unit/examples-match-lesson.test.ts` holds every idea to it over 1 John 1:1 and John 1:1. An idea no word has shows none.
  **Ideas of spelling** (mw-86e9r1.13: the alphabet, a letter, diphthongs and each pair, consonant pairs, the breathings, accents, iota
  subscript, syllables, punctuation; `isSpellingIdea`) are found by how a form is spelt (`inference.ts` `foundationSpans`), not by its
  parsing: up to twelve words (`MAX_FOUNDATION_EXAMPLES`), one for each form, in text order, each with `parts` (the Greek cut into
  stretches, the letters the idea is about `marked`: the letter, the pair, the vowel that carries the breathing or accent, the iota
  subscript's letter, each vowel sound for syllables (a word of two or more), the apostrophe or diaeresis for punctuation). The sheet
  draws a marked part bold, accent-coloured and underlined (`[data-marked]`); the alphabet marks nothing. A verse with none says
  'No word of <passage> is spelt with this.', never 'has this idea in its parsing'.
- The passage's own paradigm (the article in a case, the persons of one verb; `paradigmOf`) gave way to the card's table (mw-5r3p30.234): on a
  case card it showed the article before the article is taught. Paradigms (#/paradigms) still has the full tables.
- **The level slider** (mw-i7xe0n.3, PROVISIONAL names). A native range named 'Your level' with three stops under it, *Not yet* · *Learning* · *I know it*,
  resting on the idea's level (an idea with none rests on Not yet), a 44 px thumb (src/index.css `.level-slider`), and arrow keys, Home and End to move it. A drag
  chooses only where the thumb is let go. `teachIdea(id, outcome, now, how)`: *Learning* (`got-it`) makes the idea frontier and puts it on the schedule at step 0, due
  tomorrow; *Not yet* (`not-yet`) makes it not yet and takes it off the schedule; *I know it* does NOT write solid: it opens **Drill it** in prove mode
  (src/DrillItScreen.tsx, below), and `known` (solid, the 30-day step, due in 30 days) is written only by a pass (how `drill`, the pill 'Proved by drill 3 Oct') or
  by the small text button **Mark known without a drill** under the slider (how `sheet`; not shown once the idea is solid). The row is put in place even if the
  idea was scheduled, keeping its lapses and rights. All publish `grammar-level-changed` and `idea-taught` (docs/events.md). A **Drill it** button sits beside
  *Ask the tutor* (the same walk in practice mode). *Ask the tutor* is the Talk sheet with focus `{term, kind: 'grammar-term'}`, the idea's first term (its
  title for an idea with no term). The level shows as a chip ('Frontier since Tuesday').
- **Built on what is solid.** The sheet teaches only its own idea and takes every idea it needs (ladder `needs`) to be solid. When one is not (`unmetNeed`, the lowest
  rung), the sheet says above the text 'This builds on <title>. Prove it first.' with a button 'Go to <title>' that opens that idea's sheet over this one, and sliding
  to Learning or I know it first asks 'Go to <title> first?' (Go there opens it and leaves the level alone; Stay here goes on, so the foundation is never a lock).
- **Try it on a verse** (mw-emk3xt.4, PROVISIONAL; `src/TryItSheet.tsx`, data `ideaSheet.ts` `tryItOn`). A button beside *Drill it* that takes him from the idea to a verse he can now read. It is left out when no verse
  of the passage the examples come from (the goal's, else the open chapter; a verse goal's one verse) has a form whose parsing names the idea (`hasFormOf`: an idea of the letters or sounds or of a pattern has none). It
  opens a full screen over the idea sheet (a sheet for Back, `useSheetBack`; the dialog 'Try it') titled **Try it: 1 John 1:4**: the verse is `easiestWith(idea, graded, chapters)` (the easiest verse at his level that has a form of the idea,
  else the easiest with one at all; `gradingOf` in `review/kinds.ts` grades the passage to him as Review does), read when the screen opens and kept. It asks three questions on that verse, one at a time, as Review draws them
  (`GrammarCard`, multiple choice, 'Question 1 of 3'): **what a chunk with the form says** (`meaning`), **the form** (its `ending` when its table is open, else `tap-form`), and **a parsing of a word** (`parse`; when the
  verse is not wholly at his level, who does what to whom, `roles`, for the six ideas that have it, and then a parsing). A question that cannot be made is made up from the other kinds, one of each at most, so a verse that
  can be asked fewer than three gives fewer ('You got 1 of 2'). Each builder takes the verse as `only` (its key) and the verse as the one graded verse, so every question is about that verse. Seeded from `drillSeed` (a feature
  step fixes it). Each answer is a grammar answer on the idea (`recordGrammarAnswer`, so the review row has its right or wrong and the level moves as in Review) credited to what the form shows of the letters, sounds and marks
  (`noteAnswer`); a step of the parsing goes to the Parsing drill's table (`recordDrillStep`). It ends on **You got 2 of 3** with **Read it** (`closeAllSheets` in `ui/sheetBack.ts`, then `openVerseAt` the verse: the Verse view
  of that verse with every sheet closed, Back stepping over what was open) and **Done**, and publishes `idea-tried` `{id, right, total}` (docs/events.md). **Stop** leaves with what he answered kept and publishes nothing.
  Tests: `tests/unit/try-it.test.ts`, features/idea-sheet.feature 'Try it on a verse'.
- Tapping an example opens its word sheet, over its own chapter when that is not the Reader's.

## Placement

`#/placement` (opened by Place me under Settings > Goal; its intro also offers 'Start from the letters' for a total beginner: no quiz, nothing written, so Learn next stays where it is, The Greek alphabet for a beginner; the card counts what he already has solid, names the first three ideas and counts the rest so Back to the goal stays on the phone's first screen (mw-86e9r1.47), and names the idea Learn next opens, mw-86e9r1.19) tests the grammar the goal needs and writes where he stands. The rules are PROVISIONAL (the Mayor's, the Governor to confirm) and live in `src/data/grammar/placement.ts`, pure:

- The walk is the goal's needed ideas in `orderOf(the chosen approach)` (the ladder, the one path), with the letters, sounds and marks always on it below them (so a walk of misses reaches them; since mw-hqd5bz.17 not the alphabet as a whole, see below). With no goal it is the whole ladder, and the questions' forms come from the open chapter.
- It starts at the first idea past the letters, sounds and marks that is not already solid, and skips nothing below it. (For 1 John 1:1 that is `noun` in both BMA Tutor and the Lampas ladder, the noun coming before the article in each.)
- Two questions an idea (`questions.ts` `buildIdeaQuestion`, seeded from the state, `placementQuestion.ts`): both right is solid, one is frontier, none is not yet. Solid or frontier moves to the next idea later in the sequence that was not asked; not yet steps BACK to the idea before it.
- Two ideas missed in a row: nothing above is asked, the walk only goes down. Every idea above the first miss stays untested (no level is written).
- **A miss steps down to what the missed forms use (PROVISIONAL, mw-hqd5bz.17).** Each question that shows a Greek form is kept with the form (`Asked.form`). When a needed idea comes out not yet, the state's `focus` becomes the letters, sounds and marks of the forms asked on it (`foundationOf`, with those of the idea missed just before while the walk is going down), and the walk down asks only those of the foundation: the others are passed over, so is one that is solid already, and 'alphabet' (one idea standing for 24 letters) is never asked. A solid needed idea below still ends the walk (the ceiling); a solid letter in the focus does not, the next one is asked. A kept placement from before has no focus and steps down through every idea, as it did.
- **A right answer shows what the form is spelt with (PROVISIONAL, mw-hqd5bz.17).** `answer(state, right, question)` also runs the inference (below) on its own copy of the evidence (`state.evidence`, loaded from the store at the start): a letter, pair or mark that reaches three right uses with no miss since is solid without being asked (`state.inferred`; the end card writes it 'Solid (from your answers)') and stops a walk down as a solid idea does. The store gets the same through `noteAnswer` (`placementWrite.ts` `credit`); an idea's level is what its own two answers give, then the inference may lift it.
- It stops when a step down lands on a solid idea (already solid, or solid just now: the ceiling is found), when no idea is left in that direction, or after 20 questions in a sitting (`paused`: the state is kept in `localStorage` `lampas.placement`, `placementKeep.ts`, and Go on resumes it, even after a reopen).
- **The quick round (PROVISIONAL, mw-hqd5bz.18).** A walk that reached the letters, sounds and marks (it asked one, stepped down to the ones its missed forms use, or had nothing to ask because everything the goal needs was solid, as when he places himself again) ends in a quick round (`quickRound.ts`, pure; the screen's status `quick`, kept in `PlacementState.quick` so a reopen goes on): one tap on each letter, diphthong, consonant pair and breathing that is not solid yet, asked or inferred (`quickItems`), in the ladder's order, at most 40 taps (`QUICK_LIMIT`), outside the 20 questions of the walk. **Hear and pick** (kind `sound`): the app says the letter or pair in Greek (`speakWord`, `src/speech`) as the question comes and he taps it, among four that sound different from it; 'Say it again' and Tap to hear say it again. **See and pick** (kind `letter`): it shows the letter or pair large and he taps its sound (`shortSound`: the part of the sound before the first semicolon), among four. The two alternate, from the seed; a breathing is only seen, on a word that begins with it (Modern Greek does not say it). One tap an item: right is solid, wrong is not yet, each its own level with `setLevel(id, level, 'placement')` (`placementWrite.ts` `writeQuick`, which also puts the answer on the schedule and counts a miss against the item). **Stop here** keeps what was answered and goes to the end card; an alphabet, pair group or breathing he said he knows whole (I know this on its idea sheet, or a marked term: `how` 'sheet' or 'marked') is not asked. The end card adds 'Gaps to work on: ξ, ψ and ου' (`gapsOf`, below).
- Every answer goes on the back-off schedule (`recordGrammarAnswer`, kind `grammar`) and an idea that has had its two questions gets its level with `setLevel(id, level, 'placement')` (`placementWrite.ts`). The end card, 'Where you are: solid N, frontier M, not yet K; untested J', lists the counted ideas by tier; the numbers are over the ideas the goal needs and any other idea the walk gave a level. The card of Start from the letters counts only the ideas the goal needs (`summarize(state, true)`), so its solid, frontier and not yet (not yet plus untested) equal the Goal screen's legend even when single letters are solid (mw-86e9r1.48). `placement-done` goes on the bus. The end card (this one, or the card of Start from the letters) is kept (`lampas.placementCard`, mw-86e9r1.23) for the history entry that reached it: a reload, or Back from the Goal screen, shows the same card; Place me opens the intro again.

## What his right answers show

`src/data/grammar/inference.ts` (pure) and `src/data/repositories/inference.ts` (mw-hqd5bz.17). The rules are PROVISIONAL, the Mayor's, the Governor to confirm. His words (2026-10-09): "I got some things right, can it infer that I know the alphabet? It will learn more as I try to read."

- **A letter named or heard right credits that letter** (mw-86e9r1.11): a right answer to a `letter` or `sound` question that shows no form credits the letter whose glyph, small or capital, is the answer (`letterOf`), so a Review question about the alphabet moves the letter's own run, not only the idea's.
- **A form read right is evidence for what it is spelt with.** `foundationOf(form)`: each of its letters (`letter-*`, a final sigma as sigma, once however often it stands), a pair of vowels (`diphthongs`: αι ει οι υι ου αυ ευ ηυ, not when the first carries a stress mark or the second two dots), a pair of consonants (`consonant-pairs`: μπ ντ γκ γγ γχ γξ), a breathing (`breathings`), an accent (`accents`: acute, grave or circumflex) and an iota under a letter (`iota-subscript`).
- **Where the forms come from.** `formOfQuestion`: the ending question's stem with the right ending put back, the right word of a tap-form or a tap-use, the marked words of a use, the word of a stress, syllables or breathing question. Every right answer on such a question credits its form: in the placement, in Review's grammar ideas (`kinds.ts` GRAMMAR.record) and in a Quick test or Review word (`recordAnswer`: the lemma, right only, a self-graded 'I knew it' too). A miss on a question about a form (an ending, a tap) says nothing about its letters.
- **Three right uses and no miss make it solid.** `INFERRED_RIGHTS` 3. A foundation idea's evidence is `{run, misses}`: right uses since its last miss, and its misses. At `run` 3 the idea is written solid, `how` 'inferred', whatever it was (a placement's not yet too: three reads since the miss outweigh it), and put on the back-off schedule at the 30-day step like a term he marked I know this. A solid he set himself is left alone.
- **A miss counts against it.** A miss on a question about a letter (`letter-*`, or the alphabet's question, whose right glyph says which letter), about the pairs, the breathing or the accent (`questionFoundation`) starts the run again; a letter held only by inference falls back to the frontier (how 'inferred'). Asked misses are the ones that reach the idea's own level (`recordGrammarAnswer`).
- **The alphabet is solid when all 24 letters are.** `syncAlphabet` (grammarLevels.ts) runs after every write of a level (`setLevel`, `recordGrammarAnswer`, `teachIdea`, the inference) and writes 'alphabet' solid, how 'inferred', as soon as the 24th letter is solid, asked or inferred; an alphabet that was solid only by that falls back to the frontier when a letter does. One he set himself stays.
- **One item for each letter and each combination (PROVISIONAL, mw-hqd5bz.18).** Where the ladder has one idea for a group, each combination is an item of its own under it, as the 24 letters sit under `alphabet`: `diphthong-ai` ... `diphthong-eeu` (αι ει οι υι ου αυ ευ ηυ), `pair-mp` ... `pair-gks` (μπ ντ γκ γγ γχ γξ), `breathing-rough` and `breathing-smooth` (`GrammarIdea.parent`, `pair`; the sound is the scheme's, `ideaSound`; `itemsOf(group)`, `ITEM_GROUPS`). The items are not on the placement's walk (`startPlacement` leaves out an idea with a `parent`); they are asked in the quick round, and `foundationOf` credits the item as well as its group, so a form read right moves them too. **A group is solid when every item is** (`syncAlphabet` in grammarLevels.ts, now for all four groups: `diphthongs`, `consonant-pairs` and `breathings` become solid, how 'inferred', and, unlike the alphabet, never fall back). **The exact gaps** (`gapsOf`): the items that are not solid in each group that is partly known; a group none of whose items is solid has no gap yet, it is the whole idea that is missing.
- **It keeps running.** The evidence is in the settings store under `grammarEvidence` (`{id: [run, misses]}`, no table), so every answer anywhere moves the Goal bars live; nothing runs only in the placement.

## The Goal screen

The strip and the screen that show his goal moving (mw-hqd5bz.10). Both read `useGoalProgress` (`src/useGoalProgress.ts`): the saved goal, what its passage needs (`passageNeeds`, worked out once per goal text and kept in memory) and his words and levels, live; the counts are `progressToward`'s.

- **The chip** (`GoalStrip.tsx`, `GoalChip`), in the Reader's one slim row of chips under the header (`ReaderChips.tsx`, with Due, Tip and New): 'Goal 12/31', the solid words of the ones needed; its accessible name is the whole of what the strip said, 'Goal: 1 John 1:1, 12 of 31 words, 8 of 14 ideas'. Not drawn with no goal or while the passage is still being counted; a tap opens `#/goal`.
- **The screen** (`GoalScreen.tsx`, `#/goal`, kept across a reopen; '‹ Reader' goes back): the goal as the title with Change (to Settings > Goal), then two bars, Words and Grammar ideas. Each bar is three segments, solid (filled), frontier (striped) and not yet (empty), with the count written in each and 'Solid 6 · Frontier 0 · Not yet 10' beneath, so colour is never the only sign. 'Solid when both are full.' A tap on a bar opens the list behind it, the items grouped by level (a word with its meaning; an idea opens its idea sheet).
- **Place me** opens `#/placement`; once any level was set by the placement it reads 'Placed on 3 Oct' with Place again (the date is the newest `since` of a level whose `how` is 'placement'; nothing else is stored). Place me here opens `#/placement?from=goal`, so the placement's ‘‹ Goal’, 'Go on another day' and the intro's 'Back to the goal' return here (from Settings they return to Settings); the end card and the paused card both have 'Back to the goal'.
- **See the whole path** (`LadderGraph.tsx`, `#/path`, mw-foy5mb.5, PROVISIONAL): one button on the Goal screen, drawn with or without a goal, opens the whole ladder as a graph: every idea a node, every need an edge, laid out by depth (the ideas that need nothing at the top). A node is solid, learning (the frontier), next (not yet, every need solid) or not yet, by colour and by the dashes and weight of its outline, and named in the legend; one finger pans, two pinch, Zoom in / Zoom out / Where I am do the same without a pinch; a tap on a node opens that idea's sheet; '‹ Goal' goes back. The name is provisional: what Learn calls the ladder is his question on mw-fnvjof.16.
- **Learn next** (`goalProgress.ts` `learnNext`): the earliest idea in the chosen approach's sequence (`orderOf`) that the goal needs and that is not yet or untested, 'Learn next: The noun · Your first words' (the lesson from `lessonOf`); a tap opens its idea sheet. When none is left it says so. PROVISIONAL (mw-hqd5bz.17): when that idea is the alphabet and some letters are solid (asked or inferred), it names the letters that are not, never the whole alphabet: 'Learn next: ξ and ψ · The Greek letters' (`lettersText`: all of them up to six, then 'ξ, ψ, φ, χ, ζ, θ and 5 more letters'), and a tap opens the first of them; with no letter solid it still says 'The Greek alphabet'. An alphabet whose 24 letters are solid is solid, so Learn next goes on to the next idea. PROVISIONAL (mw-hqd5bz.18): it names the exact gaps of every partly known group together ('Learn next: ξ, ψ and ου · The Greek letters': letters, vowel pairs, consonant pairs and breathings; `LearnNext.gaps`), even a group the goal does not need (no goal needs the diphthongs), and a tap opens the first gap. PROVISIONAL (mw-hqd5bz.31): the exact gaps come first, before any earlier idea of the sequence (even the whole alphabet when no letter is solid but a breathing is a gap), so the end card, Learn next and Review always name the same ones in the same order; with no goal set the Goal screen still shows them under Learn next, beside 'No goal yet'. **Review draws the gaps first** (`review/round.ts`): the first four (`GAP_QUESTIONS`, so letters do not crowd out the due items) of the gaps Learn next names, in that order, missed or never asked (mw-hqd5bz.23: a gap with no schedule row is drawn as a step-0 item), due or not, ahead of the due ideas; each is asked as a hear-and-pick or see-and-pick (`buildIdeaQuestion` on an item).
- **Learning now** (mw-i7xe0n.6, PROVISIONAL, `goalProgress.ts` `learningNow`): he learns one idea at a time, so when an idea is at the frontier the screen names it above Learn next, 'Learning now: The noun' (`[data-testid=learning-now]`; a tap opens its sheet). Learn next then gives way to it, unless it names exact gaps (letters, pairs, breathings), which stay beside it. See 'One idea at a time'.
- **A passage lesson as Learn next** (mw-z370x5.1, PROVISIONAL): `learnNext` walks `stepsOf(approach)` (below), so after the ideas it also offers the earliest passage lesson not yet passed whose lesson's ideas are all at least frontier (none `notYet`), in the goal's book (and, for a goal of one chapter, only that chapter's lessons; with no goal, none): 'Learn next: Read 1 John 1:1-4 · Reading the letters of John' (the lesson's own title after the dot when it is not just the range, 'Read Romans 8:31-39 · Reading Paul: an argument'; `LearnNext.passage`). An idea of that lesson still not yet and needed by the goal comes first, so Learn next names that idea. Unlike an idea, a passage is still offered beside 'Learning now'. A tap opens the Verse view on the passage's range (`openVerseRange`, 'Passage lessons: Check' below). The passage lessons he has passed are the Dexie `passageLessons` table (v23, below), read live by `useGoalProgress`.
- **Next words** (`nextWords`): the three most frequent needed words he has no state for (not on his list and not dropped), in dictionary form with their meaning; a tap is Add to my words (`addLemmaToLearn`: the word becomes learning, so it is frontier and the bar moves).
- **Read it** opens the Reader on the goal: its chapter and verse, or chapter 1 for a whole book.

A word's state is looked up by its headword and by every lexicon lemma it goes by (`wordStatesOf`), the best state winning.

## Graded verses

mw-emk3xt.1, PROVISIONAL (`WORDS_SHARE`). A question about a verse's forms is only fair on a verse whose forms he has met. `src/data/grammar/gradedVerses.ts` (pure: no store, no screen) grades the verses of a goal as a whole; `frontier.ts` `easiestVerse` still ranks the verses of one new word.

- **`gradeVerse(verse, passes, known, {code, chapter, ideaMet})`** gives `{ref, forms {pass, total}, words {known, total}, atLevel, missing, score}`. `passes` is the form test `formLevel.ts` `pickerPasses` builds, `known` the NFC lemmas he has solid or learning. `atLevel`: every form passes and `words.known / words.total >= WORDS_SHARE` (0.5); a verse with no Greek is never at level. `score` is the share of forms that pass times the share of words he knows (0 to 1). `missing` lists the ideas (`ideasOfWord`, so the pattern ideas too, plus `ALWAYS_NEEDED`) of the forms that fail, those `ideaMet` (`ideaMetBy(levels, 'solid' | 'frontier')`) says he has left out; with no `ideaMet` it lists every idea of a failing form.
- **`gradedVerses(chapters, passes, known, ideaMet?)`** grades every verse, easiest first: the higher score, then the fewer Greek words, then the text's order.
- **`easiestWith(ideaId, graded, chapters)`** is the easiest verse at his level that has a form needing the idea, else the easiest with one at all, else null.

Review's `ending` and `tap-form` pick from the easiest third of these as `meaning`, `roles` and `parse` do (`questions.ts` `placesInOrder`), and the idea sheet's Try it on a verse asks three questions on `easiestWith`'s verse (above, 'Try it on a verse').

Tests: `tests/unit/gradedVerses.test.ts` (the fixture, and 1 John 1 with his seed, every noun idea solid and every verb idea not yet). Review's grammar draw (`kinds.ts` `gradedVersesOf`) hands the list to `buildIdeaQuestion`, which uses it for the `meaning`, `roles` and `parse` questions (above; tests/unit/parse-roles.test.ts, features/grammar-drills.feature).

## One idea at a time

mw-i7xe0n.6, PROVISIONAL (the switch prompt, the one-time fix keeping the latest and the auto-advance are the Governor's to confirm). Only one idea is at the frontier at a time: the one he is learning now. The letters, vowel pairs, consonant pairs and breathings are items of a group (`groupOfItem`, `isItemId`), not ideas he learns one by one, so they are never counted and may be frontier together. The rule is in `repositories/grammarLevels.ts` and every path that writes a level keeps to it:

- **The idea sheet** (`teachIdea(id, 'got-it', now, how, choice)`): with another idea at the frontier it writes nothing and returns `{ status: 'busy', other }`; the sheet asks 'You are learning <other>. Switch to <this>?' (Switch | Keep <other>). When this idea also builds on one that is not solid, 'Go to <that> first?' (Go there | Stay here) is asked first, and the switch question only after Stay here (pinned in `features/one-frontier.feature`, mw-i7xe0n.21). `choice` 'switch' puts the other back to not yet (its row is kept as a row, its schedule row and its drill runs are untouched, so it comes back quickly) and teaches this one; 'keep' changes nothing (`{ status: 'kept' }`). A failed run of Drill it in prove mode is 'keep': the idea is not made a second frontier.
- **Review** (`recordGrammarAnswer`) and the tutor's move of a rusty idea back to Frontier (`setLevel(..., 'tutor')`, refused: `false`) never make a second idea the frontier: the answer goes on the schedule, the level stays where it was (a not-yet idea stays not yet, a solid one stays solid).
- **The placement** (`setLevel(..., 'placement')`) and **what his right answers show** (the inference falling back from solid) leave the lowest unproved idea on the ladder at the frontier (`lowestFrontier`): the lowest of the idea written and the one there is the frontier, every other idea above it is put back to not yet, ideas he proved stay solid. A not-yet idea the placement writes is the frontier when it is the lowest unproved one.
- **Proving the frontier moves it on** (`advanceFrontier`): when the idea at the frontier becomes solid (a proof by Drill it, Mark known, a review reaching step 3, the inference, the alphabet's letters), the lowest idea on the ladder that is not yet (no row is not yet) and whose prerequisites (`needs`) are all solid becomes the frontier, how 'next', on the schedule at step 0. The placement does not move it on in the middle of a walk. The ladder's order is used, not the approach's, because the prerequisites keep it safe. A prerequisite that is an item of a group (a letter, a vowel pair) counts as solid once the group idea is solid by his say (`drillIt.ts` `unmetNeed`, mw-i7xe0n.19), so marking 'The Greek alphabet' known with its letters untested still moves the frontier on and the next idea's sheet does not say 'This builds on Alpha'.
- **The upgrade** (Dexie v21): where more than one idea was at the frontier, the one changed most recently (`since`) stays and the others are not yet, their rows kept. Tests: `tests/unit/one-frontier.test.ts`, `features/one-frontier.feature`.

## One choice to know

Number (`number-singular` and `number-plural`) sit in the `nouns` tier, straight after `noun` and before the cases (mw-86e9r1.2):
every question that names a form says 'genitive singular', so the singular and the plural come before the first case. So do the two
joining words met in every verse, `conjunction` (καί, δέ) and `negative` (οὐ): they sit in the `nouns` tier too, because a tier
is a part of the ladder and the ladder's rungs run in one order, and they rest on `noun` alone. Person (`person-1st` ...
`person-3rd`) stays at the start of the `pronouns` tier: I, you, he, we, you, they are where a learner first meets it.

An idea needs what its text names (mw-86e9r1.2): the article and the adjective rest on the cases, the plural and the genders;
the imperfect and the aorist on the indicative (the `mood-indicative` idea sits before the imperfect, straight after the
present and the active). A text that would name something taught after it is worded without it (the vowel pairs do not speak of
the stress mark, the iota under a letter does not speak of the dative; the marks say when two vowels are not a pair), and
a word that two ideas explain each other (the noun and its case) is the one place a text may look ahead.
`tests/unit/ladder-needs.test.ts` walks every idea's text for the grammar words it uses (case, number, gender, the moods and
tenses, the stress mark, the diaeresis, the parts of speech) and fails on one its needs do not reach.

## The ladder

<!-- ladder:begin — written by `npm run ladder:docs` from src/data/grammar/ladder.ts; edit the ladder, not this table -->
| Rung | Tier | Id | Title | Terms | Rests on |
| --- | --- | --- | --- | --- | --- |
| 1 | letters | `alphabet` | The Greek alphabet | – | – |
| 2 | letters | `letter-alpha` | Alpha | – | `alphabet` |
| 3 | letters | `letter-beta` | Beta | – | `alphabet` |
| 4 | letters | `letter-gamma` | Gamma | – | `alphabet` |
| 5 | letters | `letter-delta` | Delta | – | `alphabet` |
| 6 | letters | `letter-epsilon` | Epsilon | – | `alphabet` |
| 7 | letters | `letter-zeta` | Zeta | – | `alphabet` |
| 8 | letters | `letter-eta` | Eta | – | `alphabet` |
| 9 | letters | `letter-theta` | Theta | – | `alphabet` |
| 10 | letters | `letter-iota` | Iota | – | `alphabet` |
| 11 | letters | `letter-kappa` | Kappa | – | `alphabet` |
| 12 | letters | `letter-lambda` | Lambda | – | `alphabet` |
| 13 | letters | `letter-mu` | Mu | – | `alphabet` |
| 14 | letters | `letter-nu` | Nu | – | `alphabet` |
| 15 | letters | `letter-xi` | Xi | – | `alphabet` |
| 16 | letters | `letter-omicron` | Omicron | – | `alphabet` |
| 17 | letters | `letter-pi` | Pi | – | `alphabet` |
| 18 | letters | `letter-rho` | Rho | – | `alphabet` |
| 19 | letters | `letter-sigma` | Sigma | – | `alphabet` |
| 20 | letters | `letter-tau` | Tau | – | `alphabet` |
| 21 | letters | `letter-upsilon` | Upsilon | – | `alphabet` |
| 22 | letters | `letter-phi` | Phi | – | `alphabet` |
| 23 | letters | `letter-chi` | Chi | – | `alphabet` |
| 24 | letters | `letter-psi` | Psi | – | `alphabet` |
| 25 | letters | `letter-omega` | Omega | – | `alphabet` |
| 26 | sounds | `diphthongs` | Pairs of vowels | – | `letter-alpha`, `letter-epsilon`, `letter-eta`, `letter-iota`, `letter-omicron`, `letter-upsilon` |
| 27 | sounds | `diphthong-ai` | The vowel pair αι | – | `diphthongs` |
| 28 | sounds | `diphthong-ei` | The vowel pair ει | – | `diphthongs` |
| 29 | sounds | `diphthong-oi` | The vowel pair οι | – | `diphthongs` |
| 30 | sounds | `diphthong-ui` | The vowel pair υι | – | `diphthongs` |
| 31 | sounds | `diphthong-ou` | The vowel pair ου | – | `diphthongs` |
| 32 | sounds | `diphthong-au` | The vowel pair αυ | – | `diphthongs` |
| 33 | sounds | `diphthong-eu` | The vowel pair ευ | – | `diphthongs` |
| 34 | sounds | `diphthong-eeu` | The vowel pair ηυ | – | `diphthongs` |
| 35 | sounds | `consonant-pairs` | Pairs of consonants | – | `letter-mu`, `letter-nu`, `letter-pi`, `letter-tau`, `letter-gamma`, `letter-kappa`, `letter-chi`, `letter-xi` |
| 36 | sounds | `pair-mp` | The consonant pair μπ | – | `consonant-pairs` |
| 37 | sounds | `pair-nt` | The consonant pair ντ | – | `consonant-pairs` |
| 38 | sounds | `pair-gk` | The consonant pair γκ | – | `consonant-pairs` |
| 39 | sounds | `pair-gg` | The consonant pair γγ | – | `consonant-pairs` |
| 40 | sounds | `pair-gch` | The consonant pair γχ | – | `consonant-pairs` |
| 41 | sounds | `pair-gks` | The consonant pair γξ | – | `consonant-pairs` |
| 42 | sounds | `syllables` | Syllables | – | `diphthongs`, `consonant-pairs` |
| 43 | marks | `breathings` | Breathing marks | – | `syllables` |
| 44 | marks | `breathing-rough` | The rough breathing | – | `breathings` |
| 45 | marks | `breathing-smooth` | The smooth breathing | – | `breathings` |
| 46 | marks | `accents` | Accents and stress | – | `syllables` |
| 47 | marks | `iota-subscript` | The iota under a letter | – | `letter-iota`, `letter-alpha`, `letter-eta`, `letter-omega`, `breathings`, `accents` |
| 48 | marks | `words-sound-alike` | Words that sound alike | – | `diphthongs`, `iota-subscript` |
| 49 | marks | `punctuation` | Punctuation and small marks | – | `breathings`, `accents` |
| 50 | marks | `movable-letters` | Movable letters | – | `breathings`, `punctuation` |
| 51 | marks | `marks-change-word` | Marks that change the word | – | `breathings`, `accents` |
| 52 | marks | `enclitics` | Enclitics | – | `breathings`, `accents`, `marks-change-word` |
| 53 | nouns | `noun` | The noun | noun | `breathings`, `accents`, `iota-subscript` |
| 54 | nouns | `number-singular` | The singular | singular | `noun` |
| 55 | nouns | `number-plural` | The plural | plural | `number-singular` |
| 56 | nouns | `conjunction` | The conjunction | conjunction | `noun` |
| 57 | nouns | `negative` | The negative | negative | `conjunction` |
| 58 | nouns | `case-nominative` | The nominative case | nominative | `noun`, `number-plural` |
| 59 | nouns | `stem-and-ending` | A word is a stem and an ending | – | `noun`, `case-nominative` |
| 60 | nouns | `case-accusative` | The accusative case | accusative | `case-nominative` |
| 61 | nouns | `case-genitive` | The genitive case | genitive | `case-nominative` |
| 62 | nouns | `case-dative` | The dative case | dative | `case-genitive` |
| 63 | nouns | `case-vocative` | The vocative case | vocative | `case-nominative` |
| 64 | nouns | `gender-masculine` | The masculine gender | masculine | `noun` |
| 65 | nouns | `gender-feminine` | The feminine gender | feminine | `gender-masculine` |
| 66 | nouns | `gender-neuter` | The neuter gender | neuter | `gender-masculine`, `gender-feminine`, `case-accusative` |
| 67 | nouns | `declension-1` | The first declension | – | `stem-and-ending`, `case-nominative`, `case-genitive`, `case-dative`, `case-accusative`, `gender-masculine`, `gender-feminine`, `gender-neuter` |
| 68 | nouns | `declension-2` | The second declension | – | `stem-and-ending`, `case-nominative`, `case-genitive`, `case-dative`, `case-accusative`, `gender-masculine`, `gender-feminine`, `gender-neuter` |
| 69 | nouns | `article` | The article | article | `noun`, `case-nominative`, `case-genitive`, `case-dative`, `case-accusative`, `number-plural`, `gender-masculine`, `gender-feminine`, `gender-neuter` |
| 70 | nouns | `adjective` | The adjective | adjective | `noun`, `case-nominative`, `case-genitive`, `case-dative`, `case-accusative`, `number-plural`, `gender-masculine`, `gender-feminine`, `gender-neuter` |
| 71 | nouns | `dictionary-entry` | A dictionary entry | – | `stem-and-ending`, `case-genitive`, `gender-masculine`, `gender-feminine`, `gender-neuter`, `article`, `adjective` |
| 72 | nouns | `declension-3` | The third declension | – | `dictionary-entry`, `declension-1`, `declension-2` |
| 73 | nouns | `comparative` | The comparative | comparative | `adjective` |
| 74 | nouns | `superlative` | The superlative | superlative | `comparative` |
| 75 | nouns | `numeral` | Number words | numeral | `adjective` |
| 76 | nouns | `proper-name` | Proper names | proper name | `noun`, `article` |
| 77 | nouns | `indeclinable` | Words that never change | indeclinable, letter | `proper-name`, `case-genitive` |
| 78 | pronouns | `person-1st` | The first person | 1st person | `noun` |
| 79 | pronouns | `person-2nd` | The second person | 2nd person | `person-1st` |
| 80 | pronouns | `person-3rd` | The third person | 3rd person | `person-2nd` |
| 81 | pronouns | `pronoun` | The pronoun | – | `noun`, `person-3rd`, `number-plural`, `case-nominative`, `case-genitive`, `case-dative`, `case-accusative`, `gender-masculine`, `gender-feminine`, `gender-neuter` |
| 82 | pronouns | `pronoun-personal` | The personal pronoun | personal pronoun | `pronoun`, `case-nominative`, `case-genitive`, `case-dative`, `case-accusative` |
| 83 | pronouns | `pronoun-demonstrative` | The demonstrative pronoun | demonstrative pronoun | `pronoun-personal`, `article`, `gender-masculine`, `gender-feminine`, `gender-neuter` |
| 84 | pronouns | `pronoun-relative` | The relative pronoun | relative pronoun | `pronoun-demonstrative` |
| 85 | pronouns | `pronoun-interrogative` | The interrogative pronoun | interrogative pronoun | `pronoun-relative`, `marks-change-word` |
| 86 | pronouns | `pronoun-indefinite` | The indefinite pronoun | indefinite pronoun | `pronoun-interrogative`, `enclitics` |
| 87 | pronouns | `pronoun-reflexive` | The reflexive pronoun | reflexive pronoun | `pronoun-personal` |
| 88 | pronouns | `pronoun-possessive` | The possessive pronoun | possessive pronoun, possessor | `pronoun-reflexive`, `adjective` |
| 89 | pronouns | `pronoun-reciprocal` | The reciprocal pronoun | reciprocal pronoun | `pronoun-reflexive` |
| 90 | pronouns | `pronoun-correlative` | The correlative pronoun | correlative pronoun | `pronoun-relative`, `pronoun-demonstrative` |
| 91 | pronouns | `pronoun-correlative-interrogative` | The correlative or interrogative pronoun | correlative or interrogative pronoun | `pronoun-correlative`, `pronoun-interrogative` |
| 92 | prepositions | `preposition` | The preposition | preposition | `case-genitive`, `case-dative`, `case-accusative` |
| 93 | prepositions | `preposition-eis` | The preposition εἰς | – | `preposition`, `case-accusative` |
| 94 | prepositions | `preposition-en` | The preposition ἐν | – | `preposition`, `case-dative` |
| 95 | prepositions | `preposition-ek` | The preposition ἐκ | – | `preposition`, `movable-letters`, `case-genitive` |
| 96 | prepositions | `preposition-apo` | The preposition ἀπό | – | `preposition`, `movable-letters`, `case-genitive` |
| 97 | prepositions | `preposition-pros` | The preposition πρός | – | `preposition`, `case-accusative`, `case-dative` |
| 98 | prepositions | `preposition-dia` | The preposition διά | – | `preposition`, `movable-letters`, `case-genitive`, `case-accusative` |
| 99 | prepositions | `preposition-kata` | The preposition κατά | – | `preposition`, `movable-letters`, `case-genitive`, `case-accusative` |
| 100 | prepositions | `preposition-meta` | The preposition μετά | – | `preposition`, `movable-letters`, `case-genitive`, `case-accusative` |
| 101 | prepositions | `preposition-peri` | The preposition περί | – | `preposition`, `case-genitive`, `case-accusative` |
| 102 | prepositions | `preposition-hypo` | The preposition ὑπό | – | `preposition`, `movable-letters`, `case-genitive`, `case-accusative` |
| 103 | prepositions | `preposition-para` | The preposition παρά | – | `preposition`, `movable-letters`, `case-genitive`, `case-dative`, `case-accusative` |
| 104 | prepositions | `preposition-epi` | The preposition ἐπί | – | `preposition`, `movable-letters`, `case-genitive`, `case-dative`, `case-accusative` |
| 105 | verbs | `verb` | The verb | verb | `person-1st`, `person-2nd`, `person-3rd`, `number-singular`, `number-plural` |
| 106 | verbs | `eimi` | The verb εἰμί | – | `verb` |
| 107 | verbs | `compound-verbs` | Compound verbs | – | `verb`, `preposition`, `preposition-eis`, `preposition-en`, `preposition-ek`, `preposition-apo`, `preposition-pros`, `preposition-dia`, `preposition-kata`, `preposition-meta`, `preposition-peri`, `preposition-hypo`, `preposition-para`, `preposition-epi` |
| 108 | verbs | `tense-present` | The present tense | present | `verb` |
| 109 | verbs | `voice-active` | The active voice | active | `verb` |
| 110 | verbs | `mood-indicative` | The indicative mood | indicative | `tense-present`, `voice-active` |
| 111 | verbs | `contract-verbs` | Contract verbs | – | `stem-and-ending`, `mood-indicative` |
| 112 | verbs | `tense-imperfect` | The imperfect tense | imperfect | `mood-indicative` |
| 113 | verbs | `tense-future` | The future tense | future | `tense-present` |
| 114 | verbs | `tense-aorist` | The aorist tense | aorist | `tense-imperfect` |
| 115 | verbs | `augment` | The augment | – | `tense-aorist`, `stem-and-ending` |
| 116 | verbs | `tense-perfect` | The perfect tense | perfect | `tense-aorist` |
| 117 | verbs | `reduplication` | Reduplication | – | `tense-perfect`, `stem-and-ending` |
| 118 | verbs | `oida` | The verb οἶδα | – | `tense-perfect` |
| 119 | verbs | `tense-pluperfect` | The pluperfect tense | pluperfect | `tense-perfect` |
| 120 | verbs | `second-tenses` | Second aorists and perfects | second | `tense-aorist`, `tense-perfect` |
| 121 | verbs | `mi-verbs` | Verbs in -μι | – | `stem-and-ending`, `contract-verbs`, `second-tenses` |
| 122 | verbs | `voice-middle` | The middle voice | middle | `voice-active` |
| 123 | verbs | `voice-passive` | The passive voice | passive | `voice-active`, `tense-present`, `tense-aorist`, `case-genitive` |
| 124 | verbs | `tense-signs` | Tense signs | – | `tense-future`, `tense-aorist`, `tense-perfect`, `voice-passive`, `stem-and-ending` |
| 125 | verbs | `principal-parts` | Principal parts | – | `augment`, `tense-signs`, `reduplication` |
| 126 | verbs | `voice-middle-or-passive` | The middle or passive voice | middle or passive | `voice-middle`, `voice-passive` |
| 127 | verbs | `voice-middle-deponent` | The middle deponent | middle deponent | `voice-middle-or-passive` |
| 128 | verbs | `voice-passive-deponent` | The passive deponent | passive deponent | `voice-middle-deponent`, `tense-aorist` |
| 129 | verbs | `voice-middle-or-passive-deponent` | The middle or passive deponent | middle or passive deponent | `voice-passive-deponent` |
| 130 | verbs | `voice-middle-significance` | A middle meaning in an active form | middle significance | `voice-middle` |
| 131 | verbs | `voice-impersonal-active` | The impersonal active | impersonal active | `voice-active` |
| 132 | verbs | `voice-none` | A verb with no voice | no voice | `voice-active` |
| 133 | verbs | `mood-imperative` | The imperative mood | imperative | `mood-indicative`, `tense-aorist` |
| 134 | verbs | `mood-subjunctive` | The subjunctive mood | subjunctive | `mood-indicative` |
| 135 | verbs | `mood-optative` | The optative mood | optative | `mood-subjunctive` |
| 136 | verbs | `mood-infinitive` | The infinitive | infinitive | `mood-indicative`, `article` |
| 137 | verbs | `mood-participle` | The participle | participle | `mood-infinitive`, `case-nominative`, `case-genitive`, `case-dative`, `case-accusative`, `gender-masculine`, `gender-feminine`, `gender-neuter`, `adjective` |
| 138 | verbs | `mood-participle-imperative` | The participle with the sense of a command | imperative-sense participle | `mood-participle`, `mood-imperative` |
| 139 | joiners | `particle` | The particle | particle | `conjunction` |
| 140 | joiners | `adverb` | The adverb | adverb | `adjective`, `verb` |
| 141 | joiners | `interrogative` | Words that ask a question | interrogative | `particle` |
| 142 | joiners | `conditional` | The conditional | conditional | `conjunction`, `mood-indicative`, `mood-subjunctive` |
| 143 | joiners | `interjection` | The interjection | interjection | `particle` |
| 144 | joiners | `attic-form` | Attic spellings | Attic form | `verb` |
| 145 | joiners | `poetic` | Poetic forms | poetic | `attic-form` |
| 146 | joiners | `crasis` | Two words run together | crasis | `conjunction`, `punctuation` |
| 147 | joiners | `aramaic` | Aramaic words | Aramaic word | `indeclinable` |
| 148 | joiners | `hebrew` | Hebrew words | Hebrew word | `indeclinable` |
| 149 | sentences | `agreement` | Words that agree | – | `article`, `adjective`, `case-nominative`, `case-genitive`, `case-dative`, `case-accusative`, `number-plural`, `gender-masculine`, `gender-feminine`, `gender-neuter` |
| 150 | sentences | `article-substantival` | The article standing alone | – | `article`, `adjective`, `preposition`, `adverb`, `mood-participle` |
| 151 | sentences | `article-position` | Where the adjective stands | – | `article`, `adjective`, `agreement` |
| 152 | sentences | `postpositive` | Words that come second | – | `conjunction`, `particle` |
| 153 | sentences | `clause-hoti` | A clause with ὅτι | – | `conjunction`, `mood-indicative` |
| 154 | sentences | `clause-hina` | A clause with ἵνα | – | `conjunction`, `mood-subjunctive` |
| 155 | sentences | `participle-adverbial` | A participle beside a verb | – | `mood-participle`, `case-nominative` |
| 156 | sentences | `genitive-absolute` | The genitive absolute | – | `mood-participle`, `case-genitive` |
| 157 | sentences | `periphrastic` | Being plus a participle | – | `eimi`, `mood-participle` |
| 158 | sentences | `infinitive-articular` | The infinitive with the article | – | `mood-infinitive`, `article`, `preposition` |
| 159 | sentences | `infinitive-complement` | An infinitive that finishes a verb | – | `mood-infinitive`, `verb` |
| 160 | sentences | `subjunctive-hortatory` | Let us: urging with the subjunctive | – | `mood-subjunctive`, `person-1st`, `number-plural` |
| 161 | sentences | `prohibition` | Do not: the two ways to forbid | – | `mood-imperative`, `mood-subjunctive`, `negative`, `tense-aorist`, `particle` |
| 162 | sentences | `ou-me` | οὐ μή: a strong no | – | `negative`, `mood-subjunctive`, `tense-future`, `particle` |
| 163 | sentences | `condition` | If: the three conditions | – | `conditional`, `mood-indicative`, `mood-subjunctive` |
<!-- ladder:end -->

## Approaches

**PROVISIONAL**, the Governor to confirm (mw-foy5mb.1): Lampas has ONE path, the ladder, for every learner. The approaches stay data
so that another path can be added later by one file and one line; `APPROACHES` is `[ladder]` and `DEFAULT_APPROACH` is `'ladder'`.
A phone that saved the old choice, `'bma-tutor'`, reads as the ladder (the saved value is no longer listed, so `getGrammarApproach` gives
the default): no row is deleted or rewritten, and every idea's level and schedule row stays as it was.

An approach is the ORDER the ladder's ideas are taught, tested and suggested in, and how that order teaches. It is data, one file
each in `src/approaches/` (as `src/resources/` are), listed in `index.ts`. The choice is the `grammarApproach` setting (Settings >
Grammar approach, which draws its radio choice only while two or more approaches are listed; the tutor can change it; `getGrammarApproach` / `setGrammarApproach`; `approach-changed` on the bus, docs/events.md).
Choosing one changes no level: levels belong to the ideas, not to the approach.

- `GrammarApproach` (`types.ts`): `{ id, name, credit, method, stages }`. `credit` is `{ name, url, line }` or `null`; `method` is
  our own words, under 120; `stages` hold levels, levels hold lessons, and a lesson is `{ title, ideas }`, its title in our own words
  and `ideas` the ladder ids it teaches.
- `APPROACHES`, `DEFAULT_APPROACH`, `approachOf(id)`.
- `orderOf(approach)`: every idea id once, in lesson order (an idea a later lesson names again is a revisit and keeps its first place);
  the ideas no lesson names follow, by rung. This is the sequence the placement, 'Learn next' and the Goal screen follow.
- A lesson may name a `passage` (`{ book, chapter, from, to }`, `book` a code of `src/data/books.ts`, `to` may be the chapter's last verse): a lesson whose ideas are all taught earlier would never be Learn next by ideas alone, so the passage is a step of its own. `stepsOf(approach)` lists the steps in order: `{ kind: 'idea', id }` for every idea exactly as `orderOf` gives them, and `{ kind: 'passage', key, lesson, passage }` right after the ideas of the lesson that names it. `passageKey(passage)` is `'passage:1jn.1.1-4'`, `parsePassageKey` reads it back, `passageLabel` says '1 John 1:1-4'.
- `lessonOf(approach, ideaId)`: `{ stage, level, lesson }` of the first lesson to name the idea, or `undefined`.
- `nextLessonOf(approach, levelOf)`: the lesson holding the earliest idea in `orderOf` that has no level or is not yet.
- Settings marks 'Next' the lesson the Goal's Learn next opens (mw-86e9r1.24): `goalProgress.ts nextLesson(needs, approach, levels)`
  is `learnNext`'s lesson for the goal's needs (none marked when Learn next names none), and `nextLessonOf` with no goal or when
  the goal's chapters cannot be fetched. The tutor's `learner_grammar` names the same lesson as `next_lesson`.
- Settings > Grammar approach lists what a lesson holds (mw-86e9r1.35, .40, .42): a lesson of one idea whose title is the idea's is a button that opens that idea's
  sheet (`IdeaSheetWithWord`, `src/IdeaSheetWithWord.tsx`, with the word sheet its examples open over it); a lesson of several ideas (BMA Tutor's 'Small words that
  take a case', if a second path is listed) shows each idea's title under it as such a button (`data-idea-title`). A passage lesson keeps its range for a title.

An approach's order is bound by the ladder's `needs` (mw-86e9r1.2): in `orderOf` of every approach no idea comes before an idea
it rests on (`tests/unit/ladder-needs.test.ts`). BMA Tutor still teaches the aorist before the genitive, because the aorist does not
rest on a case; it teaches the article after the cases and the genders, because the article does. The first lessons name number
and the joining words straight after the noun.

### Passage lessons and where they are kept (mw-z370x5.1)

`src/approaches/john-lessons.ts` holds the twelve lessons that read the letters of John, one passage each ('1 John 1:1-4' to '5:13-21', and '2 John and 3 John', which reads 2 John 1:1-13 because a lesson names one passage). The Lampas ladder ends with them, as its stage 'Reading' (level 'Reading the letters of John'), so Settings > Grammar approach lists '1 John 1:1-4' with Next, when it is the step Learn next opens, and Passed once its row says so; the record of BMA Tutor's order takes the same twelve as its level 6. Their ideas are revisits (taught earlier), so `orderOf` is unchanged. The record also gives the other reading lessons passages that are Lampas's own picks, not the course's: 'Being plus a participle' reads John 3:24-28 (three periphrastics by `usesOf`), the three 'Reading Paul' lessons Romans 1:1-7, 8:31-39 and 12:1-2, stage 2 John 1:1-18 and 3:1-21, stage 3 Romans 8 and 1 Corinthians 13.

The Dexie `passageLessons` table (v23, `key, state`; `PassageLessonRow` `{ key, state: 'read' | 'passed', when, score }`) is `src/data/repositories/passageLessons.ts`: `listPassageLessons`, `markRead` (a passed row stays passed) and `markPassed(key, score)`; each publishes `passage-lesson-changed` (docs/events.md). Only a Check writes it (below); opening the view marks nothing. The tutor's `learner_grammar` `approach.next_lesson` says 'Read 1 John 1:1-4' when the next step is a passage.

### Passage lessons: the Lesson strip and Check (mw-z370x5.2, PROVISIONAL)

A lesson's range opens in the Verse view (docs/verse-view.md 'A lesson's range'): `#/?b=1jn&c=1&p=1&pt=4` (`p` the first verse, `pt` the last; `nav/route.ts` `openVerseRange`, which Learn next and a due lesson in Review use; a link `#/?ref=1John.1.1-4` opens it too). Under the heading a **Lesson strip** (`src/LessonStrip.tsx`) names the lesson (its title), its ideas as chips (a tap opens the idea sheet) and 'Read it, then Check'. The strip shows on a range that is exactly a lesson of the chosen approach (`lessonForRange`), whether the address says `pt` or a section heading starts it. The verses are woven by his dials as ever and the row of actions is unchanged.

**Check** (`src/CheckSheet.tsx`, the sheet 'Check: 1 John 1:1-4') passes the lesson by reading it, with Lampas's own questions and no token. `buildCheck` (`src/data/grammar/passageCheck.ts`): for each verse of the range, the easiest first (`gradedVerses`), one *What does this say?* (`buildMeaning`) and one parsing of a word (`buildParse`; for a verse not at his level `buildRoles` first, then a parsing), up to `CHECK_QUESTIONS` (8, PROVISIONAL) in all. The lesson's ideas are tried first (one the Check has asked less often before one it has asked more), then the ideas the verse's own forms need; each question is on one idea. The verse is built as if it were at his level: a Check reads the lesson's passage, not the verses under his frontier. Each answer is a grammar answer on its idea (`recordGrammarAnswer`) credited to what it shows of the letters (`noteAnswer`), as Try it records one; the questions are drawn once, when the sheet opens (`drillSeed`, `review/lessonCheck.ts`).

The end card: at `PASS_SHARE` (0.75, PROVISIONAL) or more it says 'Passed: 7 of 8', writes `markPassed(key, 7/8)` (so Learn next moves on) and records the lesson's review row right, if it has one (`lessonCheckPassed`). Under it, 'Read: 4 of 8' names the ideas he missed ('Weak: the perfect tense, the aorist tense'), writes `markRead` (a passed lesson stays passed), and offers two buttons: **Try again tomorrow** (`tryAgainTomorrow`: the schedule row of kind `lesson`, id the key, due in a day; a row already there keeps its step and lapses and is due a day from now) and **Quiz me** (needs a licence: the Verse view's Quiz me on the range, which costs a grind). Stop leaves with the answers kept and the lesson unmarked.

**In Review** a lesson is the kind `lesson` (`review/kinds.ts` `LESSON`): it is counted ('Due today: 1 lesson') and never an item of a round (`round.ts` leaves it out, `draw` gives none). The start screen draws a button for each due lesson, 'Read 1 John 1:1-4, then Check', which opens the Verse view on the range; the next Check that passes records its row right, so it comes back later. A due lesson is not among the 'still due' of a round's end card.

### BMA Tutor (not listed)

`src/approaches/bma-tutor.ts` is no longer in `APPROACHES` and no app code imports it (`tests/unit/one-path.test.ts` greps `src/`); it stays as the
record of BMA Tutor's order, read by the gap audit (docs/path-gaps.md), and the tests' `tests/support/fixture-path.ts` copies it as a second,
unlisted path whose order is not the ladder's. Biblical Mastery Academy is thanked in About (`ATTRIBUTION.md`) for the inspiration. It followed the sequence of Biblical Mastery Academy's Greek course. Stage 1 has six
levels of twelve lessons; stages 2 and 3 are one level 'Reading' of two lessons each, each reading a passage of ours. Only the sequence is followed: every
lesson title and the method are written here, and no course text, picture or exercise is copied (a test keeps the course's own
phrases out of `bma-tutor.ts`). Mapping, where the RP codes cannot tell a lesson apart:

- third-declension forms: `declension-3` beside a revisit of the noun and its cases (`noun`, `case-genitive`, `case-dative`);
- athematic verbs: `mi-verbs` beside a revisit of `tense-present` and `second-tenses`;
- root variations: `attic-form`, the ladder's nearest idea for a verb spelt another way;
- assimilation (letters changing at a joint): `crasis`, the nearest idea for sounds that run together;
- the periphrastic, clauses and 'reading Paul' lessons, and level 6 (1, 2 and 3 John), name the ideas that passage uses again, and level 5's clause lessons also name the sentence ideas ('Sentences' above): 'Linking one clause to the next' is not a lesson of its own (a level keeps twelve), so `clause-hoti` sits in 'Long sentences'.

### Adding an approach (a second path)

1. One file in `src/approaches/` exporting a `GrammarApproach` (a credit when the order is someone's, with their name and address).
2. One line in `src/approaches/index.ts` (`APPROACHES`).
3. `npm run grind:build`, so the tutor may be asked for it. `tests/unit/approaches.test.ts` checks that `orderOf` lists every idea once.
   With two approaches listed Settings > Grammar approach draws the choice again (`tests/unit/approach-control.test.tsx` holds that door open with a stub).

### Drill it, the runs kept

`src/data/repositories/drillRuns.ts` (mw-i7xe0n.2): a finished run is one row of the Dexie `drillRuns` table (v19: `++id, ideaId, at`; the `DrillResult` fields and `at`).
`saveDrillRun(result, at)` adds one (every run stays), `latestDrillRunFor(ideaId)` gives the newest (the one saved last on a tie) and `weakFacets()` gives, for each idea whose
latest run did not prove it and left weak facets, `{at, labels}`. The idea sheet's Drill it saves every run it ends (`recordDrill`, below).

The tutor is told them in `learner_grammar.weak` (src/data/grammar/learnerGrammar.ts): the idea's title to the labels of its weak facets (`its ending`, `ν (Nu)`),
the ideas drilled last first-dropped (at most `GRAMMAR_WEAK_IDEAS_MAX` 5 ideas, `GRAMMAR_WEAK_LABELS_MAX` 3 labels, `GRAMMAR_WEAK_LABEL_CHARS` 32 characters; the key is missing when
there are none). A later run that proves the idea (or finds no weak facet) takes the idea out. Over the 900-byte cap the oldest ideas of `weak` go first, down to
`GRAMMAR_WEAK_BYTES` (300), then the idea titles as before, then the rest of `weak`. The grinds' input schemas and instructions name it ("his weak points from Drill it").

### Drill it on the idea sheet

`src/DrillItScreen.tsx` (mw-i7xe0n.3, PROVISIONAL): a full screen over the idea sheet (dialog 'Drill it', `useSheetBack`: Back is Stop). The idea's title, 'Step N of M', one question
at a time drawn as Review draws it (`GrammarCard`, multiple choice; sideways the question stands at the left and the answers at the right), a **Hint** (takes the first
half, rounded up, of the wrong answers away, once a question, and marks the answer hinted: a hinted right does not count, drillIt.ts; `data/grammar/hint.ts` hintTakes / hintLine: the taken options are drawn struck through and faded (`data-taken`) and the line 'Hint: 2 wrong answers taken away' stands under the question, both by `GrammarCard`, so any card given `taken` draws them the same; a right answer then reads 'Right. With a Hint it does not count toward Proved, so you stay on this step.' (`HINTED_RIGHT`, mw-5r3p30.431, mw-i7xe0n.23; on a side of a sound rule not yet answered right unhinted, the walk asks that side again); the button then reads 'Hint used', disabled; mw-5r3p30.349), **Stop** (nothing is kept, the level
stays) and, after an answer, **Next** / **Finish**. The walk is `start(...)` with the idea's needs taken as solid (the sheet asked him about them), the seed from
`drillSeed.next()` (src/data/grammar/drillSeed.ts, a seam a feature step fixes). The end shows 'Proved' or 'You reached step N of M' (step 0: 'You have not reached step 1 of M
yet'), then 'Strong:' and 'Weak:' by facet label and Done.

The sheet hands the finished result to `recordDrill(result, mode)` (repositories/grammarLevels.ts): the run is kept (`saveDrillRun`); a **proof** makes the idea solid, how `drill`
('Proved by drill', the 30-day step); a run in **prove** mode (from the slider) that did not prove it puts the idea on the frontier, how `drill` (its schedule is left alone when
it was there already), so the slider goes back to Learning; a run in **practice** mode (the Drill it button) that did not prove it changes no level. The tutor's `weak` list follows
the latest run as before.

### The letter drill

`src/LetterDrillScreen.tsx` and `src/data/grammar/letterDrill.ts` (mw-86e9r1.11, PROVISIONAL): Got it on The Greek alphabet (sliding 'Your level' to Learning, also by Switch) opens the letter drill at once, a full screen
over the idea sheet (dialog 'Letter drill', `useSheetBack`). It asks all 24 letters in both forms, 48 targets, **by ear** ('Tap to hear a letter, then tap it', `buildSound`) or **by name** ('Which letter is Beta?' /
'Which capital letter is Beta?', `buildLetter` by name), drawn as Review draws a letter (`GrammarCard`), in **rounds of 8** (`ROUND_SIZE`): the targets he missed first, then those not asked yet, and
targets already right only to fill a last short round. A round ends on its score ('7 of 8 right', '7 of 48 right so far') and **Another round** / **Done**; when every target has been answered right the drill says so and offers
only Done, which, like Stop, returns to the idea sheet. The seed is `letterDrillSeed.next()`, a seam a feature step fixes. (Hearing is a tap, not a hold: docs/pwa-best-practices.md section 12.)

Each answer goes through `noteDrillAnswer` (repositories/inference.ts, `inferFromDrill`): a right answer credits the letter (`run` + 1) and a miss counts against it, **but a sitting never takes a letter's run past
`DRILL_RUN_CAP`, one short of `INFERRED_RIGHTS`**, and writes no review and no level: Solid comes only from the schedule (`SOLID_STEP`) or from a later right answer in Review, never from one drill sitting.
features/letter-drill.feature, tests/unit/letter-drill.test.ts.

**Say it** (mw-86e9r1.12, PROVISIONAL, the Governor to confirm: his words 'accept either the letter's sound or its name'): on a phone that can hear him (`src/useCanHear.ts`: it has speech
recognition, `isListenSupported`, and the microphone is not refused for the page, `navigator.permissions`) the third question of a round (`SAY_AT`) is Say it instead of a choice
(`drawRound(…, say)`, `buildSay`, kind 'say'): the letter shown large ('Say its name or its sound'), the hold bar 'Hold and say it' (the Talk sheet's `HoldBar` over `useVoice`, English
recognition) and Skip this one. What the phone heard is checked by `src/data/grammar/sayIt.ts letterHeard`: right for the letter's **name** (its English title, 'beta', and the chosen
pronunciation's own, `Pronunciation.letterNames`, 'vita') or its **sound** (the symbols of the pronunciation's lesson, 'v', and what a recogniser writes for them, `Pronunciation.heardAs`, 'vee'),
with a little filler allowed ('it is beta') and nothing else: another letter, or the English b for β, is a miss. A right answer credits the letter like any drill answer; a miss says the right
sound (`speakSound`), shows 'Not quite', what it heard and 'Β is Beta, and sounds like v', with Tap to hear. With no recognition, or the permission denied, Say it is never drawn. A refusal found
at the bar (`permission-denied`, `no-microphone`, `not-supported`) leaves every Say it out of the rest of the drill and says so; Skip this one leaves out one. A Say it left out is neither right
nor a miss: it is not in the round's score, its letter is not counted against, and the round says '7 of 7'. features/say-it.feature, tests/unit/say-it.test.ts.

### Write it

`src/handwriting/` (mw-86e9r1.51, PROVISIONAL, the Mayor's design from the Governor's words of 2026-10-14, the Governor to confirm): writing a letter by hand **as a memory aid,
never a goal**: "writing things out can help with memory ... not as if they will ever actually hand write something". A web page sees a pen only once it touches, so
`penWatch.ts` keeps 'pen seen' on the phone at the first pointer event whose `pointerType` is 'pen', and **Settings > Handwriting > Handwriting drills** is
**Automatic** (the default: on once a pen is seen), **On** (a finger too) or **Off** (nowhere).

With it on, each letter's sheet has a **Write it** part after How it sounds (`LessonWriteIt.tsx`), which opens Write it over the sheet (`WriteItScreen.tsx`), and the
letter drill mixes in **two Write it cards a round**, after every third question, on the letter it has just asked (`letterDrill.ts withWriting`); they are not
questions of the round, its score or its targets. A card (`WriteIt.tsx`) shows the letter's name and sound, the pad (`WritingPad.tsx`: pen or finger; once a pen
has touched or hovered over the pad a touch never draws, so a resting palm is ignored), and **Clear | Check | Skip**, the same size. The letter's sound plays as
he starts writing. The first card he ever meets says why: 'Writing a letter by hand helps it stick. You never need to write Greek to read the Bible.'

A letter is learnt in three stages (`progression.ts`), **two rights at each** (a miss never takes one away): **Trace** (the letter faint under the pad, its
strokes drawn first, and 'Show the strokes' draws them again), **Copy** (the letter beside the pad) and **From memory** (only its name and sound). Check asks the
checker on the phone (`recognizer.ts`), which judges which letter it is, not neatness, size or slant (no `capHeight` is given, so a small and a capital of the
same shape both count); **Right**, or **Close** (mw-86e9r1.57: a Greek letter drawn as its Latin look-alike, with one line that says where, e.g. 'The arms of γ meet on the line, in a V, before the tail drops.'),
or **Not quite**, with the right strokes drawn and Try again, never a score. Close is never Right and keeps nothing: the checker (`recognizer.ts`, `Recognition.hint`) holds the look-alike shapes of γ (y), κ (a tall k), χ (x),
υ (u with a stem) and a dot over ι (templates.ts `LOOKALIKES`), and the writing is Close when it is nearer to one of them than to the letter; ν/v, ρ/p, ο/o and ω/w are the same shape to a hand and are not told apart, on purpose. Skip keeps nothing and costs nothing: no stage,
no level, no drill score. The progress is kept per small letter in the settings store ('handwritingProgress'); it never moves a grammar level or the inference.
The strokes drawn are the checker's own templates (their first variant), which are written in the order and direction a good hand writes the letter (from the top or
the left, an upright downwards, a bar to the right, a round letter anticlockwise; mw-86e9r1.56). The model teaches the form: each stroke has a numbered start point and
an arrowhead along it, drawn in the SVG and kept after the animation (GlyphStrokes.tsx), and a plain line under it counts the strokes and names each ('Two strokes: the
top bar first, then the stem.'; templates.ts `STROKE_NOTES`). features/handwriting-drills.feature, tests/unit/write-it.test.tsx, tests/unit/write-it-order.test.tsx.

### Your drill plan

`src/data/grammar/drillPlan.ts` (mw-i7xe0n.4, PROVISIONAL, pure; the Governor's want: 'come back with a plan for drilling tailored to that person so that they can get to yes I really know
this and can move on knowing that they really know it'). A Drill it run that did not prove its idea and left weak facets makes a **plan**: `planFrom(result, at)` gives one short drill for each
weak facet, **the easiest facet first** (the lowest step the run asked it at; the run's own order on a tie), then **Prove it**, a full Drill it of the idea. A run with no weak facet makes none. A
short drill (`facetQuestions` / `shortDrill`) is 4 to 6 questions of its facet at the run's edge step and the one below it (the nearest steps fill it when the facet has fewer), and is **done**
with one miss allowed (`facetPassed`, 0.75). No tutor is asked anything.

`src/data/repositories/drillPlans.ts` keeps a plan as one JSON value in the settings store under `drillPlan.<idea id>` (no table; outside the settings registry) and schedules it: each short
drill still to do is a review row of kind `drill-plan` (id `<idea id>|<item id>`), the first due now and each next one a day after the one before; **Prove it gets its row only when the last
short drill is done**, due a day later. `answerPlanItem(ideaId, planAt, itemId, right)`: right = done (the row leaves the schedule; the next is due no sooner than tomorrow); wrong = the item
stays and comes back tomorrow (`writeReview`, a lapse); an answer to a plan made since (`planAt`) or closed changes nothing. `recordDrill` (grammarLevels.ts) makes the plan after a run that
did not prove the idea (replacing the idea's old one) and closes it when a run proves it, so a proof from the slider, the Drill it button, the result's plan or Review's Prove it all end it
(the idea is solid, how `drill`, 'Proved by drill').

On screen: the Drill it result shows **Your drill plan** (`[data-testid=drill-plan]`: the steps in order, 'Prove it' last) and **Start the first drill** (src/PlanDrillScreen.tsx, dialog 'Short
drill': one question at a time as Drill it asks, then 'N of M right' and Done); the Goal screen lists each idea with a plan open as **Drill plan: N to go** (N = steps not done, Prove it
counts; a tap opens the idea's sheet); Review's kind `DRILL_PLAN` (src/review/kinds.ts, first in KINDS so after the exact gaps its steps come before grammar ideas and words; 'Due today: 2
drills, 3 words') draws a due step as a card (src/review/DrillPlanCard.tsx: 'Your drill plan', the idea, the facet or 'Prove it', **Start the drill** / **Start Prove it**), which answers
itself KNEW_IT when the step is passed. A step of a plan that was replaced or closed is left out of the round; Prove it is not asked while a short drill is not done.
Tests: tests/unit/drill-plan.test.ts, features/drill-it.feature (the plan scenarios).

### More items from the mill

The Governor's want (grilling mw-fnvjof.6 Q1, 2026-10-12): "Yes, in the background: after each drill round, a grist asks for more items on your weakest ideas, saved so the next round starts at once." (mw-hqd5bz.36, PROVISIONAL.)

When a **Review round** ends (`ReviewScreen`, after `recordRound`), `askForMoreItems(missed)` (`src/review/moreItems.ts`) is started and **not waited for**: the end card is drawn first and never depends on the mill. `missed` is one idea id for each grammar question he missed in the round. `weakestMissed` (`src/data/grammar/fetchedItems.ts`) takes the one to `MAX_IDEAS` (3) ideas missed most (ties: the lower rung) and leaves out a letter, sound or mark (those are drilled from items the app makes: `isFetchable`). Nothing is asked **offline**, with **no device key**, with **no licence** (`currentLicence`; the gated mill client would refuse it anyway), for a round with nothing fetchable, or while **another ask is still out** (at most one in flight; `whenIdle()` resolves when none is). A failed ask is only a `console.warn`.

The grist is the `drill-items` kind (`grinds/drill-items.json`, sonnet, medium; input and answer schemas, `grinds/drill-items.instructions.md`, examples under `grinds/examples/drill-items/`). The request (`buildDrillItemsRequest`): the ideas (`id`, `title`, `what` = the idea's text, `misses`), up to `VERSES_PER_IDEA` (2) verses of the passage he reads (the goal's chapters, or the open one: `loadPassage`) for each idea that have a word needing it, the easiest for him first (`gradedVersesOf`), `MAX_VERSES` (6) in all and the last dropped until it fits `MAX_REQUEST_BYTES`, each with its Greek, its English and the words that use the idea (`uses`: form and plain parsing), and `per_idea` (`ITEMS_PER_IDEA`, 2). The answer is `items`: each an idea id, a `kind` (`tap-form` or `meaning`, the shapes `GrammarCard` already draws), the verse's `ref`, a `prompt`, four `options` and the `right` one (and the Greek `form` of a `meaning`).

**The answer is not believed** (`checkedItems`): an item is dropped unless its idea is one asked about, its `ref` a verse that was sent, its kind one of the two, its four options different with the right one among them, and, for a `tap-form`, every option a word of that verse with the right one a word that needs the idea and no other option of the same parsing, or, for a `meaning`, its `form` words of the verse in the verse's order with one that needs the idea and its `right` English found in the verse's English. What passes becomes a `GrammarQuestion` (the same shape the built-in builders give, with the right word's `code`, the facet and `say`).

`src/data/repositories/fetchedItems.ts` keeps them as one JSON list per idea in the settings store under `fetchedItems.<idea id>` (no table; outside the settings registry), the newest `MAX_KEPT` (6), and checks each again on the way out. **Serving**: `drawReviewRound` (`src/review/round.ts`) puts the ideas with kept items (`FETCHED_IDEAS`, 2, lower rung first) after the exact gaps and before the due items, due or not, because he just missed them (a missed idea is otherwise not due until tomorrow); `GRAMMAR.draw` (`src/review/kinds.ts`) takes (`takeFetchedItems`) the oldest kept item of each idea it draws and asks it in place of a built one, so an item is served once. With nothing kept the built-in questions are drawn as before, from the phone alone: a round never waits on the mill. The Drill it screens, the placement and the letter drill do not fetch or serve these items.

Tests: tests/unit/drill-items.test.ts, features/fetched-drill-items.feature (a stubbed Postern: misses on the second declension, then the next round has a fetched item).
