@uc-word-sheet @greek
Feature: The heart of the word is shown where he learns a word and where he can go back to it
  A word that has a note on its heart (src/data/wordHeart.ts: the one thread behind senses that look unrelated, the English trap, the irregular form) shows it in four places: a row
  on the word's sheet he can always go back to, under the gloss on the card that first teaches the word, under the answer after a miss in Review, and the tutor is told it so its
  answer agrees. A word with no note shows nothing in any of them.

  Scenario: The word's sheet has a row for a word with a note and none for a word without
    Given Romans 7 is open in the Greek view
    When he taps the word "θέλω" in verse 15
    Then the sheet has a "The heart of the word" row saying "One thread ties them together"
    When he closes the sheet and taps the word "πράσσω" in verse 15
    Then the sheet has no "The heart of the word" row

  Scenario: A missed multiple-choice card shows the note under the answer and a right one does not
    Given a Review card asks θέλω as multiple choice
    Then the card shows no heart of the word
    When he answers it wrongly
    Then the card shows the heart of the word "One thread ties them together"

  Scenario: A right multiple-choice answer shows no note
    Given a Review card asks θέλω as multiple choice
    When he answers it rightly
    Then the card shows no heart of the word

  Scenario: A flashcard answered Don't know shows the note and Know it well does not
    Given a Review card asks θέλω as a flashcard
    When he shows the meaning and taps "Don't know"
    Then the card shows the heart of the word "One thread ties them together"

  Scenario: A flashcard answered Know it well shows no note
    Given a Review card asks θέλω as a flashcard
    When he shows the meaning and taps "Know it well"
    Then the card shows no heart of the word

  Scenario: A flashcard answered Kind of shows no note
    Given a Review card asks θέλω as a flashcard
    When he shows the meaning and taps "Kind of"
    Then the card shows no heart of the word

  Scenario: A word without a note shows none after a miss
    Given a Review card asks πράσσω as multiple choice
    When he answers it wrongly
    Then the card shows no heart of the word

  Scenario: The card that first teaches a word shows the note under the gloss
    Given the teach sheet offers αὐτός
    Then the teach sheet shows the heart of the word "αὐτός has three jobs" under the gloss

  Scenario: The card that first teaches a word without a note shows none
    Given the teach sheet offers εἰς
    Then the teach sheet shows no heart of the word
