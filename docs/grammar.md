# The grammar ladder

**PROVISIONAL.** The tiers, the rungs and the wording of each idea are a first draft; the Governor will change them. Other
stories key on the ids (`case-genitive`, `tense-aorist` ...), so an id is not renamed once it ships.

The Governor asked to be taken "all the way down to alphabet and it's pronunciation", and to be tested "on the grammar
required". The ladder is the one list that gives both: every idea of Greek grammar a reader of the New Testament meets, easy
first, from the letters and how they sound up to the participle and the Hebrew word. It is the list the needs of a passage,
the placement, the drills, the levels and the weave's grammar dial all key on.

Code: `src/data/grammar/ladder.ts`. It is pure: no store and no screen.

## What an idea is

`GrammarIdea` is `{ id, title, tier, rung, terms, text, needs }` and, for a letter, `glyphs` (small, capital) and `sound`.

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
- `ALWAYS_NEEDED` (`alphabet`, `breathings`, `accents`): every token needs these, so `ideasOf` does not list them.
  `alphabet` is the parent of the 24 letter ideas.
- `ideasOf(code)`: the ids a word with that RP parsing code needs, sorted by rung: its part of speech, plus one idea for
  each case, number, gender, person, tense, voice, mood and suffix its parsing names (a possessive pronoun's possessor is
  one with the possessive pronoun). `ideasOf('PREP')` is `['preposition']`; `ideasOf('N-GSF')` is `noun`,
  `case-genitive`, `number-singular`, `gender-feminine`. It throws on a code `decodeParse` does not know, and a test walks
  every parse code of the 260 chapter files.

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
| `ending` | the form with its ending blanked (`ἀρχ_`), four endings; the wrong three are the endings of other inflected words of the same part of speech in the passage (the common endings when it has too few). The stem is what the lemma and the form share, a stem vowel goes to the ending | any word idea whose forms share a stem with their lemma |
| `tap-form` | the Greek words of one verse as buttons: 'Tap the dative article'. The prompt names the fewest terms that leave exactly one word of the verse, and the word's text is not repeated in the verse | any word idea the passage has a form of |
| `letter` | four glyphs: by name or by sound (a letter that sounds like the right one is never offered), vowel pairs, consonant pairs, the iota under a letter, the marks | a letter, the alphabet, `diphthongs`, `consonant-pairs`, `iota-subscript`, `punctuation` |
| `sound` | Hold to hear says a letter (`speakWord`), four glyphs | a letter, the alphabet |
| `stress` | the syllables of a word from the chosen pronunciation's respell, the stressed one right | `accents` |
| `syllables`, `breathing` | how many syllables; rough or smooth | `syllables`, `breathings` |
| `concept` | which idea this text is, four titles | only an idea the passage has no form of |

A word idea draws `ending` or `tap-form` by its first random draw and falls back to the other. Review (`src/review/kinds.ts` GRAMMAR, kind `grammar`, item id the idea id) draws the due ideas before the due words (PROVISIONAL), asks each as multiple choice below `FLASHCARD_STEP` and as a flashcard (the prompt and the form, Show reveals the answer, I knew it / Not yet) from it up, and records through `recordGrammarAnswer`. `grammarRandom(random)` is the random a round's grammar questions use: a test finds the seed that gives the question it needs through it.

## The idea sheet

