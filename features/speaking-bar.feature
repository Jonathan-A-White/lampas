Feature: Everything read aloud has the same Pause, Resume, Restart and Stop bar
  Whatever Lampas reads aloud (a verse by its play button, the chapter, the tutor's answer) goes through bsv-kit's speech package, a sentence at a
  time, and shows the one bar Postern has: Pause (Resume while paused), Restart and Stop. Pause keeps the sentence reached; Resume goes on from it.
  Listen stops at the end of the verse. Leaving the screen pauses the reading and coming back offers Resume. A word said by a long press is not
  a reading and shows no bar. speechSynthesis is bsv-kit's honest fake (tests/support/fake-speech.ts).

  Scenario: Listen on a verse shows the bar
    Given Lampas is opened on Romans 8 on a phone with an English and a Greek voice
    When he taps the play button of verse 3
    Then the speaking bar shows Pause, Restart and Stop
    And the phone speaks the first sentence of verse 3 in "en-US"

  Scenario: Pause keeps the sentence and Resume goes on from it
    Given Lampas is opened on Romans 8 on a phone with an English and a Greek voice
    And he taps the play button of verse 3
    And the phone finishes the first sentence
    When he taps Pause on the speaking bar
    Then the speaking bar shows Resume, Restart and Stop
    And the phone is told to stop
    When he taps Resume on the speaking bar
    Then the phone speaks the second sentence of verse 3
    And the first sentence was not spoken again
    And the speaking bar shows Pause, Restart and Stop

  Scenario: Restart speaks the verse again from its first sentence
    Given Lampas is opened on Romans 8 on a phone with an English and a Greek voice
    And he taps the play button of verse 3
    And the phone finishes the first sentence
    When he taps Restart on the speaking bar
    Then the phone speaks the first sentence of verse 3 in "en-US"
    And the speaking bar shows Pause, Restart and Stop

  Scenario: Stop clears the bar and speaks nothing more
    Given Lampas is opened on Romans 8 on a phone with an English and a Greek voice
    And he taps the play button of verse 3
    When he taps Stop on the speaking bar
    Then there is no speaking bar
    And nothing is highlighted as being read
    And nothing more is spoken

  Scenario: Listen stops at the end of the verse
    Given Lampas is opened on Romans 8 on a phone with an English and a Greek voice
    And he taps the play button of verse 3
    When the phone finishes everything it was asked to say
    Then only verse 3 was spoken
    And there is no speaking bar

  Scenario: Leaving the screen pauses the reading and coming back offers Resume
    Given Lampas is opened on Romans 8 on a phone with an English and a Greek voice
    And he taps the play button of verse 3
    When he opens Settings
    Then the phone is told to stop
    And the speaking bar shows Resume, Restart and Stop
    When he goes back to the reader
    Then the speaking bar still shows Resume, Restart and Stop
    When he taps Resume on the speaking bar
    Then the phone speaks the first sentence of verse 3 in "en-US"
    And the speaking bar shows Pause, Restart and Stop

  Scenario: A Greek verse is read in Greek and its bar is the same
    Given Lampas is opened on Romans 8 on a phone with an English and a Greek voice
    And he switches the reader to Greek
    When he taps the play button of verse 1
    Then the speaking bar shows Pause, Restart and Stop
    And the phone speaks the Greek of verse 1 in "el-GR"
