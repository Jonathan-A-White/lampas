Feature: The Reader's top is one slim row of chips
  Due, the goal, the tip and New words used to be three or four full-width strips between the header and the text, and the
  reading text started a third of the way down the screen. They are now compact chips in ONE slim row under the header (src/ReaderChips.tsx):
  'Due 9', 'Goal 6/16', 'Tip' and 'New 3'. Each chip does on tap what its strip did, a chip with nothing to show is not drawn, and each keeps
  an accessible name with the full text. The row is hidden while a chapter is read aloud, as the strips were. The line '<n> words in Greek' sits at its right end.

  Scenario: Each chip opens what its strip opened
    Given Lampas is opened on Romans 8 with 3 words due, the goal "1 John 1:1" and his seed words
    Then the row under the header has the chips "Due 3", "Goal" and "New 3"
    When he taps the chip "Due 3"
    Then the Review screen is shown
    When he goes back to the Reader
    And he taps the goal chip
    Then the Goal screen is shown
    When he comes back to the Reader once more
    And he taps the chip "New 3"
    Then the teach sheet is shown

  Scenario: The chips keep the full text as their accessible names
    Given Lampas is opened on Romans 8 with 3 words due, the goal "1 John 1:1" and his seed words
    Then the chip "Due 3" is named "Due: 3"
    And the goal chip is named with the title, the solid words out of 16 and the ideas
    And the chip "New 3" is named "New words: 3"

  Scenario: A chip with nothing to show is not drawn, and with no chips no row is
    Given Lampas is opened on Romans 8 with nothing due, no goal and no new words
    Then the row under the header has no chip
    And the row is not drawn

  Scenario: The row is hidden while a chapter is read aloud
    Given Lampas is opened on Romans 8 with 3 words due, the goal "1 John 1:1" and his seed words
    When he taps Read from the top
    Then the row under the header has no chip
    When he taps Stop
    Then the row under the header has the chips "Due 3", "Goal" and "New 3"

  Scenario: The Tip chip opens the tip card
    Given Lampas is opened on Romans 8 with a tip waiting
    Then there is a chip "Tip" and no tip card
    When he taps the chip "Tip"
    Then the tip card shows its title
    When he taps Not now on the tip card
    Then there is no chip "Tip" and no tip card
