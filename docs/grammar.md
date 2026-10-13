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

- `tier` is one of `letters`, `sounds`, `marks`, `nouns`, `pronouns`, `prepositions`, `verbs`, `joiners`, in that order.
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
  below, that preposition's own idea (`preposition-dia` for διά), which a parsing code cannot name. `passageNeeds` and the idea sheet's
  examples use it, so a passage with διά needs `preposition-dia`; the Weave's grammar dial (`formPasses`) still reads the code alone.

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
    passage with no subjunctive lists no subjunctive); `count` is the number of words that need the idea, `example` the first;
  - `tokens`: the words of the passage, repeats counted.
  A `ref` is 'book.chapter.verse', as in the answers table ('1jn.1.1').
- `progressToward(needs, wordStates, levels)`: `{ words, grammar }`, each `{ solid, frontier, notYet, total }`. A solid word is
  solid, a learning word is frontier, a dropped or unlisted word is not yet; an idea with no level is not yet. `Level`
  (`'solid' | 'frontier' | 'notYet'`) is exported from `needs.ts` until the levels story moves it to its repository.

## Questions that drill an idea

`src/data/grammar/questions.ts` (pure, seeded like `quiz.ts`) turns an idea and a passage into one `GrammarQuestion`; `buildIdeaQuestion(idea, passage, random)` always gives one. The passage is the goal's chapters, or the chapter the Reader has open when there is no goal (a whole-book goal reads at most six of its chapters). The kinds, and which ideas get them:

