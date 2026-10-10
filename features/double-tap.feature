Feature: A double tap on Next does not answer the next question for me
  The Tester (mw-hqd5bz.19): "A double tap on Next answers the next question for him. The second tap lands on a word of the next question whenever
  a word sits where Next was, and the card then shows red or green with no choice made. That is a wrong answer counted against him." Every question
  card (the placement's, Review's and the Quick test's) ignores taps for a moment after it appears (src/ui/settle.ts, PROVISIONAL, 300 ms); a tap
  in that moment does nothing and counts nothing; a tap after it answers as before.

  Scenario: A second tap on Next does not answer the next placement question
    Given his goal is "Read 1 John 1:1" and he knows nothing yet
    And a new question ignores taps for a moment
    When he opens the placement
    And he starts the placement
    And he answers the first question
    And he taps Next and at once taps where an option now sits
    Then the second question stays unanswered
    And only 1 answer is counted
    When he reads the question for a moment
    And he taps an option
    Then the second question shows its answer
    And 2 answers are counted

  Scenario: A second tap on Next does not answer the next Review question
    Given his words are seeded and a new question ignores taps for a moment
    When he opens Review
    And he starts the round
    And he answers the first question
    And he taps Next and at once taps where an option now sits
    Then the second question stays unanswered
    And only 1 answer is counted
    When he reads the question for a moment
    And he taps an option
    Then the second question shows its answer
    And 2 answers are counted

  Scenario: A second tap on Next does not answer the next Quick test question
    Given his words are seeded and a new question ignores taps for a moment
    When he opens the Quick test
    And he answers the first question
    And he taps Next and at once taps where an option now sits
    Then the second question stays unanswered
    And only 1 answer is counted
    When he reads the question for a moment
    And he taps an option
    Then the second question shows its answer
    And 2 answers are counted
