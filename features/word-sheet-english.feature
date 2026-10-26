Feature: The word sheet's English is the words alone
  The English a word stands for is a chunk of its verse, and a chunk carries the verse's punctuation ('at all times.').
  The word sheet shows the words without the marks at their ends; a mark inside them (an apostrophe, a hyphen) stays,
  and the Reader's own text keeps every mark.

  Scenario: Πάντοτε in 1 Thessalonians 5:16 shows its English without the full stop
    Given Lampas is opened on 1 Thessalonians 5 in Greek
    When he taps "Πάντοτε" in verse 16
    Then the word sheet shows the English "at all times"
    And verse 16 of the Reader still reads "Rejoice at all times."

  Scenario: The English he tapped heads the sheet without the full stop
    Given Lampas is opened on 1 Thessalonians 5 in English
    When he taps "at all times." in verse 16
    Then the word sheet is headed with the English "at all times"

  Scenario: Quotes and a comma at the ends go, the hyphen inside stays
    Given Lampas is opened on 2 Corinthians 12 in Greek
    When he taps "λίαν" in verse 11
    Then the word sheet shows the English "super-apostles"

  Scenario: A comma at the end goes, the apostrophe inside stays
    Given Lampas is opened on 1 Corinthians 10 in Greek
    When he taps "κυρίου" in verse 26
    Then the word sheet shows the English "Lord’s"

  Scenario: Tapping "of" in "of Nineveh" looks up only "of" in Webster's
    Given Lampas is opened on Matthew 12 in English with Logos on
    When he taps the word "of" of the chunk "of Nineveh" in verse 41
    Then the word sheet is headed with the English "of Nineveh"
    And the word sheet has the one English lookup "Look it up in Logos (English): of"

  Scenario: Tapping "Nineveh" in "of Nineveh" looks up only "nineveh"
    Given Lampas is opened on Matthew 12 in English with Logos on
    When he taps the word "Nineveh" of the chunk "of Nineveh" in verse 41
    Then the word sheet has the one English lookup "Look it up in Logos (English): nineveh"

  Scenario: A sheet opened with no tapped word known lists a row for each word of the chunk
    Given Lampas is opened on Matthew 12 in English with Logos on
    When he taps the chunk "of Nineveh" in verse 41 where no word is known
    Then the word sheet has the English lookups "Look it up in Logos (English): of" and "Look it up in Logos (English): nineveh"

  Scenario: The Greek word of the chunk stays whichever English word he taps
    Given Lampas is opened on Matthew 12 in English with Logos on
    When he taps the word "of" of the chunk "of Nineveh" in verse 41
    Then the word sheet shows the Greek word "Νινευῖται"

