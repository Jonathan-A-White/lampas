Feature: After an answer on the Quick test the word says itself, a wrong answer waits for Next, and the tutor is one tap away
  The moment he taps a gloss, right or wrong, the Greek word is spoken by itself, once, with the same
  voice as the reader's Read and the Hold to hear bar. Nothing moves on by itself: a wrong answer waits
  for Next, as a right one does. Beside Next sits Ask the tutor, which opens the Reader on the verse
  of the word with the Ask box holding a question about it.

  Scenario: The word is spoken by itself, once, after a right answer
    Given Lampas is opened with a Greek voice and the Quick test is on its first question
    Then nothing is spoken
    When he taps the right gloss
    Then the word of the question is spoken once in Greek

  Scenario: The word is spoken by itself after a wrong answer, and the test waits for Next
    Given Lampas is opened with a Greek voice and the Quick test is on its first question
    When he taps a wrong gloss
    Then the word of the question is spoken once in Greek
    And the same question is still on screen with Next
    When he waits a moment
    Then the same question is still on screen with Next
    When he taps Next
    Then the second question is on screen

  Scenario: Ask the tutor sits beside Next after an answer, not before
    Given Lampas is opened with a Greek voice and the Quick test is on its first question
    Then there is no Ask the tutor button
    When he taps a wrong gloss
    Then there is an Ask the tutor button beside Next

  Scenario: Ask the tutor opens the Ask box on the verse of the word
    Given Lampas is opened with a Greek voice and a kept round whose question is the form ἀγαπῶσιν of Romans 8:28
    When he resumes the round
    And he taps a wrong gloss
    And he taps Ask the tutor
    Then the Reader opens on verse 28 with the Ask box holding a question that names ἀγαπῶσιν and Romans 8:28

  Scenario: A word with no verse of its own asks the tutor about its meaning
    Given Lampas is opened with a Greek voice and a kept round whose question is the word ἀμήν with no verse
    When he resumes the round
    And he taps a wrong gloss
    And he taps Ask the tutor
    Then the Reader opens with the Ask box holding a question that names ἀμήν

  Scenario: A round resumed after the answer does not speak the word again
    Given Lampas is opened with a Greek voice and a kept round whose question is the word ἀμήν with no verse, already answered
    When he resumes the round
    Then nothing is spoken
    And there is an Ask the tutor button beside Next
