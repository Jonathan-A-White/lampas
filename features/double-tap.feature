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

  Scenario: A second tap on Next does not open the Parsing drill from the Quick test
    The Tester (mw-hqd5bz.26): the Next row goes away when the next card is drawn and "Parsing drill: Romans 8" moves up under the second finger.

    Given his words are seeded and a new question ignores taps for a moment
    When he opens the Quick test
    And he answers the first question
    And he taps Next and 120 ms later taps the Parsing drill button
    Then the Quick test is still on question 2
    And the Parsing drill is not open
    When he reads the question for a moment
    And he taps the Parsing drill button
    Then the Parsing drill is open

  Scenario: A second tap on Place me does not throw away the placement he kept
    The Tester (mw-hqd5bz.27): "A quick double tap on 'Place me' / 'Place again' with a placement already kept throws that placement away. The second tap lands on 'Start over'." The intro ignores taps for the same moment a question card does, and Start over asks before the answers go.

    Given his goal is "Read 1 John 1:1" and he has answered 2 placement questions
    And a new question ignores taps for a moment
    When he opens the Goal screen
    And he taps Place me and 120 ms later taps where Start over now sits
    Then the placement intro shows with his 2 answers kept
    And Go on is still offered
    When he reads the question for a moment
    And he taps Go on
    Then the question line says "Question 3"

  Scenario: A deliberate Start over asks first and then starts over
    Given his goal is "Read 1 John 1:1" and he has answered 2 placement questions
    And a new question ignores taps for a moment
    When he opens the placement
    And he reads the question for a moment
    And he taps Start over
    Then it asks whether to throw his 2 answers away
    And 2 answers are still kept
    When he waits a moment on the question
    And he taps Keep my answers
    Then the placement intro shows with his 2 answers kept
    When he taps Start over again
    And he waits a little longer on the question
    And he taps Yes, start over
    Then the question line says "Question 1"
    And only 0 answers are kept
