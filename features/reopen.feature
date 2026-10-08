Feature: Lampas reopens where he left it
  The address says where he is: the screen, and in the reader the chapter, view, weave and selected
  verse. It is kept on every move, so a reopened app (and Back across a close) puts him back.
  The trail itself, the scroll and Back across a close are proved in tests/unit/lastRoute.test.ts and
  tests/e2e/reopen.spec.ts.

  Scenario: The reader writes the verse, view and weave he chose into the address
    Given Lampas is opened on Romans 8
    When he switches to Greek
    And he selects verse 28
    Then the address says chapter 8, the Greek view, no weave and verse 28
    When he taps verse 28 again
    Then the address names no verse

  Scenario: An address that names a verse and a view opens the reader there
    Given Lampas is opened at the address "#/?c=8&view=greek&weave=off&v=28"
    Then verse 28 is selected and the reader shows Greek

  Scenario: Back to an earlier place of the reader puts its verse back
    Given Lampas is opened at the address "#/?c=8&view=english&weave=off&v=5"
    When he goes to the Words screen and then back
    Then verse 5 is selected and the reader shows English

  Scenario: Leaving the reader for another screen keeps that screen's address
    Given Lampas is opened on Romans 8
    When he goes to the Words screen
    Then the address is "#/words"
