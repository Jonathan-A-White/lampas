# Layout: the sentence diagram

Which file holds what for the sentence diagram (the epic mw-souyao): a verse worked out as a tree by the tutor, kept, and drawn as a Reed-Kellogg diagram that scrolls sideways, every word a tap target. The renderer (mw-souyao.1) is proven on hand-written fixtures; the grind that makes the tree, its request and the kept diagrams are mw-souyao.2; the Verse view's Diagram action and its pane are mw-souyao.3. A story that adds a file of `src/diagram/` writes its line here, in the same form (the path, then `#` and what it holds; a continuation line starts `#   `), never in CLAUDE.md.

```
src/diagram/types.ts      # the tree the grind answers with: Diagram {clauses: ClauseEntry[]}, ClauseEntry {clause, joinedBy?}, Clause {subject, verb, complement?}, Slot {words, modifiers}, the three Modifier kinds ('word',
#   'prepositional', 'clause' with an optional connector), Complement {kind: 'direct-object' | 'indirect-object' | 'predicate-nominative' | 'predicate-adjective', slot}, TokenRef {i} | {implied};
#   DiagramWords: the words {i} indexes, each {text, chunk} (English, split from the chapter's chunks) or {text, word} (Greek, the verse's own word index).  A passage's words also carry `verse`. The grind's answer schema mirrors it
src/diagram/validate.ts   # validateDiagram(tree, wordCount) -> {ok: true} | {ok: false, faults}: THE RULE, every word sent appears exactly once across the tree, and each fault is named (out-of-range, used-twice, missing,
#   empty-subject, empty-verb) with where in the tree. An implied-only subject (a Greek verb's ending, an English imperative) is allowed; so is an implied-only verb
src/diagram/layout.ts     # layoutDiagram(tree, words, measure) -> {width, height, segments, labels}, pure: positions only, from a measure(text) width, nothing scaled (jsdom tests pass a fixed measure). Segments are kinds
#   (base, bar-full, bar-half, bar-predicate, modifier, foot, prep-slant, object-line, indirect-slant, join, step); labels carry their word's index (none when implied), their role and clause
src/diagram/ReedKellogg.tsx # <ReedKellogg diagram words mode reference onWord measure? lit?> (lit: a word index or a set of them to light, each data-lit: the lesson's right word, or the words a grammar card teaches): the layout as one SVG (role img, 'Sentence diagram of Colossians 3:1, English') with a button over each word, in a box that
#   scrolls sideways (overflow-x-auto, which useChapterSwipe skips); implied words are text in parentheses, no button; Greek labels carry GREEK_LANG; the face is measured from a probe span by canvas
src/diagram/handwritten.ts # the builders of a diagram written by hand, pure: w, slot, hang, prep, understood(word) (an implied slot), english(...texts), greek(...[word, text]) (the verse's own words). types.ts WrittenDiagram {reference, verse, mode, words, diagram}
#   is the shape of one: the lesson's LessonStep extends it, and so does a grammar card's diagram (src/data/grammar/teach/types.ts CardDiagram, plus `lit: number[]`, the words the card teaches, drawn on the idea sheet under 'In a diagram', mw-5r3p30.791,
#   docs/layout/grammar.md). Grammar data imports this file and types.ts, never lesson.ts: the lesson stays optional
src/diagram/lesson.ts     # the optional lesson 'How to read a sentence diagram' (mw-q6t5tvn.1): LESSON_STEPS, nine {title, text, reference, verse, mode, words, diagram, check: {role, answer}} (one Reed-Kellogg convention a step, each on a real verse
#   or part of one, the diagram written by hand here and never asked of the tutor; the last is the Weave's Colossians 3:1, Greek words in the lines), checkPrompt(step) = 'Tap the <role>', and what the phone keeps in localStorage with no Dexie bump:
#   'lampas.diagram-lesson' = 'done' (lessonDone, keepLessonDone), 'lampas.diagram-lesson.step' (lessonStep, keepLessonStep; Done forgets it) and 'lampas.diagram-lesson.invite' = 'dismissed' (lessonInvited, keepInviteDismissed). Order: base line, a describing word, direct object, understood subject, predicate nominative,
#   indirect object (the tree has one complement a clause, so its example has no direct object), preposition, two clauses joined, Greek
src/diagram/DiagramLesson.tsx # <DiagramLesson/> at #/diagram-lesson (Route 'diagram-lesson', SCREEN_NAMES, a tutor place): the title, 'Step N of M', the step's sentences, then the check ('Tap the <role>': a right tap 'Right.', a wrong one lights the right word through ReedKellogg's `lit`), then the diagram drawn by ReedKellogg (same face,
#   same sideways scroll; the check is above it so a tall diagram never pushes it out of sight), and Back and Next in a footer pinned under the scroll box (AskTutor.tsx LIFT raises the round Ask button above it; tests/e2e/diagram-lesson.spec.ts at 390x844); the last step's Done keeps the lesson done and leaves for where he came from (history.back when the trail has an entry behind,
#   else the Reader), and so does ‹ Leave, which keeps the step reached (every Next/Back keeps it). Optional: nothing in the Goal, the ladder, Review or Today names it (tests/unit/diagram-lesson.test.ts greps src/ outside src/diagram/); it is reached by its address, the tutor, or the Diagram pane's 'How to read this'
src/diagram/request.ts    # buildDiagramRequest(chapter, verses, view) -> {request, words}: the sentence-diagram grind's input ({ref, lang, words: [{i, text, chunk | lemma, parse}], greek (English only: the verse's Greek with parse),
#   faults (a second ask only)}) and the DiagramWords the renderer indexes; English words are each chunk's words split on spaces with the marks stripped, Greek words verse.g with the marks stripped (an elision's apostrophe stays); a passage
#   counts on through its verses, `chunk`/`word` stay within the verse and each word carries its `verse`; diagramReference names the unit ('Colossians 3:1-2')
src/diagram/fetchDiagram.ts # fetchDiagram(chapter, verses, view, {redraw, key, signal, ask}) -> {ok: true, diagram, words, kept} | {ok: false, faults}: the kept diagram (repositories/diagrams.ts, db v31) unless redraw, else askGrind('sentence-diagram')
#   with the answer guard isDiagramAnswer, validateDiagram, one more ask with the faults on a fault, then the faults (no throw, nothing kept); a good tree is kept before it is returned. `ask` is a seam for a fake askGrind
grinds/sentence-diagram.json + .instructions.md + .input.schema.json + .answer.schema.json  # the grind (sonnet, high): its own instructions file, under 12,000 bytes (tests/unit/sentence-diagram-grind.test.ts); the answer schema mirrors types.ts with
#   $defs and $ref (the tree is recursive; tests/support/schema-validate.ts follows '#/$defs/<name>'); grinds/examples/sentence-diagram/col-3-1-english.json and -greek.json are what request.ts builds for Colossians 3:1 (the mill cannot run a new kind
#   before it lands, rig memory mw-t3xu9a.8: the first run is `mw grist eval lampas sentence-diagram --example <name>` after landing)
src/diagram/DiagramPane.tsx # <DiagramPane chapter verse view onLook>: the Verse view's Diagram action (mw-souyao.3), drawn under the row when the action is diagram (VerseView keys it by the unit and the view). unitVerses(chapter, verse) are the unit's verses;
#   fetchDiagram asks (the kept diagram, else the tutor); while waiting 'Working it out…' (role status, with seconds); then ReedKellogg, Redraw (fetchDiagram redraw: the old picture stays, dimmed, until the new one comes) and 'Drawn by the tutor; Redraw if a word sits wrong';
#   a tree that broke THE RULE twice or a TutorError is 'The tutor could not diagram this verse', why (TutorError.message, or how many faults) and Try again. A tapped word is lookupOfWord(verses, word): English, {words: the chunk's Greek words, english: the chunk's text, fromEnglish: true};
#   Greek, {words: [that word], english: its chunk, fromEnglish: false} - what Reader.tsx's own taps give (VerseText). THE WIRING: Reader.tsx passes VerseView `chapterText` and `onLook={setLookup}`, so the tap opens the Reader's one WordSheet (over the Verse view, z above it); Back (ui/sheetBack)
#   closes the sheet and the pane under it is untouched, still drawn
#   THE DOOR TO THE LESSON (mw-q6t5tvn.2): under every drawn diagram a quiet 'How to read this' button beside 'Drawn by the tutor; Redraw if a word sits wrong' navigate('diagram-lesson'); Done there is history.back to the same Verse view, whose kept diagram
#   draws with no second ask. Above a drawn diagram (never on 'Working it out…' or the error face) one line, 'New to diagrams? Learn to read one, about 3 minutes', with Learn (opens the lesson) and Not now (keepInviteDismissed: 'lampas.diagram-lesson.invite' =
#   'dismissed', localStorage) shows while lessonInvited() (the lesson not done and not dismissed); Learn does not dismiss, so leaving the lesson early keeps the invitation. tests/e2e/sentence-diagram.spec.ts (390x844) proves both fit above and below the sideways box
src/diagram/weave.ts      # weaveDiagramWords(words, verses, wovenOf) -> DiagramWords (mw-souyao.5): the English diagram as the Weave shows the verse. A chunk the Weave shows in Greek is drawn as its Greek words (`w.t`, as the Reader's woven text shows them),
#   the first of its English words taking them one each (the last the Greek that is left, when the Greek is longer); the chunk's other English words become text '' (no button, no label) and every changed word carries `weft` (the verse's Greek word indexes drawn there; [] for
#   the emptied ones). No new ask and no new cache: the tree is the English one, DiagramPane applies this at draw time, so a change of Weave redraws from the tree it holds. VerseView takes `wovenChapter` (Reader.tsx passes its `woven`, the weave of every verse of the
#   chapter, null when off or in the Greek view) to DiagramPane's `woven`. A tap on a woven word opens the WordSheet on those Greek words (fromEnglish false), as a tap on the woven text does. ReedKellogg sets a woven word in the Greek face with GREEK_LANG
#   (`data-woven`), measures it in the Greek face (a label with a Greek letter is measured by a second probe, the rest by the English one), and draws no button for an emptied word. Where a chunk's one Greek word lands is the first of its English words, which may be
#   a word the tree puts in another slot than the Greek's own role (the 'you' of 'you have been raised with' carries the verb): the tap opens the same Greek word whichever
tests/fixtures/diagrams/col-3-1-english.json, col-3-1-greek.json  # Colossians 3:1 in each mode: {reference, mode, words, diagram}; the words are read from public/data/col/3.json (tests/unit/diagram-validate.test.ts
#   checks it), the diagram is hand-written; they are the sentence-diagram grind's two example answers
tests/fixtures/diagrams/lesson-steps.ts  # EXPECTED_STEPS: the lesson's nine steps as the story sets them out (convention, verse, mode, the word of the right tap, the line kinds drawn), apart from lesson.ts so tests/unit/diagram-lesson.test.ts fails on a dropped one
features/diagram-lesson.feature  # the lesson through the whole app (features/steps/diagram-lesson.steps.tsx): opens at step 1, a right and a wrong tap, Next to Done kept and back where he came from, Back, leaving at step 3 and opening at step 3, nothing else names it
tests/support/diagram-fixtures.ts  # loadFixture(mode) and the little slots the layout tests build
features/sentence-diagram.feature  # the renderer on both fixtures and the Verse view's Diagram through the whole app with a fake mill (features/steps/sentence-diagram.steps.tsx); tests/e2e/sentence-diagram.spec.ts at 390x844 (the row, the sideways box, the word sheet, no second ask)
```

