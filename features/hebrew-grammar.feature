Feature: Learning to read Hebrew: the grammar tiers
  The Hebrew ladder's grammar tiers (mw-gdcyf98.12, src/data/grammar/hebrew/): nouns, pronouns, prepositions, verbs, joiners and sentences, 26 ideas after the letters, sounds and marks, each
  a card with worked words from Genesis 1 and Jonah 1. On the Goal with Hebrew chosen they are listed in ladder order after the letters, and a card is taught from its sheet in Hebrew type.
  The words of a Hebrew parsing (Noun, Qal, Perfect, Consecutive imperfect ...) are the terms of src/data/grammar/hebrew/terms.ts, each tied to one idea; the Grammar sheet of a Hebrew term
  (src/GrammarSheet.tsx) explains it, shows Hebrew examples from the chapter right to left and, under In Hebrew, how it shows in Biblical Hebrew. The word sheet's parsing links are story j2's,
  so these scenarios open the Grammar sheet over a chapter directly. A Greek term's sheet is as it was.

  Scenario: With Hebrew chosen the Goal lists the article after the letters
    Given Hebrew is the only language chosen and the Goal screen is open
    Then the Goal lists "The Hebrew article" as Not yet
    And the Goal lists "The Hebrew article" after "Tav" and "Ketiv and qere"
    And the Goal lists the grammar ideas from "Gender: masculine and feminine" to "Word order" in order

  Scenario: The article's card teaches with the earth of Genesis 1:1
    Given Hebrew is the only language chosen and the Goal screen is open
    When he opens "The Hebrew article"
    Then the sheet teaches the article with the Hebrew word "הָאָרֶץ" from "Genesis 1:1" right to left in lang he
    And the card's table shows "הָאָרֶץ" in Hebrew type
    And the sheet offers no Drill it

  Scenario: The Grammar sheet for Qal shows the concept with a Hebrew example
    Given Genesis 1 is open and the Grammar sheet of "Qal" is open
    Then the Grammar sheet is titled "Qal" and explains it in plain words
    And the note under "In Hebrew" has Hebrew in lang he
    And the Grammar sheet shows 3 examples from Genesis 1, each a Hebrew word in lang he whose parsing has Qal
    And the term "Qal" belongs to the idea "he-qal"

  Scenario: A related term opens its own sheet and Learn this idea names the term
    Given Genesis 1 is open and the Grammar sheet of "Qal" is open
    When he taps the related term "Piel"
    Then the sheet was asked to open the term "Piel"
    When he taps Learn this idea
    Then the sheet was asked to teach the term "Qal"

  Scenario: A Greek grammar term's sheet is as it was
    Given Romans 8 is open and the Grammar sheet of "conjunction" is open
    Then the Grammar sheet is titled "conjunction" and explains it in plain words
    And the note under "In Greek" has Greek in lang el
    And the Grammar sheet shows 3 examples from Romans 8, each a Greek word in lang el whose parsing has conjunction
    And the sheet has no note under "In Hebrew"
