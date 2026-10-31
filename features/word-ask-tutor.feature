@uc-tutor-ask @greek
Feature: Ask the tutor about a word, holding what the app knows
  A word's sheet has an Ask the tutor button, and so does a Quick test question once it is answered. Each opens the Talk sheet on
  the word's verse with a first turn already sent, so that he need not type it: from the sheet the grist carries the focus
  {form, lemma, parse} (kind word); from the test it carries the word, its parsing, the question, the gloss he chose and the answers
  he gave so far in the round (kind quiz). The bible-talk grind (grinds/bible-talk.json) opens with a line saying what it was
  handed. These scenarios run against a fake Postern whose mill opens the grist and answers it (tests/support/fake-postern.ts).

  Scenario: Ask the tutor on the word sheet opens the Talk sheet on the word's verse with the word, its lemma and its parsing
    Given Lampas is opened on Romans 8 behind a fake Postern
    And he taps "work together" in verse 28
    Then the word sheet has an Ask the tutor button
    When he taps Ask the tutor on the word sheet
    Then the word sheet is gone and the sheet is titled "Talk about Romans 8:28"
    And the mill received 1 grist for the lampas app, kind bible-talk
    And the grist carries the focus form "συνεργεῖ", lemma "συνεργέω", parse "verb, present active indicative, 3rd person singular" and kind word
    And the grist carries the reference "Romans 8:28"
    And the grist question names the word, its lemma, its parsing and the reference

  Scenario: Ask the tutor on a Quick test question sends the word, the question and his answers so far
    Given Lampas is opened on the Quick test behind a fake Postern, on the third question of a round where he got one right and one wrong
    When he taps a wrong gloss
    And he taps Ask the tutor on the question
    Then the Reader is open with the sheet titled "Talk about Romans 8:2"
    And the mill received 1 grist for the lampas app, kind bible-talk
    And the grist carries the quiz focus for the word "νόμος" as "νόμος" in "noun, nominative singular masculine" with Strong's "G3551"
    And the quiz focus holds the question "What does νόμος mean?", the gloss he chose, the right gloss "law" and the two earlier answers
    And the grist carries the reference "Romans 8:2"
    And the grist question names the word, the gloss he chose and the right one

  Scenario: A word with no verse of its own asks from the chapter's first verse and carries no parsing
    Given Lampas is opened on the Quick test behind a fake Postern, on a word with no verse of its own
    When he taps a wrong gloss
    And he taps Ask the tutor on the question
    Then the Reader is open with the sheet titled "Talk about Romans 8:1"
    And the grist carries the quiz focus for the word "ἀμήν" with no form, no parsing and no earlier answers

  Scenario: Ask the tutor on the sheet of a Hebrew word sends the word with its language
    Given Lampas is opened on Jonah 1 in the Hebrew view behind a fake Postern
    And he taps the Hebrew word "נִֽינְוֵ֛ה" in verse 2
    When he taps Ask the tutor on the word sheet
    Then the word sheet is gone and the sheet is titled "Talk about Jonah 1:2"
    And the mill received 1 grist for the lampas app, kind bible-talk
    And the grist carries the Hebrew focus form "נִינְוֵה", lemma "נִינְוֵה", parse "Noun - proper - feminine singular" and kind word
    And the grist question names the word, its lemma, its parsing and the reference "Jonah 1:2"

  Scenario: Ask the tutor on the Grammar sheet of a term of a Hebrew word sends the term
    Given Lampas is opened on Jonah 1 in the Hebrew view behind a fake Postern
    And he taps the Hebrew word "נִֽינְוֵ֛ה" in verse 2
    When he taps the parsing term "Noun" on the word sheet
    And he taps Ask the tutor on the Grammar sheet
    Then the word sheet is gone and the sheet is titled "Talk about Jonah 1:2"
    And the grist carries the term focus "Noun" of kind grammar-term
    And the grist question asks to explain "Noun" and names "Jonah 1:2"

