Feature: The reading ladder, in Greek and in English
  In the Verse view's Read it aloud action (features/reading-check.feature) a 'Reading ladder' button starts at the easiest verse to pronounce on
  public/data/ladder/<lang>.json (docs/reading-ladder.md) and walks him up it: the reading panel says 'Number N of M on the ladder', and after a good reading it
  offers 'Next verse'. A reading with words to fix, or only part of the verse, offers 'Try again' and 'Skip for now' and keeps the place; a skipped
  verse is remembered and comes back after he has read five others well. Greek and English each have a list and a place of their own, kept on the
  phone (Dexie `ladder` and the reading history, src/data/repositories/ladder.ts), so a reopened app goes on where he stopped. The Goal screen has
  an entry for each language too.

  Scenario: A new reader opens the ladder in Greek on the first verse of the Greek list
    Given Lampas is opened on Romans 8 in Greek with a reading ladder behind a fake Postern
    When he opens the reading check of verse 28 and taps "Reading ladder"
    Then the Verse view is on the first verse of the Greek list
    And the reading panel says "Number 1 of" and the number of verses on the Greek list
    And the reading panel does not call the rank "Verse 1 of", as it is not the verse's number in its chapter
    And the reading panel offers "Skip for now" and neither "Next verse" nor "Try again"

  Scenario: A well-read moves the place and Next verse opens the second verse
    Given Lampas is opened on Romans 8 in Greek with a reading ladder behind a fake Postern that finds nothing to fix
    When he opens the reading check of verse 28 and taps "Reading ladder"
    And he reads the verse aloud for 2 seconds
    Then the reading panel says "Well read"
    And the reading panel offers "Next verse" and neither "Try again" nor "Skip for now"
    When he taps "Next verse"
    Then the Verse view is on the second verse of the Greek list
    And the reading panel says "Number 2 of" and the number of verses on the Greek list

  Scenario: Words to fix keep the place and offer Try again and Skip for now
    Given Lampas is opened on Romans 8 in Greek with a reading ladder behind a fake Postern that marks two words
    When he opens the reading check of verse 28 and taps "Reading ladder"
    And he reads the verse aloud for 2 seconds
    Then the reading panel says "Words to fix"
    And the reading panel offers "Try again" and "Skip for now" and not "Next verse"
    When he taps "Try again"
    Then the reading panel no longer shows the result and says "Number 1 of" and the number of verses on the Greek list
    And the Greek place is still the first verse of the Greek list

  Scenario: A reading of only part of the verse keeps the place too
    Given Lampas is opened on Romans 8 in Greek with a reading ladder behind a fake Postern that heard only part of the verse
    When he opens the reading check of verse 28 and taps "Reading ladder"
    And he reads the verse aloud for 2 seconds
    Then the reading panel says "Read the whole verse"
    And the reading panel offers "Try again" and "Skip for now" and not "Next verse"

  Scenario: Skip for now moves on and remembers the verse
    Given Lampas is opened on Romans 8 in Greek with a reading ladder behind a fake Postern that marks two words
    When he opens the reading check of verse 28 and taps "Reading ladder"
    And he reads the verse aloud for 2 seconds
    And he taps "Skip for now"
    Then the Verse view is on the second verse of the Greek list
    And the ladder remembers the first verse of the Greek list as skipped

  Scenario: The English ladder's place is independent of the Greek
    Given Lampas is opened on Romans 8 in English with a reading ladder behind a fake Postern
    And he has read the first verse of the Greek list well
    When he opens the reading check of verse 28 and taps "Reading ladder"
    Then the Verse view is on the first verse of the English list
    And the reading panel says "Number 1 of" and the number of verses on the English list
    When he reads the verse aloud for 2 seconds
    Then the reading panel says "Well read"
    And the English place is the second verse of the English list
    And the Greek place is the second verse of the Greek list

  Scenario: Reopening the app resumes the place
    Given Lampas is opened on Romans 8 in Greek with a reading ladder behind a fake Postern
    And he has read the first verse of the Greek list well
    When Lampas is closed and opened again on Romans 8
    And he opens the reading check of verse 28 and taps "Reading ladder"
    Then the Verse view is on the second verse of the Greek list
    And the reading panel says "Number 2 of" and the number of verses on the Greek list

  Scenario: The Goal screen has a Reading ladder entry for each language
    Given Lampas is opened on the Goal screen in English with a reading ladder behind a fake Postern
    Then the Goal screen offers "Reading ladder: Greek" and "Reading ladder: English"
    When he taps "Reading ladder: Greek"
    Then the Verse view is on the first verse of the Greek list
    And the Read it aloud action is chosen
    And the reading panel says "Number 1 of" and the number of verses on the Greek list

  Scenario: While the list is on its way the Reading ladder button says it is loading
    Given Lampas is opened on Romans 8 in Greek with a reading ladder behind a fake Postern
    And the ladder list is slow to arrive
    When he opens the reading check of verse 28 and taps "Reading ladder" before the list has come
    Then the button reads "Loading the ladder…" and cannot be tapped again
    When the ladder list arrives
    Then the Verse view is on the first verse of the Greek list
    And the reading panel says "Number 1 of" and the number of verses on the Greek list
