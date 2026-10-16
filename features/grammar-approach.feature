Feature: Grammar approach
  Lampas teaches grammar by ONE path, its own ladder, for everyone. Approaches are still data, one file each (src/approaches/), so a
  second path is one file and one line away; Settings draws the choice again as soon as two are listed. Settings > Grammar approach
  shows the path's name, its method and its lessons with the next one marked, and the tutor can still be asked for another approach.
  A phone that saved the old BMA Tutor choice reads as the ladder, with every level kept.

  Scenario: Settings > Grammar approach shows the one path, with no choice to make
    Given Settings is open on a fresh phone
    Then the Grammar approach shows no choice
    And the approach shows its method and its first lesson "The Greek alphabet" marked "Next"
    And the approach shows no credit line
    And "Ask for another approach" is offered

  Scenario: A phone that saved the BMA Tutor choice reads as the ladder
    Given Settings is open on a phone that saved "bma-tutor" with the alphabet and the genitive solid and the aorist at the frontier
    Then the approach shows its method and its first lesson "Alpha" marked "Next"
    And the alphabet and the genitive are still solid and the aorist is still at the frontier
    And the saved approach is "bma-tutor" in the store and reads as "ladder"

  Scenario: The tutor is told the ladder when asked about the approach
    Given Lampas is opened on Romans 8 with a talk behind a fake Postern that answers with the change grammarApproach ladder
    And he opens Talk
    When he sends "Teach me in the Lampas order"
    Then the sheet shows "Changed: Grammar approach: Lampas ladder" with an Undo button
    And the saved approach is "ladder"
