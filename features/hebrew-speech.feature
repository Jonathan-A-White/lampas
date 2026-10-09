Feature: A Hebrew word in the tutor's answer is tappable like a Greek one
  A Hebrew word in an answer of the tutor (the Talk sheet, Ask the tutor) is a button. A tap says it in the phone's Hebrew voice (he-IL)
  and opens a pronunciation guide: the word large, Hear it, and Syllables and sounds, which asks the tutor how to say it (the bible-talk
  grind's sound kind, with Hebrew syllables). The answer then carries a guide: the syllables in Hebrew letters, each over its transliteration,
  each one a button that says it. With no Hebrew voice on the phone nothing is spoken and a line says so; it never falls back to an English
  voice. speechSynthesis is the recording fake of tests/support/fake-speech.ts and the Postern is tests/support/fake-postern.ts.

  Scenario: Tapping a Hebrew word says it in the Hebrew voice and opens the guide
    Given Lampas is opened on a phone with a Hebrew voice, and the tutor's answer has the Hebrew word "צֶדֶק" in it
    When he taps the Hebrew word "צֶדֶק"
    Then the phone is told to speak "צֶדֶק" in "he-IL"
    And the phone speaks it with its Hebrew voice
    And the pronunciation guide is open on "צֶדֶק"

  Scenario: With no Hebrew voice nothing is spoken and the phone says so
    Given Lampas is opened on a phone with no Hebrew voice, and the tutor's answer has the Hebrew word "צֶדֶק" in it
    When he taps the Hebrew word "צֶדֶק"
    Then the line "No Hebrew voice on this phone" is shown
    And nothing is spoken

  Scenario: The guide shows the syllables and their transliteration
    Given Lampas is opened on a phone with a Hebrew voice, and the tutor's answer has the Hebrew word "צֶדֶק" in it
    When he taps the Hebrew word "צֶדֶק"
    And he asks the guide for the syllables and sounds
    Then the mill received a sound question about "צֶדֶק" in Hebrew
    And the answer carries a guide with the syllables "צֶ" and "דֶק" over "TSE" and "dek"
    And tapping the syllable "דֶק" speaks it in "he-IL"
