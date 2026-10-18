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

  Scenario: A passage lesson shows its range with Next, and Passed once it is passed
    Given Settings is open on the goal "1 John" with every idea it needs solid
    Then the lesson "1 John 1:1-4" is marked "Next"
    When he has passed the passage "1 John 1:1-4"
    Then the lesson "1 John 1:1-4" shows the mark "Passed"
    And the lesson "1 John 1:5-10" now has the mark "Next"

  Scenario: The tutor is told the ladder when asked about the approach
    Given Lampas is opened on Romans 8 with a talk behind a fake Postern that answers with the change grammarApproach ladder
    And he opens Talk
    When he sends "Teach me in the Lampas order"
    Then the sheet shows "Changed: Grammar approach: Lampas ladder" with an Undo button
    And the saved approach is "ladder"

  Scenario: A lesson that holds several ideas lists them by title under it (mw-86e9r1.35, mw-86e9r1.40)
    Given Settings > Grammar approach shows the path "BMA Tutor" beside the ladder
    Then under "Small words that take a case" it lists "The preposition περί" and "Compound verbs"
    And under "Marks over the letters" it lists "Marks that change the word", "Enclitics" and "Words that sound alike"

  Scenario: A tap on an idea under a lesson opens its idea sheet (mw-86e9r1.42)
    Given Settings > Grammar approach shows the path "BMA Tutor" beside the ladder
    When he taps "Compound verbs" under "Small words that take a case"
    Then the idea sheet "Compound verbs" opens and it says "a verb with a preposition joined to its front"

  Scenario: The ladder's lessons open their idea sheet, and Marks lists the ideas the goal's words show (mw-86e9r1.42, mw-86e9r1.40)
    Given Settings is open on a fresh phone
    Then the lesson "Marks that change the word" is listed under "Marks"
    When he taps the lesson "Words that sound alike"
    Then the idea sheet "Words that sound alike" opens and it says "trust the spelling"

