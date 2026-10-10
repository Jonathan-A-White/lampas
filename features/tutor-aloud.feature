Feature: The tutor's responses are read aloud
  With Settings > Read the tutor's responses aloud On (the default) the tutor's response is spoken as soon as it arrives, with no tap: the
  reading check's verdict after Hold to read verse N, and the answer to Ask the tutor. The verdict is read whole: its heading, its paragraph and
  each word to fix with its tip. The verse's own text and the chunks are for him to read, and are not spoken. A new question, leaving the
  screen or a tap on the response stops the speech. Off, nothing is spoken by itself; the speaker on an answer still reads it. speechSynthesis
  is the recording fake of tests/support/fake-speech.ts and the Postern is the fake of tests/support/fake-postern.ts.

  Scenario: The reading check's verdict is read aloud, every instruction in it, and not the verse
    Given Lampas is opened on Romans 8 with the tutor's responses read aloud
    And he opens the reading check of verse 28
    When he holds the bar for 2 seconds and lets go
    Then the phone says "Words to fix"
    And it says "Nearly there: two words to say again."
    And it also says "together: Say the th softly, with your tongue between your teeth."
    And it goes on to say "purpose: The first part sounds like per."
    And it says nothing of the verse or the chunks

  Scenario: The tutor's answer to a question is read aloud, its Greek in the Greek voice
    Given Lampas is opened on Romans 8 with the tutor's responses read aloud
    And he asks the tutor "What does συνεργεῖ mean here?" about verse 28
    Then the phone says the answer's English in the English voice and "συνεργεῖ" in the Greek voice

  Scenario: With the switch Off nothing is read aloud by itself
    Given Lampas is opened on Romans 8 with the tutor's responses not read aloud
    And he opens the reading check of verse 28
    When he holds the bar for 2 seconds and lets go
    Then the verdict "Words to fix" is shown and nothing is spoken
    When he asks the tutor "What does συνεργεῖ mean here?" about verse 28 instead
    Then the answer is shown and nothing is spoken

  Scenario: A new question stops the speech at once
    Given Lampas is opened on Romans 8 with the tutor's responses read aloud
    And he asks the tutor "What does συνεργεῖ mean here?" about verse 28
    And the phone is speaking the answer
    When he asks the tutor "And what is its lemma?" a second question
    Then the speech has stopped

  Scenario: Leaving the screen stops the speech at once
    Given Lampas is opened on Romans 8 with the tutor's responses read aloud
    And he opens the reading check of verse 28
    And he holds the bar for 2 seconds and lets go
    And the phone is speaking the verdict
    When he presses the phone's Back
    Then the speech has stopped

  Scenario: A tap on the response stops the speech at once
    Given Lampas is opened on Romans 8 with the tutor's responses read aloud
    And he asks the tutor "What does συνεργεῖ mean here?" about verse 28
    And the phone is speaking the answer
    When he taps the answer
    Then the speech has stopped

  Scenario: A tap on the verdict stops the speech at once
    Given Lampas is opened on Romans 8 with the tutor's responses read aloud
    And he opens the reading check of verse 28
    And he holds the bar for 2 seconds and lets go
    And the phone is speaking the verdict
    When he taps the verdict
    Then the speech has stopped

  Scenario: A tap on a flagged word's speaker while the verdict is read pauses the reading and says only the word
    Given Lampas is opened on Romans 8 with the tutor's responses read aloud
    And he opens the reading check of verse 28
    And he holds the bar for 2 seconds and lets go
    And the phone is speaking the verdict
    When he taps the speaker beside the flagged word "purpose"
    Then the verdict's reading is paused, not ended
    And the phone says only "perpus" and not the tip or the note

  Scenario: Settings has the switch, On until he turns it Off, and it is kept
    Given Lampas is opened on its Settings screen
    Then "Read the tutor's responses aloud" is On
    When he turns "Read the tutor's responses aloud" Off
    Then "Read the tutor's responses aloud" is Off
    And the bus has heard the tutor is not read aloud
    When he reopens Lampas on its Settings screen
    Then "Read the tutor's responses aloud" is still Off

  Scenario: The tutor's answer read aloud shows the same bar as every reading
    Given Lampas is opened on Romans 8 with the tutor's responses read aloud
    And he asks the tutor "What does συνεργεῖ mean here?" about verse 28
    And the phone is speaking the answer
    Then the speaking bar shows Pause, Restart and Stop
    When he taps Pause on the speaking bar
    Then the speaking bar shows Resume, Restart and Stop
    When he taps Stop on the speaking bar
    Then the speech has stopped
    And there is no speaking bar