## The Reed-Kellogg conventions, as drawn

- A clause stands on a **base line**: the subject, then a **full bar** through the line, then the verb. What completes the verb follows: a **half bar** (above the line only) before a direct object; a bar **slanted back** toward the verb, standing on the line, before a predicate nominative or predicate adjective. An indirect object has no bar: it hangs under the verb on a slanted line.
- A word that modifies another (an article, adjective, adverb) is on a **slanted line** that leaves the line under the word it modifies, sloping down and to the right, and ends in a short level foot line that carries it. A modifier's own modifiers hang under it the same way.
- Several modifiers of one word hang one below another, the first listed nearest the word, each leaving the line a little further left than the one above, so no line crosses another.
- A **prepositional phrase** is a slanted line (the preposition beside it) and, from the slant's foot, a level line carrying the object, with the object's modifiers hanging under it.
- A **subordinate clause** has its own base line below, joined by a **dotted line** from the word it hangs on down to its verb, the connector word ('where', 'since') beside the dotted line.
- **Coordinate clauses** are stacked, joined by a dotted **step line** in the left margin that carries the conjunction.
- An **understood word** (the 'you' of an imperative, the subject a Greek ending carries) is in parentheses, and is not a button.
- Punctuation is not a word. The type is never shrunk: the picture is as wide as its labels and gaps add up to, and scrolls.

```
   (you) | strive                      a clause: subject, full bar, verb on the base line
   ------+-------------------------
          \
           \_______                    a word modifier: a slanted line, its foot line carries the word
            Therefore
          \
           \  for                       a prepositional phrase: the preposition by the slant,
            \______                    the object on a level line from the slant's foot
              things
          :
          :  since                     a subordinate clause: dotted line from the word it hangs on
          :                            down to its verb, the connector beside the dotted line
   you  | have been raised  \ ...       the clause on its own base line, below
   -----+-------------------
```
