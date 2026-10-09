Feature: A long press on a word speaks it
  Holding a finger on any word of the reader for half a second says that word alone, in the word's own
  language: Greek in a Greek voice (el-GR), English in English. It does not open the word sheet, does not
  select text and does not raise the phone's menu. A short tap still opens the sheet. A press that wanders
  more than 10 px is a drag, not a press, and says nothing.

  Scenario: A long press on a Greek word speaks that word with lang el-GR and does not open the sheet
    Given Lampas is opened on a phone with a Greek voice
    And he switches the reader to Greek
    When he long presses the word "Οὐδὲν" in verse 1
    Then the phone is told to speak "Οὐδὲν" with lang "el-GR"
    And the phone speaks it with its Greek voice
    And no word sheet is open

  Scenario: A long press on an English word speaks it with lang en
    Given Lampas is opened on a phone with a Greek voice
    When he long presses the word "Therefore" in verse 1
    Then the phone is told to speak "Therefore" with lang en
    And no word sheet is open

  Scenario: A long press on a woven Greek word in the English view speaks it in Greek
    Given Lampas is opened on a phone with a Greek voice
    And he sets Weave to Solid words
    When he long presses the woven word for the lemma "ἐν" in verse 1
    Then the phone is told to speak the Greek of the lemma "ἐν" in verse 1 with lang "el-GR"
    And no word sheet is open

  Scenario: A long press on a word in the Verse view speaks it and opens nothing; a short tap opens the sheet
    Given Lampas is opened on a phone with a Greek voice
    And he switches the reader to Greek
    And he opens the Verse view of verse 1
    When he long presses the word "Οὐδὲν" in the Verse view
    Then the phone is told to speak "Οὐδὲν" with lang "el-GR"
    And no word sheet is open
    When he taps the word "Οὐδὲν" in the Verse view
    Then the word sheet is open

  Scenario: A long press on a word in the Words list speaks it and does not change it; a short tap still changes it
    Given Lampas is opened on a phone with a Greek voice
    And he opens the Words list
    When he long presses the first word of the list
    Then the phone is told to speak that word with lang "el-GR"
    And that word keeps its state
    When he taps the first word of the list
    Then that word has changed its state

  Scenario: A short tap still opens the word sheet
    Given Lampas is opened on a phone with a Greek voice
    And he switches the reader to Greek
    When he taps the word "Οὐδὲν" in verse 1
    Then the word sheet is open
    And nothing is spoken

  Scenario: A press that moves more than 10 px speaks nothing
    Given Lampas is opened on a phone with a Greek voice
    And he switches the reader to Greek
    When he presses the word "Οὐδὲν" in verse 1 and drags 20 px before the half second is up
    Then nothing is spoken
    And no word sheet is open

  Scenario: A long press gives a light buzz and tells the bus which word was spoken
    Given Lampas is opened on a phone with a Greek voice
    And he switches the reader to Greek
    When he long presses the word "Οὐδὲν" in verse 1
    Then the phone gives one light buzz of 10 ms
    And the bus has heard word-spoken for "Οὐδὲν" in "greek" in verse 1

  Scenario: The word on the screen is not selectable and has no callout menu
    Given Lampas is opened on a phone with a Greek voice
    Then every word of verse 1 is set not to select text and not to raise the phone's callout menu
