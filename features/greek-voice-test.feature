@uc-voice-test @uc-voice-settings @greek
Feature: Hear and switch the Greek voice from Settings
  His phone said πατήρ alone as 'PA-teer' (mw-5r3p30.357). Settings > Reading voices names the Greek voice the Greek is said in now, the one he
  picked or the phone's own pick, and its Test says πατήρ, then ἀγάπη, as Tap to hear says a word: stressed on the last syllable, then on the one
  before it, so he hears where his voice puts the stress. Another Greek voice picked there is kept and is the voice of every Greek word.

  Scenario: Settings names the Greek voice in use, and Test says πατήρ, then ἀγάπη in it
    Given Lampas is opened on a phone with two Greek voices
    When he opens Settings
    Then Reading voices says the Greek voice in use is "Greek (Greece)"
    When he taps Test under the Greek voice
    Then the voice "Greek (Greece)" says "πατήρ!", then "αγάπη!", in lang "el-GR"
    And Test reads Stop while it speaks

  Scenario: A second tap on Test stops it
    Given Lampas is opened on a phone with two Greek voices
    When he opens Settings
    And he taps Test under the Greek voice
    And he taps Stop under the Greek voice
    Then nothing is being said
    And Test reads Test again

  Scenario: Another Greek voice picked there is kept and said everywhere
    Given Lampas is opened on a phone with two Greek voices
    When he opens Settings
    And he picks the Greek voice "Greek (Cyprus)"
    Then Reading voices says the Greek voice in use is "Greek (Cyprus)"
    When he taps Test under the Greek voice
    Then the voice "Greek (Cyprus)" says "πατήρ!", then "αγάπη!", in lang "el-GR"
    When Lampas is reopened at the Settings address
    Then Reading voices still says the Greek voice in use is "Greek (Cyprus)"
    When he opens the Quick test and taps "Tap to hear"
    Then the word of the question is said by the voice "Greek (Cyprus)"

  Scenario: A phone with no Greek voice is told where to get one, and has no Test
    Given Lampas is opened on a phone with only an English voice
    When he opens Settings
    Then Reading voices says there is no Greek voice and where to get one
    And there is no Test under the Greek voice
