Feature: The Reader's top is one slim row of chips
  Today, the goal, the tip and New words used to be three or four full-width strips between the header and the text, and the
  reading text started a third of the way down the screen. They are now compact chips in ONE slim row under the header (src/ReaderChips.tsx):
  'Today · 1 of 7', 'Goal 6/16', 'Tip' and 'New 3'. The Today chip (src/today/TodayChip.tsx) replaced the Due and Plan chips: Review and the reading plan are pieces of Today. It counts the
  pieces Today holds and those he has ticked ('Today · k of n'), says just 'Today' with Tick boxes off, and is not drawn when every Daily piece is off. Each chip does on tap what its strip did,
  a chip with nothing to show is not drawn, and each keeps an accessible name with the full text. The row is hidden while a chapter is read aloud, as the strips were. The line '<n> words in Greek' sits at its right end.

  Scenario: Each chip opens what its strip opened
    Given Lampas is opened on Romans 8 with 3 words due, the goal "1 John 1:1" and his seed words
    Then the row under the header has the chips "Today", "Goal" and "New 3"
    When he taps the chip "Today"
    Then the Today screen is shown
    When he goes back to the Reader
    And he taps the goal chip
    Then the Goal screen is shown
    When he comes back to the Reader once more
    And he taps the chip "New 3"
    Then the teach sheet is shown

  Scenario: The chips keep the full text as their accessible names
    Given Lampas is opened on Romans 8 with 3 words due, the goal "1 John 1:1" and his seed words
    Then the Today chip is named like its text
    And the goal chip is named with the title, the solid words out of 16 and the ideas
    And the chip "New 3" is named "New 3 words"

  Scenario: A chip with nothing to show is not drawn, and the Today chip is then alone in the row
    Given Lampas is opened on Romans 8 with nothing due, no goal and no new words
    Then the row under the header holds only the chip "Today"

  Scenario: The Today chip counts the pieces Today holds and those he has ticked
    Given Lampas is opened on Romans 8 with 3 words due, the goal "1 John 1:1" and his seed words
    Then the Today chip counts every piece Today holds, none ticked
    When he taps the chip "Today"
    And he ticks the box "Done: Review" on Today
    And he goes back to the Reader
    Then the Today chip counts one piece ticked

  Scenario: With Tick boxes off the chip says just Today
    Given Lampas is opened on Romans 8 with 3 words due, the goal "1 John 1:1" and his seed words
    When he turns Tick boxes off
    Then the Today chip reads exactly "Today"

  Scenario: With every Daily piece off the Reader has no Today chip
    Given Lampas is opened on Romans 8 with 3 words due, the goal "1 John 1:1" and his seed words
    When he turns every Daily piece off
    Then the row under the header has no Today chip

  Scenario: The row is hidden while a chapter is read aloud
    Given Lampas is opened on Romans 8 with 3 words due, the goal "1 John 1:1" and his seed words
    When he taps Read from the top
    Then the row under the header has no chip
    When he taps Stop
    Then the row under the header has the chips "Today", "Goal" and "New 3"

  Scenario: The Tip chip opens the tip card
    Given Lampas is opened on Romans 8 with a tip waiting
    Then there is a chip "Tip" and no tip card
    When he taps the chip "Tip"
    Then the tip card shows its title
    When he taps Not now on the tip card
    Then there is no chip "Tip" and no tip card
