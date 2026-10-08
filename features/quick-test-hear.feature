Feature: Hold to hear the word on the Quick test
  Under the Greek word of a Quick test question sits a wide bar, "Hold to hear". Holding it for half a second
  says the word in Greek, the way a long press on a word of the reader does; letting go stops it. A tap without a
  hold says nothing. The four glosses stay tappable, before and after the hold.

  Scenario: Holding the bar says the word and letting go stops it
    Given Lampas is opened with a Greek voice and the Quick test is on its first question
    When he holds "Hold to hear" for a moment
    Then the phone is told to speak the word of the question with lang "el-GR"
    And the word is being spoken
    When he lets go of "Hold to hear"
    Then the speech is stopped

  Scenario: A tap on the bar says nothing
    Given Lampas is opened with a Greek voice and the Quick test is on its first question
    When he taps "Hold to hear"
    Then nothing is spoken

  Scenario: Sliding away from the bar while holding drops the word
    Given Lampas is opened with a Greek voice and the Quick test is on its first question
    When he holds "Hold to hear" and slides 80 px away
    Then the speech is stopped

  Scenario: The glosses can still be tapped after a hold
    Given Lampas is opened with a Greek voice and the Quick test is on its first question
    When he holds "Hold to hear" for a moment
    And he lets go of "Hold to hear"
    And he taps the right gloss
    Then the tapped gloss is green and he can go on
