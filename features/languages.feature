Feature: Which languages he reads, and how far into each
  The first row of Settings is Which languages?: English only, Greek, Hebrew or Greek and Hebrew (mw-gdcyf98.2). It is the two dials' own state and no setting of its
  own: choosing a language raises its dial from Just English (to the level it was left at, else Curious) and brings its rows in; choosing English only puts both dials at
  Just English and hides every Greek and Hebrew row, but keeps his values and the levels he had, so choosing the languages again restores them. A dial, How much Greek?
  or How much Hebrew?, is drawn under the row only while its language is chosen, with five steps (Just English is the row's English only, never a button). The tutor
  reads and changes the row and both dials through settings_changes like any setting. These scenarios open the real app on a new phone, which starts at English only.

  Scenario: A new phone is English only
    Given Lampas is opened on Settings on a new phone
    Then Which languages? has "English only" chosen
    And Settings draws no dial
    And Settings lists no group "Learning"
    And the Settings home draws no Greek or Hebrew setting

  Scenario: Choosing Greek shows the Greek dial at Curious and the Greek rows
    Given Lampas is opened on Settings on a new phone
    When he chooses "Greek" under Which languages?
    Then Which languages? has "Greek" chosen
    And the dial "How much Greek?" has "Curious" chosen
    And Settings draws no dial "How much Hebrew?"
    And the dial "How much Greek?" has five steps and no "Just English"
    And the "Listening" page draws "Greek voice"

  Scenario: Choosing Hebrew shows the Hebrew dial and Hebrew in the tutor
    Given Lampas is opened on Settings on a new phone
    When he chooses "Hebrew" under Which languages?
    Then Which languages? has "Hebrew" chosen
    And the dial "How much Hebrew?" has "Curious" chosen
    And Settings draws no dial "How much Greek?"
    And the "Learning" page draws "Hebrew in the tutor"
    And the "Listening" page draws no "Greek voice"

  Scenario: Choosing Greek and Hebrew shows both dials
    Given Lampas is opened on Settings on a new phone
    When he chooses "Greek and Hebrew" under Which languages?
    Then Which languages? has "Greek and Hebrew" chosen
    And the dial "How much Greek?" has "Curious" chosen
    And the dial "How much Hebrew?" also has "Curious" chosen

  Scenario: English only hides both dials and every Greek and Hebrew row, and choosing both again restores the levels
    Given Lampas is opened on Settings on a new phone
    When he chooses "Greek and Hebrew" under Which languages?
    And he chooses "Learning" on the dial "How much Greek?"
    And he also chooses "Reading in Hebrew" on the dial "How much Hebrew?"
    And he chooses "English only" under Which languages?
    Then Settings draws no dial
    And Settings lists no group "Learning"
    And the "Listening" page draws no "Greek voice"
    When he chooses "Greek and Hebrew" under Which languages? again
    Then the dial "How much Greek?" has "Learning" chosen
    And the dial "How much Hebrew?" also has "Reading in Hebrew" chosen

  Scenario: The tutor changes the Hebrew dial to 0 and the row reads Greek
    Given Lampas is opened on Settings on a new phone
    When he chooses "Greek and Hebrew" under Which languages?
    And the tutor changes "hebrewInterest" to "0"
    Then Which languages? has "Greek" chosen
    And Settings draws no dial "How much Hebrew?"
