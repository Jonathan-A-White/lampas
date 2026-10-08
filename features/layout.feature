Feature: Reading layout and section headings
  Settings has Layout (Verse by verse | Paragraph, default Verse by verse) and Section headings (On | Off, default
  On). The data carries the MSB's paragraph starts and headings (verses[].p and verses[].h, docs/data.md). Verse by
  verse is one verse per line with its number; Paragraph runs the verses of an MSB paragraph on, with small
  superscript verse numbers, every word still tappable and a verse still selectable by its number. A heading is
  English, in a style of its own, above its verse in the English and the Greek view. Both choices are kept in the
  settings store and told to the bus.

  Scenario: Layout Paragraph runs Romans 8 verses together within a paragraph, with superscript verse numbers
    Given Lampas is opened with nothing saved
    When he sets Layout to Paragraph in Settings
    Then the bus has heard the layout is paragraph
    When he taps Back on the Settings screen
    Then verses 1 to 4 of the reader run together in one paragraph
    And verse 5 starts another paragraph
    And the verse numbers are superscript
    And verse 1 reads as the data's English chunks read

  Scenario: Verse by verse shows one verse per line
    Given Lampas is opened with nothing saved
    Then each of the 39 verses is a line of its own with its number beside it
    And no paragraph is shown
    When he sets Layout to Paragraph in Settings
    And he sets Layout to Verse by verse in Settings
    And he taps Back on the Settings screen
    Then the reader again shows each of the 39 verses as a line of its own

  Scenario: Section headings On shows the MSB heading above its verse in both views; Off hides it
    Given Lampas is opened with nothing saved
    Then "Walking by the Spirit" is shown above verse 1
    And "Heirs with Christ" is shown above verse 12
    When he switches to Greek
    Then in Greek "Walking by the Spirit" is shown above verse 1
    And the heading "Walking by the Spirit" is English
    When he sets Section headings to Off in Settings
    And he taps Back on the Settings screen
    Then no heading is shown
    When he sets Section headings to On in Settings
    And he goes back to the reader
    Then the heading "Heirs with Christ" is back above verse 12

  Scenario: a tap on a word in Paragraph layout still opens its word sheet
    Given Lampas is opened with nothing saved
    When he sets Layout to Paragraph in Settings
    And he taps Back on the Settings screen
    And he taps "Therefore" in verse 1
    Then the word sheet shows the Greek word "ἄρα"
    When he closes the word sheet
    And he taps the number of verse 2
    Then verse 2 is selected and verse 1 is not
    And the Ask box is shown

  Scenario: Layout and Section headings survive a reload
    Given Lampas is opened with nothing saved
    When he sets Layout to Paragraph in Settings
    And he sets Section headings to Off in Settings
    And Lampas is reopened at the Settings address
    Then Layout is set to "Paragraph" in Settings
    And Section headings is set to "Off" in Settings
    When he taps Back on the Settings screen
    Then verses 1 to 4 of the reader run together in one paragraph
    And no heading is shown
