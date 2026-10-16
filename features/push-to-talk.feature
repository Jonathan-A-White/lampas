Feature: Push-to-talk
  He can talk to the Bible talk instead of typing, the way Postern's Talk line works: hold the Talk button at the
  bottom of the reader (or a verse number) for half a second, say the question, and let go. His words appear in the
  sheet while he holds and go as the turn on release. A tap under half a second only opens the sheet. Sliding the
  finger away drops what he said. Reading aloud stops when he presses. The sheet's foot has Postern's big hold-to-talk bar
  under the field and Send, and the Talk button at the bottom of the reader is the same bar. The phone's recogniser is faked here (tests/support/fake-recognizer.ts); how a phone really hears is
  checked on the phone.

  Scenario: Holding Talk and saying a question sends it on release about the chapter
    Given Lampas is opened on Romans 8 with a talk behind a fake Postern and a recogniser
    When he holds the Talk button
    Then the Talk sheet is open, titled "Talk about Romans 8", and the phone is listening
    When he says "What is this chapter" and then "What is this chapter about"
    Then the sheet shows his words "What is this chapter about" while he holds
    When he lets go of the Talk button
    Then the mill received 1 grists for the lampas app, kind bible-talk
    And the first grist carries the reference "Romans 8" and the question "What is this chapter about"
    And the first grist is marked as spoken
    And the sheet shows the answer under his question

  Scenario: Long-pressing verse 28 and speaking sends a turn about 8:28
    Given Lampas is opened on Romans 8 with a talk behind a fake Postern and a recogniser
    When he long-presses the number of verse 28
    Then the Talk sheet is open, titled "Talk about Romans 8:28", and the phone is listening
    When he says "Why does Paul say all things"
    And he lets go of the number of verse 28
    Then the mill received 1 grists for the lampas app, kind bible-talk
    And the first grist carries the reference "Romans 8:28" and the question "Why does Paul say all things"
    And the first grist is marked as spoken
    And verse 28 was not selected by the press

  Scenario: A tap under 500 ms only opens the sheet
    Given Lampas is opened on Romans 8 with a talk behind a fake Postern and a recogniser
    When he taps the Talk button quickly
    Then the Talk sheet is open, titled "Talk about Romans 8", and the phone is not listening
    And no recogniser was started

  Scenario: Pressing while a verse is being read pauses the reading
    Given Lampas is opened on Romans 8 with a talk behind a fake Postern, a recogniser and a phone that speaks English
    And verse 3 is being read aloud
    When he presses the Talk button
    Then the reading is paused
    And the Talk button has not yet opened the sheet

  Scenario: Sliding the finger off the button drops what he said
    Given Lampas is opened on Romans 8 with a talk behind a fake Postern and a recogniser
    When he holds the Talk button
    And he says "Never mind this"
    And he slides his finger off the Talk button and lets go
    Then nothing was sent and the phone is not listening
    And the sheet shows no turns yet

  Scenario: The browser cancelling the press drops what he said
    Given Lampas is opened on Romans 8 with a talk behind a fake Postern and a recogniser
    When he holds the Talk button
    And he says "Never mind this"
    And the browser cancels the press
    Then nothing was sent and the phone is not listening

  Scenario: The hold button in the sheet's composer listens at once and sends on release
    Given Lampas is opened on Romans 8 with a talk behind a fake Postern and a recogniser
    When he taps the Talk button quickly
    And he presses the hold-to-talk button in the sheet
    Then the phone is listening
    When he says "What does this mean"
    And he lets go of the hold-to-talk button
    Then the mill received 1 grists for the lampas app, kind bible-talk
    And the first grist carries the reference "Romans 8" and the question "What does this mean"
    And the first grist is marked as spoken

  Scenario: A phone that denies the microphone is told what to do, and the sheet stays usable
    Given Lampas is opened on Romans 8 with a talk behind a fake Postern and a recogniser
    When he holds the Talk button
    And the phone refuses the microphone
    Then the sheet says the microphone is not allowed, with the steps in Settings
    And nothing was sent and the phone is not listening
    And the typed field and Send are still there

  Scenario: Letting go with nothing heard says so and sends nothing
    Given Lampas is opened on Romans 8 with a talk behind a fake Postern and a recogniser
    When he holds the Talk button
    And he lets go of the Talk button
    Then the sheet says "No speech was heard."
    And nothing was sent and the phone is not listening

  Scenario: A phone with no recogniser falls back to the typed field
    Given Lampas is opened on Romans 8 with a talk behind a fake Postern and no recogniser
    When he holds the Talk button
    Then the Talk sheet is open, titled "Talk about Romans 8", and the phone is not listening
    And the sheet says this phone cannot turn speech into text, and the typed field is focused

  Scenario: The reader's Talk button and the sheet's hold button are Postern's one big bar
    Given Lampas is opened on Romans 8 with a talk behind a fake Postern and a recogniser
    Then the Talk button is Postern's hold bar, 96 px high, with a microphone and the label "Talk"
    When he taps the Talk button quickly
    Then the sheet's hold-to-talk button is Postern's hold bar, 96 px high, labelled "Hold to talk", and the last control of the sheet
    When he presses the hold-to-talk button in the sheet
    Then the sheet's hold bar says "Starting the mic…" until the microphone is open and "Release to send" after

  # Android Chrome offers on-device speech but never honours it: an on-device start opens no microphone and is answered
  # language-not-supported a moment later (mw-5r3p30.426). Lampas listens through bsv-kit's startListening, which walks
  # every route once (on-device and cloud en-US, then the cloud's own default) and shows the failure only when the last fails.
  Scenario: On Android, letting go of the sheet's bar before the speech check answers shows no language error
    Given Lampas is opened on Romans 8 with a talk behind a fake Postern and Android's recogniser
    When he taps the Talk button quickly
    And he presses the hold-to-talk button in the sheet
    And he lets go of the hold-to-talk button
    And the phone's speech check answers language-not-supported
    Then the sheet says "No speech was heard."
    And the sheet shows no language-not-supported line
    And nothing was sent and the phone is not listening

  Scenario: On Android, letting go of the Talk bar before the speech check answers shows no language error
    Given Lampas is opened on Romans 8 with a talk behind a fake Postern and Android's recogniser
    When he holds the Talk button
    And he lets go of the Talk button
    And the phone's speech check answers language-not-supported
    Then the sheet says "No speech was heard."
    And the sheet shows no language-not-supported line
    And nothing was sent and the phone is not listening

  Scenario: On Android, the speech check answering while he holds goes on in the cloud and sends his words
    Given Lampas is opened on Romans 8 with a talk behind a fake Postern and Android's recogniser
    When he holds the Talk button
    And the phone's speech check answers language-not-supported
    And he says "What is this chapter about"
    And he lets go of the Talk button
    Then the mill received 1 grists for the lampas app, kind bible-talk
    And the first grist carries the reference "Romans 8" and the question "What is this chapter about"

  Scenario: A phone with no en-US speech hears him through the cloud's own language
    Given Lampas is opened on Romans 8 with a talk behind a fake Postern and Android's recogniser with no en-US in the cloud
    When he holds the Talk button
    And the phone's speech check answers language-not-supported
    And he says "What is this chapter about"
    And he lets go of the Talk button
    Then the mill received 1 grists for the lampas app, kind bible-talk
    And the recogniser that heard him was asked for no language

  Scenario: A phone that can hear him by no route says which routes it tried
    Given Lampas is opened on Romans 8 with a talk behind a fake Postern and Android's recogniser with no speech in the cloud
    When he holds the Talk button
    And the phone's speech check answers language-not-supported
    Then the sheet says the language is not supported, tried "on-device en-US, cloud en-US, cloud default"
    And nothing was sent and the phone is not listening
