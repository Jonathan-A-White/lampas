Feature: The tutor and a Hebrew verse
  Ask the tutor on a verse of an Old Testament chapter sends the verse's Hebrew with the English, as it sends a Greek verse's Greek: the pointed
  verse, and each word with its lemma, transliteration, gloss and parsing (mw-5vvlay.3, src/services/hebrewWords.ts, grinds/verse-ask.input.schema.json
  `hebrew` and `hebrew_words`; the instructions' part is grinds/verse-ask.instructions/055-a-verse-of-the-old-testament.md). The tutor's answer draws a Hebrew
  word right to left in the Hebrew face (src/markdown/scriptRuns.ts). Quiz me stays out of an Old Testament verse's row: it is the Talk sheet's quiz, written
  in the Greek ladder's terms, and the drill-items grind takes Greek grammar ideas (docs/hebrew.md). These scenarios run against a fake Postern whose mill answers.

  Scenario: Ask the tutor on Jonah 1:10 sends the Hebrew words with the English
    Given Lampas is opened on Jonah 1 with a licence and a tutor behind a fake Postern
    When he taps the number of verse 10
    And he asks the tutor "What does the Hebrew say for fear?"
    Then the mill received one verse-ask grist whose input carries the English of verse 10 and no Greek
    And its input carries the verse in Hebrew, pointed
    And its input carries the Hebrew word "וַיִּירְאוּ" with the lemma "יָרֵא", the gloss "to fear" and its parsing in plain words

  Scenario: The tutor's answer draws its Hebrew right to left
    Given Lampas is opened on Jonah 1 with a licence and a tutor behind a fake Postern
    When he taps the number of verse 10
    And he asks the tutor "What does the Hebrew say for fear?"
    Then the answer shows under verse 10
    And the answer draws the Hebrew word "יָרֵא" right to left

  Scenario: Quiz me is not offered on Jonah 1:10, and Ask the tutor is
    Given Lampas is opened on Jonah 1 with a licence and a tutor behind a fake Postern
    When he taps the number of verse 10
    Then the Verse view offers the actions "Listen", "Read it aloud", "Ask the tutor" and "Copy"
    And the Verse view has no "Quiz me" and no "Diagram"

  Scenario: The tutor on Genesis 1 is told his Hebrew words and his place on the Hebrew ladder
    Given Lampas is opened on Genesis 1 with a licence, a tutor behind a fake Postern, and a reader of Hebrew with three Hebrew words and two ideas
    When he taps the number of verse 1
    And he asks the tutor "Where am I with my Hebrew?"
    Then the mill received one verse-ask grist whose learner line tells his Hebrew words: 2 solid, learning "מַיִם"
    And its learner line puts him on the Hebrew ladder with 2 ideas known, "The Hebrew article" being learned and a next idea
    And its solid words are the Hebrew lemmas "אֶרֶץ" and "בָּרָא"

  Scenario: A Greek-only reader's request carries no Hebrew summary
    Given Lampas is opened on Genesis 1 with a licence, a tutor behind a fake Postern, and a Greek-only reader who has kept three Hebrew words
    When he taps the number of verse 1
    And he asks the tutor "Where am I with my Hebrew?"
    Then the mill received one verse-ask grist whose learner line is the Greek line "solid 1 word; learning: none; new today: none; due now: 0"
    And its learner line says nothing of Hebrew or of a ladder

  Scenario: The ask's Hebrew word is drawn in the Hebrew face and opens its word sheet
    Given Lampas is opened on Genesis 1 with a licence and a tutor behind a fake Postern whose answer lists the Hebrew word "בָּרָא"
    When he taps the number of verse 1
    And he asks the tutor "What is the verb here?"
    Then the answer lists the Hebrew word "בָּרָא" with the lemma "בָּרָא", right to left in the Hebrew face
    When he taps the Hebrew word "בָּרָא" of the answer
    Then the word sheet opens on the Hebrew word "בָּרָא"
