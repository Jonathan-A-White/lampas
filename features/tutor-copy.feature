Feature: The tutor copies or shares a passage he names
  In a Bible talk he may ask the tutor to copy or share a passage ('copy Hebrews 9:11 to 10:4', 'share this paragraph', mw-5r3p30.1075). The answer carries a copy or a
  share link and the app draws a chip, 'Copy Hebrews 9:11-10:4' or 'Share Hebrews 9:11-10:4': a phone writes its clipboard and opens its share view only on a tap, so one
  tap does it. The text is what When you copy gives, as he reads it, across chapters too; the Talk sheet stays open. The tutor's own line says 'Tap Copy', never that it is copied.

  Scenario: One tap on the copy chip puts a passage across a chapter boundary on the clipboard
    Given Lampas is opened on Romans 8 and the tutor answers with a "copy" link to "Heb.9.11-10.4"
    When he asks the tutor about verse 28
    And he taps the chip "Copy Hebrews 9:11-10:4"
    Then the phone's clipboard holds the verses of Hebrews 9:11 to 10:4 with 10:1 marking the new chapter
    And the clipboard text ends with the reference "— Hebrews 9:11-10:4 (MSB)" and the link "https://lampas.allmymind.org/#/?ref=Heb.9.11"
    And the chip says "Copied"
    And the Talk sheet is still open

  Scenario: The share chip opens the phone's share view with the passage
    Given Lampas is opened on Romans 8 and the tutor answers with a "share" link to "Hebrews 9:11-10:4"
    And the phone has a share view
    When he asks the tutor about verse 28
    And he taps the chip "Share Hebrews 9:11-10:4"
    Then the phone's share view is handed the title "Hebrews 9:11-10:4" and the passage across the chapter boundary
    And the phone's clipboard holds nothing
    And the Talk sheet is still open

  Scenario: Where the phone has no share view the share chip copies and says so
    Given Lampas is opened on Romans 8 and the tutor answers with a "share" link to "Hebrews 9:11-10:4"
    When he asks the tutor about verse 28
    And he taps the chip "Share Hebrews 9:11-10:4"
    Then the phone's clipboard holds the verses of Hebrews 9:11 to 10:4 with 10:1 marking the new chapter
    And the chip says "This phone cannot share"

  Scenario: A chapter that cannot be read is said on the chip
    Given Lampas is opened on Romans 8 and the tutor answers with a "copy" link to "Heb.9.11-10.4"
    And Hebrews 10 cannot be loaded
    When he asks the tutor about verse 28
    And he taps the chip "Copy Hebrews 9:11-10:4"
    Then the chip says "Could not read Hebrews 10"
    And the phone's clipboard holds nothing
    And the Talk sheet is still open