`src/IdeaSheet.tsx`, data in `src/data/grammar/ideaSheet.ts` (mw-hqd5bz.7). A bottom sheet that teaches one idea; it opens from the
**Learn this idea** button of a Grammar sheet (the term's idea: `ideaOfTerm(term)`), over the Grammar sheet and the word sheet.

- **Where the examples come from.** `ideaPassage(goalText, openChapter, loadChapter, index)`: the saved goal (the `goal` row of
  the settings store, any text `parseGoal` reads): its chapter, its one verse, or the first five chapters of a book goal; with no
  goal, or one that names nothing, the open chapter (`getOpenChapter()`).
- `ideaExamples(id, chapters, verse?)`: up to three words whose parsing needs the idea (`ideasOf`), one for each lemma, in text
  order, each with its chapter and verse ('1 John 1:1'). An idea no word has (a letter, the alphabet) shows none.
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

`#/placement` (opened by Place me under Settings > Goal) tests the grammar the goal needs and writes where he stands. The rules are PROVISIONAL (the Mayor's, the Governor to confirm) and live in `src/data/grammar/placement.ts`, pure:

- The walk is the goal's needed ideas in `orderOf(the chosen approach)` (BMA Tutor by default), with the letters, sounds and marks always on it below them (so a walk of misses reaches them; since mw-hqd5bz.17 not the alphabet as a whole, see below). With no goal it is the whole ladder, and the questions' forms come from the open chapter.
- It starts at the first idea past the letters, sounds and marks that is not already solid, and skips nothing below it. (For 1 John 1:1 that is `noun` in both BMA Tutor and the Lampas ladder, the noun coming before the article in each.)
- Two questions an idea (`questions.ts` `buildIdeaQuestion`, seeded from the state, `placementQuestion.ts`): both right is solid, one is frontier, none is not yet. Solid or frontier moves to the next idea later in the sequence that was not asked; not yet steps BACK to the idea before it.
- Two ideas missed in a row: nothing above is asked, the walk only goes down. Every idea above the first miss stays untested (no level is written).
- **A miss steps down to what the missed forms use (PROVISIONAL, mw-hqd5bz.17).** Each question that shows a Greek form is kept with the form (`Asked.form`). When a needed idea comes out not yet, the state's `focus` becomes the letters, sounds and marks of the forms asked on it (`foundationOf`, with those of the idea missed just before while the walk is going down), and the walk down asks only those of the foundation: the others are passed over, so is one that is solid already, and 'alphabet' (one idea standing for 24 letters) is never asked. A solid needed idea below still ends the walk (the ceiling); a solid letter in the focus does not, the next one is asked. A kept placement from before has no focus and steps down through every idea, as it did.
- **A right answer shows what the form is spelt with (PROVISIONAL, mw-hqd5bz.17).** `answer(state, right, question)` also runs the inference (below) on its own copy of the evidence (`state.evidence`, loaded from the store at the start): a letter, pair or mark that reaches three right uses with no miss since is solid without being asked (`state.inferred`; the end card writes it 'Solid (from your answers)') and stops a walk down as a solid idea does. The store gets the same through `noteAnswer` (`placementWrite.ts` `credit`); an idea's level is what its own two answers give, then the inference may lift it.
- It stops when a step down lands on a solid idea (already solid, or solid just now: the ceiling is found), when no idea is left in that direction, or after 20 questions in a sitting (`paused`: the state is kept in `localStorage` `lampas.placement`, `placementKeep.ts`, and Go on resumes it, even after a reopen).
- **The quick round (PROVISIONAL, mw-hqd5bz.18).** A walk that reached the letters, sounds and marks (it asked one, stepped down to the ones its missed forms use, or had nothing to ask because everything the goal needs was solid, as when he places himself again) ends in a quick round (`quickRound.ts`, pure; the screen's status `quick`, kept in `PlacementState.quick` so a reopen goes on): one tap on each letter, diphthong, consonant pair and breathing that is not solid yet, asked or inferred (`quickItems`), in the ladder's order, at most 40 taps (`QUICK_LIMIT`), outside the 20 questions of the walk. **Hear and pick** (kind `sound`): the app says the letter or pair in Greek (`speakWord`, `src/speech`) as the question comes and he taps it, among four that sound different from it; 'Say it again' and Hold to hear say it again. **See and pick** (kind `letter`): it shows the letter or pair large and he taps its sound (`shortSound`: the part of the sound before the first semicolon), among four. The two alternate, from the seed; a breathing is only seen, on a word that begins with it (Modern Greek does not say it). One tap an item: right is solid, wrong is not yet, each its own level with `setLevel(id, level, 'placement')` (`placementWrite.ts` `writeQuick`, which also puts the answer on the schedule and counts a miss against the item). **Stop here** keeps what was answered and goes to the end card; an alphabet, pair group or breathing he said he knows whole (I know this on its idea sheet, or a marked term: `how` 'sheet' or 'marked') is not asked. The end card adds 'Gaps to work on: ξ, ψ and ου' (`gapsOf`, below).
- Every answer goes on the back-off schedule (`recordGrammarAnswer`, kind `grammar`) and an idea that has had its two questions gets its level with `setLevel(id, level, 'placement')` (`placementWrite.ts`). The end card, 'Where you are: solid N, frontier M, not yet K; untested J', lists the counted ideas by tier; the numbers are over the ideas the goal needs and any other idea the walk gave a level. `placement-done` goes on the bus.

## What his right answers show

`src/data/grammar/inference.ts` (pure) and `src/data/repositories/inference.ts` (mw-hqd5bz.17). The rules are PROVISIONAL, the Mayor's, the Governor to confirm. His words (2026-10-09): "I got some things right, can it infer that I know the alphabet? It will learn more as I try to read."

- **A form read right is evidence for what it is spelt with.** `foundationOf(form)`: each of its letters (`letter-*`, a final sigma as sigma, once however often it stands), a pair of vowels (`diphthongs`: αι ει οι υι ου αυ ευ ηυ, not when the first carries a stress mark or the second two dots), a pair of consonants (`consonant-pairs`: μπ ντ γκ γγ γχ γξ), a breathing (`breathings`), an accent (`accents`: acute, grave or circumflex) and an iota under a letter (`iota-subscript`).
- **Where the forms come from.** `formOfQuestion`: the ending question's stem with the right ending put back, the right word of a tap-form, the word of a stress, syllables or breathing question. Every right answer on such a question credits its form: in the placement, in Review's grammar ideas (`kinds.ts` GRAMMAR.record) and in a Quick test or Review word (`recordAnswer`: the lemma, right only, a self-graded 'I knew it' too). A miss on a question about a form (an ending, a tap) says nothing about its letters.
- **Three right uses and no miss make it solid.** `INFERRED_RIGHTS` 3. A foundation idea's evidence is `{run, misses}`: right uses since its last miss, and its misses. At `run` 3 the idea is written solid, `how` 'inferred', whatever it was (a placement's not yet too: three reads since the miss outweigh it), and put on the back-off schedule at the 30-day step like a term he marked I know this. A solid he set himself is left alone.
- **A miss counts against it.** A miss on a question about a letter (`letter-*`, or the alphabet's question, whose right glyph says which letter), about the pairs, the breathing or the accent (`questionFoundation`) starts the run again; a letter held only by inference falls back to the frontier (how 'inferred'). Asked misses are the ones that reach the idea's own level (`recordGrammarAnswer`).
- **The alphabet is solid when all 24 letters are.** `syncAlphabet` (grammarLevels.ts) runs after every write of a level (`setLevel`, `recordGrammarAnswer`, `teachIdea`, the inference) and writes 'alphabet' solid, how 'inferred', as soon as the 24th letter is solid, asked or inferred; an alphabet that was solid only by that falls back to the frontier when a letter does. One he set himself stays.
- **One item for each letter and each combination (PROVISIONAL, mw-hqd5bz.18).** Where the ladder has one idea for a group, each combination is an item of its own under it, as the 24 letters sit under `alphabet`: `diphthong-ai` ... `diphthong-eeu` (αι ει οι υι ου αυ ευ ηυ), `pair-mp` ... `pair-gks` (μπ ντ γκ γγ γχ γξ), `breathing-rough` and `breathing-smooth` (`GrammarIdea.parent`, `pair`, `sound`; `itemsOf(group)`, `ITEM_GROUPS`). The items are not on the placement's walk (`startPlacement` leaves out an idea with a `parent`); they are asked in the quick round, and `foundationOf` credits the item as well as its group, so a form read right moves them too. **A group is solid when every item is** (`syncAlphabet` in grammarLevels.ts, now for all four groups: `diphthongs`, `consonant-pairs` and `breathings` become solid, how 'inferred', and, unlike the alphabet, never fall back). **The exact gaps** (`gapsOf`): the items that are not solid in each group that is partly known; a group none of whose items is solid has no gap yet, it is the whole idea that is missing.
- **It keeps running.** The evidence is in the settings store under `grammarEvidence` (`{id: [run, misses]}`, no table), so every answer anywhere moves the Goal bars live; nothing runs only in the placement.

## The Goal screen

The strip and the screen that show his goal moving (mw-hqd5bz.10). Both read `useGoalProgress` (`src/useGoalProgress.ts`): the saved goal, what its passage needs (`passageNeeds`, worked out once per goal text and kept in memory) and his words and levels, live; the counts are `progressToward`'s.

- **The chip** (`GoalStrip.tsx`, `GoalChip`), in the Reader's one slim row of chips under the header (`ReaderChips.tsx`, with Due, Tip and New): 'Goal 12/31', the solid words of the ones needed; its accessible name is the whole of what the strip said, 'Goal: 1 John 1:1, 12 of 31 words, 8 of 14 ideas'. Not drawn with no goal or while the passage is still being counted; a tap opens `#/goal`.
- **The screen** (`GoalScreen.tsx`, `#/goal`, kept across a reopen; '‹ Reader' goes back): the goal as the title with Change (to Settings > Goal), then two bars, Words and Grammar ideas. Each bar is three segments, solid (filled), frontier (striped) and not yet (empty), with the count written in each and 'Solid 6 · Frontier 0 · Not yet 10' beneath, so colour is never the only sign. 'Solid when both are full.' A tap on a bar opens the list behind it, the items grouped by level (a word with its meaning; an idea opens its idea sheet).
- **Place me** opens `#/placement`; once any level was set by the placement it reads 'Placed on 3 Oct' with Place again (the date is the newest `since` of a level whose `how` is 'placement'; nothing else is stored). Place me here opens `#/placement?from=goal`, so the placement's ‘‹ Goal’, 'Go on another day' and the intro's 'Back to the goal' return here (from Settings they return to Settings); the end card and the paused card both have 'Back to the goal'.
- **Learn next** (`goalProgress.ts` `learnNext`): the earliest idea in the chosen approach's sequence (`orderOf`) that the goal needs and that is not yet or untested, 'Learn next: The noun · Your first words' (the lesson from `lessonOf`); a tap opens its idea sheet. When none is left it says so. PROVISIONAL (mw-hqd5bz.17): when that idea is the alphabet and some letters are solid (asked or inferred), it names the letters that are not, never the whole alphabet: 'Learn next: ξ and ψ · The Greek letters' (`lettersText`: all of them up to six, then 'ξ, ψ, φ, χ, ζ, θ and 5 more letters'), and a tap opens the first of them; with no letter solid it still says 'The Greek alphabet'. An alphabet whose 24 letters are solid is solid, so Learn next goes on to the next idea. PROVISIONAL (mw-hqd5bz.18): it names the exact gaps of every partly known group together ('Learn next: ξ, ψ and ου · The Greek letters': letters, vowel pairs, consonant pairs and breathings; `LearnNext.gaps`), even a group the goal does not need (no goal needs the diphthongs), and a tap opens the first gap. **Review draws the gaps first** (`review/round.ts`): the first four (`GAP_QUESTIONS`, so letters do not crowd out the due items) of the gaps Learn next names, in that order, missed or never asked (mw-hqd5bz.23: a gap with no schedule row is drawn as a step-0 item), due or not, ahead of the due ideas; each is asked as a hear-and-pick or see-and-pick (`buildIdeaQuestion` on an item).
- **Next words** (`nextWords`): the three most frequent needed words he has no state for (not on his list and not dropped), in dictionary form with their meaning; a tap is Add to my words (`addLemmaToLearn`: the word becomes learning, so it is frontier and the bar moves).
- **Read it** opens the Reader on the goal: its chapter and verse, or chapter 1 for a whole book.

A word's state is looked up by its headword and by every lexicon lemma it goes by (`wordStatesOf`), the best state winning.

## One choice to know

Person and number (`person-1st` ... `number-plural`) sit at the start of the `pronouns` tier, not the `nouns` tier: I, you,
he, we, you, they are where a learner first meets them, and the verb needs them too. So a perfect first-person plural verb
needs nothing from the `nouns` tier, but a plural noun's number idea comes after the cases.

## The ladder

| Rung | Tier | Id | Title | Terms | Rests on |
| --- | --- | --- | --- | --- | --- |
| 1 | letters | `alphabet` | The Greek alphabet | – | – |
| 2 | letters | `letter-alpha` | Alpha (α Α) | – | `alphabet` |
| 3 | letters | `letter-beta` | Beta (β Β) | – | `alphabet` |
| 4 | letters | `letter-gamma` | Gamma (γ Γ) | – | `alphabet` |
| 5 | letters | `letter-delta` | Delta (δ Δ) | – | `alphabet` |
| 6 | letters | `letter-epsilon` | Epsilon (ε Ε) | – | `alphabet` |
| 7 | letters | `letter-zeta` | Zeta (ζ Ζ) | – | `alphabet` |
| 8 | letters | `letter-eta` | Eta (η Η) | – | `alphabet` |
| 9 | letters | `letter-theta` | Theta (θ Θ) | – | `alphabet` |
| 10 | letters | `letter-iota` | Iota (ι Ι) | – | `alphabet` |
| 11 | letters | `letter-kappa` | Kappa (κ Κ) | – | `alphabet` |
| 12 | letters | `letter-lambda` | Lambda (λ Λ) | – | `alphabet` |
| 13 | letters | `letter-mu` | Mu (μ Μ) | – | `alphabet` |
| 14 | letters | `letter-nu` | Nu (ν Ν) | – | `alphabet` |
| 15 | letters | `letter-xi` | Xi (ξ Ξ) | – | `alphabet` |
| 16 | letters | `letter-omicron` | Omicron (ο Ο) | – | `alphabet` |
| 17 | letters | `letter-pi` | Pi (π Π) | – | `alphabet` |
| 18 | letters | `letter-rho` | Rho (ρ Ρ) | – | `alphabet` |
| 19 | letters | `letter-sigma` | Sigma (σ Σ) | – | `alphabet` |
| 20 | letters | `letter-tau` | Tau (τ Τ) | – | `alphabet` |
| 21 | letters | `letter-upsilon` | Upsilon (υ Υ) | – | `alphabet` |
| 22 | letters | `letter-phi` | Phi (φ Φ) | – | `alphabet` |
| 23 | letters | `letter-chi` | Chi (χ Χ) | – | `alphabet` |
| 24 | letters | `letter-psi` | Psi (ψ Ψ) | – | `alphabet` |
| 25 | letters | `letter-omega` | Omega (ω Ω) | – | `alphabet` |
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
| 49 | nouns | `noun` | The noun | noun | `accents` |
| 50 | nouns | `article` | The article | article | `noun` |
| 51 | nouns | `case-nominative` | The nominative case | nominative | `noun` |
| 52 | nouns | `case-accusative` | The accusative case | accusative | `case-nominative` |
| 53 | nouns | `case-genitive` | The genitive case | genitive | `case-nominative` |
| 54 | nouns | `case-dative` | The dative case | dative | `case-genitive` |
| 55 | nouns | `case-vocative` | The vocative case | vocative | `case-nominative` |
| 56 | nouns | `gender-masculine` | The masculine gender | masculine | `noun` |
| 57 | nouns | `gender-feminine` | The feminine gender | feminine | `gender-masculine` |
| 58 | nouns | `gender-neuter` | The neuter gender | neuter | `gender-masculine` |
| 59 | nouns | `adjective` | The adjective | adjective | `noun`, `gender-masculine`, `gender-feminine`, `gender-neuter` |
| 60 | nouns | `comparative` | The comparative | comparative | `adjective` |
| 61 | nouns | `superlative` | The superlative | superlative | `comparative` |
| 62 | nouns | `numeral` | Number words | numeral | `adjective` |
| 63 | nouns | `proper-name` | Proper names | proper name | `noun` |
| 64 | nouns | `indeclinable` | Words that never change | indeclinable, letter | `proper-name`, `case-genitive` |
| 65 | pronouns | `person-1st` | The first person | 1st person | `noun` |
| 66 | pronouns | `person-2nd` | The second person | 2nd person | `person-1st` |
| 67 | pronouns | `person-3rd` | The third person | 3rd person | `person-2nd` |
| 68 | pronouns | `number-singular` | The singular | singular | `person-1st` |
| 69 | pronouns | `number-plural` | The plural | plural | `number-singular` |
| 70 | pronouns | `pronoun` | The pronoun | – | `noun`, `person-3rd`, `number-plural` |
| 71 | pronouns | `pronoun-personal` | The personal pronoun | personal pronoun | `pronoun`, `case-nominative`, `case-genitive`, `case-dative`, `case-accusative` |
| 72 | pronouns | `pronoun-demonstrative` | The demonstrative pronoun | demonstrative pronoun | `pronoun-personal`, `gender-masculine`, `gender-feminine`, `gender-neuter` |
| 73 | pronouns | `pronoun-relative` | The relative pronoun | relative pronoun | `pronoun-demonstrative` |
| 74 | pronouns | `pronoun-interrogative` | The interrogative pronoun | interrogative pronoun | `pronoun-relative` |
| 75 | pronouns | `pronoun-indefinite` | The indefinite pronoun | indefinite pronoun | `pronoun-interrogative` |
| 76 | pronouns | `pronoun-reflexive` | The reflexive pronoun | reflexive pronoun | `pronoun-personal` |
| 77 | pronouns | `pronoun-possessive` | The possessive pronoun | possessive pronoun, possessor | `pronoun-reflexive` |
| 78 | pronouns | `pronoun-reciprocal` | The reciprocal pronoun | reciprocal pronoun | `pronoun-reflexive` |
| 79 | pronouns | `pronoun-correlative` | The correlative pronoun | correlative pronoun | `pronoun-relative`, `pronoun-demonstrative` |
| 80 | pronouns | `pronoun-correlative-interrogative` | The correlative or interrogative pronoun | correlative or interrogative pronoun | `pronoun-correlative`, `pronoun-interrogative` |
| 81 | prepositions | `preposition` | The preposition | preposition | `case-genitive`, `case-dative`, `case-accusative` |
| 82 | verbs | `verb` | The verb | verb | `person-1st`, `person-2nd`, `person-3rd`, `number-singular`, `number-plural` |
| 83 | verbs | `tense-present` | The present tense | present | `verb` |
| 84 | verbs | `tense-imperfect` | The imperfect tense | imperfect | `tense-present` |
| 85 | verbs | `tense-future` | The future tense | future | `tense-present` |
| 86 | verbs | `tense-aorist` | The aorist tense | aorist | `tense-imperfect` |
| 87 | verbs | `tense-perfect` | The perfect tense | perfect | `tense-aorist` |
| 88 | verbs | `tense-pluperfect` | The pluperfect tense | pluperfect | `tense-perfect` |
| 89 | verbs | `second-tenses` | Second aorists and perfects | second | `tense-aorist`, `tense-perfect` |
| 90 | verbs | `voice-active` | The active voice | active | `verb` |
| 91 | verbs | `voice-middle` | The middle voice | middle | `voice-active` |
| 92 | verbs | `voice-passive` | The passive voice | passive | `voice-active` |
| 93 | verbs | `voice-middle-or-passive` | The middle or passive voice | middle or passive | `voice-middle`, `voice-passive` |
| 94 | verbs | `voice-middle-deponent` | The middle deponent | middle deponent | `voice-middle-or-passive` |
| 95 | verbs | `voice-passive-deponent` | The passive deponent | passive deponent | `voice-middle-deponent` |
| 96 | verbs | `voice-middle-or-passive-deponent` | The middle or passive deponent | middle or passive deponent | `voice-passive-deponent` |
| 97 | verbs | `voice-middle-significance` | A middle meaning in an active form | middle significance | `voice-middle` |
| 98 | verbs | `voice-impersonal-active` | The impersonal active | impersonal active | `voice-active` |
| 99 | verbs | `voice-none` | A verb with no voice | no voice | `voice-active` |
| 100 | verbs | `mood-indicative` | The indicative mood | indicative | `tense-present`, `voice-active` |
| 101 | verbs | `mood-imperative` | The imperative mood | imperative | `mood-indicative` |
| 102 | verbs | `mood-subjunctive` | The subjunctive mood | subjunctive | `mood-indicative` |
| 103 | verbs | `mood-optative` | The optative mood | optative | `mood-subjunctive` |
| 104 | verbs | `mood-infinitive` | The infinitive | infinitive | `mood-indicative` |
| 105 | verbs | `mood-participle` | The participle | participle | `mood-infinitive`, `case-nominative`, `case-genitive`, `case-dative`, `case-accusative`, `gender-masculine`, `gender-feminine`, `gender-neuter`, `adjective` |
| 106 | verbs | `mood-participle-imperative` | The participle with the sense of a command | imperative-sense participle | `mood-participle`, `mood-imperative` |
| 107 | joiners | `conjunction` | The conjunction | conjunction | `noun`, `verb` |
| 108 | joiners | `particle` | The particle | particle | `conjunction` |
| 109 | joiners | `adverb` | The adverb | adverb | `adjective`, `verb` |
| 110 | joiners | `negative` | The negative | negative | `particle` |
| 111 | joiners | `interrogative` | Words that ask a question | interrogative | `particle` |
| 112 | joiners | `conditional` | The conditional | conditional | `conjunction`, `mood-indicative`, `mood-subjunctive` |
| 113 | joiners | `interjection` | The interjection | interjection | `particle` |
| 114 | joiners | `attic-form` | Attic spellings | Attic form | `verb` |
| 115 | joiners | `poetic` | Poetic forms | poetic | `attic-form` |
| 116 | joiners | `crasis` | Two words run together | crasis | `conjunction`, `punctuation` |
| 117 | joiners | `aramaic` | Aramaic words | Aramaic word | `indeclinable` |
| 118 | joiners | `hebrew` | Hebrew words | Hebrew word | `indeclinable` |

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

An approach's order is not bound by the ladder's `needs`: BMA Tutor teaches the aorist before the genitive. A story that must
not meet an idea before what it rests on takes `ideasBelow(id)` as well.

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
