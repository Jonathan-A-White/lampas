Feature: One bad render never blacks out the app
  A chapter kept on the phone from before a deploy can have an older shape, and any screen can fail to draw.
  The Reader reads the old shape, and a failure shows a screen with Reload instead of a black page.

  Scenario: The Reader in English draws a chapter whose chunks carry the old s: 1
    Given Lampas is opened on a chapter whose supplied chunks say s: 1
    When he switches to English
    Then the verses are shown
    And no error screen is shown

  Scenario: A component that throws inside the Reader shows the error screen
    Given Lampas is opened on a chapter that makes the Reader throw
    Then the error screen says "Something went wrong"
    And it has a Reload button
    And the error was reported to the console
