Feature: Grammar approach
  The order grammar is taught and tested in is a setting, the Grammar approach. Approaches are data, one file each
  (src/approaches/): BMA Tutor, which follows the sequence of Biblical Mastery Academy's Greek course with credit, and the
  Lampas ladder. Settings shows the chosen approach's credit line, its method and its lessons, and the tutor can change it.

  Scenario: Settings > Grammar approach offers BMA Tutor and Lampas ladder, BMA Tutor chosen
    Given Settings is open on a fresh phone
    Then the Grammar approach offers "BMA Tutor" and "Lampas ladder"
    And "BMA Tutor" is chosen

  Scenario: The chosen approach shows its credit line and its method
    Given Settings is open on a fresh phone
    Then the approach shows the credit line "After the Greek Success Path of Biblical Mastery Academy; the lessons and drills here are Lampas's own."
    And the credit line links to Biblical Mastery Academy
    And the approach shows its method and its first lesson "The Greek letters" marked "Next"
    When he chooses "Lampas ladder"
    Then the approach shows no credit line
    And "Lampas ladder" is chosen and the bus has heard the approach is "ladder"

  Scenario: Switching to Lampas ladder changes nothing of his levels
    Given Settings is open on a fresh phone
    And the alphabet and the genitive are solid and the aorist is at the frontier
    When he chooses "Lampas ladder"
    Then the genitive is still solid and the aorist is still at the frontier
    And the lesson marked "Next" is "Alpha"

  Scenario: The tutor changes the approach when asked
    Given Lampas is opened on Romans 8 with a talk behind a fake Postern that answers with the change grammarApproach ladder
    And he opens Talk
    When he sends "Teach me in the Lampas order"
    Then the sheet shows "Changed: Grammar approach: Lampas ladder" with an Undo button
    And the saved approach is "ladder"
    When he taps Undo
    Then the saved approach is "bma-tutor"
