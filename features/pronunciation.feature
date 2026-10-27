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
    And he sets each language on its own
    Then Greek pronunciation lists "Modern Greek" and "Shouting"
    When he chooses the pronunciation "Shouting"
    And he taps Back on the Settings screen
    And he switches the reader to Greek
    And he taps the Greek word "πνεῦμα" in verse 1
    Then the word sheet shows the respelling "ΠΝΕΥΜΑ"

  Scenario: The family row sets both languages
    Given Lampas is opened with the Greek dial at 5 and the Hebrew dial at 1, Greek pronunciation "other" and Hebrew pronunciation "other" saved
    When he taps the gear in the reader's header
    Then Listening shows the Pronunciation row with the choice "Modern", and neither the Greek nor the Hebrew pronunciation row
    When he chooses the pronunciation family "Modern"
    Then Greek pronunciation is saved as "modern" and Hebrew pronunciation as "israeli"

  Scenario: Set each language on its own shows the Greek and the Hebrew row, and the family goes
    Given Lampas is opened with the Greek dial at 5 and the Hebrew dial at 1
    When he taps the gear in the reader's header
    And he sets each language on its own
    Then Listening shows the Greek pronunciation and the Hebrew pronunciation rows, and no Pronunciation row
    And "Modern Greek" is the Greek pronunciation and "Israeli" is the Hebrew pronunciation

  Scenario: Turning it off puts the family back and both languages follow it
    Given Lampas is opened with the Greek dial at 5 and the Hebrew dial at 1, Greek pronunciation "other" and Hebrew pronunciation "other" saved
    When he taps the gear in the reader's header
    And he sets each language on its own
    And he turns Set each language on its own off
    Then Listening shows the Pronunciation row with the choice "Modern", and neither the Greek nor the Hebrew pronunciation row
    And Greek pronunciation is saved as "modern" and Hebrew pronunciation as "israeli"

  Scenario: The Hebrew voice, speed and keyboard rows show while Hebrew is at Curious or above
    Given Lampas is opened with the Greek dial at 0 and the Hebrew dial at 1
    When he taps the gear in the reader's header
    Then Listening has the Hebrew voice and the Hebrew speed, and no Greek voice or Greek speed
    And Daily has the Hebrew keyboard, and no Greek keyboard

  Scenario: Neither language's voice, speed or keyboard rows show at English only
    Given Lampas is opened with the Greek dial at 0 and the Hebrew dial at 0
    When he taps the gear in the reader's header
    Then Listening has neither the Hebrew nor the Greek voice or speed, nor a Pronunciation row
    And Daily has neither the Hebrew nor the Greek keyboard
