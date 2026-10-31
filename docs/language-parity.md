# Language parity: the golden list of use cases (mw-5r3p30.903)

His ask (Postern general, 2026-10-31 04:10Z): "really make sure you have a way of assessing total parity ... there should be something where you know there are use cases and the use cases for Latin and the use cases for Hebrew and the use cases for Greek align ... as we add use cases in the future then it should apply to all the languages that we have". Greek, the most developed, wrote the list; Hebrew is checked against it and its gaps named for backfill; Latin is the next language and every later one (Spanish, German) plugs into the same seams.

<!-- toc -->

- [The rule for Builders](#the-rule-for-builders)
- [How a use case is proved](#how-a-use-case-is-proved)
- [The golden list](#the-golden-list)
- [Hebrew gaps](#hebrew-gaps)
- [Stories in flight and their languages](#stories-in-flight-and-their-languages)
- [A new language](#a-new-language)
  - [What Latin must plug in](#what-latin-must-plug-in)
  - [Every place in src/ wired to Greek or Hebrew](#every-place-in-src-wired-to-greek-or-hebrew)
  - [Spanish or German](#spanish-or-german)

<!-- /toc -->

## The rule for Builders

1. **A new use case is a tagged scenario for every enabled language plus a registry entry, in the same story.** The registry is `src/languages/useCases.ts` (`USE_CASES`: an id, a title, a status per language). Each scenario that proves it is tagged `@uc-<id>` and `@greek`, `@hebrew` (or `@latin` once Latin is enabled); a Scenario Outline with an Examples row per language carries every language's tag.
2. **A gap is allowed only as a registry `gap` with its backfill named** (the scenario it must add, the files, a size XS to M), and the Mayor files the backfill as a story whose acceptance criterion is that scenario passing. An `na` carries the reason the use case does not apply to the language.
3. A feature that is not about a language (the shell, the licence, navigation, the tutor's mechanics, English-only pieces) is listed in `NEUTRAL_FEATURES` with why. A feature is tagged or listed, never neither: `tests/unit/language-parity.test.ts` fails on one left out, on a `has` with no tagged scenario, on a `gap` a scenario already proves, on a `@uc-` tag the registry lacks, on a scenario with a use case and no language (or the reverse), on a language not yet enabled claiming anything, and on this file's table or gaps being behind the registry.
4. After a change to the registry or the tags run `npm run parity:docs` (`scripts/language-parity-docs.ts`): it rewrites the table and the Hebrew gaps below between their markers. Edit the rest of this file by hand.

## How a use case is proved

A scenario's tags are its own and its Feature's (Gherkin's inheritance, read by `tests/support/features.ts`): a feature that is one use case in one language is tagged once, on its `Feature:` line (`features/reader.feature`: `@uc-english-text @uc-source-view @greek`); a feature that mixes use cases or languages tags each scenario (`features/hebrew-reader.feature`, `features/data.feature`, `features/pronunciation.feature`). Two things about `@amiceli/vitest-cucumber` 7.0.0: its `includeTags`/`excludeTags` read a scenario's **own** tags only (a Feature-level tag never splits a feature's steps, so `features/bible-talk.feature`'s `@grist`, `@answer` ... scenario tags keep working beside the new ones), and a tag line before `Examples:` is hung on the **next** scenario, so the reader refuses one. The tags are for the parity test and this file; `npm run test:bdd` runs every scenario as before.

The table names, for each use case and language, the feature files with a scenario tagged for both. `gap` and `n/a` are the registry's words; the gaps' detail is in the next section.

## The golden list

<!-- parity-table -->
| id | use case | Greek | Hebrew | Latin (not yet enabled) |
| --- | --- | --- | --- | --- |
| `english-text` | The English of a chapter beside its source text (the MSB for the Greek, the BSB for the Hebrew) | reader | old-testament | gap |
| `source-view` | The Reader's source view and its English \| Source switch, immersive reading, the chips row | hebrew-reader, immersive-hint, immersive-reader, reader-chips, reader-weave-switch, reader | hebrew-reader | gap |
| `weave` | The diglot weave: his known words stand in the source language inside the English | reader-weave-switch, weave | hebrew-reader | gap |
| `variants` | Textual variants inline in the Reader, the witnesses setting and reading sets | variants-reader, variants-setting | n/a: the WLC data carries no apparatus (no Qere/Ketiv or witness lists are built, docs/data.md); a story that adds one reopens this row | gap |
| `copy` | Copy and Share give the words as he reads them, the source text in the source view | copy-format | hebrew-reader | gap |
| `word-sheet` | The word card: form, respelling, lemma, gloss, parsing with its terms as links, Help with this word | clean-gloss, hebrew-word-sheet, word-heart, word-help, word-question-verse, word-sheet-english, word-sheet-many-resources, word-sheet-study | hebrew-reader, hebrew-word-sheet | gap |
| `hear-word` | Hearing a word: a tap or long press says it in its language, the one-letter words, no voice says so | greek-audio, hear-any-word, long-press-speak, one-letter-greek-voice, word-tip | hebrew-reader, hebrew-speech, hebrew-word-sheet, hebrew-words | gap |
| `links` | Links into the app at a word or a verse of the language (#/?word=G..., #/?word=H...) | links | hebrew-word-sheet | gap |
| `verse-view` | The Verse view of a verse or passage in the source language, with its actions | hebrew-verse-view, passage-view, verse-sheet, verse-view | hebrew-verse-view | gap |
| `listen` | Hearing a verse: Listen in the Verse view says the verse in its voice | listen | hebrew-verse-view | gap |
| `read-aloud` | Read aloud what is shown (Read from the top, a verse, the weave in each piece’s language) with the one speaking bar | read-aloud-anywhere, read-aloud, read-span, speaking-bar, speaking-interruptions | hebrew-reader | gap |
| `tutor-aloud` | The tutor's answers read aloud, the source words in their own voice | tutor-aloud | gap | gap |
| `tutor-word` | A source word in the tutor's answer: drawn in its face, tappable, said, its guide, Add to my words | bible-talk | hebrew-speech, hebrew-talk, hebrew-tutor | gap |
| `voice-settings` | The language's voice and speed rows in Settings, shown from its dial's Curious | greek-voice-test, pronunciation | pronunciation | gap |
| `voice-test` | Hear and switch the voice from Settings: the name of the voice in use and Test | greek-voice-test | gap | gap |
| `pronunciation` | The respelling of a word in the chosen pronunciation, the one family setting and each language on its own | pronunciation-progress, pronunciation, voice-respelling-agree | pronunciation | gap |
| `ipa-course` | The IPA course: the optional lesson on the symbols of the sounds, behind a setting | ipa-course | hebrew-ipa-course | gap |
| `sound-lessons` | Hard sounds: optional lessons on the sounds his English makes hard, with Try it and the pair drill | hard-sounds, pair-drill, roll-r, try-it | gap | gap |
| `letter-drill` | The letters: each taught from its sheet with Hear it, the letter drill and Say it | hebrew-letters, letter-drill, say-it | hebrew-letters | gap |
| `handwriting` | Write it: a letter by hand, traced, copied and from memory, in the letter lessons and drills | handwriting-drills | gap | gap |
| `words` | Words he knows: the list under its language, a segment where two languages are chosen | words | hebrew-words | gap |
| `quick-test` | The Quick test on his words, asked in the dictionary form among words of the same language | quick-test-after-answer, quick-test-hear, quick-test-lemma, quick-test | hebrew-words | gap |
| `review` | Review brings back the words and ideas due, on the schedule, each asked in its language | review, schedule | hebrew-verse-view, hebrew-words | gap |
| `new-words` | New words taught while he reads: the frontier, the pace, the teach sheet, the picker at his grammar level | frontier, hebrew-words, one-frontier, pace, picker-grammar, teach | hebrew-words | gap |
| `pictures` | Memory pictures on the teach sheet and in the talk | pictures | gap | gap |
| `parsing-drill` | The Parsing drill on the open chapter asks a word’s terms with the verse in its language | drill | hebrew-words | gap |
| `example-words` | The example words a new phone holds (docs/example-words.md), which the offers and the tests draw on | greek-offer | gap | gap |
| `grammar-ladder` | The grammar ladder: the Goal, the idea sheet, the terms and their Grammar sheet, levels that turn solid, inference | goal-progress, goal, grammar-ladder, grammar-levels, grammar-terms, hebrew-grammar, hebrew-ladder, idea-sheet, inference, pattern-ideas | hebrew-grammar, hebrew-ladder, hebrew-word-sheet | gap |
| `drill-it` | Drill it on an idea, the grammar drills in Review, more drill items from the mill | drill-it, drill-sound-rule, fetched-drill-items, grammar-drills, sound-alike-miss | hebrew-letters, hebrew-quiz | gap |
| `placement` | Placement: test me on the grammar and meet me where I am | placement, quick-round | hebrew-ladder | gap |
| `paradigms` | Paradigms: the tables, a word’s own paradigm, Drill on a table, How much of a table | hebrew-paradigms, own-paradigm, paradigm-drill, paradigms | hebrew-paradigms, hebrew-word-sheet | gap |
| `grammar-approach` | Grammar approach: the order and voice the ladder is taught in | grammar-approach | gap | gap |
| `lessons` | Lessons read to him: Read lessons to me, a passage lesson that opens its verses and Check passes it by reading | passage-lesson, read-lessons | gap | gap |
| `reading-ladder` | The reading ladder: verses by how hard they are to say, Read it aloud, the reading check, drills on what he missed, his readings kept | my-reading, reading-check, reading-drill, reading-history, reading-ladder | hebrew-reading-ladder | gap |
| `memorize` | Memorize a verse: the target text, the session, hearing and typing it, the schedule, the tutor on it | hebrew-memorize, memorize-hear, memorize-schedule, memorize-session, memorize-target, memorize-tutor, memorize-type, memorize | hebrew-memorize | gap |
| `diagram` | The sentence diagram of a verse (Reed-Kellogg) and the lesson on reading one | diagram-lesson, sentence-diagram | hebrew-diagram | gap |
| `verse-quiz` | Quiz me on a verse, with the quiz goal, in the Talk sheet | hebrew-quiz, quiz-goal, quiz-me | hebrew-quiz | gap |
| `practise` | The Practise door on a verse: copywork, narration, dictation, summary and the quiz (Susan Wise Bauer’s order) | gap | gap | gap |
| `tutor-ask` | Ask the tutor about a verse or a word, holding what the app knows of it in its language | ask-tutor, tutor, word-ask-tutor | hebrew-tutor | gap |
| `talk` | The Bible talk on a chapter or a verse: the request carries the source text and its words, the bridge | bible-talk, hebrew-talk, talk-bridge | hebrew-talk | gap |
| `language-offer` | The tutor offers the language gently to a reader who is not learning it | greek-offer | gap | gap |
| `learner-summary` | The tutor is told his progress in the language: solid words, the ladder, the reading ladder, rust | hebrew-tutor, tutor-rust, welcome-back | hebrew-tutor, tutor-rust | gap |
| `languages-dial` | Which languages? and a dial per language: what each step shows, the tutor may move it | languages | languages | gap |
| `script-depth` | How deep into the script the tutor writes: transliteration, both, or the letters alone | n/a: Greek is written in its letters wherever it is drawn (its depth is simply full, src/script/scripts.ts); a reader who wants less lowers the dial | languages | n/a: Latin is written in the Latin alphabet, which needs no transliteration |
| `logos-links` | Links into Logos from a word (Strong’s, Bible Word Study, his lexicons) and a verse (In Logos, In another book, Read in Logos) | grammar-books, idea-sheet-read-more, in-logos, tutor-links, tutor-works | hebrew-word-sheet, old-testament | gap |
| `resources` | Study resources by language: which ship, which his shelf turns on, the Study row at scale | study-resources, word-sheet-many-resources, word-sheet-study | hebrew-word-sheet | gap |
| `data` | The text data: every word with its lemma, gloss and parsing, the lexicon and frequencies built with the chapters | data | data | gap |
<!-- /parity-table -->

## Hebrew gaps

Each line is one backfill story: its acceptance criterion is the named `@hebrew` scenario passing (and the registry row turned to `has`). Sizes: XS a scenario over code that already does it, S a scenario and one module, M new content or a new module.

<!-- hebrew-gaps -->
- `tutor-aloud` (The tutor's answers read aloud, the source words in their own voice): scenario "The tutor’s answer read aloud says its Hebrew words in the Hebrew voice" in features/hebrew-speech.feature; src/speech/answerRuns.ts (a Hebrew stretch becomes a run in the Hebrew voice as a Greek one does), features/steps/hebrew-speech.steps.tsx; docs/hebrew.md "Not done" names it; S
- `voice-test` (Hear and switch the voice from Settings: the name of the voice in use and Test): scenario "Test under the Hebrew voice says a Hebrew word in the voice in use" in a new features/hebrew-voice-test.feature; src/settings/controls/voice.tsx (GreekVoiceInUse drawn for one language: take the language), src/speech/greek.ts voiceInUse/testGreekVoice by language; S
- `sound-lessons` (Hard sounds: optional lessons on the sounds his English makes hard, with Try it and the pair drill): scenario "The Goal lists the Hebrew hard sounds for his accent and opens one" in a new features/hebrew-hard-sounds.feature; a lesson file per sound (het, ayin, resh, tsade) in src/hardSounds/lessons.ts keyed by the Israeli scheme’s sound ids, src/hardSounds/ and the Goal’s Optional section by the Hebrew dial (src/GoalScreen.tsx); M
- `handwriting` (Write it: a letter by hand, traced, copied and from memory, in the letter lessons and drills): scenario "Write it on Alef traces its strokes" in features/hebrew-letters.feature; stroke data for the 27 glyphs beside the Greek ones in src/handwriting/, the Write it part of a Hebrew letter sheet and the drill’s Write it questions (src/data/grammar/hebrew/letterQuestions.ts), Settings > Handwriting drills shown by either dial (src/settings/registry.ts); M
- `pictures` (Memory pictures on the teach sheet and in the talk): scenario "The teach sheet of a Hebrew word with a picture shows it" in features/hebrew-words.feature; a picture per Hebrew seed lemma under public/pictures/ and its row in the pictures index (docs/pictures.md says where), credited in ATTRIBUTION.md; S
- `example-words` (The example words a new phone holds (docs/example-words.md), which the offers and the tests draw on): scenario "A new phone’s Hebrew Quick test draws its wrong answers from the Hebrew example words" in features/hebrew-words.feature; src/data/seed-words-hbo.ts is built (npm run seed:build) and src/data/quiz.ts reads it, so only the scenario and features/steps/hebrew-words.steps.tsx; XS
- `grammar-approach` (Grammar approach: the order and voice the ladder is taught in): scenario "A Hebrew approach orders the Hebrew ladder" in features/hebrew-grammar.feature; an approach for the Hebrew ladder in src/approaches/, src/settings/registry.ts Grammar approach shown by either dial (today greekFrom, docs/layout/settings.md), and the Hebrew ladder’s path reads it; M
- `lessons` (Lessons read to him: Read lessons to me, a passage lesson that opens its verses and Check passes it by reading): scenario "A Hebrew passage lesson opens its verses in Hebrew and Check passes it by reading" in features/hebrew-ladder.feature; a passage step in the Hebrew ladder (src/data/grammar/hebrew/ladder.ts), src/data/grammar/lessons.ts and the Verse view’s Check for an hbo chapter; S
- `practise` (The Practise door on a verse: copywork, narration, dictation, summary and the quiz (Susan Wise Bauer’s order)): lands with the Practise stories mw-5r3p30.899 (copywork) and mw-5r3p30.900 (dictation), both live in Hebrew from the start; narration .901 and summary .902 are English only in their first slice
- `language-offer` (The tutor offers the language gently to a reader who is not learning it): scenario "The tutor offers the Hebrew gently on Genesis 1 to a reader who is not learning it" in features/hebrew-talk.feature; the grind example grinds/examples/bible-talk/hebrew-offer-on-genesis.json already exists and src/talk/greekOffer.ts has chapterOfferLang, so the scenario and features/steps/hebrew-talk.steps.tsx; XS
<!-- /hebrew-gaps -->

Two rows the Governor may want to reopen: `variants` is `n/a` for Hebrew because the WLC data carries no apparatus (a Qere/Ketiv story would add one); `script-depth` is `n/a` for Greek because the Greek is written in its letters wherever it is drawn (`src/script/scripts.ts`: Greek is not a `SCRIPTS` entry).

## Stories in flight and their languages

| story | what | languages it covers | parity |
| --- | --- | --- | --- |
| mw-5r3p30.899 | Practise door and copywork | English, Greek, Hebrew from the start (his Q4 C) | tags `@uc-practise @greek @hebrew`; turns the `practise` row to `has` for both |
| mw-5r3p30.900 | Practise: dictation | English, Greek, Hebrew | the same tags on its scenarios |
| mw-5r3p30.901 | Practise: narration | English only in its first slice (the transcriber is en-US) | no language tag; a Greek or Hebrew narration is a later `gap` with its story |
| mw-5r3p30.902 | Practise: summary | English only in its first slice | as narration |
| mw-5r3p30.897 | Diagram by sentence, across verse breaks | Greek and Hebrew (its title) | its scenarios carry `@uc-diagram @greek` and `@uc-diagram @hebrew`; the `diagram` row stays `has` |

A story of this list that lands with only its Greek scenario must write the Hebrew one as a registry `gap` with its backfill, or the parity test refuses it.

## A new language

### What Latin must plug in

Latin (the held epic mw-cbsbw9q, its probe mw-cbsbw9q.2) reads the Vulgate or a Latin New Testament beside the English, with a tutor on the verse, and must land every row of the golden list or write each gap. In order of dependence, the seams it plugs into (each is a table today, or a two-way branch this section names):

1. **The text data** (`docs/data.md`): a `lang` for the source (`'lat'`, say) in `SourceLanguage` (`src/data/chapter.ts:9`), the chapters as JSON under `public/data/` with lemma, gloss and parsing per word, a lexicon and frequency file named in `src/data/lexicon.ts:17` and `src/data/frequency.ts:25`, the books of `CANON` (`src/data/canon.ts:14`; a second text of the same books is a new source, not new books, which the Reader does not yet hold), the data build under `scripts/`, the fingerprint in `public/data/index.json`, and `ATTRIBUTION.md` and the Preface (`src/preface.ts`) for the text and its licence.
2. **The dial**: a third `InterestLang` (`src/settings/definitions/interest.ts:11`) with its six steps, a `latinInterest` setting beside `src/settings/definitions/greekInterest.ts` and `hebrewInterest.ts`, its entry in `src/settings/registry.ts`, its control, and the `Languages` row (`interest.ts` `languagesOf`, `LANGUAGES_CHOICES`, `src/settings/controls/languages.tsx`), which today says english, greek, hebrew or both and must become a set.
3. **The voice**: an id in `SettableLanguage` and an entry in `LANGUAGES` (`src/speech/languages.ts:6`, `la` has no phone voice on most phones: `hasVoice` and the no-voice notice of `src/speech/readAloud.ts:53` must say so for Latin as they do for Hebrew), and a pronunciation scheme (Ecclesiastical first, Classical after) in `src/speech/schemes/` filed under a `PronunciationLanguage` (`src/speech/pronunciation.ts:75`) with its family line in `src/settings/definitions/pronunciation.ts`.
4. **The script**: none. Latin is written in the Latin alphabet, so it is not a `SCRIPTS` entry (`src/script/scripts.ts`: a `TutorScript` is a non-Latin script with its own font class and depth) and `splitScripts`, `isHebrewText` (`src/data/lemma.ts:16`) and `wordAt`'s script test (`src/ui/wordAt.ts:20`) cannot tell Latin from English by its letters: every place that finds a word's language from its characters must read it from the data (`Word.lang`, `data-lang`) instead. That is the deepest difference from Hebrew and the reason most of the "make generic" rows below exist.
5. **The grammar**: a ladder (`src/data/grammar/ladders.ts:16` `LADDER_LANGS`, a `LadderOf` with ideas, teaching cards, terms, tiers and a path, as `src/data/grammar/hebrew/` has), letters are not needed, paradigms under `src/data/paradigms/` with a cell `lang` (`src/data/paradigms/types.ts:9`), a letter set is not needed (`src/data/grammar/letterDrill.ts:74`), and the parsing codes' terms (`src/data/parseCode.ts:317`).
6. **The grinds**: the request fields `greek`/`hebrew` and `greek_words`/`hebrew_words` (`src/services/talk.ts:579`, `src/services/talkFit.ts:32`, `src/services/talkFetch.ts:21`) are the wire format of bible-talk, drill-items, sentence-diagram and reading; a third language either adds `latin`/`latin_words` to each schema and instruction (`grinds/`, under the bible-talk byte cap, docs/grinds.md) or the fields become `source`/`source_words` with a `language` (one story, server and app together). `src/tutor/knows.ts` classifies its settings and progress; `src/tutor/registry.ts:177` lists the memorize languages the tutor may name.
7. **Settings**: the rows a language owns (voice, speed, pronunciation, keyboard, resources by `ResourceLang`, `src/resources/types.ts:65`) each `dependsOn` its dial (`src/settings/registry.ts:214` `languageFrom`); a shared row reads `depth`, the higher dial (`src/settings/rows.ts:286` `dialOf`), which must become the highest of all dials.
8. **The seed and the offer**: example words (`src/data/quiz.ts:51` picks the seed by language), a gentle offer (`src/talk/greekOffer.ts`), the learner summary (`src/data/learnerSummary.ts:98`), the Logos links by Strong's prefix (`src/resources/logos.ts:21`: Latin has no Strong's numbers; a Latin lexicon link is a new form, docs/resources.md).
9. **The golden list**: `latin` turned to `enabled: true` in `src/languages/useCases.ts`, each row `has` with a `@latin` scenario or a `gap` with its story.

### Every place in src/ wired to Greek or Hebrew

Found by search (`'grc' | 'hbo'`, `'el' | 'he'`, `'greek' | 'hebrew'`, `=== 'hbo'`, `isHebrew*`, `sourceLanguage(`, `ladderFor(`, `hebrewDepth`, the dials). **Make generic** means a third language cannot be added without editing the line; **fine as is** means it is a table a new language adds an entry to, or a Greek-only thing (a Greek manuscript apparatus, a Greek letter lesson) with no counterpart to add. A type a dozen files use is listed once at its definition. Line numbers are of this story's commit and will drift; the file and the name hold.

| where | what | verdict |
| --- | --- | --- |
| `src/data/chapter.ts:9` | `SourceLanguage = 'grc' \| 'hbo'`; `sourceLanguage()` at `:207` defaults a chapter with no `lang` to Greek | make generic: widen the union; the default to Greek is the old data's and may stay |
| `src/data/db.ts:17` | `Word.lang: 'grc' \| 'hbo'`; `OfferLang` at `:317`; a word with no `lang` is Greek (`src/data/studyLanguage.ts:15`) | make generic: widen; persisted rows stay valid |
| `src/data/lemma.ts:16` | `isHebrewText` by Unicode block; `languageOfLemma` at `:19` answers Greek for anything not Hebrew | make generic: a Latin lemma is Latin letters, so the language must come from the word, not its letters; used by rustyFace, learnerSummary, links |
| `src/data/books.ts:29` | `isHebrewBook(code)`: the Old Testament is Hebrew, used at 20+ sites (picker, Reader, reference card, nav) | fine as is for the two Bibles; a Latin Bible covers both Testaments, so the chapter's own `lang` (the data) must win over the book, and the call sites that mean "which text" read `sourceLanguage(chapter)` |
| `src/data/studyLanguage.ts:18` | `languagesInPlay(languages, segment)`: a three-way branch on `Languages` | make generic with `Languages` (below) |
| `src/data/grammar/ladders.ts:16` | `LADDER_LANGS = ['grc', 'hbo']`, `LADDERS`, `ladderLangOf(id)` by the `he-` prefix (`src/data/grammar/hebrew/ladder.ts:16`) | table: add an entry and a `la-` prefix; fine as is |
| `src/data/grammar/languageInHand.ts:8` | `ladderLangsOf(languages)`: a three-way branch | make generic with `Languages` |
| `src/data/grammar/letterDrill.ts:74` | `letterSetOf(lang)`: Hebrew set else Greek | make generic: a table by language (Latin has no letter drill: `undefined`) |
| `src/data/parseCode.ts:317` | `if (language === 'hbo') return hebrewParseSegments` | make generic: a term pattern per language |
| `src/data/paradigms/types.ts:9` | a cell's `lang: 'el' \| 'en' \| 'he'`; `languageOf(table)` (`src/data/paradigms/index.ts:60`) reads it; `:127` chooses `findHebrewTable` | make generic: widen the cell union and look the finder up by language |
| `src/data/quiz.ts:51` | the seed pool: `lang === 'hbo' ? SEED_WORDS_HBO : SEED_WORDS` | make generic: a `Record<SourceLanguage, SeedWord[]>` |
| `src/data/learnerSummary.ts:57` | the Hebrew part of the learner line (`ladderFor('hbo')`, `hebrewChosen` at `:98`): a Greek side and a Hebrew side | make generic: one part per chosen language in a loop |
| `src/data/lexicon.ts:17`, `src/data/frequency.ts:25` | `FILES: Record<SourceLanguage, string>` | table; fine as is |
| `src/data/canon.ts:14` | `CanonBook.lang`; the Old Testament rows are `hbo` (`:92`) | fine as is for a book's first text; a second text of the same books needs a source on the chapter, not the book |
| `src/data/offlineCopy.ts:17` | `HEBREW_LISTS` (the lexicon and frequency files to keep) | make generic: derive from `FILES` |
| `src/data/readingLadder.ts:10` | `LADDER_LANGS = ['el', 'en', 'he']`, `LADDER_NAMES`: the reading ladder's own language ids | table; fine as is (its ids differ from `SourceLanguage`: a Latin story should map once) |
| `src/data/repositories/greekInterest.ts:36` | `HEBREW_DIAL_KEY`, `moveDial`, `setGreekInterest`/`setHebrewInterest`, `placeInterest`: exactly two dials and the kept level of the other | make generic: one `moveDial(lang)` over `LANGUAGES`' dials, the "other dial" the highest of the rest |
| `src/data/repositories/settings.ts:24` | `ReaderView = 'english' \| 'greek'`: `greek` means the source view (`src/reader/sourceText.ts`) and Hebrew chapters use it | fine as is (a naming quirk: `'greek'` is "the source text"); rename when convenient |
| `src/settings/definitions/interest.ts:11` | `InterestLang`; `levelsOf` (`:43`), `InterestLevels { grc, he }`, `levelOf`, `higherOf`, `interestKeyOf`, `startOf`, `Languages = 'english' \| 'greek' \| 'hebrew' \| 'both'`, `languagesOf`, `LANGUAGES_CHOICES`, `chosen()` | make generic: the deepest knot. `both` cannot grow to three; `Languages` becomes a set of `InterestLang`, `InterestLevels` a `Record<InterestLang, number>`, `higherOf` a max over it |
| `src/settings/definitions/greekInterest.ts`, `hebrewInterest.ts` | one file per dial (`GREEK_LEVELS`, `greekFrom`; `HEBREW_LEVELS`, `hebrewFrom`) | table-like: a third file by the same factory `interestSetting(lang)`; fine as is |
| `src/settings/definitions/pronunciation.ts:57` | `SEPARATE_KEYS = { grc, he }`, `separateFrom` | table; fine as is |
| `src/settings/registry.ts:164` | the depth entry per `SCRIPTS` entry (`section: 'hebrew'`); `languageFrom` at `:214` (greek, hebrew, else none); the interest entries | make generic: `languageFrom` as a lookup over the dials; the section per script is a table |
| `src/settings/rows.ts:286` | `dialOf(row)`: `'greekInterest' \| 'hebrewInterest' \| 'depth'`; `readValues` reads both dials; `DEPTH_KEY` the higher of two | make generic: the dial keys from `LANGUAGES`, depth the max |
| `src/settings/controls/languages.tsx:3` | Which languages?: four buttons over two dials | make generic: a button per language and English only, writing a set |
| `src/settings/controls/interest.tsx`, `src/SettingsScreen.tsx` | `language === 'grc' ? greekInterestSetting : hebrewInterestSetting`; `key === 'greekInterest' ? 'Greek' : 'Hebrew'` | make generic: look the dial up by language |
| `src/script/scripts.ts:28` | `TutorScript.id: 'he'` | widen when a second non-Latin script comes (Syriac, Coptic); fine for Latin |
| `src/script/greekLang.ts:16` | `langOfSource` and `faceOf` (`:25`): `hbo` is the Hebrew face, anything else Greek; "a word with no language is Greek" | make generic: a table of `{lang attrs, face class, dir}` per `SourceLanguage`; Latin's face is the English one |
| `src/reader/sourceText.ts:8` | `HEBREW_LANG_ATTRS`, `sourceAttrs` (`:11`), `sourceSpeech` (`:14`), `sourceFace`: `hbo` else Greek | make generic: the same table as `faceOf` |
| `src/reader/englishSource.ts:31` | `translationOf(lang)`: `bsb` for Hebrew, `msb` for Greek (which English stands beside the source) | make generic: a table by source |
| `src/reader/useWoven.ts:19` | the weave's grammar filter (`formOk`) holds Greek forms to the grammar dial and lets another source's forms through | fine as is until a Latin ladder exists; then a filter per ladder |
| `src/ReaderChips.tsx:62`, `src/TapToHear.tsx:15` | `'Hebrew' : 'Greek'`; a tapped text's language by script | make generic: the language's label from a table; the language from the element's `data-lang` |
| `src/speech/languages.ts:6` | `SettableLanguage`, `LANGUAGES` (voice and speed per language) | table plus a union to widen; the header comment says Latin is one more id |
| `src/speech/greek.ts:36` | `chosenVoices` literal; `langOf` (`:43`); `languageOfTag` (`:113`: `el` Greek, `he`/`iw` Hebrew, else English); `speak`/`speakWord` (lone letters and clips are Greek's); `wordSpeech` (`:547`: Greek phrase form, Hebrew voice form, else raw); `noVoiceHelp` (`:626`) | make generic: `languageOfTag` and `wordSpeech` as lookups over `LANGUAGES` with a scheme per language (docs/module-map.md R7 "a speech engine that is not named for Greek") |
| `src/speech/readAloud.ts:53` | `NO_HEBREW_VOICE_NOTICE` beside the Greek one; `source === 'hbo' ? 'hebrew' : 'greek'` in the run builder; `textOf` per language | make generic: notice and voice form per language |
| `src/speech/pronunciation.ts:75` | `PronunciationLanguage = 'grc' \| 'he'`; `pronunciationsOf` (`:190`) two lists | make generic: a `Record` of lists; the scheme files are a table |
| `src/speech/languageRuns.ts:10` | `GREEK_STRETCH` beside the `SCRIPTS` loop (Greek is not a `SCRIPTS` entry) | fine as is for Latin (Latin letters are English's run); make generic when Greek joins the scripts table |
| `src/speech/answerRuns.ts:38` | the Hebrew script found by `speaks === 'hebrew'`; syllables spoken `language: 'greek'` (`:69`) | make generic: the focus word's language from the request |
| `src/services/talk.ts:89` | `focus.language?: 'he'`; `textFields` (`:579`: `greek` or `hebrew`); `hebrewOn` (`:622`); `greek_interest`/`hebrew_interest`; `reader_view \| 'hebrew'`; the `greek_offer` validator | make generic together with the grinds' schemas (seam 6 above) |
| `src/services/talkFit.ts:32`, `src/services/talkFetch.ts:21` | `sourceKeyOf`: `hebrew` or `greek`; the fetched verse under `greek` or `hebrew` | make generic with the wire format |
| `src/services/reading.ts:180` | `ReadingView = 'english' \| 'greek' \| 'hebrew'`, `readingViewOf`, `isHebrewLang` | make generic: the view is English or the source; the scoring language from the scheme |
| `src/services/interestField.ts`, `src/services/greekWords.ts`, `src/services/hebrewWords.ts` | a field builder per language | table-like: a third builder; fine as is once the wire format is generic |
| `src/memorize/languages.ts:7` | `MemorizeLang = 'en' \| 'el' \| 'he' \| 'weave'`, `sourceLangOf` (`:13`); `TargetLang` (`src/memorize/target.ts:11`), `tokensOf` default source (`:36`); `DICTATION` (`src/memorize/useRecallHold.ts:21`); `memorizeSessionOf` (`src/nav/route.ts`) | make generic: the memorize language is English, the source, or the weave; derive the source's id from `SourceLanguage` |
| `src/ipa/course.ts:14` | `CourseLanguage = 'grc' \| 'he'`; `#/ipa?lang=he` (`src/nav/route.ts:227`) | make generic: the course by `PronunciationLanguage` |
| `src/resources/types.ts:65` | `ResourceLang = 'grc' \| 'he' \| 'en' \| 'both'`; `resourcesForLevel` by the dial | make generic: `both` again; a resource lists the languages it serves |
| `src/resources/logos.ts:21` | `wordLanguage` by the Strong's prefix `H`/`G` | fine as is for Greek and Hebrew (Strong's covers both); Latin has none and needs a link form of its own |
| `src/library/usableRows.ts:21` | `OTHER_LANGUAGES` holds `la`, `lat` as languages to leave out of a Greek import | make generic: a supported-languages set from `LANGUAGES` |
| `src/ui/wordAt.ts:20` | the language of a tapped word by its script: Greek, Hebrew, else English | make generic: read `data-lang` first |
| `src/ui/sourceSegmentStore.ts:14` | the Greek \| Hebrew segment: `'hbo' ? 'hbo' : 'grc'`; `src/ui/SourceSegment.tsx` two steps | make generic: a step per chosen language |
| `src/tutor/screen.ts:16` | `languageFact(lang, hebrewChosen)`: "Hebrew" or "Greek" | make generic: the label from a table |
| `src/tutor/registry.ts:177` | `LANG = { enum: ['en', 'el', 'he', 'weave'] }` the tutor's tool schema | make generic with `MemorizeLang` |
| `src/tutor/knows.ts:73` | `hebrewDepth`, `greekInterest`, `hebrewInterest`, `hebrewPronunciation`, `hebrewWords`, `hebrewLadder`, `hebrewReading`, `hebrewRust` | table: a new language adds its rows; fine as is |
| `src/verse/action.ts:23` | the actions an `hbo` verse is offered on a condition (`offered`, `useHebrewOn`) | make generic: the condition by the chapter's dial |
| `src/review/kinds.ts:184` | `lang === 'hbo' ? 'hebrew' : 'greek'`; a Hebrew passage loaded for Hebrew ideas (`:230`) | make generic: the voice by `sourceSpeech`, the passage by the idea's ladder |
| `src/GoalScreen.tsx:275`, `src/PlacementScreen.tsx:34`, `src/HebrewPlacement.tsx` | a Hebrew Goal body and a Hebrew Placement beside the Greek ones | make generic: one body over `ladderFor(lang)`; the Hebrew ones show what differs (no letters quiz for Latin) |
| `src/WordsScreen.tsx:33` | `collators = { grc, hbo }` | table; fine as is |
| `src/markdown/scriptRuns.ts:4`, `src/markdown/Markdown.tsx` | a Greek stretch is `lang="grc" class="font-greek"`; Hebrew through `SCRIPTS` | fine as is for Latin (no script); make generic when Greek joins the scripts table |
| `src/nav/links.ts:202` | `isHebrewText`: a Strong's `H` or Hebrew letters | fine as is (Strong's); a Latin word link needs its own form (docs/links.md) |
| `src/data/grammar/hebrew/`, `src/data/paradigms/hebrew/`, `src/speech/schemes/hebrew-israeli.ts`, `src/data/seed-words-hbo.ts` | the Hebrew content trees beside the Greek ones | table-like: a Latin tree of the same shapes; fine as is |
| `src/handwriting/`, `src/hardSounds/`, `src/reader/variants*.ts`, `src/reader/VariantBrace.tsx` | Greek letter strokes, Greek hard-sound lessons, the Greek apparatus | fine as is: Greek-only content with no Latin counterpart (Latin has no strokes to learn; its hard sounds are a lesson file, not code) |

The survey's method and the fuller list of sites (every `=== 'hbo'` test, about fifty) are in the closing comment of mw-5r3p30.903. The refactor that pays most is one `LANGUAGE_INFO: Record<SourceLanguage, {...}>` table (lang attrs, face, dir, speech language, English translation, dial key, ladder, label) that `faceOf`, `sourceText`, `translationOf`, `sourceSpeech`, `languageFact`, `dialOf` and the Settings controls all read: with it, most rows above become "add an entry".

### Spanish or German

A modern language is a different kind of row: there is no ancient text to read, so it comes in as **a Bible text beside the English** (a Spanish Bible with its own licence in `ATTRIBUTION.md`) with a voice the phone has (`es-ES`, `de-DE`: an entry in `LANGUAGES`), no script, no Strong's, and lemma, gloss and parsing only if a tagged text is found (docs/data.md). The golden list applies unchanged: each row is `has`, a `gap` with its story, or `n/a` with why (the reading ladder by pronunciation difficulty needs a scheme; paradigms need tables; the apparatus is `n/a`). The seams are the same nine as Latin's, and the first story of such a language enables it in `src/languages/useCases.ts` and writes its column.
