Feature: The Audible send-off
  With the Reading plan on and a plan started, Listen in Audible on a chapter of the plan (the Verse view of a New Testament chapter, and an Old
  Testament chapter in the chapter picker) does not fire and forget. A short sheet comes up first: "Off to Audible: Luke 15", one line of what
  happens next, and one big Go. Go records the start time of the listening session (src/data/repositories/readingPlan.ts beginSession) and only then
  opens Audible, with the fallback armed. Back, Escape or a tap outside closes the sheet and begins nothing. With the Reading plan off, or on with no
  plan started, Listen in Audible opens Audible at once as it always did, with no sheet.

  Scenario: On a plan chapter Listen in Audible asks first
    Given Lampas is opened with a reading plan started at Luke 15
    When he opens the Verse view of Luke 15:11
    And he taps the Listen in Audible link
    Then the send-off sheet "Off to Audible: Luke 15" is shown
    And the sheet says "When you are back, tell me where you got to."
    And the sheet has one button, "Go"
    And Audible was not opened
    And no listening session is open

  Scenario: Go records the start time and then opens Audible
    Given Lampas is opened with a reading plan started at Luke 15
    When he opens the Verse view of Luke 15:11
    And he taps the Listen in Audible link
    And he taps Go
    Then the listening session for Luke 15 was open when Audible was opened
    And the session began at the time of the tap
    And Audible's smart link for Luke 15 was opened once
    And the send-off sheet is gone

  Scenario: A tap outside closes the sheet and begins nothing
    Given Lampas is opened with a reading plan started at Luke 15
    When he opens the Verse view of Luke 15:11
    And he taps the Listen in Audible link
    And he taps outside the sheet
    Then the send-off sheet is gone
    And Audible was not opened
    And no listening session is open

  Scenario: An Old Testament chapter in the picker goes through the same sheet
    Given Lampas is opened with a reading plan started at Genesis 1
    When he chooses Leviticus 3 in the chapter picker
    And he taps the Listen in Audible link
    Then the send-off sheet "Off to Audible: Leviticus 3" is shown
    When he taps Go
    Then the listening session for Leviticus 3 was open when Audible was opened

  Scenario: With the Reading plan off Audible opens at once
    Given Lampas is opened with the Reading plan off and the Audio Bible on
    When he opens the Verse view of Luke 15:11
    And he taps the Listen in Audible link
    Then there is no send-off sheet
    And no listening session is open

  Scenario: With the Reading plan on but no plan started Audible opens at once
    Given Lampas is opened with the Reading plan on but no plan started
    When he opens the Verse view of Luke 15:11
    And he taps the Listen in Audible link
    Then there is no send-off sheet
