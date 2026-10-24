# Layout: Memorize

Which file holds what for Memorize, the app's help to learn Bible verses by heart (mw-6ww.137, the epic mw-fu7dqf). A story that adds a file of `src/memorize/` writes its line here, in the same form (the path, then `#` and what it holds; a continuation line starts `#   `), never in CLAUDE.md.

```
src/memorize/refs.ts    # versesOf(canonical) -> the verses 'Rom.8.28' / 'Rom.8.28-29' names, each its own Verse of the chapter (never a passage Verse), with the heading and the chapter;
#   {ot: true, heading} for an Old Testament reference (Lampas has no Old Testament text); null for a string that names no verse (verse 0, a verse the chapter lacks); a chapter alone is its first verse
src/memorize/target.ts  # tokensOf(verse, 'en' | 'el' | 'weave', woven?) -> Token[] {text, lang, chunk, word?}: English words in English order, Greek words in Greek order, or the weave's drawn order
#   (a woven chunk's Greek as 'el', every other chunk's English as 'en', a moved closing mark kept); memorizeTarget(canonical, lang, readerSettings?) joins a reference's verses, each token with its verse number.
#   The weave is wovenOf's of the moment over his words and the Reader's Weave settings, never stored: a verse that has moved toward Greek is judged against the Greek
```
src/memorize/languages.ts # MemorizeLang 'en' | 'el' | 'weave'; languagesFor(level: GreekLevel): English always, Greek from Curious (GREEK_VIEW_FROM), the Weave from Dipping a toe (GREEK_WEAVE_FROM);
#   langName ('English', 'Greek', 'Weave'), isMemorizeLang. At 'Just English' only English is offered and nothing else is named
src/memorize/rung.ts      # rungFor(step) -> Rung {kind 'read' | 'gaps' | 'nothing', share}: step 0 read and say, 1..3 a quarter, half, three quarters of the words gone, 4 and 5 all gone with the first letters,
#   RARE_STEP (the 90-day check) from nothing; rungName for the screen. PROVISIONAL, the Governor to confirm
src/data/repositories/memorize.ts # verses on the schedule: kind 'verse' rows, id '<lang>:<canonical ref>' ('en:Rom.8.28'), one per verse per language, kept out of listDue()/countDue() with no kind (Review, Today, the pace and the summary do not count them);
#   memorize(ref, langs, now) / unmemorize(ref, lang?) / memorizedOf(refs) / listMemorized / listDueVerses / countDueVerses; recordRecall(input, now) writes the `recalls` row (score, missed, asked tokens with their languages, rung, gap in days, how)
#   and the schedule row (a score of 0.9 or more is right) in one transaction and publishes 'memorize-due-changed'. The ONLY file that names db.recalls; unmemorize keeps the recalls (evidence)

Tests: tests/unit/memorize-target.test.ts, memorize-target-scan.test.ts (every NT verse, the tokens agree with src/services/reading.ts readingText and wovenReading), features/memorize-target.feature; memorize-store.test.ts, memorize-rung.test.ts, features/memorize-schedule.feature (the verse rows and the recalls).