| kind | what it asks | ideas |
|---|---|---|
| `ending` | the form with its ending blanked (`ἀρχ_`), four endings; the wrong three are the endings of other inflected words of the same part of speech in the passage (the common endings when it has too few). The stem is what the lemma and the form share, a stem vowel goes to the ending; a movable ν (-σιν, a verb's -εν) is shown in brackets and is one ending with or without it, `ουσι(ν)` | any word idea whose forms share a stem with their lemma |
| `tap-form` | the Greek words of one verse as buttons: 'Tap the dative article'. The prompt names the fewest terms that leave exactly one word of the verse, and the word's text is not repeated in the verse | any word idea the passage has a form of |
| `letter` | four glyphs: by name or by sound (a letter that sounds like the right one is never offered), vowel pairs, consonant pairs, the iota under a letter, the marks, and for `movable-letters` the form that fits a New Testament phrase (οὐ, οὐκ or οὐχ; ἐκ or ἐξ; ἀπ᾿ or ἀφ᾿; a word that takes a movable ν), and for `marks-change-word` and `enclitics` the word that fits a New Testament phrase, with its twin (the same letters, the other mark) always among the four | a letter, the alphabet, `diphthongs`, `consonant-pairs`, `iota-subscript`, `punctuation`, `movable-letters`, `marks-change-word`, `enclitics` |
| `sound` | Tap to hear says a letter (`speakWord`), four glyphs | a letter, the alphabet |
| `stress` | the syllables of a word from the chosen pronunciation's respell, the stressed one right | `accents` |
| `preposition` | 'What does διά mean here?' over a real phrase (`διὰ τοὺς λόγους`, John 10:19): four meanings, the right one is the meaning of the case the phrase is in; the other cases' meanings of the same preposition are among the wrong ones | each `preposition-<key>` |
| `compound` | 'ἐκ + βάλλω (“throw”) makes ἐκβάλλω, as in ἐξεβάλομεν. What does ἐκβάλλω mean?': four meanings | `compound-verbs` |
| `syllables`, `breathing` | how many syllables; rough or smooth | `syllables`, `breathings` |
| `concept` | which idea this text is, four titles; the idea's own title, terms and pronunciation hint are blanked (`___`) from the text | only an idea the passage has no form of |

A word idea draws `ending` or `tap-form` by its first random draw and falls back to the other. Review (`src/review/kinds.ts` GRAMMAR, kind `grammar`, item id the idea id) draws the due ideas before the due words (PROVISIONAL), asks each as multiple choice below `FLASHCARD_STEP` and as a flashcard (the prompt and the form, Show reveals the answer, I knew it / Not yet) from it up, and records through `recordGrammarAnswer`. `grammarRandom(random)` is the random a round's grammar questions use: a test finds the seed that gives the question it needs through it.

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
- `start(ideaId, levels, options)` returns a walk, or `{needs: id}` when a prerequisite (ladder `needs`, not the group an item belongs to) is not solid: the lowest such idea.
  A drill's facets are its own idea's; no question tests a prerequisite, and every question assumes the prerequisites are solid.
- `answer(walk, right, hinted)`: up one step on a right answer; on a miss, back to halfway (rounded down) between the highest step he holds below the missed one and the
  missed one (the facet just missed is asked again at the easier step); a hinted right changes nothing and breaks the run. It ends **proved** (two unhinted rights in a
  row at the top step), at the **edge** (the step he holds has the one above it failed, or he misses step 1 twice: edge 0) or at the **limit** (`MAX_QUESTIONS`, 14).
- The result: `{ideaId, proved, edgeStep, topStep, strong, weak, answers, ended}`; a facet is **weak** when missed at least once and right fewer than twice, **strong**
  when right at least once and not weak (a hinted right counts as neither).

## The idea sheet

`src/IdeaSheet.tsx`, data in `src/data/grammar/ideaSheet.ts` (mw-hqd5bz.7). A bottom sheet that teaches one idea; it opens from the
**Learn this idea** button of a Grammar sheet (the term's idea: `ideaOfTerm(term)`), over the Grammar sheet and the word sheet.

- **Where the examples come from.** `ideaPassage(goalText, openChapter, loadChapter, index)`: the saved goal (the `goal` row of
  the settings store, any text `parseGoal` reads): its chapter, its one verse, or the first five chapters of a book goal; with no
  goal, or one that names nothing, the open chapter (`getOpenChapter()`).
- `ideaExamples(id, chapters, verse?)`: up to three words whose parsing needs the idea (`ideasOf`), one for each lemma, in text
  order, each with its chapter and verse ('1 John 1:1'). An idea no word has shows none.
  **Ideas of spelling** (mw-86e9r1.13: the alphabet, a letter, diphthongs and each pair, consonant pairs, the breathings, accents, iota
  subscript, syllables, punctuation; `isSpellingIdea`) are found by how a form is spelt (`inference.ts` `foundationSpans`), not by its
  parsing: up to twelve words (`MAX_FOUNDATION_EXAMPLES`), one for each form, in text order, each with `parts` (the Greek cut into
  stretches, the letters the idea is about `marked`: the letter, the pair, the vowel that carries the breathing or accent, the iota
  subscript's letter, each vowel sound for syllables (a word of two or more), the apostrophe or diaeresis for punctuation). The sheet
  draws a marked part bold, accent-coloured and underlined (`[data-marked]`); the alphabet marks nothing. A verse with none says
  'No word of <passage> is spelt with this.', never 'has this idea in its parsing'.
- `paradigmOf(idea, chapters, verse?)`: for a case idea, the article's forms in that case (rows singular, plural; columns
  masculine, feminine, neuter); for a tense idea, the persons of the one verb that fills most cells in a finite mood (rows singular,
  plural; columns 1st, 2nd, 3rd person). A cell the passage lacks is blank (–); `null` for any other idea or no form at all. Forms
  are the passage's own; a capitalised sentence-start form gives way to one in mid-sentence.
- **Buttons.** `teachIdea(id, outcome)`: *Got it* makes the idea frontier (how `sheet`) and puts it on the schedule at step 0, due
  tomorrow; *I know this* makes it solid and puts it at the 30-day step, due in 30 days. The row is put in place even if the idea
  was scheduled, keeping its lapses and rights. Both publish `grammar-level-changed` and `idea-taught` (docs/events.md).
  *Ask the tutor* is the Talk sheet with focus `{term, kind: 'grammar-term'}`, the idea's first term (its title for an idea with no
  term). The level shows as a chip ('Frontier since Tuesday').
- Tapping an example opens its word sheet, over its own chapter when that is not the Reader's.

## Placement

`#/placement` (opened by Place me under Settings > Goal; its intro also offers 'Start from the letters' for a total beginner: no quiz, nothing written, so Learn next stays where it is, The Greek alphabet for a beginner; the card counts what he already has solid and names the idea Learn next opens, mw-86e9r1.19) tests the grammar the goal needs and writes where he stands. The rules are PROVISIONAL (the Mayor's, the Governor to confirm) and live in `src/data/grammar/placement.ts`, pure:

- The walk is the goal's needed ideas in `orderOf(the chosen approach)` (BMA Tutor by default), with the letters, sounds and marks always on it below them (so a walk of misses reaches them; since mw-hqd5bz.17 not the alphabet as a whole, see below). With no goal it is the whole ladder, and the questions' forms come from the open chapter.
- It starts at the first idea past the letters, sounds and marks that is not already solid, and skips nothing below it. (For 1 John 1:1 that is `noun` in both BMA Tutor and the Lampas ladder, the noun coming before the article in each.)
- Two questions an idea (`questions.ts` `buildIdeaQuestion`, seeded from the state, `placementQuestion.ts`): both right is solid, one is frontier, none is not yet. Solid or frontier moves to the next idea later in the sequence that was not asked; not yet steps BACK to the idea before it.
- Two ideas missed in a row: nothing above is asked, the walk only goes down. Every idea above the first miss stays untested (no level is written).
- **A miss steps down to what the missed forms use (PROVISIONAL, mw-hqd5bz.17).** Each question that shows a Greek form is kept with the form (`Asked.form`). When a needed idea comes out not yet, the state's `focus` becomes the letters, sounds and marks of the forms asked on it (`foundationOf`, with those of the idea missed just before while the walk is going down), and the walk down asks only those of the foundation: the others are passed over, so is one that is solid already, and 'alphabet' (one idea standing for 24 letters) is never asked. A solid needed idea below still ends the walk (the ceiling); a solid letter in the focus does not, the next one is asked. A kept placement from before has no focus and steps down through every idea, as it did.
- **A right answer shows what the form is spelt with (PROVISIONAL, mw-hqd5bz.17).** `answer(state, right, question)` also runs the inference (below) on its own copy of the evidence (`state.evidence`, loaded from the store at the start): a letter, pair or mark that reaches three right uses with no miss since is solid without being asked (`state.inferred`; the end card writes it 'Solid (from your answers)') and stops a walk down as a solid idea does. The store gets the same through `noteAnswer` (`placementWrite.ts` `credit`); an idea's level is what its own two answers give, then the inference may lift it.
- It stops when a step down lands on a solid idea (already solid, or solid just now: the ceiling is found), when no idea is left in that direction, or after 20 questions in a sitting (`paused`: the state is kept in `localStorage` `lampas.placement`, `placementKeep.ts`, and Go on resumes it, even after a reopen).
- **The quick round (PROVISIONAL, mw-hqd5bz.18).** A walk that reached the letters, sounds and marks (it asked one, stepped down to the ones its missed forms use, or had nothing to ask because everything the goal needs was solid, as when he places himself again) ends in a quick round (`quickRound.ts`, pure; the screen's status `quick`, kept in `PlacementState.quick` so a reopen goes on): one tap on each letter, diphthong, consonant pair and breathing that is not solid yet, asked or inferred (`quickItems`), in the ladder's order, at most 40 taps (`QUICK_LIMIT`), outside the 20 questions of the walk. **Hear and pick** (kind `sound`): the app says the letter or pair in Greek (`speakWord`, `src/speech`) as the question comes and he taps it, among four that sound different from it; 'Say it again' and Tap to hear say it again. **See and pick** (kind `letter`): it shows the letter or pair large and he taps its sound (`shortSound`: the part of the sound before the first semicolon), among four. The two alternate, from the seed; a breathing is only seen, on a word that begins with it (Modern Greek does not say it). One tap an item: right is solid, wrong is not yet, each its own level with `setLevel(id, level, 'placement')` (`placementWrite.ts` `writeQuick`, which also puts the answer on the schedule and counts a miss against the item). **Stop here** keeps what was answered and goes to the end card; an alphabet, pair group or breathing he said he knows whole (I know this on its idea sheet, or a marked term: `how` 'sheet' or 'marked') is not asked. The end card adds 'Gaps to work on: ξ, ψ and ου' (`gapsOf`, below).
- Every answer goes on the back-off schedule (`recordGrammarAnswer`, kind `grammar`) and an idea that has had its two questions gets its level with `setLevel(id, level, 'placement')` (`placementWrite.ts`). The end card, 'Where you are: solid N, frontier M, not yet K; untested J', lists the counted ideas by tier; the numbers are over the ideas the goal needs and any other idea the walk gave a level. `placement-done` goes on the bus.

## What his right answers show

`src/data/grammar/inference.ts` (pure) and `src/data/repositories/inference.ts` (mw-hqd5bz.17). The rules are PROVISIONAL, the Mayor's, the Governor to confirm. His words (2026-10-09): "I got some things right, can it infer that I know the alphabet? It will learn more as I try to read."

- **A form read right is evidence for what it is spelt with.** `foundationOf(form)`: each of its letters (`letter-*`, a final sigma as sigma, once however often it stands), a pair of vowels (`diphthongs`: αι ει οι υι ου αυ ευ ηυ, not when the first carries a stress mark or the second two dots), a pair of consonants (`consonant-pairs`: μπ ντ γκ γγ γχ γξ), a breathing (`breathings`), an accent (`accents`: acute, grave or circumflex) and an iota under a letter (`iota-subscript`).
- **Where the forms come from.** `formOfQuestion`: the ending question's stem with the right ending put back, the right word of a tap-form, the word of a stress, syllables or breathing question. Every right answer on such a question credits its form: in the placement, in Review's grammar ideas (`kinds.ts` GRAMMAR.record) and in a Quick test or Review word (`recordAnswer`: the lemma, right only, a self-graded 'I knew it' too). A miss on a question about a form (an ending, a tap) says nothing about its letters.
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
- **Learn next** (`goalProgress.ts` `learnNext`): the earliest idea in the chosen approach's sequence (`orderOf`) that the goal needs and that is not yet or untested, 'Learn next: The noun · Your first words' (the lesson from `lessonOf`); a tap opens its idea sheet. When none is left it says so. PROVISIONAL (mw-hqd5bz.17): when that idea is the alphabet and some letters are solid (asked or inferred), it names the letters that are not, never the whole alphabet: 'Learn next: ξ and ψ · The Greek letters' (`lettersText`: all of them up to six, then 'ξ, ψ, φ, χ, ζ, θ and 5 more letters'), and a tap opens the first of them; with no letter solid it still says 'The Greek alphabet'. An alphabet whose 24 letters are solid is solid, so Learn next goes on to the next idea. PROVISIONAL (mw-hqd5bz.18): it names the exact gaps of every partly known group together ('Learn next: ξ, ψ and ου · The Greek letters': letters, vowel pairs, consonant pairs and breathings; `LearnNext.gaps`), even a group the goal does not need (no goal needs the diphthongs), and a tap opens the first gap. PROVISIONAL (mw-hqd5bz.31): the exact gaps come first, before any earlier idea of the sequence (even the whole alphabet when no letter is solid but a breathing is a gap), so the end card, Learn next and Review always name the same ones in the same order; with no goal set the Goal screen still shows them under Learn next, beside 'No goal yet'. **Review draws the gaps first** (`review/round.ts`): the first four (`GAP_QUESTIONS`, so letters do not crowd out the due items) of the gaps Learn next names, in that order, missed or never asked (mw-hqd5bz.23: a gap with no schedule row is drawn as a step-0 item), due or not, ahead of the due ideas; each is asked as a hear-and-pick or see-and-pick (`buildIdeaQuestion` on an item).
- **Next words** (`nextWords`): the three most frequent needed words he has no state for (not on his list and not dropped), in dictionary form with their meaning; a tap is Add to my words (`addLemmaToLearn`: the word becomes learning, so it is frontier and the bar moves).
- **Read it** opens the Reader on the goal: its chapter and verse, or chapter 1 for a whole book.

A word's state is looked up by its headword and by every lexicon lemma it goes by (`wordStatesOf`), the best state winning.

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
| 47 | marks | `iota-subscript` | The iota under a letter | – | `letter-iota`, `letter-alpha`, `letter-eta`, `letter-omega` |
| 48 | marks | `punctuation` | Punctuation and small marks | – | `accents` |
| 49 | marks | `movable-letters` | Movable letters | – | `breathings`, `punctuation` |
| 50 | marks | `marks-change-word` | Marks that change the word | – | `breathings`, `accents` |
| 51 | marks | `enclitics` | Enclitics | – | `breathings`, `accents`, `marks-change-word` |
| 52 | nouns | `noun` | The noun | noun | `accents` |
| 53 | nouns | `number-singular` | The singular | singular | `noun` |
| 54 | nouns | `number-plural` | The plural | plural | `number-singular` |
| 55 | nouns | `conjunction` | The conjunction | conjunction | `noun` |
| 56 | nouns | `negative` | The negative | negative | `conjunction` |
| 57 | nouns | `case-nominative` | The nominative case | nominative | `noun` |
| 58 | nouns | `case-accusative` | The accusative case | accusative | `case-nominative` |
| 59 | nouns | `case-genitive` | The genitive case | genitive | `case-nominative` |
| 60 | nouns | `case-dative` | The dative case | dative | `case-genitive` |
| 61 | nouns | `case-vocative` | The vocative case | vocative | `case-nominative` |
| 62 | nouns | `gender-masculine` | The masculine gender | masculine | `noun` |
| 63 | nouns | `gender-feminine` | The feminine gender | feminine | `gender-masculine` |
| 64 | nouns | `gender-neuter` | The neuter gender | neuter | `gender-masculine`, `case-accusative` |
| 65 | nouns | `article` | The article | article | `noun`, `case-nominative`, `case-genitive`, `case-dative`, `case-accusative`, `number-plural`, `gender-masculine`, `gender-feminine`, `gender-neuter` |
| 66 | nouns | `adjective` | The adjective | adjective | `noun`, `case-nominative`, `case-genitive`, `case-dative`, `case-accusative`, `number-plural`, `gender-masculine`, `gender-feminine`, `gender-neuter` |
| 67 | nouns | `comparative` | The comparative | comparative | `adjective` |
| 68 | nouns | `superlative` | The superlative | superlative | `comparative` |
| 69 | nouns | `numeral` | Number words | numeral | `adjective` |
| 70 | nouns | `proper-name` | Proper names | proper name | `noun`, `article` |
| 71 | nouns | `indeclinable` | Words that never change | indeclinable, letter | `proper-name`, `case-genitive` |
| 72 | pronouns | `person-1st` | The first person | 1st person | `noun` |
| 73 | pronouns | `person-2nd` | The second person | 2nd person | `person-1st` |
| 74 | pronouns | `person-3rd` | The third person | 3rd person | `person-2nd` |
| 75 | pronouns | `pronoun` | The pronoun | – | `noun`, `person-3rd`, `number-plural`, `case-nominative`, `case-genitive`, `case-dative`, `case-accusative`, `gender-masculine`, `gender-feminine`, `gender-neuter` |
| 76 | pronouns | `pronoun-personal` | The personal pronoun | personal pronoun | `pronoun`, `case-nominative`, `case-genitive`, `case-dative`, `case-accusative` |
| 77 | pronouns | `pronoun-demonstrative` | The demonstrative pronoun | demonstrative pronoun | `pronoun-personal`, `article`, `gender-masculine`, `gender-feminine`, `gender-neuter` |
| 78 | pronouns | `pronoun-relative` | The relative pronoun | relative pronoun | `pronoun-demonstrative` |
| 79 | pronouns | `pronoun-interrogative` | The interrogative pronoun | interrogative pronoun | `pronoun-relative` |
| 80 | pronouns | `pronoun-indefinite` | The indefinite pronoun | indefinite pronoun | `pronoun-interrogative` |
| 81 | pronouns | `pronoun-reflexive` | The reflexive pronoun | reflexive pronoun | `pronoun-personal` |
| 82 | pronouns | `pronoun-possessive` | The possessive pronoun | possessive pronoun, possessor | `pronoun-reflexive`, `adjective` |
| 83 | pronouns | `pronoun-reciprocal` | The reciprocal pronoun | reciprocal pronoun | `pronoun-reflexive` |
| 84 | pronouns | `pronoun-correlative` | The correlative pronoun | correlative pronoun | `pronoun-relative`, `pronoun-demonstrative` |
| 85 | pronouns | `pronoun-correlative-interrogative` | The correlative or interrogative pronoun | correlative or interrogative pronoun | `pronoun-correlative`, `pronoun-interrogative` |
| 86 | prepositions | `preposition` | The preposition | preposition | `case-genitive`, `case-dative`, `case-accusative` |
| 87 | prepositions | `preposition-eis` | The preposition εἰς | – | `preposition`, `case-accusative` |
| 88 | prepositions | `preposition-en` | The preposition ἐν | – | `preposition`, `case-dative` |
| 89 | prepositions | `preposition-ek` | The preposition ἐκ | – | `preposition`, `movable-letters`, `case-genitive` |
| 90 | prepositions | `preposition-apo` | The preposition ἀπό | – | `preposition`, `movable-letters`, `case-genitive` |
| 91 | prepositions | `preposition-pros` | The preposition πρός | – | `preposition`, `case-accusative`, `case-dative` |
| 92 | prepositions | `preposition-dia` | The preposition διά | – | `preposition`, `movable-letters`, `case-genitive`, `case-accusative` |
| 93 | prepositions | `preposition-kata` | The preposition κατά | – | `preposition`, `movable-letters`, `case-genitive`, `case-accusative` |
| 94 | prepositions | `preposition-meta` | The preposition μετά | – | `preposition`, `movable-letters`, `case-genitive`, `case-accusative` |
| 95 | prepositions | `preposition-peri` | The preposition περί | – | `preposition`, `case-genitive`, `case-accusative` |
| 96 | prepositions | `preposition-hypo` | The preposition ὑπό | – | `preposition`, `movable-letters`, `case-genitive`, `case-accusative` |
| 97 | prepositions | `preposition-para` | The preposition παρά | – | `preposition`, `movable-letters`, `case-genitive`, `case-dative`, `case-accusative` |
| 98 | prepositions | `preposition-epi` | The preposition ἐπί | – | `preposition`, `movable-letters`, `case-genitive`, `case-dative`, `case-accusative` |
| 99 | verbs | `verb` | The verb | verb | `person-1st`, `person-2nd`, `person-3rd`, `number-singular`, `number-plural` |
| 100 | verbs | `compound-verbs` | Compound verbs | – | `verb`, `preposition`, `preposition-eis`, `preposition-en`, `preposition-ek`, `preposition-apo`, `preposition-pros`, `preposition-dia`, `preposition-kata`, `preposition-meta`, `preposition-peri`, `preposition-hypo`, `preposition-para`, `preposition-epi` |
| 101 | verbs | `tense-present` | The present tense | present | `verb` |
| 102 | verbs | `voice-active` | The active voice | active | `verb` |
| 103 | verbs | `mood-indicative` | The indicative mood | indicative | `tense-present`, `voice-active` |
| 104 | verbs | `tense-imperfect` | The imperfect tense | imperfect | `mood-indicative` |
| 105 | verbs | `tense-future` | The future tense | future | `tense-present` |
| 106 | verbs | `tense-aorist` | The aorist tense | aorist | `tense-imperfect` |
| 107 | verbs | `tense-perfect` | The perfect tense | perfect | `tense-aorist` |
| 108 | verbs | `tense-pluperfect` | The pluperfect tense | pluperfect | `tense-perfect` |
| 109 | verbs | `second-tenses` | Second aorists and perfects | second | `tense-aorist`, `tense-perfect` |
| 110 | verbs | `voice-middle` | The middle voice | middle | `voice-active` |
| 111 | verbs | `voice-passive` | The passive voice | passive | `voice-active`, `tense-present`, `case-genitive` |
| 112 | verbs | `voice-middle-or-passive` | The middle or passive voice | middle or passive | `voice-middle`, `voice-passive` |
| 113 | verbs | `voice-middle-deponent` | The middle deponent | middle deponent | `voice-middle-or-passive` |
| 114 | verbs | `voice-passive-deponent` | The passive deponent | passive deponent | `voice-middle-deponent`, `tense-aorist` |
| 115 | verbs | `voice-middle-or-passive-deponent` | The middle or passive deponent | middle or passive deponent | `voice-passive-deponent` |
| 116 | verbs | `voice-middle-significance` | A middle meaning in an active form | middle significance | `voice-middle` |
| 117 | verbs | `voice-impersonal-active` | The impersonal active | impersonal active | `voice-active` |
| 118 | verbs | `voice-none` | A verb with no voice | no voice | `voice-active` |
| 119 | verbs | `mood-imperative` | The imperative mood | imperative | `mood-indicative`, `tense-aorist` |
| 120 | verbs | `mood-subjunctive` | The subjunctive mood | subjunctive | `mood-indicative` |
| 121 | verbs | `mood-optative` | The optative mood | optative | `mood-subjunctive` |
| 122 | verbs | `mood-infinitive` | The infinitive | infinitive | `mood-indicative`, `article` |
| 123 | verbs | `mood-participle` | The participle | participle | `mood-infinitive`, `case-nominative`, `case-genitive`, `case-dative`, `case-accusative`, `gender-masculine`, `gender-feminine`, `gender-neuter`, `adjective` |
| 124 | verbs | `mood-participle-imperative` | The participle with the sense of a command | imperative-sense participle | `mood-participle`, `mood-imperative` |
| 125 | joiners | `particle` | The particle | particle | `conjunction` |
| 126 | joiners | `adverb` | The adverb | adverb | `adjective`, `verb` |
| 127 | joiners | `interrogative` | Words that ask a question | interrogative | `particle` |
| 128 | joiners | `conditional` | The conditional | conditional | `conjunction`, `mood-indicative`, `mood-subjunctive` |
| 129 | joiners | `interjection` | The interjection | interjection | `particle` |
| 130 | joiners | `attic-form` | Attic spellings | Attic form | `verb` |
| 131 | joiners | `poetic` | Poetic forms | poetic | `attic-form` |
| 132 | joiners | `crasis` | Two words run together | crasis | `conjunction`, `punctuation` |
| 133 | joiners | `aramaic` | Aramaic words | Aramaic word | `indeclinable` |
| 134 | joiners | `hebrew` | Hebrew words | Hebrew word | `indeclinable` |

## Approaches

**PROVISIONAL**, the Governor to confirm: BMA Tutor is the default, and the lessons below that the RP codes cannot tell apart are
mapped to the nearest ideas we have.

An approach is the ORDER the ladder's ideas are taught, tested and suggested in, and how that order teaches. It is data, one file
each in `src/approaches/` (as `src/resources/` are), listed in `index.ts`. The choice is the `grammarApproach` setting (Settings >
Grammar approach; the tutor can change it; `getGrammarApproach` / `setGrammarApproach`; `approach-changed` on the bus, docs/events.md).
Choosing one changes no level: levels belong to the ideas, not to the approach.

- `GrammarApproach` (`types.ts`): `{ id, name, credit, method, stages }`. `credit` is `{ name, url, line }` or `null`; `method` is
  our own words, under 120; `stages` hold levels, levels hold lessons, and a lesson is `{ title, ideas }`, its title in our own words
  and `ideas` the ladder ids it teaches.
- `APPROACHES`, `DEFAULT_APPROACH`, `approachOf(id)`.
- `orderOf(approach)`: every idea id once, in lesson order (an idea a later lesson names again is a revisit and keeps its first place);
  the ideas no lesson names follow, by rung. This is the sequence the placement, 'Learn next' and the Goal screen follow.
- `lessonOf(approach, ideaId)`: `{ stage, level, lesson }` of the first lesson to name the idea, or `undefined`.
- `nextLessonOf(approach, levelOf)`: the lesson holding the earliest idea in `orderOf` that has no level or is not yet; Settings
  marks it 'Next'.

An approach's order is bound by the ladder's `needs` (mw-86e9r1.2): in `orderOf` of every approach no idea comes before an idea
it rests on (`tests/unit/ladder-needs.test.ts`). BMA Tutor still teaches the aorist before the genitive, because the aorist does not
rest on a case; it teaches the article after the cases and the genders, because the article does. The first lessons name number
and the joining words straight after the noun.

### BMA Tutor

Follows the sequence of Biblical Mastery Academy's Greek course, credited in Settings and About (`ATTRIBUTION.md`). Stage 1 has six
levels of twelve lessons; stages 2 and 3 are one lesson each, 'Reading', until more is known. Only the sequence is followed: every
lesson title and the method are written here, and no course text, picture or exercise is copied (a test keeps the course's own
phrases out of `bma-tutor.ts`). Mapping, where the RP codes cannot tell a lesson apart:

- third-declension forms: revisits the noun and its cases (`noun`, `case-genitive`, `case-dative`);
- athematic verbs: revisits `tense-present` and `second-tenses`;
- root variations: `attic-form`, the ladder's nearest idea for a verb spelt another way;
- assimilation (letters changing at a joint): `crasis`, the nearest idea for sounds that run together;
- the periphrastic, clauses and 'reading Paul' lessons, and level 6 (1, 2 and 3 John), name the ideas that passage uses again.

### Adding an approach

1. One file in `src/approaches/` exporting a `GrammarApproach` (a credit when the order is someone's, with their name and address).
2. One line in `src/approaches/index.ts` (`APPROACHES`).
3. `npm run grind:build`, so the tutor may be asked for it. `tests/unit/approaches.test.ts` checks that `orderOf` lists every idea once.
