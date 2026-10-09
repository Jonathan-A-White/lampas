Feature: A quick test on his words
  A round asks ten of his solid and learning words, favouring the learning ones. Each question shows the
  Greek word in its dictionary form (the lemma) and four English glosses to tap; right or wrong shows at once,
  and the end screen gives the score. Two misses in a row move a solid word to learning, and two rights
  in a row move a learning word to solid.

  Scenario: A round asks ten different words
    Given Lampas is opened for the first time
    When he opens the Quick test
    Then the first question is shown with 4 glosses to tap
    When he answers every question and goes on to the end
    Then ten different words were asked

  Scenario: A right answer shows green and a wrong answer shows the right gloss
    Given Lampas is opened for the first time
    When he opens the Quick test
    And he taps the right gloss
    Then the tapped gloss is green and he can go on
    When he goes to the next question
    And he taps a wrong gloss
    Then the tapped gloss is red and the right gloss is shown green

  Scenario: The end screen shows the score and the misses
    Given Lampas is opened for the first time
    When he opens the Quick test
    And he answers the first 3 questions wrongly and the rest rightly
    Then the end screen reads "7 of 10"
    And the end screen lists the 3 words he missed

  Scenario: Two misses in a row make a solid word learning and it leaves the weave
    Given Lampas is opened for the first time
    When he opens the Quick test
    And he answers every question wrongly and goes on to the end
    Then the words he missed that were solid are still solid on the Words screen
    When he starts another Quick test
    And he answers every question wrongly again and goes on to the end
    Then the words he missed that were solid are learning on the Words screen
    And the words store holds them as learning

  Scenario: Two rights in a row make a learning word solid
    Given Lampas is opened for the first time
    When he opens the Quick test
    And he answers every question rightly and goes on to the end
    Then the learning words he was asked are still learning on the Words screen
    When he starts another Quick test
    And he answers every question rightly again and goes on to the end
    Then the learning words he was asked are solid on the Words screen
    And the words store holds them as solid

  Scenario: A round left half done is offered again after the app was closed, and Resume goes on where he stopped
    Given Lampas is opened for the first time
    When he opens the Quick test
    And he answers the first 3 questions of a round
    And he closes the app and opens it again
    Then the Quick test says "Round left unfinished" with Resume and New round
    When he taps Resume
    Then he is on question 4 of 10 with the same word as before

  Scenario: New round throws the half-done round away
    Given Lampas is opened for the first time
    When he opens the Quick test
    And he answers the first 3 questions of a round
    And he closes the app and opens it again
    And he taps New round
    Then he is on question 1 of 10
    When he closes the app and opens it again
    Then the Quick test shows a question and does not offer a round
