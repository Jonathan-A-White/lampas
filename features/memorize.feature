Feature: I choose which verses to memorize
  A verse list is the unit I own, and a single verse can still be picked on its own. A tap memorizes in English; the languages beyond follow my Greek setting. The Old Testament
  has no text in Lampas yet, so its references are named and left out.

  Scenario: I memorize a whole list
    Given my Greek setting is step 3 and I have a list "Refuge" holding "Rom.8.28, Ps.62.1-2, 2Thess.3.3"
    When I turn on Memorize this list
    Then Romans 8:28 and 2 Thessalonians 3:3 are memorized in English
    And the list says "No Old Testament text in Lampas yet: Ps 62:1-2"
    And each New Testament row reads "Memorizing · English"

  Scenario: I pick one verse in the Verse view
    Given my Greek setting is step 3 and the Verse view is open on Romans 8:28
    When I tap Memorize
    Then the Verse view reads "Memorizing · English"
    When I switch Greek on in its sheet
    Then Romans 8:28 is memorized in English and Greek

  Scenario: A reader with no Greek gets English only
    Given my Greek setting is step 0 and the Verse view is open on Romans 8:28
    When I tap Memorize
    Then the Verse view reads "Memorizing · English"
    When I tap the Verse view's Memorizing · English
    Then no sheet opens and nothing is memorized
