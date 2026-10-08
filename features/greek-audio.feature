Feature: Hear it in modern Greek
  A speaker button on each word (the Words screen, and the word sheet a tapped word opens) and a play
  button on each verse are spoken by the phone's own Greek voice (Web Speech, el-GR). No server.
  Without a Greek voice the buttons still show, and a tap says in one line how to get one.

  Scenario: A word's speaker on the Words screen speaks the lemma in Greek
    Given Lampas is opened on a phone with a Greek voice
    When he opens Words
    And he taps the speaker of the word "λόγος"
    Then the phone is told to speak "λόγος" in "el-GR"
    And the phone speaks it with its Greek voice

  Scenario: The speaker on a tapped word's sheet speaks the word as it stands in the text
    Given Lampas is opened on a phone with a Greek voice
    When he switches the reader to Greek
    And he taps the word "Οὐδὲν" in verse 1
    And he taps the speaker on the word sheet
    Then the phone is told to speak "Οὐδὲν" in "el-GR"

  Scenario: A verse's play button speaks the verse's Greek
    Given Lampas is opened on a phone with a Greek voice
    When he taps the play button of verse 1
    Then the phone is told to speak the Greek of verse 1 in "el-GR"
    And the play button of verse 1 shows it is playing

  Scenario: A second tap on the same verse stops it
    Given Lampas is opened on a phone with a Greek voice
    And he taps the play button of verse 1
    When he taps the play button of verse 1 again
    Then the phone is told to stop
    And nothing more is spoken
    And the play button of verse 1 shows it is not playing

  Scenario: Tapping another verse stops the first and speaks the second
    Given Lampas is opened on a phone with a Greek voice
    And he taps the play button of verse 1
    When he taps the play button of verse 2
    Then the phone is told to stop before it speaks the Greek of verse 2
    And the play button of verse 1 shows it is not playing

  Scenario: Without a Greek voice a tap shows one line of help and nothing is spoken
    Given Lampas is opened on an Android phone with no Greek voice
    When he taps the play button of verse 1
    Then the help line reads "No Greek voice on this phone: Settings > General management > Text-to-speech > install Greek"
    And nothing is spoken
    And the play button of verse 1 still shows

  Scenario: Without a Greek voice a word's speaker shows the help too
    Given Lampas is opened on an Android phone with no Greek voice
    When he opens Words
    And he taps the speaker of the word "λόγος"
    Then the help line reads "No Greek voice on this phone: Settings > General management > Text-to-speech > install Greek"
    And nothing is spoken

  Scenario: A browser that is not Android gets the generic line
    Given Lampas is opened on a computer with no Greek voice
    When he taps the play button of verse 1
    Then the help line reads "No Greek voice on this device: install a Greek text-to-speech voice in its system settings"
    And nothing is spoken

  Scenario: A phone that lists no voices yet is still asked to speak
    Given Lampas is opened on a phone that has not listed its voices
    When he taps the play button of verse 1
    Then the phone is told to speak the Greek of verse 1 in "el-GR"
    And no help line shows
