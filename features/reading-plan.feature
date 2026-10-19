Feature: The listening plan lives in the Bible view
  The plan's next chapter is a piece of Today (src/today/Today.tsx, opened by the Reader's Today chip, features/reader-chips.feature). With the Reading plan on and a plan started
  it says "Next: Leviticus 4" and how far she is ("93 of 1,189 chapters done"), with Listen in Audible, whose tap opens that chapter's send-off sheet. With the plan off, or on but not
  started, it says no plan is started and has "Start a plan", which opens "Start a listening plan": pick the plan, then "Where are you starting?" (the chapter picker in
  choose mode), and everything before that chapter is done. Settings > Study resources has the same entry. The chapter picker marks the chapters done and
  the next one. A reader who is not learning Greek is shown the Today chip alone: the Greek chips are only drawn when they have something to show.

  Scenario: Today names the next chapter and how far she is
    Given Lampas is opened with a reading plan started at Leviticus 4
    When he opens Today from the Reader
    Then the Reading plan piece says "Next: Leviticus 4" and "93 of 1,189 chapters done"

  Scenario: Listen in Audible opens the next chapter's send-off sheet
    Given Lampas is opened with a reading plan started at Leviticus 4
    When he opens Today from the Reader
    And he taps Listen in Audible on Today
    Then the send-off sheet "Off to Audible: Leviticus 4" is shown

  Scenario: With the plan off Today invites her to start one
    Given Lampas is opened with the Reading plan off
    When he opens Today from the Reader
    Then the Reading plan piece says "No reading plan is started."
    When he taps Start a plan on Today
    Then the sheet "Start a listening plan" is shown with the plan "The whole Bible"

  Scenario: Starting the plan at a chapter marks everything before it done
    Given Lampas is opened with the Reading plan off
    When he opens Today from the Reader
    And he taps Start a plan on Today
    And he picks the plan "The whole Bible"
    Then the chapter picker "Where are you starting?" is shown
    When he chooses Leviticus 1 there
    Then the Reading plan piece says "Next: Leviticus 1" and "90 of 1,189 chapters done"
    And the Reading plan setting is On

  Scenario: Settings has the same entry
    Given Lampas is opened with the Reading plan off
    When he opens Settings
    And he taps "Start a listening plan" in Settings
    Then the sheet "Start a listening plan" is shown with the plan "The whole Bible"

  Scenario: The chapter picker marks the chapters done and the next
    Given Lampas is opened with a reading plan started at Luke 15
    When he opens the chapter picker at Matthew
    Then the Matthew chapters are all marked done and none is marked next
    When he goes back to the books and opens Luke
    Then Luke 14 is marked done and Luke 15 is marked next and Luke 16 is neither
    When he goes back to the books and opens Leviticus
    Then every Leviticus chapter is marked done

  Scenario: A reader with no Greek activity sees the Today chip alone
    Given Lampas is opened with a reading plan started at Leviticus 4 and no Greek activity
    Then the row has no Goal chip and no Tip chip, and the Today chip

  Scenario: A reader with words due sees no Due or Plan chip, only Today
    Given Lampas is opened with a reading plan started at Leviticus 4 and 3 words due
    Then the row holds the Today chip and no Due chip and no Plan chip

  Scenario: Every chip has an accessible name
    Given Lampas is opened with a reading plan started at Leviticus 4 and 3 words due
    Then every chip in the row is named

  Scenario: The Developer row resets the plan for the demo
    Given Lampas is opened with a reading plan started at Leviticus 4
    When he turns Developer mode on and opens Settings
    And he taps "Reset the listening plan, for the demo" in Settings
    Then the Reading plan setting is Off and no plan is kept
    When he taps "Start a listening plan" in Settings
    And he picks the plan "The whole Bible"
    And he chooses Leviticus 1 there
    Then the Reading plan setting is On and the plan starts at Leviticus 1
