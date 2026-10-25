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
src/diagram/ReedKellogg.tsx # <ReedKellogg diagram words mode reference onWord measure?>: the layout as one SVG (role img, 'Sentence diagram of Colossians 3:1, English') with a button over each word, in a box that
#   scrolls sideways (overflow-x-auto, which useChapterSwipe skips); implied words are text in parentheses, no button; Greek labels carry GREEK_LANG; the face is measured from a probe span by canvas
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
tests/fixtures/diagrams/col-3-1-english.json, col-3-1-greek.json  # Colossians 3:1 in each mode: {reference, mode, words, diagram}; the words are read from public/data/col/3.json (tests/unit/diagram-validate.test.ts
#   checks it), the diagram is hand-written; they are the sentence-diagram grind's two example answers
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
