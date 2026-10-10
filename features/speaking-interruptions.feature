Feature: Whatever is read aloud can be paused, resumed, restarted and stopped, and an interruption only pauses it
  While the tutor's answer (or a chapter) is read aloud the one speaking bar offers Pause, Restart and Stop; Resume replaces Pause while it waits. Pause
  keeps the sentence reached and Resume goes on from it; Restart speaks from the first sentence; Stop ends it and the bar goes. A word he taps (Hebrew or
  Greek), a speaker beside a word or a hold on the Talk bar INTERRUPTS the answer: it is paused where it was, not ended, and the bar shows Resume. A page
  that hides pauses it too. A new question still ends it. speechSynthesis is the honest fake of tests/support/fake-speech.ts and the Postern is the fake
  of tests/support/fake-postern.ts.

  Scenario: The tutor's answer has Pause, Restart and Stop; Resume goes on from the sentence it stopped in
    Given Lampas is opened on a phone with a Hebrew voice, and the tutor's answer of three sentences is being read aloud
    And the phone has finished the first sentence
    When he taps Pause on the speaking bar
    Then the speaking bar shows Resume, Restart and Stop
    When he taps Resume on the speaking bar
    Then the phone speaks the answer on from its second sentence
    And the speaking bar shows Pause, Restart and Stop

  Scenario: Restart speaks the answer from the first sentence
    Given Lampas is opened on a phone with a Hebrew voice, and the tutor's answer of three sentences is being read aloud
    And the phone has finished the first sentence
    When he taps Restart on the speaking bar
    Then the phone speaks the answer again from its first sentence

  Scenario: Stop ends the answer and the bar goes away
    Given Lampas is opened on a phone with a Hebrew voice, and the tutor's answer of three sentences is being read aloud
    When he taps Stop on the speaking bar
    Then the phone has stopped speaking
    And there is no speaking bar

  Scenario: Tapping a Hebrew word pauses the answer, says the word, and Resume goes on from the interrupted sentence
    Given Lampas is opened on a phone with a Hebrew voice, and the tutor's answer of three sentences is being read aloud
    And the phone has finished the first sentence
    When he taps the Hebrew word "צֶדֶק"
    Then the phone says "צֶדֶק" in "he-IL"
    And the answer is paused, not ended
    And the speaking bar shows Resume, Restart and Stop
    When he taps Resume on the speaking bar
    Then the phone speaks the answer on from its second sentence

  Scenario Outline: Closing a word's How to say it sheet any way keeps the tutor paused, ready to Resume
    Given Lampas is opened on a phone with a Hebrew voice, and the tutor's answer of three sentences is being read aloud
    And the phone has finished the first sentence
    When he taps the Hebrew word "צֶדֶק"
    And he taps <place> of the How to say it sheet
    Then the answer is paused, not ended
    And the speaking bar shows Resume, Restart and Stop
    When he taps Resume on the speaking bar
    Then the phone speaks the answer on from its second sentence

    Examples:
      | place                                  |
      | the dim backdrop                       |
      | the big Hebrew word                    |
      | empty space inside the guide           |
      | Done                                   |

  Scenario Outline: A quick double tap on a Hebrew word leaves Resume available
    Given Lampas is opened on a phone with a Hebrew voice, and the tutor's answer of three sentences is being read aloud
    And the phone has finished the first sentence
    When he taps the Hebrew word "צֶדֶק" and again <gap> ms later where it was
    Then the answer is paused, not ended
    And the speaking bar shows Resume, Restart and Stop

    Examples:
      | gap |
      | 0   |
      | 150 |
      | 400 |

  Scenario: Holding the Talk bar to speak pauses the answer
    Given Lampas is opened on a phone with a Hebrew voice, and the tutor's answer of three sentences is being read aloud
    When he holds the sheet's Hold to talk bar
    Then the answer is paused, not ended

  Scenario: A page that hides pauses the answer and coming back offers Resume at the same place
    Given Lampas is opened on a phone with a Hebrew voice, and the tutor's answer of three sentences is being read aloud
    And the phone has finished the first sentence
    When the page goes hidden and comes back
    Then the answer is paused, not ended
    And the speaking bar shows Resume, Restart and Stop
    When he taps Resume on the speaking bar
    Then the phone speaks the answer on from its second sentence

  Scenario: A new question still ends the answer
    Given Lampas is opened on a phone with a Hebrew voice, and the tutor's answer of three sentences is being read aloud
    When he sends another message to the tutor
    Then the phone has stopped speaking
    And there is no speaking bar

  Scenario: Reading the chapter has the same Pause, Restart and Stop
    Given Lampas is opened on a phone with a Hebrew voice, and the chapter is being read from the top
    Then the speaking bar shows Pause, Restart and Stop
    When he taps Stop on the speaking bar
    Then there is no speaking bar
