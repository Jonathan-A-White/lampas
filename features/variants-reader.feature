@uc-variants @greek
Feature: The Reader shows the variants inline, and a chip in its header turns them on and off
  With Settings > Variants on, the words of each variant unit are marked in the text and a brace right after them holds the other reading(s)
  with a small witness chip (B, NA, ECM). A chip in the Reader's header, beside English | Weave | Greek, is drawn only on a chapter that has
  variants: it shows how many the filter shows ('⁑ 3'), dim while Variants is Off. A tap turns Variants on (to its last value, 'Those that
  change the English' the first time) or off; a long press opens a small sheet with the two filters and a link to Settings. The Immersive
  reader marks the words and draws the braces too (a tap on one opens the sheet), and has the chip in its row while the bars show (at the top of the
  chapter): the chip slides away with the bars, as the other chips do, and is not left out of a row he can see.

  Scenario: With Variants Off the chip is dim and no brace is drawn
    Given Lampas is opened on Revelation 3 with nothing saved
    Then the header has the variants chip, not pressed
    And it counts the units that change the English
    And no brace is drawn

  Scenario: A tap on the chip turns Variants on to Those that change the English, and braces follow the units
    Given Lampas is opened on Revelation 3 with nothing saved
    When he taps the variants chip
    Then Variants is saved as "english"
    And the variants chip is pressed
    And a brace is drawn after each unit that changes the English, as many as the chip counts
    And the brace of verse 2 holds "keep" with the chip "B"

  Scenario: A second tap turns Variants off and a third puts back the value it had
    Given Lampas is opened on Revelation 3 with Variants "all"
    When he taps the variants chip
    Then Variants is saved as "off"
    And no brace is drawn
    When he taps the variants chip again
    Then Variants is saved again as "all"
    And a brace is drawn for every unit of the chapter

  Scenario: A long press opens the filter sheet; Byzantine splits only leaves the Byzantine units
    Given Lampas is opened on Revelation 3 with Variants "all"
    When he long presses the variants chip
    Then a sheet "Variants" offers "Those that change the English" and "All", and "Byzantine splits only", "also Nestle-Aland" and "also ECM"
    When he chooses "Byzantine splits only" in the sheet
    Then the chip counts the Byzantine units, and as many braces are drawn, each with the chip "B" alone
    When he then chooses "also Nestle-Aland" in the sheet
    Then the chip counts the Byzantine and Nestle-Aland units

  Scenario: The sheet's link opens Settings at Variants
    Given Lampas is opened on Revelation 3 with Variants "all"
    When he long presses the variants chip
    And he taps "Variants in Settings" in the sheet
    Then Settings opens at the Variants row

  Scenario: A chapter with no variants has no chip
    Given Lampas is opened on Genesis 1 with Variants "all"
    Then the header has no variants chip

  Scenario: Weave's long press still flips the word order beside the chip
    Given Lampas is opened on Revelation 3 with Variants "all" and the Weave on
    When he long presses "Weave" in the language switch
    Then a toast says "Greek word order"
    And the variants chip is pressed

  Scenario: The Immersive reader draws the braces and marks the words, and the chip while the bars show
    Given Lampas is opened on Revelation 3 with Variants "all" and the Immersive reader on
    Then a brace is drawn for every unit of the chapter
    And the chips row, shown, has the variants chip pressed
    And the chip is the same as in the plain reader: it counts every unit
