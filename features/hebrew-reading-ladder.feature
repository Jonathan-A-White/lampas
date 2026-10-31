@uc-reading-ladder @hebrew
Feature: Reading the Old Testament aloud in Hebrew, on the Reading ladder
  Every Old Testament verse is ranked from the easiest to say to the hardest (public/data/ladder/he.json, docs/reading-ladder.md 'Hebrew'). With Hebrew chosen the
  Goal screen has a "Reading ladder: Hebrew" entry that opens the easiest verse in the Hebrew view on Read it aloud; the place is kept for Hebrew apart from Greek and
  English. A reading is sent to the mill scored in Hebrew (lang "he", no Greek words), a word he misread is spoken in the Hebrew voice, and the words he keeps missing are
  the drill. The Greek and English lists are as features/reading-ladder.feature has them.

  Scenario: With Hebrew chosen the Reading ladder opens the easiest Hebrew verse, in Hebrew, on Read it aloud
    Given Lampas is opened on the Goal screen with Hebrew chosen and a reading ladder behind a fake Postern
    Then the Goal screen offers "Reading ladder: Hebrew" and "Reading ladder: English" and not "Reading ladder: Greek"
    When he taps "Reading ladder: Hebrew"
    Then the Verse view is on the first verse of the Hebrew list
    And the verse is shown in Hebrew, right to left
    And the Read it aloud action is chosen
    And the reading panel says "Number 1 of" and the number of verses on the Hebrew list

  Scenario: A reading sent is scored in Hebrew and carries no Greek words
    Given Lampas is opened on the Goal screen with Hebrew chosen and a reading ladder behind a fake Postern that finds nothing to fix
    When he taps "Reading ladder: Hebrew"
    And he reads the verse aloud for 2 seconds
    Then the reading sent says lang "he" with the Hebrew words of the verse and no Greek words
    And the reading panel says "Well read"
    And the reading panel offers "Next verse"

  Scenario: Next verse goes up the Hebrew list and the Greek place stays where it was
    Given Lampas is opened on the Goal screen with Hebrew chosen and a reading ladder behind a fake Postern that finds nothing to fix
    When he taps "Reading ladder: Hebrew"
    And he reads the verse aloud for 2 seconds
    And he taps "Next verse"
    Then the Verse view is on the second verse of the Hebrew list
    And the Hebrew place is the second verse of the Hebrew list
    And the Greek place is still the first verse of the Greek list

  Scenario: A flagged Hebrew word has Me and its speaker, and the speaker says it in Hebrew
    Given Lampas is opened on the Goal screen with Hebrew chosen and a reading ladder behind a fake Postern that marks the first word and times it
    When he taps "Reading ladder: Hebrew"
    And he reads the verse aloud for 2 seconds
    Then the first word of the verse is marked with its speaker and "Me" right beside it
    When he taps the speaker of the marked word
    Then the phone's Hebrew voice says the marked word
    When he taps "Me" beside the marked word
    Then the audio element plays his recording

  Scenario: The words he missed are the drill
    Given Lampas is opened on the Goal screen with Hebrew chosen and a reading ladder behind a fake Postern, two of his last five Hebrew readings having missed two words
    When he taps "Reading ladder: Hebrew"
    Then the reading panel offers "Drill these words"
    When he taps "Drill these words" in the reading panel
    And he taps "Start the drill" in the Reading drill
    Then the Reading drill shows the first missed word in Hebrew, right to left

  Scenario: With Greek only there is no Hebrew list
    Given Lampas is opened on the Goal screen with Greek chosen and a reading ladder behind a fake Postern
    Then the Goal screen offers "Reading ladder: Greek" and "Reading ladder: English" and not "Reading ladder: Hebrew"

  Scenario: With both chosen the Greek | Hebrew segment picks the list
    Given Lampas is opened on the Goal screen with Greek and Hebrew chosen and a reading ladder behind a fake Postern
    Then the Goal screen offers "Reading ladder: Greek" and "Reading ladder: English" and not "Reading ladder: Hebrew"
    When he chooses "Hebrew" in the Goal language segment
    Then the Goal screen then offers "Reading ladder: Hebrew" and "Reading ladder: English" and not "Reading ladder: Greek"
