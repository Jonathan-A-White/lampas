Feature: Which did you hear? A minimal-pair drill in a Hard sounds lesson
  The 'Tell them apart' step of a Hard sounds lesson (mw-5r3p30.361) is now headed "Which did you hear?" (mw-5r3p30.362, PROVISIONAL until the Governor confirms). Below the
  pairs to hear it has a drill made from the lesson's own pairs of Greek words: the Greek voice says one word of a pair, he taps which of the two it was. Ten rounds in
  random order, a score at the end, and the pair of a miss comes back side by side, to hear both. The runs are kept on the device, as Drill it's are.

  Scenario: Ten rounds, a miss comes back side by side, and the score shows
    Given Lampas is opened on the "Which did you hear?" step of the lesson "Rolling your r"
    When he taps "Start the drill"
    Then the drill shows "Round 1 of 10" and the Greek voice says one word of a pair
    When he taps the word that was said
    Then the drill says "Right" and does not show the pair side by side
    When he goes to the next round
    And he taps the other word of the pair
    Then the drill says "Not quite" and shows the pair side by side, both words to hear
    And the Greek voice says both words of the pair
    When he answers the remaining rounds, all right
    Then the drill shows the score "You got 9 of 10"
    And it shows the missed pair side by side to hear

  Scenario: A perfect run has nothing to replay, and the run is kept on the device
    Given Lampas is opened on the "Which did you hear?" step of the lesson "Rolling your r"
    When he taps "Start the drill"
    And he answers all ten rounds right
    Then the drill shows the score "You got 10 of 10"
    And it shows no missed pair
    And the run is kept on the device: the lesson "tapped-r" with a score of 10 of 10

  Scenario: Again draws ten new rounds
    Given Lampas is opened on the "Which did you hear?" step of the lesson "Rolling your r"
    When he taps "Start the drill"
    And he answers all ten rounds right
    And he chooses "Again" on the score
    Then the drill shows "Round 1 of 10" and the Greek voice says one word of a pair
