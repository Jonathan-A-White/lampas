# The Septuagint derivation: lemma and parsing for Swete's Greek

How Lampas derives a lemma and a parsing for each word of Swete's Septuagint, written so that anyone can rerun it and check it. The method was
measured by the probe (`docs/sources/lxx-derivation-probe.md`, story mw-cbsbw9q.3, whose script `scripts/lxx-derivation-probe.mjs` stays as its
record); this is the tested pipeline under `scripts/lxx/` (story mw-u2w5klk.1 onward). What the files may be shared under is in `data/lxx/README.md`
and `data/lxx/LICENSE` (MIT for Lampas's own data; STEPBible credited, CC BY 4.0).

<!-- toc -->

- [The layers](#the-layers)
- [Layer 1 in detail](#layer-1-in-detail)
- [Layer 2 in detail](#layer-2-in-detail)
  - [A lone candidate on thin support](#a-lone-candidate-on-thin-support)
  - [Names no lexicon has: the form as its own lemma](#names-no-lexicon-has-the-form-as-its-own-lemma)
  - [The two books over the bar on words with no candidate (B9)](#the-two-books-over-the-bar-on-words-with-no-candidate-b9)
  - [A name written with a capital mid-clause is not the common word its letters spell](#a-name-written-with-a-capital-mid-clause-is-not-the-common-word-its-letters-spell)
- [The agreement check](#the-agreement-check)
  - [Analogy's readings beside a thin lone candidate](#analogys-readings-beside-a-thin-lone-candidate)
  - [An address: the vocative read from the verse](#an-address-the-vocative-read-from-the-verse)
  - [A preposition's case: the word it governs](#a-prepositions-case-the-word-it-governs)
- [Swete's tokens](#swetes-tokens)
- [The bar](#the-bar)
  - [The chapter bar](#the-chapter-bar)
- [The known-answer run](#the-known-answer-run)
- [The choices file](#the-choices-file)
- [A model session](#a-model-session)
- [Morpheus, the second method](#morpheus-the-second-method)
  - [The sweep: what the first real run found](#the-sweep-what-the-first-real-run-found)
- [The annotation file](#the-annotation-file)
- [The report](#the-report)
- [On the word card](#on-the-word-card)
- [The re-count after the three fixes](#the-re-count-after-the-three-fixes)
- [The files](#the-files)
- [The commands](#the-commands)
  - [The deploy](#the-deploy)
- [The sources](#the-sources)
- [Checking it](#checking-it)
- [What the move from the probe changed](#what-the-move-from-the-probe-changed)

<!-- /toc -->

## The layers

Each word is looked up in three layers, in order. A word keeps the layer that gave its answer and a confidence.

| Layer | What it does | State |
| --- | --- | --- |
| Layer 1, TAGNT form | The word's form as STEPBible's TAGNT has it anywhere in the New Testament, taken when TAGNT gives it one analysis, or one with at least 95% of 20 or more words | built (`scripts/lxx/tagnt.ts`, `derive.ts`) |
| Layer 2, parser | For a form the New Testament lacks: ending rules learned from TAGNT's (form, lemma, parsing) triples, proposing only lemmas in TBESG; then Swete's other spellings; then analogy. Taken when one candidate is left on enough support (a rule's stem support, analogy's pairs; 'A lone candidate on thin support'), or one with 90% of the support | built (`scripts/lxx/parser.ts`, `tbesg.ts`, `derive.ts`) |
| The agreement check, layer 2a | Before the model: a settled nominative in an address becomes the vocative, as TAGNT tags one ('An address'); a settled word right after a preposition, in a case the preposition does not take, takes the one reading of its own that is in a case it takes, or goes to the model ('A preposition's case'); an answer whose ending two cases or genders share is demoted to its candidates; a name the New Testament has, written here in lower case, goes to the model; within a verse an article, adjective or participle must agree with its noun, a settled pair that does not is a break (both to the model), and a word left with exactly one candidate that agrees with its settled neighbours takes it as layer 2a | built (`scripts/lxx/agreement.ts`, `derive.ts`) |
| Layer 3, model choice | A model reads the verse and chooses among the candidates, or guesses (marked) when there are none; where Morpheus (below) knows a form that has no candidate, its analyses are the candidates, and where it knows a form with one thin candidate its readings are put beside or in place of it | the choices file is read, scored and joined (`scripts/lxx/choices.ts`, 'The choices file'); the runner that lists a book's pending words in batches and takes the choices back is built (`scripts/lxx/batches.ts`, `pending.ts`, `choose.ts`, 'A model session'); no paid API: a Builder's own session |

A word that layers 1 and 2 and the agreement check do not settle, and that no choice has settled, is **pending**, with its candidates. A book's annotation file is written only when none is pending and the rest of the bar is met ('The bar').

## Layer 1 in detail

`scripts/lxx/tagnt.ts` reads every word row of the two TAGNT files (`readTagnt`) and builds the form index (`formIndex`):

- **The key** (`keyOf`, `scripts/lxx/swete.ts`): punctuation and brackets dropped, lower case, a grave accent read as acute, an enclitic's second
  accent dropped (`ἐξέθρεψέν με` is looked up as `ἐξέθρεψεν`), an elision mark written `’`, NFC. A noun's semantic tags are dropped from TAGNT's code
  (`N-NSM-T` is `N-NSM`): they say what a name refers to, not how it is inflected.
- **Capitals with no accents** (`ΕΝ ΑΡΧΗ` at a book's opening) are matched on a second key with every mark dropped and final sigma as sigma (`bareOf`).
- **The 95%-of-20 rule** (`settle`): the form's first analysis is taken when it is the only one, or when it has at least 95% of 20 or more New Testament words.
  Confidence 0.97 for one analysis seen three times or more, 0.90 for one seen once or twice, the share x 0.97 for a dominant one.
- **Swete's spellings** (`spellings`): when the form is not found and the parser (layer 2) finds nothing for it either, other spellings are tried once
  each, in turn, on the second key: ει read as ι (`Δαυείδ`), ι read as ει (`ἴδεν` as `εἶδεν`), the movable ν added after -σι, -ξι, -ψι or -ε (`πᾶσι` as
  `πᾶσιν`) or dropped after them. The first that the New Testament has gives the candidates as a layer-1 answer, and the row says which (`notes`); a
  spelling the New Testament lacks is parsed, and the first the parser analyses gives layer 2's candidates.

A form with several analyses and none dominant is pending with its candidates (`several analyses: for the model`). A form the New Testament lacks goes
to layer 2.

## Layer 2 in detail

`scripts/lxx/parser.ts` is the paradigm parser, trained on the same TAGNT rows as layer 1 (a hidden book left out of both) with TBESG's lemmas
(`scripts/lxx/tbesg.ts`). On the whole New Testament it learns 2,083 ending rules from 18,914 distinct (form, lemma, parsing) triples; TBESG gives 10,941
one-word lemmas. The run prints these counts. Letters are compared without accents or breathings, in lower case, final sigma as sigma (`bareOf`).

- **Undoing the augment, reduplication or a compound's prefix** (`unaugment`). A form is read as it stands and also: with `ἐρρ-` as `ρ-`; with a syllabic
  `ε-` before a consonant dropped (`ἐποίησεν`, `ποιησ-`); with a temporal augment read back (`ηὐ-` as `εὐ-` or `αὐ-`, `η-` as `α-`, `ε-` or `αι-`, `ει-` as
  `ε-`, `ω-` as `ο-`); with a reduplication dropped (a consonant, ε, and the same consonant or its aspirate: `πεπληρ-`, `τεθ-`); and inside a compound of one
  of 18 prepositions, with the augment after the prefix undone, the prefix written whole and assimilated where Greek assimilates it (`ἐπεφέρετο` as
  `επιφερετο`, `ἐνέβλεψεν` as `εμβλεψεν`, `συνεκάλεσεν` as `συγκαλεσεν`). Each reading is tried once.
- **A rule** (`ruleOf`, `trainRules`). Each triple is matched against its lemma by the reading that shares the most letters with it (two at least); what is
  left on each side is the rule, kept with the reading's kind: `ἐπεφέρετο` / `ἐπιφέρω` / V-IPI-3S is 'with the augment undone, -ετο for the lemma's -ω is
  V-IPI-3S'. A rule's weight is the number of New Testament lemmas that show it.
- **Parsing a form** (`parse`). For each reading and each ending of up to 12 letters (leaving two), each rule for that ending puts the lemma's ending on the
  stem. A candidate is kept only when the result is a **TBESG lemma** and the parsing **fits the lemma** (`fits`): the New Testament shows the lemma with
  that part of speech (and, for a noun, that gender), or else TBESG's row allows it: a noun's gender must be one the row gives (`G:N-M/F`), an adjective's
  row also takes an adverb, any other part of speech must match. A candidate's support is the weight of every rule that gives it, summed.
- **Analogy** (`byAnalogy`), only when the rules find nothing for the form or any of Swete's other spellings: a New Testament form sharing the form's
  first letters (four at least, the most first) gives its lemma, and its ending beside the form's ending gives the parsing, as other lemmas show that pair
  of endings (a form in `-ωσαν` beside a New Testament form in `-ω` takes the parsing other lemmas' `-ωσαν` forms have beside their `-ω`). The row notes `analogy: a sibling form in the New Testament`.
- **The 90% rule** (`settleParsed`): layer 2 takes the first candidate when it is the only one or has at least 90% of the support. Confidence 0.75 x its
  share. Otherwise the word is pending with every candidate (`several candidates: for the model`), or with none (`no candidate: for the model to guess`).
  An ending rule's only candidate is taken only on enough **stem support** (the next section); with less it is pending with that one candidate.
- **The order**: most support first, then by lemma and parsing (analogy: by parsing, then lemma), never by the order of the files.

- **Names that do not decline** (`indeclinableNames`, `nameCandidates` in `parser.ts`; `readTbesgNames` in `tbesg.ts`; story mw-u2w5klk.13). A name like Ἀδάμ has one form for every
  case, and the New Testament prints it in the cases it happened to need (Ἀδάμ: nominative, genitive, dative; never the accusative Genesis needs), so layer 1's
  analyses and the parser's single guess leave the right case out. A form written with a capital that is such a name takes **every case of its gender in the name's own lemma**
  (`N-NSM`, `-GSM`, `-DSM`, `-ASM`, `-VSM`, singular), as candidates after the others with the word `name` in the support column and the note `an indeclinable name: every case of
  its gender: for the agreement check or the model`. The test for a name that does not decline, from the data and in this order: (1) **TAGNT**: a lemma written with a capital, tagged
  a person or a place, whose every noun row is one spelling (bare letters) in at least two of the nominative, genitive, dative and accusative, and with no plural (a neuter needs the
  genitive or dative among them): Ἀδάμ, Ἐνώχ, Ἰακώβ; not Ἰησοῦς (Ἰησοῦν), not Ἰούδας (Ἰούδαν), not Μαγδαληνή (no name tag); (2) **TBESG**: a row with a capital lemma, a noun's part
  of speech or none, and `indecl.` in its text (or the part of speech N-PRI, the names found only in the Septuagint), for what TAGNT has too rarely: a TBESG row that lists two
  lemmas (`Καϊνάν, Καϊνάμ`) gives a name for each, and a lemma TAGNT shows declined is left out whatever TBESG's text says. The gender is TAGNT's, else the row's (`N:N-M-P`), else the
  article before `indecl.` in its text (`ὁ, indecl.`: Ἰωβήλ is masculine though its row gives no part of speech); where no source gives one, all three genders are offered (60 of
  the 209 names, 155 words in the Old Testament). A form that is no spelling of such a name but for which layer 1 or the parser proposed one in one case (Ἰωβέλ read as Ἰωβήλ
  `N-ASF`, by the rule -ελ for -ηλ) gets the same. A name this applies to is **pending** whatever layer settled it: a single case seen in the New Testament, or the parser's one
  candidate, says nothing of the case Genesis needs, so 195 Genesis words that were settled (174 in layer 1, 15 in layer 2, 6 by agreement: Ῥαχήλ 42, Ῥουβήν 13, Σήμ 12, Λάμεχ 7, Σήθ 6) now wait for the model; the
  agreement check settles 28 others that were pending, Ἀδάμ, Ἐνώχ and Ἰωβήλ among them, by their article. The test is `an indeclinable name offers every case of its gender (B6)` in `tests/unit/lxx-parser.test.ts`.

**Known weak spots.** In the probe's sample of the whole of Swete, 27.3% of the words whose form the New Testament lacks got no candidate at all: mostly
lemmas TBESG lacks, irregular stems the rules cannot reach from the lemma (`Γενηθήτωσαν` has no rule and no sibling with that pair of endings), and
lexicon entries that refuse the right parsing: TBESG lists `μακρότης` as masculine (`G:N-M`), so the feminine `μακρότητα` (Ps 22:6) gets nothing until the
lexicon is fixed or a later layer reads it (`ἄσφαλτος` is the same, masculine in TBESG and feminine in Gen 6:14). Names that TBESG and TAGNT lack are the largest of them
(story mw-u2w5klk.13): of the 17,800 words of the 39 books that have no candidate, 10,849 are names (`npm run lxx:batches -- --all`; 4,296 distinct forms), mostly names found
only in the Septuagint (`Γαιδάδ`, `Σελλά`, `Θόβελ`), and the rule for names that do not decline cannot reach them for want of a lemma (story mw-u2w5klk.19 gives those whose ending looks indeclinable their own form as the lemma: the next section). An ending two genders or cases share is settled by the 90% rule on the New Testament's evidence alone
(`ἕρπον[τι`, Gen 1:30, masculine where it goes with a neuter noun): the agreement check below demotes such an answer before the model.

### A lone candidate on thin support

Story mw-u2w5klk.28, from the hand audit of settled words (`docs/sources/lxx-settled-audit.md`): `ἐξῆρται` (Nah 2:1, ἐξαίρω `V-RPI-3S`) was settled as ἐξαρτάω `V-IAI-3S`,
the one candidate left, though the rule behind it (`-ει` as `-εω`, `V-IAI-3S`, with the augment undone) was learned from 33 lemmas and none of them a stem like `εξαρτα-`.
A rule's weight counts the lemmas that show it, whatever their stems; for a lone candidate that weight says little.

- **Stem support** (`Candidate.stemSupport`, `parse`; `trainRulesAndStems` keeps `RuleStems`): of the New Testament lemmas behind the rules that give a candidate, those whose
  stem ends as the candidate's own stem does, summed as support is. How a stem ends (`stemClass`): its last letter when that is a vowel (the vowel of a contract verb, `ποιε-` or
  `εξαρτα-`, which a rule's endings leave out), else one class for every consonant. Every letter apart was tried and left `ἀκολουθοῦντας` with none, for no `-εω` stem the New
  Testament shows ends in `θ`. Analogy's candidates have no stem support; they are read by their own support, below.
- **The rule** (`isThinLone`, `settleParsed`): an ending rule's only candidate is taken only when its stem support is at least `LONE_MIN_STEM_SUPPORT` (4). Below that the
  word is pending with that one candidate and the note `one candidate on thin support: for the agreement check or the model`. Analogy's readings are put beside it for the
  model only, and the check does not read them ('Analogy's readings beside a thin lone candidate', below).
- **The threshold, measured** (`npm run lxx:lone-support`, `scripts/lxx/lone-support.ts`): each of the New Testament's 27 books hidden in turn from the form index and the
  parser, over the 4,438 words whose form the other books lack and which the rules leave with one candidate, scored against TAGNT on lemma and full parsing. By stem support:
  0: 308 of 388 right (79.4%); 1: 625 of 795 (78.6%); 2: 291 of 336 (86.6%); 3: 238 of 257 (92.6%); 4: 191 of 195 (97.9%); 4 and above together 2,610 of 2,662 (98.0%), the bar's
  line for full parsing; 3 and above 97.6%. So 4.
- **The address rule** reads such a word as it read it settled: its guard, no settled finite verb of another person in the phrase (`An address`), counts a thin lone verb
  too, so `ὦπταί` (Exo 3:16, its one candidate ὀπτάω `V-IAI-3S`) keeps `θεὸς Ἀβραάμ` a nominative.
- **What it does on the 39 books** (`npm run lxx:derive -- --all --no-morpheus`, before and after): about 8,100 more words pending, nearly all from layer 2; none moves from one
  settled answer to another. `ἐξῆρται` is pending (its stem support 0); `ἄφρονος` (Ecc 2:16) is pending with its one candidate `A-GSF-C`, and its article `τοῦ` is left pending, not
  counted a break. Its right reading, `A-GSM`, was no candidate then (story .31 offers it beside). Gen 1 has 163 pending words (161 before), John 1 with John hidden settles 19 in layer 2 (25
  before). The words newly pending in the fixtures and the known-answer chapters were chosen by a blind reader (a fresh subagent given only the verse, the word and its
  candidates), each line marked `# blind subagent, mw-u2w5klk.28` in its file.
- **Analogy's lone candidate** (story mw-u2w5klk.30; `isThinLone`, `LONE_MIN_ANALOGY_SUPPORT`, `Candidate.analogy`): the same fault, found by the same sweep: analogy's one candidate was settled on any support, and is
  88.9% right on the New Testament, 73.3% at a support of 1. Analogy's support is the number of pairs of forms of one lemma that show the ending pair (`c pairs` in the note), not a stem's, so it is
  read as it stands. Measured as the rules' was (`npm run lxx:lone-support`, the rules left nothing, analogy gave one candidate: 700 words, 622 right, scored on lemma and full parsing; 698 are right on the lemma, so what
  analogy gets wrong is the parsing, a participle's or a perfect's shared ending, the second-aorist `2` and voice): support 1: 129 of 176 right (73.3%); 2: 91 of 104 (87.5%); 3: 65 of 69 (94.2%);
  4: 42 of 45 (93.3%); 5: 45 of 45; 6: 36 of 38; 7: 22 of 24; 8: 25 of 26; 9 to 15 100% bar one of 11 at 11. By *this support and above*: 1: 88.9%, 2: 94.1% (493 of 524), 3: 95.7%, **4: 96.0% (337 of 351)**,
  5: 96.4%, 8 and 9: 96.5%, the most any support gives. **No support reaches the bar's 98% but 63, on 6 words**, so unlike the rules' it cannot be had; 4 is the least from which they are right at least 96%
  together, and above it no support adds half a point, so **4**. This is two points short of the rules' line, and that line is the Governor's to confirm (`LONE_ANALOGY_MIN_SHARE`). Below it the word is pending with that one candidate and the same
  note (`one candidate on thin support: ...`), with the analogy note beside it. Several analogy candidates are weighed as before (the 90% rule is not touched).
  On the 39 books (`npm run lxx:derive -- --all --no-morpheus`, before and after): settled 354,992 and pending 121,137 before, 353,535 and 122,594 after: 1,463 settled words pending (1,378 analogy's thin words, mostly
  verbs, 1,203 of them, and 151 `Μωϋσῆς` in the dative or genitive, whose `-ῆ` ending one lemma shows; 85 neighbours, 83 of them an article whose noun went pending), 6 pending words settled by agreement (an article beside the thin `φύλαξ`),
  and 90 settled again by agreement under the same answer (layer 2 to 2a); no answer changed. The 12,000-word limit that would have called for a narrower form is far off; the wider forms would add 1,602 at a support below 5, and the
  narrower 973 below 3 and 634 below 2. Read by hand, 20 of the 1,559 words it touched (seed 20261104): 15 sent to the model that were right (a cost), 4 sent that were wrong (`Μωυσῆ` read as the dative
  where Exo 18:5 and Num 4:45 are genitive, `δύνησθε` as an aorist, `ἀπώσῃ` as a future after `μή`), 1 confirmed (settled again by agreement), none mended and none made wrong. Gen 1 has 168 pending words (163 before), John 1 with John hidden
  settles 16 in layer 2 (19 before; 25 before .28), and the two known-answer chapters score as before (Jhn.1 827 of 829 on the lemma, 823 on full parsing; Rom.8 650 and 645). The words newly pending in the fixtures and the known-answer
  chapters (seven; Jhn.1:22#10 for the fixture's own choices) were chosen by a blind reader (a fresh subagent given only the verse, the word and its candidates), each line marked `# blind subagent, mw-u2w5klk.30`.
- **Not changed, the same fault elsewhere**: the 90% rule's dominant candidate (93.1% right on the same New Testament measure, 1,223 of 1,314); the agreement check's settling of a thin word whose one reading agrees with its settled neighbours (layer 2a: right for all 32 and 34 words of John 1 and Romans 8 after the check, not measured over the
  whole New Testament). Layer 1 is clear: its support is New Testament words of the form itself. Morpheus's mapping, which left perfects unmapped, and Morpheus's being asked only of forms with no candidate, are story mw-u2w5klk.32's, next.
- **Morpheus's perfects, and Morpheus asked about a thin lone candidate** (story mw-u2w5klk.32; `mapAnalysis`, `weighMorpheus`, `withMorpheus`; 'Morpheus, the second method'). `ἐξῆρται` (Nah 2:1) is `ἐξαίρω V-RPI-3S` to Morpheus (`perf ind mp 3rd sg`), which the mapping left out as a perfect, and
  Morpheus was asked only of forms with no candidate, never of one with a thin lone candidate, so .28 could leave it pending only. Now (1) **the perfects are mapped** (TAGNT's `R`, 'The mapping'), and (2) **a form whose one candidate is thin (`isThinLone`: an ending rule's on a stem support under 4,
  or analogy's on a support under 4) is asked of Morpheus too**, as the first pass leaves it before the agreement check, and its answer is weighed with the rule's (`weighMorpheus`):
  - Morpheus does not know the form, has no reading the mapping covers, or reads what the rule reads (the same lemma by its letters and the same parsing): **nothing changes**, the word is the thin lone one it was;
  - Morpheus has mapped readings, **every one a perfect**, none sharing the rule's lemma or parsing, and left no reading out: it knows the form whole as a tense the ending rules do not make, so **the rule's candidate is set aside** (and analogy's beside it) and Morpheus's readings are the word's candidates (`replaces`;
    the note `one candidate on thin support, set aside: Morpheus knows the form as a perfect: for the agreement check or the model`). `ἐξῆρται` is `ἐξαίρω V-RMI-3S | V-RPI-3S`, never `ἐξαρτάω`. The address rule's guard counts such a word as settled, as it counts a thin lone one (`ὦπταί`, Exo 3:16, is `ὁράω V-RPI-3S`, and keeps `θεὸς Ἀβραάμ` a nominative);
  - otherwise (Morpheus left a reading out, shares the lemma or the parsing, or reads it as anything but a perfect) **its readings are put beside the rule's candidate** (`beside`, as analogy's are; the note `one candidate on thin support, and Morpheus's readings beside it: for the model`): the model sees them, the agreement check and the address rule do not, and the word is still a thin lone one.
  Morpheus settles nothing by itself. **Why only perfects take the place**: a first version set the rule's candidate aside whenever Morpheus knew the form whole and shared neither lemma nor parsing, on 351 words: 20 were perfects, and those read right (`ὁράω` for `ὀπτάω`, `ἐξαίρω` for `ἐξαρτάω`, `περιζώννυμαι` perfect participles, `οἶδα`); the rest were
  mostly a spelling that Morpheus reads as another word (Swete's `δουλίαν` as the adjective `δούλιος` for the noun `δουλεία`, `λατρίαν` as `λάτριος`, `αἰγῶν` as `αἴξ` for the adjective `αἴγεος`), and five words the agreement check had settled right (`δουλεία` three times, `λατρεία` twice) were settled wrong. Those stay beside.
  **The cache**: it holds the mapped readings, so a file made before the perfects were mapped holds them `unmapped`. It carries a line `# mapping 2` (`MAPPING_VERSION`, `cacheText`); `ensureCache` asks a file without the current number again whole once Morpheus can run, and reads it as it is when it cannot. Raise the number when `mapAnalysis` changes what it returns for a form.
  **On the 39 books** (`sg docker -c 'npm run lxx:derive -- --all'` on the Laptop, before and after, the derived and pending files compared word by word; the Morpheus cache rebuilt, 10,698 forms asked before and 16,688 after): settled 353,911 and pending 122,218 before, settled 353,938 and pending 122,191 after. 2,828 words changed:
  1,873 thin lone words have Morpheus's readings beside them, 20 have a perfect in place of their candidate, 804 words with no candidate have Morpheus's perfects as candidates, 39 that had Morpheus's candidates have more, and 27 pending words are settled by the agreement check (17 perfect participles and 10 articles beside them; `τελευτάω V-RAP-DSF` in Lev 21:11 and Num 6:6, `ἐνδύω V-RAP-ASM` in Eze 9:3);
  none of the 65 words settled before changes its answer (their candidates grow), and none is settled and then pending. The words with no candidate fall from 11,546 to 10,725 (`lxx:morpheus-check --coverage`). The 12,000-word limit is not near: the fix adds no pending word. With `--no-morpheus` the output is byte-identical to before (settled 353,535, pending 122,594).
  The known-answer runs do not use Morpheus: Jhn.1 827 of 829 on the lemma and 823 on full parsing, Rom.8 650 and 645, before and after, so no word is newly pending in a known chapter or a fixture and no blind reader was needed. `lxx:morpheus-check --known Jhn.1 Rom.8`: TAGNT's answer among Morpheus's readings for 1,074 of the 1,271 words it offered readings for (84.5%), 1,063 of 1,255 (84.7%) before.
  Read by hand, 20 of the 2,828 (seed 20261104, `mulberry32` over the words in the books' order): 14 mended (the right reading is now a candidate where it was not: `ζήσομαι` as `V-FMI-1S`, `κανῷ` as `κάνεον` where it was `Κανᾶ`, `ποτιεῖς` as `V-FAI-2S`, `κεχρισμένα`, `κεκλωσμένην`, `κατακεκαυμένος`, `πεφύλακα`, `ἐπεσκεμμένοι`, `περιτετειχισμένα` as perfects, `ἀμφίασιν` as `N-ASF`, `αἰγῶν` as `αἴξ`, `λούσεται`, `συνελκύσῃς`, `προφυλάξομαι`),
  5 confirmed (the right reading was already a candidate and Morpheus added a near one or noise: `ἀπώσω`, `ἀποστραφήσεται`, `χαρίτων`, `ἀκούσεται`, `λογισθήσεσθε`), 1 unhelped (`Μωυσῆ` in Num 36:13, a genitive, where Morpheus adds a vocative); none sent to the model that was right, none made wrong.
  **The tenses and moods `mapAnalysis` still leaves unmapped**: the pluperfect (TAGNT's `L`, `2L`: 43 forms of the cache have only that) and the future perfect (11), the dual, a comparative or superlative, a dialect without Attic (the largest, 496 forms), an unaugmented form, an aorist whose table says neither first nor second (`ath_secondary`), a pronoun. The perfect imperative and infinitive are mapped (`V-RAM`, `V-RAN`).

### Names no lexicon has: the form as its own lemma

Story mw-u2w5klk.19 (B8). Of the 17,800 words of the 39 books with no candidate, 10,849 were names in neither TAGNT nor TBESG, every one a forced guess at the cost of a model's
reading for no information. **A capitalised word that still has no candidate after layers 1 and 2, that opens no verse or clause, and whose form ends as a Hebrew name does, takes
its own form as its lemma**: `formNameLemma` and `formNameCandidates` in `parser.ts`, applied in `derive.ts` (`withFormNames`) to the words layers 1 and 2 left without a candidate
(Morpheus's candidates, when its cache is there, come first: a word it knows is not touched). Γαιδάδ (Gen 4:18), Σελλά (Gen 4:19), Θόβελ (Gen 4:22) and Εὑειλάτ (Gen 2:11) are such words.

| The form ends in | Taken | Why (the numbers are on the New Testament's own names: rows of TAGNT that are a noun tagged a person or a place, capitalised, that this rule takes; the form's letters equal the lemma's) |
| --- | --- | --- |
| a consonant other than ς and ν (Γαιδάδ, Θόβελ, Ἰεροβοάμ) | yes: 4,563 words (1,669 forms) | the indeclinable look; Greek has no other word ending so but ρ, ξ, ψ (a capital name in them is a Hebrew one in the Septuagint) |
| ν, the vowel before it an α or ω with an acute or grave (Ἰωναθάν, Δάν, Χεβρών) | yes: 1,059 words (314 forms) | a Greek name's accusative is -ον, -ην, -ιν, -υν, or has its accent earlier (Ἰούδαν), or a circumflex (-ῶν, -ᾶν); of the New Testament's -ών with an acute 37 of 43 are their own lemma, of -άν 4 of 10 (few: where the Septuagint's already settled -άν names are their own lemma 44%, the rest being Greek words that end so; the model chooses) |
| α, ι, η, ω or υ with the acute or grave on that last vowel (Σελλά, Νεφθαλεί, Ἰερειχώ, Βαναιού) | yes: 2,154 words (1,199 forms) | a Greek name's nominative is not accented on its last syllable; the New Testament's -ά 73%, -ί 75%, -ώ 100%, -ή 100% |
| ς | **no**: 1,119 words | Greek declines it: the nominative, but also the genitive of -ις and -ων names (Βαβυλῶνος) and the accusative plural (Ἀσσυρίους); the New Testament: -ας 50%, -ης 57%, -ις 13%, -ως 24% |
| ν otherwise (-ον, -ην, -ιν, -εν, -υν, an accent earlier or a circumflex) | **no**: 751 words | the accusative of a Greek name (Ἀμορραῖον, Γοδολίαν, Μωσῆν): the New Testament: -ον 1%, with no accent on the vowel 9%, with a circumflex 1% |
| a vowel with no accent on it, or a circumflex (Μειχαία, Γάλγαλα, Μωσῇ), ε or ο | **no**: 1,144 words | a nominative or a dative or genitive of Greek (-ου, -ῳ, -ῃ), a vocative or a verb |
| a word of fewer than three letters (Ὤ, Ἦ), or of a letter that is not Greek | **no**: 59 words | an interjection |

A word that opens a verse or follows a full stop, a colon, the high point or the question mark (`opensClause`, the rule `lxx:batches --all` has counted names by) is **left as it was**: Swete capitalises it
whatever it is (391 words), and a lower-case word is never taken (6,560 words have no candidate, 0 of them taken). The lemma is the form in NFC with its grave an acute (Σελλὰ is Σελλά), so
its accent and breathing are the print's own, and a dictionary may write them otherwise (Ζοροβαβέλ for Ζοροβάβελ); the New Testament's lemma is the same letters for 86.1% of 779 such rows
and the same spelling, accent and breathing for 68.0% (the rest: Μαριάμ for Μαρία, Καφαρναούμ for Καπερναούμ, the spellings of one name). **The word is pending**, with every case of every gender in
the singular (`N-NSM` ... `N-VSN`, 15 candidates: nothing says the gender, and the agreement check settles the case and gender where an article says them), the support column `form` (and 0 in the counts), the via note `a name no lexicon has: the form
itself as the lemma ...`, and the note `a name no lexicon has: its form read as its own lemma, every case of every gender: for the agreement check or the model`, in place of `no candidate: for the model to guess`.
`lxx:batches --all` counts these in a column of their own (`a name from its form alone`) and adds them back in the last (`both % of words`), which is the share the table gave before: the
guess share of the bar counts the model's choices, so a book can get under 3% when its names are read (7,776 words of the 39 books were given candidates, 3,182 forms; the agreement check settles 755 of them at once; 7,021 stay pending, which with the 10,024 still without a candidate make 17,045, 3.58% of the words, against 17,800, 3.74%, before), and a model that chooses one of these candidates is **not** marked a guess (confidence 0.8, as
for any candidate); how sure the reading is, is the figures above, and **the Governor has answered whether the bar counts it: it does not** (his tap of 2026-11-02, "A: Count only words with no candidate", on the decision card of mw-u2w5klk; the next section). The test is `a capitalised no-candidate form is its own lemma where its ending looks indeclinable (B8)` in `tests/unit/lxx-parser.test.ts`.

Three small things from the same sweep: a TBESG lemma cell that ends in a stray mark (`Ἄπις;`, `Μακαλωθ·`) loses it in `readTbesg`, as `readTbesgNames` always did; a choice whose lemma differs
from a candidate's by a diaeresis alone (the file's Καινάν for TBESG's Καϊνάν) is that candidate (`sameLemma` in `choices.ts`; any other difference is a different lemma); and the gender of a name no source
gives is left to the agreement check (it settles a name whose article is next to it: `τῷ Ἰωναθάν`), where no article says it all three stay.

### The two books over the bar on words with no candidate (B9)

Story mw-u2w5klk.20. His answer above leaves Esther (181 of 5,936 words with no candidate, 3.05%) and Lamentations (74 of 2,463, 3.004%) over 3%, with Morpheus's cache and B8 in. The words, sorted by cause
(`grep 'no candidate' data/lxx/pending/est.tsv`), were not what the story expected, and two general rules answer them; no list of words, no lower bar.

- **The editor's verse numbers are not words** (`VERSE_NUMBER` in `swete.ts`). The Greek of the additions to Esther prints the editor's own numbering of the verse's parts as a token: `⸂[1] ΕΤΟΥΣ δευτέρου` (Est 1:1), `[2] ἄνθρωπος`. These
  were words with no candidate, since no lexicon has a number: 106 of Esther's 181, and 257 in Swete's file (1 Kings 57, Proverbs 38, Job 13, 2 Chronicles 12, Joshua 10, Daniel 8 and the rest in six other books). A token that is only a bracketed number (with the
  editor's `⸂`, `⸃` before it) is an **editor's sign**, as `⸆` is: left out of the words, not numbered, counted with the signs. The words after it in its verse are numbered without it (`ΕΤΟΥΣ` is `Est.1:1#1`), and the book's word count falls by the number of them, so the shares of the books that have them move: none rises (`npm run lxx:batches -- --all`, the table in the closing comment of the story). A Greek numeral (`ε᾽`, Est 9:19) has no digits and no brackets, and is a word.
  No file under `data/lxx/choices` or `known` has a reference after one of these (Genesis has none, and the known-answer chapters are the New Testament's). Test: `counts a bracketed number as an editor sign` in `tests/unit/lxx-parser.test.ts`.
- **A word that is a whole clause is not held out as a clause's opening** (`isWholeClause` in `derive.ts`, used by `withFormNames`). Swete capitalises the first word of a verse or a clause, so the B8 rule above leaves such a word as it was; but a word that
  opens a clause and whose own print ends it, with a full stop, a colon or the high point, is a sentence of one word, and in Lamentations it is a letter name of the acrostic: `Βήθ. Κλαίουσα ἔκλαυσεν` (Lam 1:2), `Γίμελ.`, `Δάλεθ.`, `Τιαδή.`, `Κώφ.`
  (62 of Lamentations' 74 words with no candidate; one other word, in 1 Chronicles). Where its ending is one a Hebrew name has (the table above), it takes its form as its lemma and is pending with every case of every gender, as any such name.
  49 of the 62 are so; `Ἄιν.` (-ν after ι), `Ῥήχς.` (-ς) and `Χσέν.` (-ν after έ) are not, and stay with no candidate. Test: `takes the form as the lemma of a capitalised word that opens a clause and ends it` in `tests/unit/lxx-parser.test.ts`,
  with the words it holds out.

With both, Esther has 75 words with no candidate (1.29%) and Lamentations 25 (1.02%); no book of the 39 has a higher share than before in either column of `lxx:batches --all`, and `npm run lxx:known -- --chapter Jhn.1 --chapter Rom.8` is byte for byte what it was.
`BAR.guesses` is unchanged: 3%.

### A name written with a capital mid-clause is not the common word its letters spell

Story mw-u2w5klk.25. Layers 1 and 2 read a form's letters with its capital lowered, so a name that is spelled as a common Greek word settled as that word: Σειών (Zion, 138
words of the 39 books) as σείω, a participle; Ἀμμών (102) as ἄμμος, sand; Εἰού (Jehu, 51) as εἴλω; Ἁμάν (50) as ἀμάω; Ἠλεί (Eli, 35) as ἀλέω; Σηών (34) as σής, a moth; Ἀμνών
(29) as ἀμνός, a lamb; Γάζης (Gaza, 10) as the treasury of Acts 8:27, which the New Testament has and layer 1 took whole. **The capital rule** (`withCapitalNames` in
`derive.ts`, run after the layers and the rule above, before the agreement check) reads three things and nothing else: Swete's own capitals and small letters, TAGNT's
lemmas and TBESG's. A word written with a capital that does not open a verse or a clause (`opensClause`, or is all of its clause, `isWholeClause`: Swete capitalises
such a word whatever it is, so its capital says nothing), which the layers settled on a lemma written in lower case, or left pending with only such candidates of
their own, is read again, and is a name when either of two things says so:

1. **A lexicon has a name spelled so.** The parser is run on the form whether the New Testament has it or not, and a candidate whose lemma is written with a capital
   in TBESG or TAGNT (as the rule for indeclinable names reads a name, by its capital; TBESG also marks a name with `N:` before its part of speech, 781 rows, but writes
   `N:` on common words too, γέεννα, ζηλωτής, κέδρος, and some capitalised names without it, ᾍδης, Τιτάν, so the capital is read) is added to the word's candidates, or is already
   among them: Γάζα `N-GSF` for Γάζης, Σύρος for Σύρων (Gen 22:21, settled as σύρω), Φοῖνιξ for Φοίνικες (Deu 3:9). The `via` of such a candidate begins `a capital mid-clause: a
   lexicon has a name spelled so`. 26 words of the 39 books; Ἡλίου (Gen 41:45, Heliopolis) and Πέτρας (Jdg 1:36) get a name they are not (Ἡλίας, Πέτρος) beside the common
   word they may be: the model chooses.
2. **Swete's own print.** Where no lexicon has a name, the form is read as its own lemma, in every case of every gender (support `form`, as in 'Names no lexicon has'), when
   the file never writes the form in lower case anywhere in its 60 books (`lowerCaseForms`, kept on the trained run as `lowerCase`), the word carries one accent (Κέχρικά σε,
   Ἠγάπηκά σε carry an enclitic's: `hasTwoAccents` in `swete.ts`), and its ending is one a Hebrew name has (`formNameLemma`, the table of 'Names no lexicon has'). The first
   word of what someone says follows no mark and is capitalised too (`εἶπεν ὁ θεός Ἰδοὺ δέδωκα`, Gen 1:29, 284 words; `Μὴ` 163, `Οὐκ` 137, `Ἐγὼ` 77), and nearly every such
   word is written in lower case somewhere else in the file; what is left is a Greek word that only ever opens a speech, and its ending tells it from a Hebrew name
   (`Ἀνάβηθι`, `Λάλησον`, `Πορευθῶμεν`, `Στήσατε`). 817 words of the 39 books.

The word is **pending** with the common candidates kept and the name's added, the note `a capital mid-clause: a name beside the common word its letters spell: for the
agreement check or the model`, so the agreement check settles it where an article says the case (`τῇ Μαὰν`, 1 Sam 23:24: Μαάν `N-DSF`; 55 words) and the model reads
the rest. A word settled on a lemma with a capital, pending with a name among its candidates already (an indeclinable name, a name from its form alone), with no candidate
(the rule above), or with Morpheus's candidates alone, is not touched. On the 39 books the rule touches 843 words (188 forms): 580 that were settled (39 in layer 1, 541
in layer 2) and 263 that were pending with common candidates; of a seeded random sample of 30 of them read in their verses, 30 were names (the story's closing comment lists
them). `npm run lxx:known -- --chapter Jhn.1 --chapter Rom.8` is byte for byte what it was.

**What the rule cannot see.** A name that opens a verse or a clause and spells a common word (its capital says nothing, and the layers' answer stands). A name the file
also writes in lower case as the common word, that no lexicon has as a name: Ὤν (On: Exo 1:11, Hos 4:15, 5:8, 10:5, 10:8, 12:4, Amos 1:5, Jer 50:13, and Gen 41:48, 9 words) is ὤν, being, in the New Testament and in TBESG;
Ζωή (Gen 3:20) is ζωή. A name declined in Greek that no lexicon has, whose ending Greek declines (Λείας, Gen 29:17, read as λεῖος; Καδής; Κῦρος, read as κυρόω; Σείν):
its form is not its lemma, and nothing says which name it is. And the other way, a Greek word that only ever opens a speech and ends as a Hebrew name does goes to the
model with its right reading kept: Παρελθὼν (Exo 3:3), Στενά (2 Sam 24:14), Ἡδύ (Isa 44:16), about ten forms of the 188. Κύριος written with a capital is the Lord and
keeps the lemma κύριος, as Παντοκράτωρ keeps its own: a title is not another word. The test is `a name written with a capital mid-clause is not settled on the common
word its letters spell (mw-u2w5klk.25)` in `tests/unit/lxx-parser.test.ts`: Σηών and Ἀμμών (Num 21:21, 21:24), Γάζης (Deu 2:23), and the capitals that are no name, Ἰδοὺ
(Gen 1:29), Ἠγάπηκά σε (Jdg 16:15), Ἐγώ opening a verse and a sentence, and in the real Gen 1 fixture ΕΝ, Γενηθήτω and Ἰδοὺ.

## The agreement check

`scripts/lxx/agreement.ts` runs after layers 1 and 2 and before the files are written (`checkAgreement`, called by `deriveBook`), from the probe's
'Error checks for the full run', 2(a) and 2(b). It reads one book's words verse by verse, and its rules are data (`SHARED_ENDINGS`, `TAGNT_EVIDENCE`,
`LINKS`, `ADDRESS`, `PREPOSITION`), each with the comment this section copies. Its tests are `tests/unit/lxx-agreement.test.ts`; each rule below names its test there. In order:

0. **An address** (`readAddresses`, `ADDRESS`; story mw-u2w5klk.26; the tests under 'an address is tagged vocative'). A settled nominative in a phrase spoken to
   someone becomes the vocative, layer 2a, confidence 0.85, the note `an address: the vocative, as TAGNT tags one, read from the verse`; a pending word of
   the phrase is offered the vocative. The next section gives the rule and its numbers.

0b. **A preposition's case** (`readPrepositions`, `PREPOSITION`; story mw-u2w5klk.27; the tests under 'a preposition's case checks the word it governs'). A settled
   word right after a settled preposition, in a case the preposition does not take, takes the one reading of its own candidates in a case it takes, layer 2a,
   confidence 0.85, the note `a preposition's case: <preposition> (<ref>) takes <cases>`; with several such readings, or none, it goes to the model. The section
   after the next gives the rule and its numbers.

1. **A name written in lower case** (test: 'sends χλόης (Ps 22:2) to the model'; 'keeps a name the text writes with a capital'). A form whose every New
   Testament word TAGNT tags a person or a place (`-P`, `-L`), or a title whose lemma it writes with a capital (`Χριστός`, `-T`), and which the text writes
   in lower case, goes to the model with the note `a name in the New Testament: lower case here, for the model`: `χλόης` (grass, Ps 22:2) is in the New
   Testament only as Chloe. TAGNT also tags every `θεός` and `κύριος` a title (`-T`); they are common nouns, and stay in layer 1.
2. **The shared-ending rule.** A layer-1 or layer-2 answer whose ending is in a class below is not settled on the New Testament's evidence alone: the word
   is demoted to pending with the note `shared ending: <class>: for the agreement check or the model`, its candidates its own (layer 1's analyses or the
   parser's) and, at support 0, every reading of the same lemma the ending can be. Not the parser's candidates for a form the New Testament has: its rules,
   learned from other lemmas, offer tagged and stray readings (`ἁγίῳ` as `A-DSN-LG` and `A-DSF`) that only blur the choice. A word in several classes
   takes the readings of each and the first one's name.
3. **The agreement links** (`agree`), within a verse; no link reaches past a mark of punctuation Swete prints after a word (a comma, a colon or high point,
   a full stop, a question mark; his brackets are read past: test 'reaches past no mark of punctuation'). First the breaks: two settled words joined by a link that breaks and not agreeing in gender, number
   and case are a **break**, counted once, and both go pending with the note `agreement break: <link> with <ref>: for the model`. Then, until nothing
   changes, a pending word (demoted or not) whose candidates leave **exactly one** agreeing with every settled word it is linked to takes it as **layer
   2a**, confidence 0.85, the candidate first and the note `agreement: <link> with <ref>`; a word settled so is a settled neighbour on the next round. A
   link that only chooses narrows what the others leave, and is set aside where it would leave nothing. Where two candidates agree the word stays pending:
   the check never guesses (test: 'never guesses: where two candidates agree'). A word plays a part in a link when its settled answer is of that part, or
   its candidates of that part hold at least half its support (`τοῦ` with `ὁ T-GSM`, `ὁ T-GSN` and a stray `αὐτός P-GSN` is an article; `ὃ` with `ὅς
   R-ASN` and a stray `ὁ T-NSM` is not); only those candidates take part.

The shared-ending classes (`SHARED_ENDINGS`, then `TAGNT_EVIDENCE`), each with its test in `tests/unit/lxx-agreement.test.ts`:

| Class | Parts of speech | Readings that share one form | Why | Test |
| --- | --- | --- | --- | --- |
| masculine accusative and neuter in -on | an adjective whose lemma ends in -ος; a participle not active, in -μενον | ASM, NSN, ASN | `χλωρόν` (Gen 1:30) with `χόρτον`, masculine, given neuter. A comparative (`μεῖζον`, masculine `μείζονα`) and an active participle (masculine `-οντα`; `μένον`, John 1:33, only looks like `-μενον`) are not in it | 'masculine accusative and neuter in -on: …' |
| neuter nominative and accusative | a noun, and every part with a gender | NSN, ASN; NPN, APN | every neuter has one form for both cases (the probe named -ον and -α; -ος and -ο are the same): `ποιοῦν` (Gen 1:11, 1:12) and `μένον` (John 1:33) given nominative, accusative needed | 'neuter nominative and accusative: …' |
| masculine and neuter genitive and dative singular | every part with a gender (an adjective, the article, a pronoun of the third person or another kind, a participle); never a noun, whose gender is its own | GSM, GSN; DSM, DSN | `αὐτοῦ` and `αὐτῷ` of `ξύλον` (Gen 1:11-12) given masculine; `ἕρπον[τι` of `ἑρπετῷ` (Gen 1:30) given masculine by the parser | 'masculine and neuter genitive and dative singular: …' |
| every gender in the genitive plural | the article, pronouns, an adjective whose lemma ends in -ος | GPM, GPF, GPN | `τῶν`, `αὐτῶν`, `τούτων`, `ὧν`, `ἁγίων` (Gen 1:9, `αὐτῶν`) | 'every gender in the genitive plural: …' |
| masculine and neuter genitive plural | any other adjective, a participle | GPM, GPN | `πάντων`, `ποιούντων` (the feminine is `πασῶν`, `ποιουσῶν`) | the same test |
| masculine and neuter dative plural | every part with a gender | DPM, DPN | `τοῖς`, `αὐτοῖς`, `πᾶσι`, `ποιοῦσι` (Gen 1:30, `πᾶσι` with `θηρίοις`) | 'masculine and neuter dative plural: …' |
| the New Testament's analyses differ only in case or gender | any, layer 1 only | the New Testament's analyses of the same lemma, part of speech and number | the ending is shared whatever the rows above say (`ἀόρατος`, masculine and feminine). A vocative is not counted: TAGNT tags an address vocative (`ὁ θεός` is `T-VSM N-VSM` in each of its 11 addresses), so a vocative among a form's analyses says the form was once spoken to, not that its ending is shared; counted, it would demote 19,895 words of layer 1 in the 39 books. The address rule reads it from the verse ('An address'). An analysis seen in one New Testament word only is a slip of tagging, not evidence (`τόν` is `T-ASM` 1,628 times, `T-DSF` once) | "the New Testament's analyses differ only in case or gender: …" |

The links (`LINKS`):

| Link | Breaks? | What agrees | Test |
| --- | --- | --- | --- |
| an article and the word after it | yes | an article and the next word (past `δέ`, `γάρ`, `μέν`, `οὖν`, `τε`, `γε`, `δή`) when that word is a noun, an adjective, a possessive, a participle or an infinitive (an article before an infinitive is neuter singular). Not when it is another article (`τὸ τοῦ θεοῦ πνεῦμα`), a pronoun, or a genitive after an article in another case (`τὰ Καίσαρος`). Read the other way it is the rule that **a neuter noun in -ον or -α takes its case from its article** | 'settles τὸ before φῶς by agreement only when φῶς is itself settled'; 'gives a neuter noun in -ον or -α the case of its article'; 'reads past δέ'; 'marks a break'; 'takes no genitive after an article' |
| an article, adjective and noun | no, it only chooses | an article, an adjective and a noun in a row (`τὸ μέγα φῶς`): all three agree. Never a break: the adjective may stand for a noun with another noun after it (`ἡ νεωτέρα υἱόν`, Gen 19:38; `τῇ τρίτῃ ἡμέρα γενέσεως`, Gen 40:20), which the whole of Genesis showed | 'settles an article and adjective from the noun after them'; 'never counts a break from an article, adjective and noun' |
| a noun, then an article and adjective or participle | no, it only chooses | a noun, then an article with an adjective or participle (`τῷ ἑρπετῷ τῷ ἕρποντι`): the article and its word repeat the noun's gender, number and case. Never a break: the article may begin a phrase of its own (`ἐκάλεσεν ὁ θεὸς τὸ ξηρὸν γῆν`) | 'settles a repeated article and its participle'; 'never counts a break from a link that only chooses' |
| an adjective or participle beside a noun | no, it only chooses | an adjective or participle next to a settled noun (`πάντα χόρτον χλωρόν`, Gen 1:30); never a break: `ποιοῦν καρπόν` (Gen 1:11) is a participle and its object | 'settles χλωρὸν (Gen 1:30) as the masculine accusative'; 'settles ἁγίῳ (John 1:33)' |

**What it does to the sample** (the fixtures; the test file asserts each word by reference). Of the probe's eight layer-1 and layer-2 errors in Gen 1 and
Ps 22 and John's `μένον`: `ποιοῦν` (Gen 1:11, 1:12), `αὐτοῦ` and `αὐτῷ` of `ξύλον` (Gen 1:11, 1:12), `ἕρπον[τι` (Gen 1:30) and `μένον` (John 1:33) are
demoted, with the right reading among their candidates; `χλωρὸν` (Gen 1:30) is settled as `A-ASM` by `χόρτον`; `χλόης` (Ps 22:2) goes to the model as a
name in lower case. On John 1 with John hidden, all 31 words the check settles in layer 2a are TAGNT's answer, and of the 48 layer-1 and layer-2 answers
it demotes, the one that was wrong is `μένον`. Gen 1 has 178 words pending before the check and 161 after it (26 demoted, 43 settled by agreement, mostly
articles in the genitive and dative, no breaks); Ps 22 has 24 and 25. Agreement settles an article's gender and number but not, before a neuter noun,
whether it is nominative or accusative (`τὸ φῶς`, `τὰ ὕδατα`): most of the articles left are those, for the model.

**What it does to the whole file** (`npm run lxx:derive -- --all`, 2026-11-01, about 15 seconds): of 608,427 words, 27,765 are settled in layer 2a and
22,467 demoted; 144,631 are pending after the check against 148,918 before it, 2.9% fewer, not the third to a half the probe hoped for. The demoted words
are mostly pronouns (`αὐτοῦ`, `αὐτῷ`, `αὐτῶν`, whose gender comes from what they stand for, not a neighbour) and neuter nouns, nominative or accusative;
in Genesis 14 of its 1,291 are settled again. The articles left pending are, in Genesis, 661 `τό` and `τά` before a neuter and most of the rest before a
name the New Testament shows in another case (`τῷ Ἰωσήφ`), which needs both words chosen together. There are 412 breaks, 0.7 per 1,000 words, none
above 5 per 1,000 in any book (Susanna 3.4, the Letter of Jeremiah 3.1); read in Genesis and Isaiah they are layer-1 answers the article shows wrong:
`οἱ παῖδες` given feminine, `τὴν ἵππον` (the cavalry) masculine, `τῆς ὑδρίας` accusative plural, `τὴν Ῥαχήλ` nominative, `οἱ ψευδεῖς` accusative,
`ὁ αἰώνιος` feminine, `ὁ δεσπότης` vocative.

### Analogy's readings beside a thin lone candidate

Story mw-u2w5klk.31. Analogy holds the right reading for many of the thin lone candidates that are wrong, and the model can only choose among the candidates it is given (`ἄφρονος`,
Ecc 2:16, `A-GSF-C` from one comparative: analogy has `A-GSM`). A first version put analogy's readings among the candidates and let the check read them. That did harm in two places:
twelve true addresses turned nominative, because a pending imperative with a reading beside it (`ἐπάρθητε` `V-APM-2P` beside `V-APS-2P`) no longer read as one imperative of the second person (Ps 23:7 and 23:9
`πύλαι αἰώνιοι`, Ps 79:15 and 114:7 `ἐπίστρεψον`, Isa 13:2 `ἀνοίξατε`, Isa 40:9 `ὕψωσον`); and agreement settled `ἄφρονος` as `A-NSF` three times, beside a `καρδία` or a `φωνή` (Pro 17:21, Ecc 5:2, Ecc 10:2).

- **The rule** (`derive.ts` `analogyBeside`, the note `analogy's readings beside it: for the model`): where an ending rule's one candidate is thin (`isThinLone`), `byAnalogy` is asked for the form too, and
  every reading of it that is not the rule's own is added after the rule's, marked `beside` (`Candidate.beside`, `WordCandidate.beside`, in memory only, as `analogy` is; the files show them as any
  candidate). The rule's candidate stays first. A word that analogy gave its own lone candidate has them already; several rule candidates are weighed as before.
- **Who reads them**: only the model. `agreement.ts` `ownReadings` drops them where the address rule reads a pending word (`readings`, the vocative offered by weight) and where the agreement links read one
  (`readingsOf`, `plays`, `agree`), so a pending imperative is still an imperative, no link settles a word on a reading analogy alone gave, and `isThinLone` does not count them. A word settled by
  agreement takes its reading from the rules' candidates and carries no `beside` reading. The sweep of readers: `readAddresses` (changed), `agree` and its roles (changed), `readPrepositions` (clear: it reads a settled word's
  candidates, which carry none), `sharedEnding` (clear: settled words), `derive.ts` `withCapitalNames`, `withFormNames` and `withMorpheus` (clear: they read a candidate's `source` or capital, which analogy's has not
  for these words), the batches, the pending list and the choices (they offer every candidate, so the model sees them).
- **Measured on the New Testament** (`npm run lxx:lone-support`, each book hidden in turn): 1,776 thin lone candidates; 314 wrong, 126 of them (40.1%) with TAGNT's answer among analogy's readings, 12 with readings none of which is
  it and 176 with none; 1,462 right, 307 of them with readings beside them (a cost to the model's choice) and 1,155 alone. No settled answer is made wrong: the check does not read them.
- **On the 39 books** (`npm run lxx:derive -- --all --no-morpheus`, before and after): settled 353,535 and pending 122,594 both times, and no word changes its answer; 2,432 pending words have readings beside their
  candidate. `ἄφρονος` stays pending at Pro 17:21, Ecc 5:2, Ecc 10:2 and Ecc 2:16, each with `A-GSM` among its candidates. Read by hand, 20 of the 2,432 (seed 20261104): 13 confirmed (the rule's reading right, analogy's extra only),
  5 mended (the right reading is now a candidate: `ἔπιδεν` ἐπεῖδον `V-2AAI-3S`, `ἄφρονος` `A-GSM`, three `παῖδες` as masculine), 1 unsure, 1 neither (`ἀποθανῇ`, Jer 41:5, a future), none made wrong.
  The known-answer chapters are as before (Jhn.1 827 of 829 on the lemma, 823 on full parsing; Rom.8 650 and 645), and no word is newly pending, so no blind reader was needed.

### An address: the vocative read from the verse

Story mw-u2w5klk.26, problem A of the hand audit (`docs/sources/lxx-settled-audit.md`, mw-u2w5klk.24): `ἀδελφή μου, κώφευσον` (2Sa 13:20#19), `αἰνεῖτε αὐτόν, πάντες οἱ
ἄγγελοι αὐτοῦ` (Psa 148:2#5) and `θρηνήσατε, πάντες οἱ πίνοντες` (Joe 1:5#10) were settled as nominatives. **The rule is what TAGNT would write**, and TAGNT tags an
address vocative whatever its ending, with its article and the words that go with it: `ὁ θεός` is `T-VSM N-VSM` in each of the 11 rows where it is an address (Heb 1:8,
Heb 10:7, Mark 15:34 twice, Luke 18:11, 18:13, John 20:28, Rev 4:11, 11:17, 15:3, 16:7), and no θεός after a vocative is tagged `N-NSM` but as a subject (Acts 7:2,
Jas 2:5, Mark 12:29); Rev 19:5 is `πάντες/A-VPM οἱ/T-VPM δοῦλοι/N-VPM`. Layer 1 cannot see it: the New Testament has no vocative of `ἀδελφή` or `ἄγγελοι`, and
`πάντες` is `A-NPM` 172 times of 179, so the 95%-of-20 rule takes the nominative. Layer 1 still does (`tests/unit/lxx-layer1.test.ts`).

**The means, by the numbers.** Counting the vocative as TAGNT's evidence (the shared-ending rule) would demote 19,895 words of layer 1 in the 39 books (`ὁ` 14,051, `κύριος`
3,366, `θεός` 1,494, `πᾶς` 518), about 28 batches, and still settle none of the three: it mends only `πάντες`, to pending. **Reading the address from the verse** changes 414
words and adds none to pending. Run on the New Testament itself (TAGNT's NA28 words, each as layer 1 would leave it, Swete's place taken by NA28's punctuation, every word
the rule changes judged by TAGNT's own row), the rule as built changes 33 settled words: 28 are TAGNT's tag, and of the 5 others 3 are `υἱὸς Δαυίδ` after `κύριε`, which
TAGNT leaves nominative, 1 is `Ἰουδαῖοι` (Acts 2:14), the vocative TAGNT writes but of an adjective, and 2 are `ὁ βασιλεὺς τῶν Ἰουδαίων` after `μὴ γράφε·` (John 19:21),
a title quoted. The first draft (any second person, any mood) was 55 right and 99 wrong there; each limit below is one of those wrongs.

The rule (`readAddresses`): a verse is cut into phrases at Swete's marks of punctuation. A phrase is an address when

- it holds no word that may be a finite verb or an infinitive, and none that opens a clause (`NOT_IN_ADDRESS`: `γάρ`, `δέ`, `τε`, `μέν`, `ὅτι`, `ὡς`, `εἰ`, `ἵνα`, `οὖν`,
  `ἀλλά`, `ἰδού` and the like: `ὁ γὰρ θεὸς μεθ’ ὑμῶν` is a clause with its verb left out);
- its first word (after `ὦ`) is a **settled** nominative article, noun, adjective or participle, not a participle alone (`λέγων·`, `νήφοντες`) nor an adjective but `πᾶς`
  (`μακάριοι οἱ πεινῶντες`, `μεγάλη σου ἡ πίστις`: a predicate); a pending first word may be the verb's object (`δότε τύμπανον, ψαλτήριον τερπνόν`, Ps 80:3);
- it holds a nominative noun or article;
- and either it **calls** (it holds `ὦ`, or a vocative by its form: a noun or adjective in the singular, `Κύριε ὁ θεός μου`; not an article, participle or plural, whose
  vocative is the nominative's form: layer 1 settles `οἰκοδομῶν`, Amos 9:6, `V-PAP-VSM` only because its two New Testament words were addresses; and layer 1's only, since
  the parser's vocative of a name is a guess: `υἱὸς Ἀδά`, Gen 36:10, is a list of Esau's sons), or the phrase before or
  after it in its sentence holds an **imperative of the second person** of its number and no settled verb of another person (`φωνὴ ἀδελφιδοῦ μου, κρούει … Ἄνοιξόν μοι`,
  Song 5:2, is a cry and his words), or the phrase **before** it, across a **comma**, calls or is an address whose head has its gender and number (`Κύριε, ὁ θεὸς τῆς
  σωτηρίας μου`; not `Κύριε· καιρὸς εὐδοκίας`, Ps 68:14). A singular imperative takes a singular phrase, a plural one a plural or a phrase joined by `καί` (`ἥλιος καὶ σελήνη`).
  Not the indicative: beside it a nominative is as often its subject's predicate (`ὅτι σύ, Κύριε, ἡ ἐλπίς μου· τὸν ὕψιστον ἔθου`, Ps 90:9) or the law's future (`Οὐ θύσεις …,
  πᾶν ῥῆμα πονηρόν`, Deut 17:1); not `εἰμί` or `γίνομαι`, whose nominative is a predicate.
- A sentence (up to a full stop or question mark) that names `σύ` or `ὑμεῖς` in the nominative has no address but a phrase that calls itself (`ὑμεῖς, κλητοὶ Ἰησοῦ Χριστοῦ`).

In an address each settled nominative of the head's gender and number (any, where `καί` joins) becomes the vocative, layer 2a, before the other rules of the check, so the
article link sees `οἱ/T-VPM ἄγγελοι/N-VPM` agree; a pending word that is mostly a nominative (by support) is offered the vocative beside each such nominative, and the links
may settle it (`πύλαι αἰώνιοι`, Ps 23:7: `A-VPF`).

**What it did** (`npm run lxx:derive -- --all --no-morpheus`, before and after, the derived and pending files compared word by word over the 39 books, 2026-11-04): settled
363,241 and pending 112,888 before; 363,244 and 112,885 after. 414 words changed: 401 settled words took the vocative (`ὁ` 171, `θεός` 95, `πᾶς` 14 and the rest), 3 pending
words were settled (`Dan 3:63 ἄστρα`, `Hab 1:5 οἱ καταφρονηταί`), 10 pending words were offered the vocative, and none went to pending. The three words of the audit read
`N-VSF`, `N-VPM` and `A-VPM`. Read by hand, 20 of the 414 drawn at random (seed 20261105, `mulberry32`): 19 right, 1 wrong (Lev 16:29, `ὁ αὐτόχθων καὶ ὁ προσήλυτος` after
`οὐ ποιήσετε`, the subject named, not spoken to). `npm run lxx:known -- --chapter Jhn.1 --chapter Rom.8`:
John 1 as it was; Rom 8 from 644 to 646 of 652 words with the lemma and the whole parsing (`αββα ὁ πατήρ`, Rom 8:15). An address it misses is left as it was: one not set
off by marks (`ἐξεγέρθητι ἡ δόξα μου`, the verb in the phrase), one whose first word is pending, one beside an indicative.

### A preposition's case: the word it governs

Story mw-u2w5klk.27, problem B of the hand audit (`docs/sources/lxx-settled-audit.md`, mw-u2w5klk.24): `ἐπὶ τρίβων` (Job 18:10#12) was settled as `τρίβω V-PAP-NSM` (the
parser's support 123 of 133) and `ἐν ῥινὶ ὑός` (Prov 11:22#4) as `ῥίν N-NPF` (42 of 45), though the right reading (`τρίβος N-GPF`, `ῥίν N-DSF`) was among the candidates both
times. Layer 2's 90% rule (`settleParsed`) weighs rules learned from other lemmas, none of it from the verse, and nothing checked that a preposition's word is in a case the
preposition takes. Layer 1's 95%-of-20 rule (`settle`) has the same blind spot: it reads the New Testament's analyses of the form, not the verse.

**The cases each preposition takes come from TAGNT** (`prepositionCases`, `scripts/lxx/parser.ts`, learned with the parser, `Parser.governs`): in each verse, NA28's words in
TAGNT's order, the case of the word right after a word tagged `PREP`, where it has one (a conjunction, adverb, infinitive or verb after it is passed over). A preposition is
checked when the New Testament shows at least 20 such words (`GOVERN_MIN_WORDS`) and at most 1 in 100 of them nominative or vocative (`GOVERN_MAX_NOMINATIVE`); a case is one
it takes when 2 words and 1 in 200 show it (`GOVERN_MIN_CASE`, `GOVERN_MIN_SHARE`); the nominative and vocative never are. Of the pinned TAGNT that is 20 prepositions:

| Preposition | Cases it takes | The New Testament's words after it (declined) |
| --- | --- | --- |
| ἐν | dative | 2,705 dative, 1 genitive (2,706) |
| εἰς | accusative | 1,746 accusative, 2 genitive (1,748) |
| ἐκ | genitive | 898 |
| ἐπί | genitive, dative, accusative | 220, 180, 470 (870) |
| πρός | dative, accusative | 7, 686, 1 genitive (694) |
| διά, μετά, περί, ὑπό, ὑπέρ, κατά | genitive, accusative | διά 379 and 275; μετά 357, 77; περί 277, 36; ὑπό 168, 51; ὑπέρ 126, 19 and 1 nominative; κατά 74, 381 and 2 nominatives (καθ’ εἷς) |
| παρά | genitive, dative, accusative | 80, 51, 59 |
| ἀπό | genitive | 600, 1 nominative (`ἀπὸ ὁ ὢν`, Rev 1:4) |
| σύν | dative | 127 |
| ἐνώπιον, πρό, ἄχρι, ὀπίσω, ἕνεκα, ἀντί | genitive | 94, 42, 38, 26, 23, 22 |

Not checked: `ἕως` (3 nominatives in 83: `ἕως ἡμέρα ἐστίν`, John 9:4, a conjunction there), `ἔμπροσθεν`, `χωρίς`, `ἔξω`, `ἐγγύς`, `ὡσεί`, `ὅπου` and every preposition with
fewer than 20 words after it.

**The rule** (`readPrepositions`, run by `checkAgreement` after the address rule and before the others): a settled word right after a settled preposition of the table (in
its verse, no mark of punctuation after the preposition), whose case the preposition does not take, is read again among its own candidates. A reading layer 1 has from one
New Testament word only is a slip of tagging, as in `TAGNT_EVIDENCE`, and is not taken (`σὺν τὸν δίκαιον`, Eccl 3:17: the New Testament tags `τόν` `T-DSF` once).

- **Exactly one reading in a case the preposition takes**: it is settled, layer 2a, confidence 0.85, first among the candidates, with the note `a preposition's case: ἐπί
  (Job.18:10#11) takes the genitive, dative or accusative`. Job 18:10 reads `τρίβος N-GPF`, Prov 11:22 `ῥίν N-DSF`.
- **Several** (a preposition that takes more than one case, with a word that may be either): nothing is settled. The word goes to the model with the fitting readings first
  and the note `…; several readings fit: for the model`, and the agreement links do not settle it. In the 39 books this happened to no word.
- **None**: the word goes to the model, its candidates as they were, with the note `…; no reading fits: for the model`, and the links do not settle it. Either the
  preposition does not govern it (`οὗ εἵνεκεν ὁ υἱὸς τοῦ βασιλέως ἀπέθανεν`, 2 Sam 18:20; `εἰς ἀγροῦ σκοπιάν`, a genitive before its noun; `πρὸς κεφαλῆς`, a genitive the New
  Testament has once after πρός; Ecclesiastes' `σύν` with the accusative) or the reading is wrong and its right one is not among our candidates (`κατὰ Μωυσῆ` as a dative,
  `ἐν Καδής` as `κάδος N-NSM`, `εἰς ἀριστερά` as `A-NSF`, `μετὰ τραυματιῶν` as `τραυματίζω V-PAP-NSM`). Left settled, about two in three of these were wrong.
- A word in a case the preposition takes is never changed, whichever of its cases is right.

**What it did** (`npm run lxx:derive -- --all --no-morpheus`, before and after, the derived and pending files compared word by word over the 39 books, 2026-11-04): settled
363,244 and pending 112,885 before; 363,138 and 112,991 after (106 more pending, about one batch). 113 words changed: 7 settled words were settled again in a case their preposition takes (`τρίβων`
Job 18:10 and Judg 5:20, `ῥινί` Job 27:3 and Prov 11:22, `ἅλωνι` Gen 50:11 and Dan 2:35, and `ἐν βολίσι`, 1 Sam 14:14, read `N-DSF` where it is `N-DPF`: the case right,
the number the parser's wrong), 105 went to the model with no reading fitting (65 of layer 1, 40 of layer 2), and 1 more, `δίκαιον` (Eccl 3:17), went with its article.
None went with several. By preposition: πρός 26, εἰς 26, ἐν 17, ἐκ 11, σύν 8, μετά 8, ἐπί 5, κατά 3, and 2 each for ὑπό, ἕνεκα, ἀπό and διά. Read by hand, 20 of the 113
drawn at random (seed 20261106, `mulberry32`): 15 right (14 wrong answers sent to the model, and `ῥινί`, Prov 11:22, settled right), 5 wrong, each a right answer sent to the model
(`εἰς ἀγροῦ σκοπιάν`, `εἰς γῆς βάθος`, `πρὸς κεφαλῆς` twice, `οὗ εἵνεκεν ὁ υἱός`), none a wrong answer settled. `npm run lxx:known -- --chapter Jhn.1 --chapter Rom.8` is
byte for byte what it was.

## Swete's tokens

`scripts/lxx/swete.ts` reads the two pinned files: `00-Swete_versification.csv` (`1	Gen.1:1`: each verse's first line) and
`01-Swete_word_with_punctuations.csv` (`3	ἐποίησεν`: one token a line). A verse runs from its first line to the line before the next verse's.

- **A reference** is the verse and the word's number in it: `Gen.1:20#13`. The editor's signs (`⸆`, `⸂⸆⸃`: a token of nothing but signs and
  punctuation) are not words: they are left out, not numbered, and counted (Gen 1 has five, in 1:13, 1:14, 1:19, 1:26 and 1:31). So is the editor's verse number of an addition (`[1]`, `⸂[1]`; 'The two books over the bar', B9).
- **Brackets** mark letters Swete supplied where Codex Alexandrinus is damaged (`πληθυ]νέσθωσαν`, `Ἐξαγαγ[έτω`). They are stripped for look-up
  and kept in the token's display text; the word's row notes them. One bracket can open in one word and close several words later.
- Swete writes accents as oxia (U+1F71), not tonos; the key's NFC makes them one.

## The bar

A book's annotation file holds only what passes the bar of the probe (`docs/sources/lxx-derivation-probe.md`, 'Error checks for the full run', 1), and since mw-u2w5klk.265 the unit that passes is the Greek chapter (below, 'The chapter bar'); the bar is
read whole for a book by `verdict`, which `npm run lxx:report` shows and the second pass counts. The bar is data in
`scripts/lxx/bar.ts` (`BAR`). Five lines, each with its number and why:

| Line | The number | Why |
| --- | --- | --- |
| Known-answer lemma | at least 99% of the words of each known-answer chapter | The probe's John 1 scored 99.9%. A model that misses one word in a hundred makes a mistake a reader meets in every few verses |
| Known-answer full parsing | at least 98% of the same words (lemma and the whole parsing) | The probe's John 1 scored 99.5%. Parsing is where two cases share an ending, which is where the probe found its errors |
| Pending | none: no word of the book left without an answer | A word with no answer is not an annotation; the build fails while any waits for a choice (probe, check 4) |
| Guesses | at most 3% of the book's words | A guess is the model's own lemma and parsing where the candidates held none, or none of them fit, or that it marked a guess (`isGuess`: layer 3 with a note beginning `guess:`). A guessed lemma is not a dictionary form until checked; the app draws it with a mark and never quizzes it (probe, check 3). **The Governor's answer, 2026-11-02: "A: Count only words with no candidate"**: a choice among the candidates of a name read from its own form (support `form`, 'Names no lexicon has') is not marked a guess and does not count, unless the model marks it one; only a word no source gave a candidate counts. The test is `the bar counts only the words with no candidate, or marked a guess: not a choice among form candidates (B9)` in `tests/unit/lxx-bar.test.ts` |
| Agreement breaks | at most 5 per 1,000 words of the book | The agreement check finds a settled article, adjective or participle that does not agree with its settled noun. Genesis has 1.2 (probe, check 2) |

**The known-answer chapters of a build** are two: John 1, and one other New Testament chapter that changes with the build. The other chapter is taken from `SECOND_CHAPTERS` in
`bar.ts` by the build number (`secondChapter(build)`: the build number counts round the list), so no build is held to the same second chapter as the last and a model cannot be tuned to it.
The list is Rom.8 (the chapter the first model story, M0, measures), Mat.5, Mrk.4, Luk.15, Act.2, 1Co.13, Eph.2, Php.2, Heb.11, Jas.2, 1Pe.1 and Rev.21: none of John. The build number is the patch of
`package.json`'s version (0.7.55 is build 55), which each landed batch raises by one; `--build <n>` names another. Each chapter's book is hidden from layers 1 and 2 as John is, and each
needs a choices file of its own in `data/lxx/known/` made by a model session without TAGNT's answers: a chapter with none scores its pending words as wrong. Adding a chapter to the list means someone has to make that file.

**Only the chapters that have a file are held** (mw-u2w5klk.265; `knownChaptersFor` in `bar.ts`). John 1 always; the build's own second chapter when `data/lxx/known/` has its file; otherwise the newest OTHER chapter of the list that has one (the last in the list), and
the run says so: `second chapter Luk.15: no choices file; Rom.8 used`. With two files of twelve, holding each build to its own second chapter would fail ten builds of twelve and nothing could ship; no build fails for a missing file alone, and with no second chapter
having a file the run holds John 1 alone and says that. The rotation stays the aim: once a chapter has its file, the builds that rotate to it are held to it. `npm run lxx:report` prints the note under the known-answer table.

### The chapter bar

The chapter is what ships. A Greek chapter (Swete's numbering, which is not always Lampas's: Greek Ps 22 is Psalm 23) is held against the chapter bar by `chapterVerdict` in `bar.ts`: it is **SHIPPABLE** when no word of it is pending and its agreement breaks are at most
5 per 1,000 of its words (`BAR.breaks`, the number a book is held to, read per chapter; a break is counted in the chapter of its verse, `AgreementOutcome.breakVerses`). A chapter that fails names each line (`pending: N`, `breaks: N per 1,000`). Its guesses are counted and shown,
a figure and a share of the chapter's words, and never a hold on the chapter.

Three lines are held once for the whole run, not by the chapter: the known-answer lines of the build (the chapters above), and **the guess line, which stays the book's** (at most 3% of the book's words, the Governor's answer of 2026-11-02): when one fails, nothing of the book is written. The Governor's word of
2026-11-05 replaced 'a book ships only above its bar' with 'a chapter ships above the same bar, read per chapter'; the numbers did not change. A book is SHIPPABLE as a whole (`verdict`, the report's Bar column) when every line holds for all of it.

A third line is the parsing: a chapter with a word whose parsing Lampas cannot put in words (`decodeParse`, `src/data/parseCode.ts`) is not shippable (`parsing: N`), because the build of its file stops at such a row. The
run does not stop: `lxx:ship` names each such word (`gen: Gen.20:6#8 has the parsing "P-1NS + G2532", which Lampas cannot put in words: chapter 20 is not shipped`) and goes on, so one word never stops the deploy of every
Lampas landing (mw-u2w5klk.270). The first real cause was TAGNT's own last part on an adjective: TAGNT tags a people's name written as an adjective as it tags a noun (`A-NPM-LG` for Αἰγύπτιοι, Gen.12:12#8; -L a place, -LG a group
of places, -PG a people, -T a title), and `normMorph` in `tagnt.ts` dropped the tag from a noun only; it now drops it from an adjective and an adverb too (an adjective's own -C, -S and -P stay).

PROVISIONAL (the Mayor's calls of 2026-11-05, to be confirmed by the Governor): the chapter bar's three lines and the choice of known-answer chapters above; that a word with an unsayable parsing holds only its chapter back.

## The known-answer run

`npm run lxx:known -- --chapter Jhn.1 --chapter Rom.8` runs each chapter through layers 1, 2 and 2a with its whole book hidden from the form index and the parser (TBESG stays as the lemma list: a lexicon is not an answer key),
and scores the result against TAGNT's own rows for the same words. The words are TAGNT's NA28 words of the chapter (an `N` in the row's edition code), read as a book of Swete's would be, so the references are
the derivation's own (`Jhn.1:33#23`). **Lemma** is right when it equals TAGNT's exactly, in NFC, so accents count; **full** is right when the lemma and the whole parsing are, a noun's semantic tags (`-T`, `-P`, `-L`) dropped.

The run prints, for each chapter: layers 1 and 2 alone before the agreement check (the probe's table: on John 1 layer 1 settles 673 words, 672 right on the lemma and 670 on full parsing, layer 2 25 of 25; 16 of 16 since 'A lone candidate on thin support'); then the
words each layer answers after the check (1, 2, 2a); then layer 3, the words a choices file settled; and the whole chapter. A word still pending with no choice has no answer and is counted wrong. Flags:

```bash
npm run lxx:known -- --chapter Jhn.1                                # the choices file data/lxx/known/jhn-1.tsv when there is one
npm run lxx:known -- --chapter Jhn.1 --choices <file>               # a model session's choices, scored the same way
npm run lxx:known -- --chapter Jhn.1 --choices-dir <dir>            # another directory of known-answer choices
npm run lxx:known -- --chapter Jhn.1 --choices <file> --keep-demoted  # the probe's reading
```

`--keep-demoted` is for comparing with the probe, whose choices were made before the agreement check existed: a pending word with no choice scores as the answer layer 1 or 2 gave it before the check demoted it.
On John 1 with the probe's choices (`tests/fixtures/lxx/choices-jhn-1.tsv`, copied from the probe's `MODEL_CHOICES_JOHN`) that reading scores 828 of 829 on the lemma and 825 on full parsing, the probe's
numbers; the check demotes 48 words the probe's choices do not cover, which a model session now chooses, and scored without the flag (as the bar scores) they count wrong. The bar never uses the flag.

## The choices file

Layer 3 is a model's choice, made by a Builder's own session reading a pending word in its verse (no paid API). A choices file has a header and one line per word, tab-separated: `ref`, `parsing` (TAGNT's code),
`lemma` (left empty when the candidates have one lemma for that parsing) and `mark` (empty, `unsure` or `guess`). A line starting with `#` is a comment.

- A choice among the word's candidates takes confidence 0.8, an `unsure` one 0.5; layer 3.
- A choice outside the candidates is refused unless it is marked `guess`, and a word left with no candidate takes any choice as a guess; a guess is 0.4 sure, names its lemma (or the candidates have one lemma between them), carries the note `guess: ...`, and is
  counted against the guesses line of the bar. A refused choice leaves its word pending.
- A reference twice in a file or in two files of a book is an error. A choice for a word that is not pending (settled by layers 1, 2 or 2a) is ignored.

Where the files live: `data/lxx/choices/<book>-<batch>.tsv` for a Swete book (`gen-01.tsv`), all of a book's files joined by `lxx:release` and `lxx:report`; `data/lxx/known/<book>-<chapter>.tsv` for a known-answer chapter (`jhn-1.tsv`);
`data/lxx/recheck/<book>.tsv` for the second pass's choices on a sample (`lxx:choose --recheck`; `lxx:report` reads this and any `<book>-*.tsv` there). `lxx:choose` writes the file in the reader's shape, `ref`, `parsing`, `lemma`, `mark`
(`scripts/lxx/choices.ts`), with two columns after them that the reader leaves be: `confidence` (0.80, 0.50 or 0.40) and `note` (`model: unsure`, `guess: ...`).

## A model session

A model story gives a Builder one batch of one book. **The Builder's own session is the model of layer 3**: no script calls a paid API, and the Builder reads each verse itself. A batch is about 700 pending words, cut at a chapter
boundary (a chapter that would take a batch past 700 is taken in when it overshoots by less than the batch falls short without it; a chapter of 700 or more is a batch alone). A batch has one choices file, so the stories of
one book never touch the same file and different books run in parallel.

**Model stories are pathed `host=laptop`.** `lxx:batches`, `lxx:pending` and `lxx:choose` read the Morpheus cache (`data/lxx/morpheus/<book>.tsv`, 'Morpheus, the second method'), which is git-ignored and is made on the Laptop (where Docker is, and where the image
was built for story mw-u2w5klk.14). A host without the cache lists fewer candidates (a form Morpheus knows has `no candidate` there) and accepts fewer choices, so a batch listed on one host cannot be checked on the other: its counts differ (the sweep's: 17,800 words with no candidate
without the cache, 12,541 with it, 'The sweep'). Until a later story moves the cache into the repo, or a host builds its own with `npm run lxx:derive -- --all`, a Builder session for a model story runs on the Laptop and **builds the cache first** (a fresh worktree has none).
`lxx:pending` enforces it (story mw-u2w5klk.268): for a batch or a `--recheck` with no `data/lxx/morpheus/<book>.tsv` it exits non-zero, writes no listing and prints the command, `sg docker -c 'npm run lxx:derive -- --book <code>'`.
`--no-morpheus` is the way past it for a host that truly cannot run Docker: it lists as the other host would, with fewer candidates, and the closing comment says so. `lxx:batches` and `lxx:choose` go on without the cache and print one `warning: no Morpheus cache` line (`lxx:batches --all` one line
after its total row, naming the books); `lxx:report` shows a dash in the Morpheus column; `lxx:known` and `lxx:release` read no cache for a hidden chapter or take what they find.

**The Mayor**, to file the stories:

```bash
npm run lxx:batches -- --book gen     # batch, chapters, pending, no candidate: a row a batch, then the total
npm run lxx:batches -- --all          # a row a book of the 39: how many of its words have no candidate, so must be a guess, against the bar's 3%, how many of those are names, how many more are a name read from its own form, and both as a share
```

**The Builder**, for its batch `n` of book `b` (`gen`, batch 1; the files are `gen-01`):

```bash
npm run lxx:pending -- --book gen --batch 1                 # prints the batch and writes data/lxx/pending/gen-01.md (git-ignored: it holds Swete's Greek)
npm run lxx:choose -- --book gen --batch 1 --from <file>    # checks the choices and writes data/lxx/choices/gen-01.tsv
```

0. Build the book's Morpheus cache first, when `data/lxx/morpheus/<book>.tsv` is not there (a fresh worktree has none; `lxx:pending` refuses without it): `sg docker -c 'npm run lxx:derive -- --book gen'` makes it in a minute and prints `Morpheus gave N words candidates`.
1. Run `lxx:pending` and read it. Each verse is printed whole with the words to choose marked ⟦like this⟧; under it, a line for each of them: its reference, its form, and its candidates as `lemma parsing (support)`, most frequent first, or `no candidate`.
2. Write the choices in a file outside the repo (`/tmp/gen-01.txt`), one line a word, in the order of the listing: `ref parsing`, then the lemma when two candidates share that parsing, then `?` when unsure or `guess`:
   `Gen.1:2#16 V-IPI-3S ?` · `Gen.1:7#15 R-ASN ὅς, ἥ` · `Gen.1:14#5 V-APM-3P γίνομαι guess`. A line starting `#` is a comment.
3. Run `lxx:choose`. It refuses, naming each reference, a line whose lemma and parsing are not among the word's candidates and that does not say `guess`; a reference that is not in the batch; a reference twice; a word of the batch with no line; a word
   with several lemmas for the parsing you chose and none named; a word with no candidate answered without `guess`; a guess that names no lemma. Nothing is written until none is left: fix the file and run it again.
4. Commit the one file, `data/lxx/choices/gen-01.tsv`, and nothing else. (The confidence is 0.8 for a plain line, 0.5 for `?`, 0.4 for `guess`.)

**The rules:**

- **Only from the candidates.** Choose the candidate the verse supports. Do not reach outside the list because another reading seems nicer.
- **Read the verse.** The candidates are not ranked by the verse: the support is a New Testament count. Check the word's neighbours: an article, adjective or participle agrees with its noun in case, number and gender; a verb agrees with its subject.
- **Mark unsure.** When the verse does not settle it between two candidates, choose the likelier and add `?`.
- **A guess only when there is no candidate.** A word with `no candidate` takes `guess` and names its lemma (look it up; a rare word is checked against TBESG or any lexicon). Mark `guess` on a choice outside the candidates only when none of them can be right, and say why in the closing comment.
  A book is released only with at most 3% guesses ('The bar').
- **Name the lemma** only when two candidates have the same parsing under different lemmas; otherwise leave it out.
- **No paid API.** Nothing in this session calls one. Anything that is wrong with the listing (a candidate that seems missing, a word that is not Greek) goes in the closing comment with its reference, for the Mayor; it is not fixed in passing.

**Tips from M0** (story mw-u2w5klk.7: Sonnet at high chose John 1's 149 and Romans 8's 135 pending words with their books hidden; whole chapter lemma 99.8% and 99.8%, full parsing 99.3% and 98.8%, the bar met on both; the files are `data/lxx/known/jhn-1.tsv` and `rom-8.tsv`). The hardest choices, and what they teach:

- **A neuter's nominative and accusative are one ending, and the clause can be read either way** (`Rom.8:3#1` τὸ ἀδύνατον τοῦ νόμου, `Rom.8:27#7` τί τὸ φρόνημα, `Jhn.1:21#4` τί οὖν;). The session read the first two as nominative and the third as accusative, and TAGNT has them the other way round; these were half of layer 3's eight errors, and no rule of thumb settles them (the same session got `Jhn.1:46#8` τι ἀγαθόν and `Rom.8:1#1` οὐδὲν κατάκριμα right as nominative). Mark `?` on a neuter whose case the verse does not force; do not spend long on it.
- **A candidate list can lack the right word** (`Rom.8:13#5` ζῆτε listed only ζητέω readings; `Jhn.1:44#6` Βηθσαϊδά after ἀπό listed only vocative and accusative). Read the lemma column as well as the parsing: when no candidate can be right, mark `guess`, name the lemma and parse it yourself. Five of the six guesses of the two chapters were right in the lemma (the sixth is the convention below).
- **TAGNT's conventions are the answer key, not the grammar books.** A comparative is lemmatised under the positive (`Jhn.1:50#16` μείζω is μέγας, not μείζων, which is the TBESG headword); a second perfect or second aorist carries the `2` (`Jhn.1:15#6` κέκραγεν is `V-2RAI-3S`, not `V-RAI-3S`); `οὐ μόνον` is the adjective μόνος `A-ASN`, which the 50-to-2 support counts show. When two candidates differ only in such a convention, follow the support counts.
- A known-answer chapter's pending words have no `lxx:pending` listing (`lxx:known` has no `--pending` or `--from`; its flag is `--choices`). M0's listing came from a throwaway script that ran `deriveBook` on the chapter as `known.ts` does and printed each pending word's verse and candidates, never TAGNT's answers; the next such story rebuilds it the same way.

**Tips from the model stories** (mw-u2w5klk.33 to .36):

- **Read case from the sentence, never from a candidate's count**, above all on capitals (`Gen.1:1#2`): the support is a New Testament count and the verse decides.
- **A word with no lexicon entry lists junk candidates**, and `ἐμοῦ` offers only the possessive (mw-u2w5klk.33): read the lemma column and mark `guess` when no candidate can be right.
- **A long name line runs to kilobytes**: read it with `cut -c1-260`. A name with a grave accent can have no candidate at all (mw-u2w5klk.34).
- **A parsing that two lemmas share needs the lemma named** (mw-u2w5klk.35). A throwaway script outside the repo that groups each word's candidates by lemma makes the listing readable.
- **Choose in the order `ref parsing lemma guess`**, and `lxx:report` rewrites `docs/lxx-report.md`: `git checkout docs/lxx-report.md` before committing, for a model story's diff is its choices file only (mw-u2w5klk.36).

**The recheck**, one story a book after its batches are in: a second session, which must not read `data/lxx/choices/`, lists a blind 5% of the book's chosen words (at least one; seeded by the book, so it is the same words each time, in the text's order, with nothing of the first choices)
and chooses them again the same way:

```bash
npm run lxx:pending -- --recheck --book gen                 # prints the sample and writes data/lxx/pending/gen-recheck.md
npm run lxx:choose -- --recheck --book gen --from <file>    # writes data/lxx/recheck/gen.tsv, committed
npm run lxx:report                                          # the book's row now shows the second pass's disagreement rate
```

The rate (the share of the second pass's choices that differ from the first's in the parsing, or in the lemma when both name one) is the book's error check: the story reports it, and a book whose rate is high is reread before it is released.

**The story template** (M1 and the model stories after it follow it):

- *Title:* `Lampas Septuagint, <Book> batch <n> (chapters <a>-<b>): the model's choices for <N> pending words`
- *Path:* rig `lampas`; files: `data/lxx/choices/<book>-<nn>.tsv` and nothing else; size M.
- *What:* run `npm run lxx:pending -- --book <book> --batch <n>`, read every verse, write the choices, run `npm run lxx:choose -- --book <book> --batch <n> --from <file>`, commit `data/lxx/choices/<book>-<nn>.tsv`. The rules of 'A model session' apply.
- *Acceptance:* (1) `data/lxx/choices/<book>-<nn>.tsv` exists, was written by `lxx:choose`, and has a row for each of the <N> pending words of the batch (`lxx:batches` gives the count); (2) the diff touches that file only; (3) the closing comment gives the counts chosen, unsure and guessed,
  lists the guesses with their lemma, and says what the session left in doubt; (4) `npm run lxx:report` still runs and the book's pending count has fallen by <N>.
- *Recheck story:* the same, with `--recheck`, the file `data/lxx/recheck/<book>.tsv`, and the disagreement rate from `lxx:report` in the closing comment.

## Morpheus, the second method

From the probe's 'Lampas's paradigm data, or an open analyzer?' and 'Error checks', 2(d) (story mw-u2w5klk.6). [Morpheus](https://github.com/perseids-tools/morpheus)
is the Perseus Project's analyzer of Greek and Latin, pinned at commit `ab6898ffed335fc6169fa02c9940657a9b5a78e0` and licensed **MPL-2.0**. It is a **build tool**, run from its Docker image at
derive time; **nothing of it is in the app**. MPL-2.0 is a file-level copyleft: it reaches Morpheus's own files, which Lampas does not copy, change or ship, and not what
the analyzer prints about a word (the probe's reading). What reaches Lampas's data is **its analyses as candidates (`morpheus` in the support column), never its code or its tables**.
`ATTRIBUTION.md` credits it as a build tool, not an app dependency. No paid API is called; Docker is never needed by the gate or the tests.

**What `scripts/lxx/morpheus.ts` does.** `npm run lxx:derive -- --book <code>` (or `--all`), when `docker` is in PATH and the image is there:

1. derives the book (layers 1 and 2 and the agreement check) as always, and takes its **forms with no candidate** and the forms of its **guesses** (the rows marked `guess` in `data/lxx/choices/<book>-*.tsv`);
2. asks Morpheus about each form the cache does not hold yet: `docker run --rm -i -e MORPHLIB=stemlib lampas-morpheus bin/cruncher -S`, the forms in Perseus beta code, one to a line
   (`LAMPAS_MORPHEUS_IMAGE` names another image). The image is the pinned commit built from the repository's own Dockerfile, once:
   `docker build -t lampas-morpheus https://github.com/perseids-tools/morpheus.git#ab6898ffed335fc6169fa02c9940657a9b5a78e0`;
3. maps what it prints to TAGNT's codes and writes `data/lxx/morpheus/<book>.tsv` (git-ignored, a derived cache; unlike the other files it holds the forms, in Greek, so it is never released): `form`, then `lemma/code` readings joined by ` | `,
   and one `unmapped` for each reading the mapping leaves out. A form Morpheus does not know has an empty second column. The cache is asked only for forms it lacks, and rewritten in a fixed order;
4. derives the book again: a word that had **no candidate** takes Morpheus's mapped readings as its candidates (`ἐκτρέφω/V-AAI-3S/morpheus`, the note `morpheus: candidates from the second method, for the model`), so a guess becomes a choice among candidates
   where Morpheus knows the form. The word stays pending: Morpheus settles nothing by itself, the model still chooses. (The agreement check may settle it as layer 2a when exactly one of Morpheus's candidates agrees with the settled words around it, as with any pending word.) A word where Morpheus gave nothing, or only readings the mapping leaves out, keeps `no candidate`.
5. asks about the forms whose one candidate is thin too, and weighs its answer with the rule's ('A lone candidate on thin support', story mw-u2w5klk.32); the cache file carries the number of the mapping that made it, `# mapping 2`, and one made by an earlier mapping is asked again.

**When Docker or the image is absent** the step prints one line, `Morpheus skipped: <why>` (for a whole `--all` run, once), and the output is byte-identical to a run with `--no-morpheus`. A cache from an earlier run is still read.
`lxx:release`, `lxx:report`, `lxx:batches`, `lxx:pending` and `lxx:choose` never run Docker: they read the cache that is there.

**The mapping** (`mapAnalysis`; the tests are `tests/unit/lxx-morpheus.test.ts`, one for each line). One Morpheus reading is one TAGNT code, or a code for each gender or case it lists together (`masc/neut gen sg` is `GSM` and `GSN`; at most six), or `unmapped`:

| Part of speech | Morpheus prints | TAGNT code | Left unmapped |
| --- | --- | --- | --- |
| verb, finite | tense, mood, voice, person, number (`pres ind mp 3rd pl`) | `V-` tense (`P` present, `I` imperfect, `F` future, `A` aorist) voice (below) mood (`I`, `S`, `O`, `M` imperative), `-3P` | a pluperfect or future perfect; an imperfect that is not indicative; the dual |
| verb, aorist | the same | `A` for the ending table `aor1` or `aor_pass`, `2A` for `aor2` or `aor2_pass` (`V-2AAI-3S`) | any other table (`ath_secondary`) |
| verb, perfect | `perf ind mp 3rd sg`, `perf part act masc nom sg`, `perf inf act` | `V-RPI-3S`, `V-RMI-3S`; an active one `V-RAI-3S` when the form has a κ before its ending (`firstPerfect`: λέλυκα, πεποίηκεν, λελυκώς), else also `V-2RAI-3S` (Morpheus's `perf_act` is one table for TAGNT's first and second perfects; 13 of TAGNT's 163 second perfects have a κ and 302 of its 681 first perfects have none, which is why a form without one is offered as both); a middle or passive one `R` only | a pluperfect or future perfect |
| infinitive | `pres inf act` | `V-PAN` | |
| participle | `pres part act fem gen pl` | `V-PAP-GPF` (case, number, gender) | |
| noun | gender, case, number (`fem acc sg`) | `N-ASF` | the dual; a comparative or superlative (`irreg_comp`, `irreg_superl`); a form with a flag beyond `contr`, `enclitic`, `nu_movable`, `a_priv` and `poetic` |
| noun or adjective Morpheus lists form by form | `indeclform`, class `irreg_decl3` or `irreg_adj3` (`do/rati`, `pa=s`) | `N-DSN`, `A-ASM` | |
| adjective | the same, from an adjective's ending table (`os_h_on`, `hs_es`, …: `ADJECTIVE_TABLES`) | `A-GSM` | |
| article | `indeclform`, class `article` | `T-GSM`, `T-GSN` | |
| indeclinable | `indeclform`, class `conj`, `particle`, `adverb`, `prep` | `CONJ`; `PRT` and `CONJ` for a `particle` (TAGNT writes δέ, οὖν, γάρ, ἄρα CONJ and μέν PRT, where Morpheus says particle for all); `ADV`; `PREP` | a pronoun, a numeral, any other class |

**Voice.** Morpheus says `act`, `mid`, `pass` and `mp` (middle or passive), and for a deponent verb says `mp` in every tense; TAGNT says what the form is. `voicesOf` gives each reading the letters TAGNT uses (a deponent is told by its lemma ending in -μαι):
`act` `A`; `mid` `M` (and `D` for a deponent); `pass` `P` (and `O` for a deponent's aorist or future); `mp` of a deponent `N` in the present and imperfect, `D` and `O` in the aorist and future; `mp` of any other verb `P` and `M`.
A deponent's perfect (`mp`) is `N` or `P`, the two TAGNT writes (13 and 11 of its words), not the `D` and `O` of its aorist and future. TAGNT's `E` (middle or passive, not told) is rare in its text (about 40 of the New Testament's verb words), so it is no longer offered. Several voices make several readings, which is why a form can have two codes where it had one.

Always unmapped: a reading in a dialect without Attic (`doric aeolic`, `epic`: a reading whose dialects list `attic` is kept), an unaugmented form, a pronoun (the pronoun classes, and the lemmas Morpheus declines as an adjective where TAGNT has a pronoun's code: αὐτός, ἐκεῖνος, ἐμός, σός, ἡμός, ὑμός, ὅσος, … `PRONOUN_LEMMAS`), an English gloss (`E`, which is not another reading and is not counted). A Morpheus lemma is Morpheus's headword in beta code read back as Greek
(`gi/gnomai` is `γίγνομαι`, where TAGNT writes `γίνομαι`): lemmas are compared by their letters without accents, not by spelling, and a spelling difference shows as 'differed'. A deponent verb is told by its lemma ending in -μαι ('Voice'), so its passive is offered as `P` and `O`; a verb Morpheus gives an active lemma but TAGNT treats as deponent (ἀποκρίνω, whose `ἀπεκρίθη` TAGNT writes `V-ADI-3S`) still shows as 'differed'. These are the mapping's known weak spots, and the count below is how to see their size.

**The count.** `lxx:release` and `lxx:report` read the cache and count, for each book, its guesses (layer 3 rows marked `guess:`) that Morpheus **agreed with** (a reading has the guess's parsing and the lemma's letters), **differed from**
(it has mapped readings and none is the guess) or **did not know** (no cache row, or no reading the mapping covers). `lxx:release` prints `Morpheus: A agreed, D disagreed, U unknown (the guesses)`; the report has a column, `Morpheus agreed / differed / unknown`, with a dash for a book that has no cache. A guess it differs from is looked at, in the second pass's way.

**Checking it.** The tests give Morpheus's output as a fixture (`tests/fixtures/lxx/morpheus-sample.tsv`, for the 7 forms of Gen 1 and Ps 22 that layers 1 and 2 leave with no candidate: `Γενηθήτωσαν`, `ζωσῶν`, `ἐξέθρεψεν`, `αὐταί`, `ἐλίπανας`, `καταδιώξεται`, `μακρότητα`), never the image or the network.
The fixture is **captured from the real image** (story mw-u2w5klk.14; its header says how): the first version was written by hand in the shape of Morpheus's own `test/fixture.json`, and the first real run found it wrong in five places (below).

### The sweep: what the first real run found

On the Laptop, with the image built from the pinned commit (`docker build -t lampas-morpheus https://github.com/perseids-tools/morpheus.git#ab6898ffed335fc6169fa02c9940657a9b5a78e0`, 1 minute 34 seconds, 199,582,456 bytes) and `npm run lxx:derive -- --all`
(60 books, 10,954 forms asked, 1 minute 51 seconds). Where the real output differed from what the code and the doc had taken it to be:

- **A form Morpheus does not know has no line on standard output** (it is said on standard error, with `:longtime` timings): the reader had taken an echo line with no analyses, so a book with one unknown form failed with `Morpheus answered 228 forms for 566`. `parseCruncher` now matches the echoes to the forms asked, in order, and the others are unknown.
- **The echo line is there for a known form, as the input** (every echo of the sweep was one of the forms asked, in order).
- **The aorist tables are named as taken** (`aor1`, `aor2`, `aor_pass`, `aor2_pass`), and so are the participle's `P` and the finite verb's `V`; an athematic aorist (`emi_aor`, `ami_aor`, `ath_secondary`) has no table that says first or second and stays unmapped (193 readings).
- **The dialect column** lists every dialect a form can be in, `attic` among them (`attic epic doric ionic`); the mapping already took a reading with `attic` in the list.
- **`mp` is a deponent's voice in every tense** and TAGNT's `E` is rare: 'Voice' above (the hand-written fixture had `pres ind mp` mapped `E`).
- **`indeclform` is also set on a noun listed form by form** (`irreg_decl3`), not only on an indeclinable; and `nu_movable`, `a_priv` and `poetic` are flags that change nothing.
- **A pronoun is not always a pronoun class**: αὐτός is `art_adj`, an adjective's table, so every form of it came as an `A-` candidate where TAGNT writes `P-`.

The count of what the mapping covers, and the known-answer check, are `npm run lxx:morpheus-check -- --coverage` and `-- --known Jhn.1 Rom.8` (`scripts/lxx/morpheus-check.ts`; they need the image and write nothing). On the sweep's 10,954 forms: 5,927 known to Morpheus, 10,011 readings, 6,568
of them mapped (65.6%); the words that still have no candidate after Morpheus are 12,541 of the 39 books' 476,380 words (2.63%; 17,800, 3.74%, before), and 10,905 of them are forms Morpheus does not know (names, nearly all). `lxx:batches --all` gives the per-book figures with and without the cache.
In the known-answer check over the NA28 words of Jhn.1 and Rom.8 (1,481 words), Morpheus's mapped readings held TAGNT's lemma (by its letters, accents off) and parsing for 1,063 of the 1,255 words it offered readings for, 84.7% (74.9% before the fixes above); 71.8% of all the words. The misses are mostly the spelling of a lemma
(LSJ's γίγνομαι, εἶδον, εἶπον, Μωυσῆς for TAGNT's γίνομαι, εἴδω, ἔπω, Μωϋσῆς), TAGNT's `CONJ`, `PRT` and `ADV` where Morpheus has another of the three, and a deponent Morpheus gives an active lemma.

**What the readings left out would add** (`--coverage`, over the 12,541 words that still had no candidate; a word counts under each reason among its form's readings, then 'only' where that is its one reason): a perfect, 821 words (666 only), a pluperfect or future perfect, 55 more (44); a dialect without Attic, 659 (418);
an athematic aorist, 123 (78); a form listed by itself on an irregular table (`irreg_decl3`), 53; a comparative or superlative, 44 (44); a pronoun, 70 (46); a numeral, none. **The perfects are mapped now** (story mw-u2w5klk.32): the words with no candidate fall from 11,546 to 10,725 on the rebuilt cache; the pluperfect (22 words) and future perfect (25) are what is left of the tenses, and a dialect without Attic is the largest reason (504).
(11,546 is the count on the cache `lxx:derive -- --all` builds before this story; 12,541 was the sweep's, before names were read from their form.)

## The annotation file

`npm run lxx:release -- --book gen` derives the book, joins its rows with every choices file of the book, runs the known-answer chapters of the build, and holds each Greek chapter against the chapter bar ('The chapter bar'). It writes
`data/lxx/annotations/gen.tsv` with the rows of the shippable chapters only; with none shippable, or when a line held for the whole run fails (the known-answer lines, the book's guess line), it refuses, names each failing line (`chapter 1: pending: 7 words left without an answer (the bar: none)`), and writes nothing.
**A partly shipped book's file is partial, and says so**: its first line names the Greek chapters it holds, `# shipped chapters: 1-6 of 50` (ranges, `1-2, 4-6 of 50`; `# shipped chapters: all 50` when every chapter is in it), and `data/lxx/README.md` says a partial book is partial.
The build (`npm run data:build:lxx`) reads that line, skips it as a comment, and stops where it names chapters the rows do not hold. **The annotation file is the MIT release**
(`data/lxx/LICENSE`) and is committed: every row in it passed the bar. After the comment line, a header row and one row a word in the text's order, tab-separated, with `ref`, `lemma`, `parsing`, `layer` (1, 2, 2a or 3), `confidence` (two decimals) and `notes` (in words, `; `-separated).
**It never holds Swete's own words**: a word is named by its reference, and the only Greek in it is the lemma, which is Lampas's own derived data. A second run writes the same bytes.
The files of `derived/` and `pending/` stay git-ignored; they are working files.

## The report

`npm run lxx:report` writes `docs/lxx-report.md` between its markers: this build's known-answer scores, and one row for each of the 39 books of Swete's Old Testament (the other 21 books of his file are not assessed): its words, the share each layer settled, the words still
pending, guesses, agreement breaks per 1,000 words, the second pass's disagreement rate (the share of the recheck files' choices that differ from the first pass's on the same word, a dash when there are none), the Greek chapters that ship (**Shipped chapters**: `1-6 of 50`, `none` or `all`), and
SHIPPABLE or NOT with the failing lines named (the whole book's). It is the build's one place to see a book fall short. A second run on the same inputs changes nothing. No book is SHIPPABLE as a whole yet: the model's choices (B4, then the model stories) are what is missing.

## On the word card

A tap on a Septuagint word opens the word card (mw-u2w5klk.12, `features/septuagint.feature`). Its lemma, parsing and Meaning are the derivation's and TBESG's (`public/data-lxx/lexicon-grc-lxx.json`, by lemma); the word has no Strong's number, so the card has no Strong's row. 'How Lampas read this word' says the layer and the confidence in words:

| Layer (`y`) | The card says | Confidence (`c`) | The card says |
| --- | --- | --- | --- |
| 1 | From the New Testament's forms | 0.85 and above | sure |
| 2 | From the paradigm parser | 0.60 up to 0.85 | likely |
| 2a | By agreement with its neighbours | below 0.60 | unsure |
| 3 | A model's reading of the verse | | |
| g (confidence below 0.5) | A guess | | |

A guess is drawn in the text with a dotted line, its card begins 'A guess: Lampas derived this reading and is not sure', and it is never offered to learn, quizzed, drilled or put on his list until a model session or a person has checked it. A guess or an unsure word has Report this reading, which asks the tutor 'Is <form> in <ref> read right as <lemma>, <parsing>?'; the reader-facing words are on Help's Words page.

## The re-count after the three fixes

Story mw-u2w5klk.29, 2026-11-04, after the three fixes of the hand audit's causes (mw-u2w5klk.26 the vocative, .27 a preposition's case, .28 a lone candidate on thin support). The Governor's word: fix the three, re-count,
then the model batches. The count is in `docs/sources/lxx-settled-audit.md` ('The re-count after the three fixes'); this is what it found, for whoever files the model stories.

- **Batches: 193, against 178 before F3** (177 when the audit was drawn), over the 39 books by `npm run lxx:batches -- --book <code>`; **121,137 pending words** against 112,991 (112,888), of which 9,715 have no candidate, as before. F3 added all but 103 of the
  increase; the model stories are filed from the new table, not the old one. The 39 recheck lists (`lxx:pending --recheck`, 5% of a book's chosen words) stay 39, with 6,058 words if every pending word is chosen.
- **The seven words the first audit judged wrong:** five settled right (the three addresses by F1, `ῥινὶ` and `τρίβων` by F2); two (`ἄφρονος`, `ἐξῆρται`) pending with **only a wrong candidate**, so a model choosing among the candidates cannot be right on them.
- **The first audit's 468 words:** 422 read as before; 46 differently (5 repaired, 2 pending with no right candidate, 1 unsure now pending, 38 right now pending: a thin lone candidate or a neighbour made pending).
- **A fresh sample** (`npx tsx scripts/lxx/audit-sample.ts --seed 20261104`, 6 a pool a book): the whole word 456 of 463 judged, 98.5% (Wilson 96.9% to 99.3%), the lemma 99.4% (98.1% to 99.8%). **It cannot settle the 98 bar** (the interval holds 98;
  about 2,300 words read by hand would be needed). Layer 2 alone is 95.0% (89.6% to 97.7%): four of its six wrong words are analogy's lone candidate on one sibling form (`mw-u2w5klk.30`, deferred), two a rule's winner over the reading the verse needs.
- The audit file's count reads a section: `--count <file> [--section <heading>]` (`## The words`, the first audit's, unless one is named).

## The files

Written under `data/lxx/` (`derived/` and `pending/` are git-ignored working files; `.gitignore`). Tab-separated, a header row, one row a word in the
text's order, a newline at the end. A word is named by its `ref` alone: **no column holds Swete's Greek**. The lemma and the candidates are Lampas's
own derived data, and Greek.

`data/lxx/derived/<book>.tsv`, the settled words:

| Column | What it holds |
| --- | --- |
| `ref` | `Gen.1:20#13` |
| `lemma` | the dictionary form, NFC, as TAGNT writes it |
| `parsing` | TAGNT's code (`N-NSM`, `V-AAI-3S`, `T-GSN`, `PREP`) |
| `layer` | 1, 2 or 2a, the agreement check (later 3) |
| `confidence` | two decimals, as in 'Layer 1 in detail' and 'Layer 2 in detail'; 0.85 for layer 2a |
| `candidates` | every analysis found, most frequent first, as `lemma/parsing/support` joined by ` \| ` (`ἀρχή/N-NSF/8 \| ἀρχή/N-DSF/5`; a lemma may hold a space or a comma, never `/` or `\|`) |
| `notes` | `;`-separated, in words: `unaccented: matched without accents`, `capitals`, `brackets: letters Swete supplied`, `spelling: ei written i`, `spelling: i written ei`, `spelling: movable nu added`, `spelling: movable nu dropped`, `not in the New Testament: for the parser`, `analogy: a sibling form in the New Testament`, `shared ending: <class>: for the agreement check or the model` (a word settled again by agreement keeps it), `agreement: <link> with <ref>` (layer 2a, one for each settled neighbour) |

`data/lxx/pending/<book>.tsv`, the words still waiting: `ref`, `candidates`, `notes`, where the notes end with why it waits:
`several analyses: for the model` (layer 1's), `several candidates: for the model` (the parser's), `no candidate: for the model to guess`, or the agreement
check's: `a name in the New Testament: lower case here, for the model`, `shared ending: <class>: for the agreement check or the model`,
`agreement break: <link> with <ref>: for the model`, or `an indeclinable name: every case of its gender: for the agreement check or the model`. A candidate the shared-ending rule added has support 0.
A candidate the name rule added has `name` in the support column (and 0 in the counts). A candidate a name no lexicon has was given from its own form (`withFormNames`) has `form` there (and the note `a name no lexicon has: its form read as its own lemma, every case of every gender: for the agreement check or the model`); a word settled by agreement keeps it in its candidates column, which is how an audit tells such a reading from a lexicon's.

`data/lxx/morpheus/<book>.tsv` (git-ignored, a derived cache), Morpheus's analyses of a book's no-candidate forms and guesses: `form`, `analyses` ('Morpheus, the second method'). A candidate it gave has `morpheus` in the support column.

`data/lxx/annotations/<book>.tsv`, the MIT release: `ref`, `lemma`, `parsing`, `layer`, `confidence`, `notes`, committed, written by `lxx:release` only when the book passes the bar ('The annotation file'). `data/lxx/choices/`, `data/lxx/known/` and `data/lxx/recheck/` hold the choices files ('The choices file'); they are committed too.

`<book>` is Swete's book code in lower case: `gen`, `exo`, … `psa`, … (Swete's file has 60 books; Tobit and Daniel come in two forms each).

A released book is turned into the app's chapter files by `npm run data:build:lxx` (`scripts/data-build-lxx.ts`, `public/data-lxx/`; docs/data.md 'The Septuagint data'): it joins the annotation file's rows to Swete's tokens by reference, so the MIT file never holds his Greek and the chapter files, which do, ship with eliranwong's GPL-3.0 notice beside them.

## The commands

From a clean checkout, Node 20 or later, with network access for the first run:

```bash
npm ci
npm run lxx:derive -- --book gen               # data/lxx/derived/gen.tsv and data/lxx/pending/gen.tsv, and the counts
npm run lxx:derive -- --book gen --hide jhn    # John's rows left out of the form index and the parser: a known-answer run
npm run lxx:derive -- --word Gen.1:20#13       # one word: its candidates, their support, the rule or analogy behind each; writes nothing
npm run lxx:derive -- --all                    # every book of the file, trained once: each book's two files, and one line a book
npm run lxx:derive -- --book gen --no-morpheus # the same with the second method off (with no Docker it prints "Morpheus skipped: ..." and does the same)
npm run lxx:known -- --chapter Jhn.1           # a New Testament chapter with its book hidden, scored against TAGNT ('The known-answer run')
npm run lxx:lone-support                       # the New Testament measure behind LONE_MIN_STEM_SUPPORT and LONE_MIN_ANALOGY_SUPPORT, and what analogy's readings beside a thin lone candidate hold, each book hidden in turn ('A lone candidate on thin support')
npm run lxx:morpheus-check -- --known Jhn.1 Rom.8   # Morpheus's mapped readings against TAGNT's answers; needs Docker and the image ('The sweep')
npm run lxx:morpheus-check -- --coverage            # the mapping's coverage over the sweep's forms, and the words still with no candidate, by reason
npm run lxx:batches -- --book gen              # the book's pending words in batches of about 700: the table the model stories are filed from ('A model session')
npm run lxx:batches -- --all                   # a row for each of the 39 books: words, pending, no candidate (the words forced to be a guess), that as a share of the words, and how many are names
npm run lxx:pending -- --book gen --batch 1    # a batch's pending words with their verses and candidates: for a model session
npm run lxx:choose -- --book gen --batch 1 --from <file>  # a model session's choices, checked, as data/lxx/choices/gen-01.tsv
npm run lxx:release -- --book gen              # data/lxx/annotations/gen.tsv: the rows of the chapters that pass the chapter bar ('The chapter bar'), under `# shipped chapters: 1-6 of 50`
npm run lxx:ship -- --out <dir> [--no-morpheus] [--build <n>]   # for each book with a choices file: derive, release its shippable chapters and build the chapter files, index.json, lexicon and notices into <dir>; no tracked file changes ('The deploy')
npm run lxx:report                             # docs/lxx-report.md: where every book of the Old Testament stands
npx tsx scripts/lxx/audit-sample.ts [--seed <n>]    # the hand audit's sample of settled words (6 a pool a book; seed 20261103 unless given), each with its verses; --count <file> [--section <heading>] counts the verdicts
```

The run fetches the pinned sources into `data/raw/lxx/<repo>/<commit>/<path>` (git-ignored) unless they are there (`scripts/lxx/sources.ts`), and prints
the book's words, the editor's signs left out, the parser's triples, rules and lemmas, the words settled in layers 1 and 2, then the agreement check's
lines (`settled by agreement (layer 2a)`, `demoted by the shared-ending rule`, `a name in the New Testament, lower case here`, `agreement breaks: … breaks
per 1,000 words`, `pending before the agreement check: …; after it: …`), the words pending (and how many of those have no candidate), and a count of each
note. On the whole of Genesis: 32,635 words; before the check layer 1 23,148, layer 2 1,531, pending 7,956 (8,182 with the names that do not decline now waiting);
after it layer 1 21,626, layer 2 1,470, layer 2a 1,515, pending 8,024 (1,013 with no candidate), 1,291 demoted, 31 breaks (0.9 per 1,000). `--all` prints a line a book: book, words, layer 1,
layer 2, layer 2a, pending, pending before the check, demoted, breaks per 1,000. A second run writes the same bytes:
the candidates are ordered by support, then lemma, then parsing, never by the order of the files.

### The deploy

The live site's Septuagint is written at deploy, not in the batch stories (mw-u2w5klk.265). `npm run lxx:ship -- --out <dir>` takes every book of Swete's 39 that has at least one `data/lxx/choices/<book>-*.tsv` file and derives it (the Morpheus cache is read when present, `--no-morpheus`
leaves it off; Docker is never needed), holds the known-answer lines once, releases the book's shippable chapters to a temporary annotation set, and builds the chapter files, `index.json`, `lexicon-grc-lxx.json` and the three notice files (`LICENSE-swete.txt`, `README-swete.md`, `README.md`) into `<dir>`.
It writes nothing under `data/`, `public/` or `docs/`, prints one line a book (`gen: shipped 1-6 of 50`, `shipped all 50`, `shipped none of 50`) and exits non-zero only on a derive or build error, never on nothing shippable or on a word with a parsing it cannot put in words (that chapter is held back and the word named, 'The chapter bar'). So every landed batch ships its chapters on the next deploy.
The Laptop's deploy runs it after `npm run build`, into the built folder: `npm run lxx:ship -- --out dist/data-lxx`. The repo's own `public/data-lxx/index.json` stays `books: []`.

## The sources

| Source | Pinned at | Licence | Used for |
| --- | --- | --- | --- |
| Swete's Septuagint, eliranwong/LXX-Swete-1930: `00-Swete_versification.csv`, `01-Swete_word_with_punctuations.csv`, `LICENSE`, `README.md` | https://github.com/eliranwong/LXX-Swete-1930 commit `1d3efc3c63bd384a4f3f07ed37eef54b0d45ac33` | text public domain; packaging GPL-3.0 | the words and their references |
| TAGNT, `Translators Amalgamated OT+NT/TAGNT Mat-Jhn …` and `… Act-Rev …` | https://github.com/STEPBible/STEPBible-Data commit `be4191f0082aeedddb0eff0c02c966292b2bd641` | CC BY 4.0 | layer 1; the parser's rules |
| TBESG, `Lexicons/TBESG - Translators Brief lexicon of Extended Strongs for Greek …` | same commit | CC BY 4.0 | the parser's lemmas, a lemma's part of speech and a noun's gender; a name by its capital and `indecl.` ('Names that do not decline', 'A name written with a capital mid-clause') |
| TVTMS (fetched, not read here) | same commit | CC BY 4.0 | English Ps 23 = Greek Ps 22 (`npm run lxx:english`) |
| Morpheus, a build tool run from its Docker image (not fetched by the scripts) | https://github.com/perseids-tools/morpheus commit `ab6898ffed335fc6169fa02c9940657a9b5a78e0` | MPL-2.0 | its analyses of the forms with no candidate, as candidates ('Morpheus, the second method') |

## Checking it

- **The tests** (`tests/unit/lxx-layer1.test.ts`, in `npm test`) run layer 1 on Swete's Gen 1 and Greek Ps 22 from `tests/fixtures/lxx/` and never the
  network: Gen 1 settles 545 of its 751 words and Ps 22 78 of its 104, the probe's counts; each rule above has a test. The fixture's TAGNT rows are thinned
  (the test's header says how), so the supports in a fixture run are not the New Testament's counts.
- **A word by hand.** For `Gen.1:11#20`: find `Gen.1:11` in the pinned `00-Swete_versification.csv`, read on from that line of
  `01-Swete_word_with_punctuations.csv`, counting only tokens with a letter in them, to the 20th; look its form up in TAGNT (or any lexicon) and compare
  the row's `candidates`.
- **The parser's tests** (`tests/unit/lxx-parser.test.ts`) run layers 1 and 2 on the same chapters and on John 1, from fixtures: Gen 1 settles 28 words in
  layer 2 and leaves 178 pending, Ps 22 2 and 24, the probe's counts; each rule of 'Layer 2 in detail' has a test. The fixture's TAGNT rows for the parser
  are thinned as layer 1's are (the test's header says how): every word's answer is the one the whole of TAGNT gives, the supports are not.
- **The agreement check's tests** (`tests/unit/lxx-agreement.test.ts`) assert each shared-ending class, each link, the name rule and the probe's wrong
  words by reference (see 'The agreement check'); the tests of layers 1 and 2 count what those layers settle before the check (`beforeCheck`).
- **One word by its rules.** `npm run lxx:derive -- --word Gen.1:20#13` prints the word, what the layers made of it and each candidate with its support and
  the rule (`rule: πετομ-ενα as πετομ-αι (4 lemmas)`: the form's ending, the lemma's, and how many New Testament lemmas show the pair) or analogy behind it.
- **The known answer.** `--hide jhn` leaves John's rows out of the form index and the parser's training. On John 1 (its 829 words in NA28, from TAGNT,
  read as a book: `tests/fixtures/lxx/swete-jhn-1.csv`) layer 1 settles 673, layer 2 25, all 25 right; the parser alone, its first candidate with no
  context, is right on the lemma for 80.9% and on lemma and parsing for 69.3% of the 681 words it analyses (the probe: 80.8% and 69.2%, one tie ordered
  differently).
- **The bar's tests** (`tests/unit/lxx-bar.test.ts`) hold `BAR` to the probe's numbers, run John 1 with the probe's choices to its 828 of 829 and 825, and check that `lxx:release` refuses a book with a word pending or guesses at 4%
  and writes the same bytes twice when every line is met, and that `lxx:report` has a row for each of the 39 books and names another second chapter for another build.

## What the move from the probe changed

Layers 1 and 2 here and the probe's (no model choices) give every word of Gen 1, Ps 22 and John 1 the same layer, lemma, parsing and candidates. The
differences, all small:

- **The spelling fallbacks run after the parser again**, as in the probe (story B1a, with no parser yet, had tried them first and settled 484 words
  wrongly across the file, such as `γενέσεις` as `γένεσις`).
- **The movable ν only where Greek has it**, after -σι, -ξι, -ψι and -ε (B1a). The probe tried it after any -ι or -ε; with its parser first that changed
  few words, and here `φαίνειν` is parsed as the infinitive.
- **A reading is tried once.** The probe pushed a compound's augment-undone reading twice when the prefix elides (`επεφερετο` from `επ-` both as the
  prefix assimilated and as the prefix written whole), so such a rule's support counted double. Here each reading is tried once: no answer changes in the
  three chapters or the whole of Genesis; such a candidate's support no longer counts that rule twice.
- **Ties are ordered by code point**, lemma then parsing, where the probe used the locale's order (and, for analogy, the order of the files). That is
  the one difference left in John 1: the parser alone scores 80.9% and 69.3% here against the probe's 80.8% and 69.2%, one word more.
