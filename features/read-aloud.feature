Feature: Lampas reads aloud what is shown
  A play button on each verse reads that verse; Read from the top (Read from here when a verse is selected) in the
  header reads on to the chapter's end. What is read is what is shown: the English view in an English voice, the Greek
  view in the phone's Greek voice, a woven verse changing voice where the language does. The verse being read is
  highlighted; the header's button gives way to the one speaking bar (Pause or Resume, Restart, Stop: features/speaking-bar.feature); the screen
  stays awake. The phone's own voices, no server, through bsv-kit's speech package.

  Scenario: A verse in the English view is read in English
    Given Lampas is opened on a phone with an English and a Greek voice
    When he taps the play button of verse 1
    Then the phone speaks the English of verse 1 in "en-US"

  Scenario: A verse in the Greek view is read in Greek
    Given Lampas is opened on a phone with an English and a Greek voice
    And he switches the reader to Greek
    When he taps the play button of verse 1
    Then the phone speaks the Greek of verse 1 in "el-GR"
    And the phone speaks it with its Greek voice

  Scenario: A woven verse changes voice with the language
    Given Lampas is opened on a phone with an English and a Greek voice
    And he sets Weave to Solid words
    When he taps the play button of verse 1
    Then the phone speaks verse 1 in "en-US", "el-GR", "en-US", "el-GR" and "en-US", the voice changing only where the language does
    And the Greek spoken is the Greek woven into verse 1, in order

  Scenario: Read from the top reads every verse in order and highlights the one being read
    Given Lampas is opened on a phone with an English and a Greek voice
    When he taps Read from the top
    Then the phone speaks the English of verse 1 in "en-US"
    And verse 1 is highlighted as being read
    And the reading bar says "Reading verse 1"
    When the phone finishes speaking verse 1
    Then the phone goes on to the English of verse 2 in "en-US"
    And verse 2 is now highlighted as being read
    And verse 1 is not highlighted
    When the phone finishes the chapter
    Then every verse of the chapter was read in order
    And the reading bar is gone

  Scenario: With a verse selected the header reads from there
    Given Lampas is opened on a phone with an English and a Greek voice
    When he selects verse 5
    And he taps Read from here
    Then the phone speaks the English of verse 5 in "en-US"
    And verse 5 is highlighted as being read

  Scenario: Pause keeps the verse and Resume goes on from it
    Given Lampas is opened on a phone with an English and a Greek voice
    And he taps Read from the top
    And the phone finishes speaking verse 1
    When he taps Pause
    Then the phone is told to stop
    And the reading bar says "Paused at verse 2"
    When he taps Resume
    Then the phone speaks the English of verse 2 in "en-US"
    And the reading bar now says "Reading verse 2"

  Scenario: The top button gives way to the speaking bar while reading and is back after Stop
    Given Lampas is opened on a phone with an English and a Greek voice
    Then the top bar has Read from the top and there is no speaking bar
    When he taps Read from the top
    Then the top bar has no Read from the top, Pause, Play or Stop and the speaking bar has Pause
    When he taps Pause
    Then the speaking bar has Resume and no Pause
    And the reading is paused
    When he taps Resume
    Then the speaking bar has Pause and no Resume
    And the reading is going
    When he taps Stop
    Then the top bar is back to Read from the top and there is no speaking bar
    And nothing is being read

  Scenario: Stop speaks nothing more
    Given Lampas is opened on a phone with an English and a Greek voice
    And he taps Read from the top
    And the phone finishes speaking verse 1
    When he taps Stop
    Then the phone is told to stop
    And the reading bar is gone
    And no verse is highlighted as being read
    And nothing more is spoken

  Scenario: Leaving the reader pauses the reading
    Given Lampas is opened on a phone with an English and a Greek voice
    And he taps Read from the top
    When he opens Settings
    Then the phone is told to stop
    And nothing more is spoken

  Scenario: The screen is kept awake while reading and let go when it stops
    Given Lampas is opened on a phone with an English and a Greek voice
    When he taps Read from the top
    Then the screen is kept awake
    When he taps Stop
    Then the screen is let go

  Scenario: Without a Greek voice Greek is still read, with one plain line
    Given Lampas is opened on a phone with only an English voice
    And he switches the reader to Greek
    When he taps the play button of verse 1
    Then the phone speaks the Greek of verse 1 in "el-GR"
    And the reading bar shows the line "This phone has no Greek voice: Greek is read with the default voice"

  Scenario: English alone shows no such line
    Given Lampas is opened on a phone with only an English voice
    When he taps the play button of verse 1
    Then the reading bar shows no voice line
