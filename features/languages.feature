Feature: Which languages he reads, and how far into each
  The first row of Settings is Which languages?: English only, Greek, Hebrew or Greek and Hebrew (mw-gdcyf98.2). It is the two dials' own state and no setting of its
  own: choosing a language raises its dial from Just English (to the level it was left at, else Curious) and brings its rows in; choosing English only puts both dials at
  Just English and hides every Greek and Hebrew row, but keeps his values and the levels he had, so choosing the languages again restores them. A dial, How much Greek?
  or How much Hebrew?, is drawn under the row only while its language is chosen, with five steps (Just English is the row's English only, never a button). The tutor
  reads and changes the row and both dials through settings_changes like any setting. These scenarios open the real app on a new phone, which starts at English only.

  @uc-languages-dial @greek @hebrew
  Scenario: A new phone is English only
    Given Lampas is opened on Settings on a new phone
    Then Which languages? has "English only" chosen
    And Settings draws no dial
    And Settings lists no group "Learning"
    And the Settings home draws no Greek or Hebrew setting

  @uc-languages-dial @greek @hebrew
  Scenario: Choosing Greek shows the Greek dial at Curious and the Greek rows
    Given Lampas is opened on Settings on a new phone
    When he chooses "Greek" under Which languages?
    Then Which languages? has "Greek" chosen
    And the dial "How much Greek?" has "Curious" chosen
    And Settings draws no dial "How much Hebrew?"
    And the dial "How much Greek?" has five steps and no "Just English"
    And the "Listening" page draws "Greek voice"

  @uc-languages-dial @uc-script-depth @hebrew
  Scenario: Choosing Hebrew shows the Hebrew dial and Hebrew in the tutor
    Given Lampas is opened on Settings on a new phone
    When he chooses "Hebrew" under Which languages?
    Then Which languages? has "Hebrew" chosen
    And the dial "How much Hebrew?" has "Curious" chosen
    And Settings draws no dial "How much Greek?"
    And the "Learning" page draws "Hebrew in the tutor"
    And the "Listening" page draws no "Greek voice"

  @uc-languages-dial @greek @hebrew
  Scenario: Choosing Greek and Hebrew shows both dials
    Given Lampas is opened on Settings on a new phone
    When he chooses "Greek and Hebrew" under Which languages?
    Then Which languages? has "Greek and Hebrew" chosen
    And the dial "How much Greek?" has "Curious" chosen
    And the dial "How much Hebrew?" also has "Curious" chosen

  @uc-languages-dial @greek @hebrew
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

  @uc-languages-dial @greek @hebrew
  Scenario: The tutor changes the Hebrew dial to 0 and the row reads Greek
    Given Lampas is opened on Settings on a new phone
    When he chooses "Greek and Hebrew" under Which languages?
    And the tutor changes "hebrewInterest" to "0"
    Then Which languages? has "Greek" chosen
    And Settings draws no dial "How much Hebrew?"

  # A chapter is read by the dial of its own language (mw-gdcyf98.3): the Old Testament by How much Hebrew?, the New Testament by How much Greek?, whatever the other dial stands at.
  # These scenarios open the chapter with the two dials saved at the steps the scenario names.

  @uc-languages-dial @greek @hebrew
  Scenario: Genesis 1 at Hebrew Curious shows its switch and Matthew 1 at Greek Just English none
    Given Lampas is opened on "Genesis 1" with Greek at "Just English" and Hebrew at "Curious"
    Then the language switch offers "English" and "Hebrew"
    When Lampas is opened on "Matthew 1" with Greek at "Just English" and Hebrew at "Curious"
    Then the Reader draws no language switch

  @uc-languages-dial @greek @hebrew
  Scenario: Matthew 1 at Greek Curious shows its switch and Genesis 1 at Hebrew Just English none
    Given Lampas is opened on "Matthew 1" with Greek at "Curious" and Hebrew at "Just English"
    Then the language switch offers "English" and "Greek"
    When Lampas is opened on "Genesis 1" with Greek at "Curious" and Hebrew at "Just English"
    Then the Reader draws no language switch

  @uc-languages-dial @greek @hebrew
  Scenario: A Review card of Jonah 1:1 is in the Hebrew view at Hebrew Curious, whatever Greek stands at
    Given a phone with Greek at "Just English" and Hebrew at "Curious" whose Reader is set to the original
    When a Review card of "Jonah 1:1" is opened
    Then the card shows the verse in Hebrew, right to left

  @uc-languages-dial @greek @hebrew
  Scenario: A Review card of Jonah 1:1 is in English at Hebrew Just English, whatever Greek stands at
    Given a phone with Greek at "All in" and Hebrew at "Just English" whose Reader is set to the original
    When a Review card of "Jonah 1:1" is opened
    Then the card shows the verse in English

  @uc-languages-dial @greek @hebrew
  Scenario: At English only Genesis 1 is plain and only the English word sheet opens
    Given Lampas is opened on "Genesis 1" with Greek at "Just English" and Hebrew at "Just English"
    Then the Reader draws no language switch
    And verse 1 is drawn in English
    When he taps the English word "heavens" in verse 1
    Then only the English word sheet opens

  @uc-languages-dial @greek @hebrew
  Scenario: At English only Matthew 1 is plain and only the English word sheet opens
    Given Lampas is opened on "Matthew 1" with Greek at "Just English" and Hebrew at "Just English"
    Then the Reader draws no language switch
    And verse 1 is drawn in English
    When he taps the English word "Abraham" in verse 1
    Then only the English word sheet opens

  @uc-languages-dial @greek @hebrew
  Scenario: A talk on Genesis 1 carries hebrew_interest beside greek_interest
    Given Lampas is opened on "Genesis 1" behind a fake Postern with Greek at "Curious" and Hebrew at "Learning"
    When he opens the talk and asks "What does the first word mean?"
    Then the request carries greek_interest "Curious" with "Dipping a toe" next
    And the request carries hebrew_interest "Learning" with "Reading in Hebrew" next
