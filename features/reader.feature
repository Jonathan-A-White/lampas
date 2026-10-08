Feature: Read Romans 8
  Lampas opens on Romans 8, verse by verse in large, clear type. The header switches between the
  English (the MSB) and the Greek (Byzantine); every word is tappable and opens a sheet from the
  bundled data, with no call beyond the app's own /data/ files.

  Scenario: Romans 8 opens in English with 39 verses
    Given Lampas is opened with nothing saved
    Then the reader is headed "Romans 8" and shows the English
    And 39 verses are listed
    And verse 1 reads as the data's English chunks read

  Scenario: Tapping Therefore in verse 1 shows the Greek word behind it
    Given Lampas is opened with nothing saved
    When he taps "Therefore" in verse 1
    Then the word sheet shows the Greek word "ἄρα"
    And the word sheet shows the respelling "A-ra"
    And the word sheet shows the lemma "ἄρα"
    And the word sheet shows the parsing "particle"
    And the word sheet shows a gloss containing "therefore"
    And the word sheet shows Strong's "G686"

  Scenario: Switching to Greek shows verse 1 in the Greek order
    Given Lampas is opened with nothing saved
    When he switches to Greek
    Then the reader shows the Greek
    And verse 1 begins with the first 4 Greek words of the data

  Scenario: Tapping a Greek word shows its sheet
    Given Lampas is opened with nothing saved
    And he switches to Greek
    When he taps "πνεῦμα" in verse 1
    Then the word sheet shows the Greek word "πνεῦμα"
    And the word sheet shows the lemma "πνεῦμα"
    And the word sheet shows the parsing "noun, accusative singular neuter"
    And the word sheet shows a gloss containing "spirit"
    And the word sheet shows Strong's "G4151"
    And the word sheet shows the English "the Spirit."

  Scenario: An English chunk that renders several Greek words shows them all
    Given Lampas is opened with nothing saved
    When he taps the first English chunk that renders several Greek words
    Then the word sheet shows every Greek word that chunk renders

  Scenario: The word sheet closes by a tap outside it
    Given Lampas is opened with nothing saved
    And he taps "Therefore" in verse 1
    When he taps outside the word sheet
    Then no word sheet is open

  Scenario: The word sheet closes by a swipe down
    Given Lampas is opened with nothing saved
    And he taps "Therefore" in verse 1
    When he swipes the word sheet down
    Then no word sheet is open

  Scenario: Tapping a verse number selects that verse
    Given Lampas is opened with nothing saved
    When he taps the number of verse 3
    Then verse 3 is selected
    When he taps the number of verse 5 instead
    Then verse 5 is selected and verse 3 is not
    When he taps the number of verse 5 again
    Then no verse is selected

  Scenario: The switch is remembered after reload
    Given Lampas is opened with nothing saved
    And he switches to Greek
    When he reopens Lampas
    Then the reader shows the Greek

  Scenario: Reading asks for nothing but the app's own Romans 8 file
    Given Lampas is opened with nothing saved
    When he taps "Therefore" in verse 1
    Then the only request made was "/data/rom/8.json"
