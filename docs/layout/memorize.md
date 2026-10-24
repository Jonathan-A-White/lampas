# Layout: Memorize

Which file holds what for Memorize, the app's help to learn Bible verses by heart (mw-6ww.137, the epic mw-fu7dqf). A story that adds a file of `src/memorize/` writes its line here, in the same form (the path, then `#` and what it holds; a continuation line starts `#   `), never in CLAUDE.md.

```
src/memorize/refs.ts    # versesOf(canonical) -> the verses 'Rom.8.28' / 'Rom.8.28-29' names, each its own Verse of the chapter (never a passage Verse), with the heading and the chapter;
#   {ot: true, heading} for an Old Testament reference (Lampas has no Old Testament text); null for a string that names no verse (verse 0, a verse the chapter lacks); a chapter alone is its first verse
src/memorize/target.ts  # tokensOf(verse, 'en' | 'el' | 'weave', woven?) -> Token[] {text, lang, chunk, word?}: English words in English order, Greek words in Greek order, or the weave's drawn order
#   (a woven chunk's Greek as 'el', every other chunk's English as 'en', a moved closing mark kept); memorizeTarget(canonical, lang, readerSettings?) joins a reference's verses, each token with its verse number.
#   The weave is wovenOf's of the moment over his words and the Reader's Weave settings, never stored: a verse that has moved toward Greek is judged against the Greek
src/memorize/judge.ts   # judgeSaid / judgeTyped(target: Token[], heard) -> Judgement {score, passed, misses (token indexes), heardWords, asked}: learn-kit/recall's matchSequence over the target's texts (90% in order, extras free,
#   a token that folds to nothing is not asked); each token is matched in its own language, so a Greek token answered by its English is a miss (the Weave rule). judgeReading(target, VerseReadAnswer)
#   reads a Weave recall sent to verse-read: well-read passes, some-to-fix marks each focus word's token (index counts wordsOfText) and passes at a tenth or fewer, partial marks tokens past `reached` and fails, incomplete misses all.
#   asked(target) is the {text, lang} list recordRecall keeps. The folding is learn-kit/recall's fold, which src/services/greekWords.ts (bare) and src/services/reading.ts (normalWord) now use: no folder of their own
```
src/memorize/languages.ts # MemorizeLang 'en' | 'el' | 'weave'; languagesFor(level: GreekLevel): English always, Greek from Curious (GREEK_VIEW_FROM), the Weave from Dipping a toe (GREEK_WEAVE_FROM);
#   langName ('English', 'Greek', 'Weave'), isMemorizeLang. At 'Just English' only English is offered and nothing else is named
src/memorize/rung.ts      # rungFor(step) -> Rung {kind 'read' | 'gaps' | 'nothing', share}: step 0 read and say, 1..3 a quarter, half, three quarters of the words gone, 4 and 5 all gone with the first letters,
#   RARE_STEP (the 90-day check) from nothing; rungName for the screen. PROVISIONAL, the Governor to confirm
src/data/repositories/memorize.ts # verses on the schedule: kind 'verse' rows, id '<lang>:<canonical ref>' ('en:Rom.8.28'), one per verse per language, kept out of listDue()/countDue() with no kind (Review, Today, the pace and the summary do not count them);
#   memorize(ref, langs, now) / unmemorize(ref, lang?) / memorizedOf(refs) / listMemorized / listDueVerses / countDueVerses; recordRecall(input, now) writes the `recalls` row (score, missed, asked tokens with their languages, rung, gap in days, how)
#   and the schedule row (a score of 0.9 or more is right) in one transaction and publishes 'memorize-due-changed'. The ONLY file that names db.recalls; unmemorize keeps the recalls (evidence)
src/memorize/commands.ts # how a verse enters and leaves memorizing: memorizeVerse({ref, langs}), unmemorizeVerse({ref, lang?}), memorizeList({listId}), unmemorizeList({listId}) -> {said, skipped?}, plain async functions over the memorize
#   repository and verseLists that the buttons call and the tutor-drives epic registers too (a screen never writes the repository itself). A language the Greek dial does not allow is dropped, English when none is left; an Old Testament
#   reference is skipped and named ('No Old Testament text in Lampas yet: Ps 62:1-2', printedRef/skippedLine); a list's commands act on the New Testament references it holds then (splitRefs), On in English, Off in every language
src/memorize/MemorizeControl.tsx # the one control a list row (compact) and the Verse view draw: 'Memorize' (a tap memorizes in English), 'Memorizing · English' (a tap opens the language sheet, a role=dialog with useSheetBack: a switch for each language
#   languagesFor(dial) allows plus any it is already memorized in, and Stop memorizing; at Just English no sheet, the tap stops it); the Verse view gives it the OSIS reference with the passage's range as one ('Rom.8.12-17'), a row only a New Testament reference
src/lists/VerseListScreen.tsx # (Memorize this list) the switch under Rename/Edit/Delete, aria-checked On when every New Testament reference is memorized in English, with the skipped line under it

Tests: tests/unit/memorize-judge.test.ts (also greps that greekWords.ts and reading.ts keep no NFD strip), tests/unit/memorize-target.test.ts, memorize-target-scan.test.ts (every NT verse, the tokens agree with src/services/reading.ts readingText and wovenReading), features/memorize-target.feature; memorize-store.test.ts, memorize-rung.test.ts, features/memorize-schedule.feature (the verse rows and the recalls). tests/unit/memorize-enter.test.tsx (the list switch, the row control and its sheet by dial, the commands spy), verse-view-memorize.test.tsx (the Verse view), features/memorize.feature, tests/e2e/memorize-enter.spec.ts (shots memorize-list, memorize-enter).
