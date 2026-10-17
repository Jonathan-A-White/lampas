Feature: Back from Audible, the return sheet asks where she got to
  She listens in Audible with a listening session open (the plan records when it began). When Lampas is in front again the return sheet opens once,
  asks "Where did you get to?" and proposes the chapter the time away most likely reached, walking forward from the chapter she began at by how long each
  chapter plays. She answers in a tap or two: she finished the chapter she began, got further (the chapters around the estimate), picks the chapter herself,
  or stopped partway. Each answer but the last marks the plan done through that chapter; every answer ends the session, so the sheet never reopens for it.

  Scenario: Back after two chapters of listening, the sheet proposes the chapter two on
    Given a plan started at "Leviticus 1" with the Reader open
    And a listening session opened at "Leviticus 1"
    When she is away for 2 chapters of listening and comes back to Lampas
    Then the sheet "Where did you get to?" is open
    And the sheet proposes "Leviticus 3"
    And the sheet offers "Finished Leviticus 1", "Pick it myself" and "Stopped partway"
    And the sheet offers "Got further" for the 5 chapters from "Leviticus 1" to "Leviticus 5"

  Scenario: Finished the chapter she began marks it done
    Given a plan started at "Leviticus 1" with the Reader open
    And a listening session opened at "Leviticus 1"
    When she is away for 2 chapters of listening and comes back to Lampas
    And she taps "Finished Leviticus 1"
    Then the sheet is closed
    And the next chapter is "Leviticus 2" with 91 of 1189 done
    And no listening session is open

  Scenario: Got further marks the plan done through the chapter she taps
    Given a plan started at "Leviticus 1" with the Reader open
    And a listening session opened at "Leviticus 1"
    When she is away for 2 chapters of listening and comes back to Lampas
    And she taps "Got further: Leviticus 3"
    Then the sheet is closed
    And the next chapter is "Leviticus 4" with 93 of 1189 done
    And no listening session is open

  Scenario: Pick it myself opens the chapter picker and marks the chapter she chooses
    Given a plan started at "Leviticus 1" with the Reader open
    And a listening session opened at "Leviticus 1"
    When she is away for 2 chapters of listening and comes back to Lampas
    And she taps "Pick it myself"
    And she chooses the book "Numbers" and the chapter 2 in the picker
    Then the sheet is closed
    And the next chapter is "Numbers 3" with 119 of 1189 done
    And no listening session is open

  Scenario: Stopped partway ends the session and marks nothing
    Given a plan started at "Leviticus 1" with the Reader open
    And a listening session opened at "Leviticus 1"
    When she is away for 2 chapters of listening and comes back to Lampas
    And she taps "Stopped partway"
    Then the sheet is closed
    And the next chapter is "Leviticus 1" with 90 of 1189 done
    And no listening session is open

  Scenario: Back again after an answer, the sheet does not reopen
    Given a plan started at "Leviticus 1" with the Reader open
    And a listening session opened at "Leviticus 1"
    When she is away for 2 chapters of listening and comes back to Lampas
    And she taps "Stopped partway"
    And she is away again for 3 chapters of listening and comes back to Lampas
    Then the sheet is closed

  Scenario: Closing the sheet without answering keeps the session, and the next return asks again
    Given a plan started at "Leviticus 1" with the Reader open
    And a listening session opened at "Leviticus 1"
    When she is away for 2 chapters of listening and comes back to Lampas
    And she taps "Not now"
    Then the sheet is closed
    And a listening session is open
    When she is away again for 3 chapters of listening and comes back to Lampas
    Then the sheet "Where did you get to?" is open
    And the sheet proposes "Leviticus 4"

  Scenario: Coming back with no listening session opens nothing
    Given a plan started at "Leviticus 1" with the Reader open
    When she is away for 2 chapters of listening and comes back to Lampas
    Then the sheet is closed

  Scenario: With the Reading plan setting Off the sheet does not open
    Given a plan started at "Leviticus 1" with the Reader open
    And a listening session opened at "Leviticus 1"
    And the Reading plan setting is Off
    When she is away for 2 chapters of listening and comes back to Lampas
    Then the sheet is closed

  Scenario: Lampas opened afresh with a session still open asks at once
    Given a plan started at "Leviticus 1" with a listening session open before Lampas opens
    Then the sheet "Where did you get to?" is open
