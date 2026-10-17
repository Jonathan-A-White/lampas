Feature: The listening plan lives in the Bible view
  A Plan chip sits in the Reader's row of chips (src/plan/PlanChip.tsx), beside Due and Goal. With the Reading plan on and a plan started it says
  "Next: Leviticus 4" and how far she is ("93 of 1,189"); a tap is Continue and opens that chapter's send-off sheet. With the plan off, or on but not
  started, it reads "Listen through the Bible" and opens "Start a listening plan": pick the plan, then "Where are you starting?" (the chapter picker in
  choose mode), and everything before that chapter is done. Settings > Study resources has the same entry. The chapter picker marks the chapters done and
  the next one. A reader who is not learning Greek is shown the Plan chip alone: the Greek chips are only drawn when they have something to show.

  Scenario: The chip names the next chapter and how far she is
    Given Lampas is opened with a reading plan started at Leviticus 4
    Then the Plan chip says "Next: Leviticus 4" and "93 of 1,189"
    And the Plan chip is named "Next: Leviticus 4, 93 of 1,189 chapters done"

  Scenario: Tapping the chip opens the next chapter's send-off sheet
    Given Lampas is opened with a reading plan started at Leviticus 4
    When he taps the Plan chip
    Then the send-off sheet "Off to Audible: Leviticus 4" is shown

  Scenario: With the plan off the chip invites her to start one
    Given Lampas is opened with the Reading plan off
    Then the Plan chip says "Listen through the Bible"
    When he taps the Plan chip
    Then the sheet "Start a listening plan" is shown with the plan "The whole Bible"

  Scenario: Starting the plan at a chapter marks everything before it done
    Given Lampas is opened with the Reading plan off
    When he taps the Plan chip
    And he picks the plan "The whole Bible"
    Then the chapter picker "Where are you starting?" is shown
    When he chooses Leviticus 1 there
    Then the Plan chip says "Next: Leviticus 1" and "90 of 1,189"
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

  Scenario: A reader with no Greek activity sees the Plan chip alone
    Given Lampas is opened with a reading plan started at Leviticus 4 and no Greek activity
    Then the row has no Due chip, no Goal chip and no Tip chip, and the Plan chip

  Scenario: A reader with Greek activity sees both
    Given Lampas is opened with a reading plan started at Leviticus 4 and 3 words due
    Then the row holds the chips "Due 3" and the Plan chip

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
