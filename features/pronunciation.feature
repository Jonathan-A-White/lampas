Feature: Respelling a Greek word
  The word sheet says how to say the word: under the Greek, a respelling in the pronunciation chosen in
  Settings (Modern Greek today: syllables, the stressed one in capitals, English sound-alikes). The schemes
  are a registry, one file each, so another (Erasmian next) is added without touching the screens. The
  data's beta-code transliteration ("cristw") is not shown anywhere.

  Scenario: The word sheet respells the word in Modern Greek and shows no beta-code
    Given Lampas is opened on a phone with a Greek voice
    And he switches the reader to Greek
    When he taps the Greek word "πνεῦμα" in verse 1
    Then the word sheet shows the respelling "PNEV-ma"
    And the word sheet shows no transliteration

  Scenario: A scheme added to the registry is listed in Settings and respells the word sheet
    Given Lampas is opened on a phone with a Greek voice
    And a second pronunciation "Shouting" is registered that respells every word as its capitals
    When he taps the gear in the reader's header
    Then Greek pronunciation lists "Modern Greek" and "Shouting"
    When he chooses the pronunciation "Shouting"
    And he taps Back on the Settings screen
    And he switches the reader to Greek
    And he taps the Greek word "πνεῦμα" in verse 1
    Then the word sheet shows the respelling "ΠΝΕΥΜΑ"
