Feature: The Verse view shows the verse
  Tapping a verse number opens the Verse view (mw-5r3p30.79, features/verse-view.feature). It is headed by the verse's
  reference, and it shows the verse's whole text in the view's language, big, above the actions and the hold bar, so
  he can read the verse aloud from the view itself. Nothing from another verse ever heads it.

  Scenario: The Greek view shows the Greek of Romans 8:22 under the reference
    Given Lampas is opened on Romans 8 in the Greek view
    When he taps the number of verse 22
    Then the Verse view is headed "Romans 8:22"
    And the Verse view shows the Greek of verse 22 in Greek type
    And the verse comes before the hold bar

  Scenario: The English view shows the English of Romans 8:22 under the reference
    Given Lampas is opened on Romans 8 in the English view
    When he taps the number of verse 22
    Then the Verse view is headed "Romans 8:22"
    And the Verse view shows the English of verse 22 in English type
    And the verse comes before the hold bar

  Scenario: A kept reading with a word from another verse does not head the panel
    Given Lampas is opened on Romans 8 in the Greek view
    And a kept reading of verse 22 lists the word "ἀπεκδεχόμεθα"
    When he taps the number of verse 22
    And he chooses "Read it aloud"
    And he taps "Read these again"
    Then the Verse view is headed "Romans 8:22"
    And the Verse view shows the Greek of verse 22 in Greek type

  Scenario: With the weave on, the English view's Verse view shows the verse woven as the reader does
    Given Lampas is opened on Romans 8 in the English view with the weave "Solid words"
    When he taps the number of verse 1
    Then the Verse view's verse has the same words as the reader's line for verse 1
    And the Verse view's verse has a Greek word woven in
    And the Verse view's woven words are tappable like the reader's

  Scenario: With the weave off, the English view's Verse view shows plain English
    Given Lampas is opened on Romans 8 in the English view with the weave "Off"
    When he taps the number of verse 1
    Then the Verse view's verse has the same words as the reader's line for verse 1
    And the Verse view's verse has no Greek word woven in

  Scenario: The Greek view's Verse view shows the Greek, whatever the weave
    Given Lampas is opened on Romans 8 in the Greek view with the weave "Solid words"
    When he taps the number of verse 1
    Then the Verse view's verse has the same words as the reader's line for verse 1
    And the Verse view's verse has no Greek word woven in

  Scenario: The Verse view follows the weave and the view when they change while it is open
    Given Lampas is opened on Romans 8 in the English view with the weave "Off"
    And he taps the number of verse 1
    When the weave is set to "Solid words"
    Then the Verse view's verse has a Greek word woven in
    And the Verse view's verse has the same words as the reader's line for verse 1
    When the weave is then set to "Off"
    Then the Verse view's verse has no Greek word woven in
    When the view is set to Greek
    Then the Verse view's verse shows the Greek of verse 1 as the reader's line does
