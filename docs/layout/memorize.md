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

Tests: tests/unit/memorize-judge.test.ts (also greps that greekWords.ts and reading.ts keep no NFD strip), tests/unit/memorize-target.test.ts, memorize-target-scan.test.ts (every NT verse, the tokens agree with src/services/reading.ts readingText and wovenReading), features/memorize-target.feature.
