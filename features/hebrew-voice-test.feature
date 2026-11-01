@uc-voice-test @hebrew
Feature: Hear and switch the Hebrew voice from Settings
  As for Greek (features/greek-voice-test.feature), Settings > Listening names the Hebrew voice the Hebrew is said in now, the one he picked or the phone's
  own pick, and its Test says שָׁלוֹם, stressed on the last syllable, as Tap to hear says a Hebrew word, so he hears where his voice puts the stress. Another
  Hebrew voice picked there is kept. A phone with no Hebrew voice is told so and has no Test.

  Scenario: Test under the Hebrew voice says a Hebrew word in the voice in use
    Given Lampas is opened with the Hebrew dial at All in on a phone with two Hebrew voices
    When he opens Settings
    Then Listening says the Hebrew voice in use is "Hebrew (Israel)"
    When he taps Test under the Hebrew voice
    Then the voice "Hebrew (Israel)" says "שָׁלוֹם", in lang "he-IL"
    And Test reads Stop while it speaks
    When he taps Stop under the Hebrew voice
    Then nothing is being said

  Scenario: Another Hebrew voice picked there is kept and Test says the word in it
    Given Lampas is opened with the Hebrew dial at All in on a phone with two Hebrew voices
    When he opens Settings
    And he picks the Hebrew voice "Hebrew (Alternate)"
    Then Listening says the Hebrew voice in use is "Hebrew (Alternate)"
    When he taps Test under the Hebrew voice
    Then the voice "Hebrew (Alternate)" says "שָׁלוֹם", in lang "he-IL"

  Scenario: A phone with no Hebrew voice is told so, and has no Test
    Given Lampas is opened with the Hebrew dial at All in on a phone with only an English voice
    When he opens Settings
    Then Listening says there is no Hebrew voice on this phone
    And there is no Test under the Hebrew voice
