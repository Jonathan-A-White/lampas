Feature: Listen is a player: tap Play and the passage reads on by itself
  The Verse view's Listen action (mw-5r3p30.130) is not a hold: a tap on "Play verses 1-11" starts the passage, no thumb held down, and it reads
  on to the end of the passage and stops, showing "Play again". While it plays or waits the one speaking bar (bsv-kit/speech) has Pause or Resume,
  Restart and Stop. The verse being read is lit in the passage and kept in view. An interruption from inside the app (a word held for its sound,
  the Hold to ask bar, the reading check's recording) pauses it and it goes on by itself from the same place when the interruption ends; leaving
  the passage, opening another screen or the page going hidden pauses it and the bar offers Resume at the same verse. A long press on a word still
  says that word. speechSynthesis, the recogniser and Postern are fakes (tests/support).

  Scenario: A tap on Play reads the passage with no hold bar, and the speaking bar offers Pause, Restart and Stop
    Given Lampas is opened on Romans 8 in the English view and a phone that speaks
    When he taps the heading "Walking by the Spirit"
    Then the Listen foot says "Play verses 1-11" and there is no hold bar
    And the hint says "Tap Play to hear verses 1-11."
    When he taps "Play verses 1-11"
    Then the phone is reading verse 1 aloud
    And the speaking bar shows Pause, Restart and Stop
    And the Listen foot is gone
    And nothing says "Hold to listen"

  Scenario: Pause stops the voice and Resume goes on from the same verse
    Given Lampas is opened on Romans 8 in the English view and a phone that speaks
    When he taps the heading "Walking by the Spirit"
    And he taps "Play verses 1-11"
    And the phone finishes speaking until verse 3 is being read
    And he taps Pause on the speaking bar
    Then the speaking bar shows Resume, Restart and Stop
    And the passage is paused at verse 3
    When he taps Resume on the speaking bar
    Then the phone is reading verse 3 aloud
    And the speaking bar shows Pause, Restart and Stop

  Scenario: It reads on to the end of the passage by itself, lighting each verse, and then offers Play again
    Given Lampas is opened on Romans 8 in the English view and a phone that speaks
    When he taps the heading "Walking by the Spirit"
    And he taps "Play verses 1-11"
    Then verse 1 is the one lit in the passage
    When the phone finishes speaking until verse 4 is being read
    Then verse 4 is now the one lit in the passage
    When the phone finishes speaking
    Then the phone has stopped reading
    And the Listen foot says "Play again" and there is no hold bar
    And the phone never spoke verse 12

  Scenario: Restart reads again from verse 1 and Stop returns to Play
    Given Lampas is opened on Romans 8 in the English view and a phone that speaks
    When he taps the heading "Walking by the Spirit"
    And he taps "Play verses 1-11"
    And the phone finishes speaking until verse 3 is being read
    And he taps Restart on the speaking bar
    Then the phone is reading verse 1 aloud
    And the speaking bar shows Pause, Restart and Stop
    When he taps Stop on the speaking bar
    Then the phone has stopped reading
    And the Listen foot says "Play verses 1-11" and there is no hold bar

  Scenario: Listen on a single verse is the same player
    Given Lampas is opened on Romans 8 in the English view and a phone that speaks
    When he taps the number of verse 11
    Then the Listen foot says "Play verse 11" and there is no hold bar
    When he taps "Play verse 11"
    Then the phone is reading verse 11 aloud
    When the phone finishes speaking
    Then the Listen foot now says "Play again" and there is no hold bar

  Scenario: A long press on a word during Listen pauses it and it goes on from the same verse when the word is said
    Given Lampas is opened on Romans 8 in the English view and a phone that speaks
    When he taps the heading "Walking by the Spirit"
    And he taps "Play verses 1-11"
    And the phone finishes speaking until verse 3 is being read
    And he long presses the first word of verse 3 in the passage
    Then the passage is paused at verse 3
    And the phone is saying the word alone
    When the phone finishes the word
    Then the phone is reading verse 3 aloud
    And the speaking bar shows Pause, Restart and Stop

  Scenario: Hold to ask pauses Listen and it goes on after the question is sent
    Given Lampas is opened on Romans 8 in the English view and a phone that speaks and a tutor and a recogniser behind a fake Postern
    When he taps the heading "Walking by the Spirit"
    And he taps "Play verses 1-11"
    And the phone finishes speaking until verse 3 is being read
    And he chooses "Ask the tutor"
    And he holds the hold bar
    Then the passage is paused at verse 3
    When he says "What is the Spirit's work here?" and lets go
    Then the phone is reading verse 3 aloud

  Scenario: The reading check's recording pauses Listen and it goes on when he lets go
    Given Lampas is opened on Romans 8 in the English view and a phone that speaks and a reading check behind a fake Postern
    When he taps the heading "Walking by the Spirit"
    And he taps "Play verses 1-11"
    And the phone finishes speaking until verse 3 is being read
    And he chooses "Read it aloud"
    And he holds the hold bar
    Then the passage is paused at verse 3
    When he lets go of the hold bar after 2 seconds
    Then the phone is reading verse 3 aloud

  Scenario: Leaving the passage pauses Listen and the speaking bar offers Resume at the same verse
    Given Lampas is opened on Romans 8 in the English view and a phone that speaks
    When he taps the heading "Walking by the Spirit"
    And he taps "Play verses 1-11"
    And the phone finishes speaking until verse 3 is being read
    And he presses the phone's Back
    Then the passage is paused at verse 3
    And the speaking bar shows Resume, Restart and Stop

  Scenario: Going to another screen pauses Listen and coming back offers Resume at the same verse
    Given Lampas is opened on Romans 8 in the English view and a phone that speaks
    When he taps the heading "Walking by the Spirit"
    And he taps "Play verses 1-11"
    And the phone finishes speaking until verse 3 is being read
    And he opens Settings
    Then the passage is paused at verse 3
    When he goes back to the reader
    Then the passage is still paused at verse 3
    And the speaking bar shows Resume, Restart and Stop
    When he taps Resume on the speaking bar
    Then the phone is reading verse 3 aloud

  Scenario: The page going hidden pauses Listen
    Given Lampas is opened on Romans 8 in the English view and a phone that speaks
    When he taps the heading "Walking by the Spirit"
    And he taps "Play verses 1-11"
    And the phone finishes speaking until verse 3 is being read
    And the page goes hidden
    Then the passage is paused at verse 3
    And the speaking bar shows Resume, Restart and Stop

  Scenario: The tutor speaking pauses Listen and Listen goes on from its verse when the tutor is done
    Given Lampas is opened on Romans 8 in the English view and a phone that speaks
    When he taps the heading "Walking by the Spirit"
    And he taps "Play verses 1-11"
    And the phone finishes speaking until verse 3 is being read
    And the tutor starts reading an answer aloud
    Then the answer is being read aloud
    When the phone finishes speaking the answer
    Then the phone is reading verse 3 aloud
