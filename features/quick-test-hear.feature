@uc-quick-test @greek
Feature: Tap to hear the word on the Quick test
  Under the Greek word of a Quick test question sits a wide bar, "Tap to hear". One tap says the word in Greek, the
  way a tap or a long press on a word of the reader does, and it plays to its end with no finger kept down. A second
  tap while it speaks stops it. Holding the bar is no different from a tap. The four glosses stay tappable.

  Scenario: Tapping the bar says the word once
    Given Lampas is opened with a Greek voice and the Quick test is on its first question
    When he taps "Tap to hear"
    Then the phone is told to speak the word of the question with lang "el-GR"
    And the word is being spoken

  Scenario: The word plays on with no finger down
    Given Lampas is opened with a Greek voice and the Quick test is on its first question
    When he taps "Tap to hear"
    And the word has been spoken to its end
    Then the word was spoken once and never cancelled

  Scenario: A second tap while it speaks stops it
    Given Lampas is opened with a Greek voice and the Quick test is on its first question
    When he taps "Tap to hear"
    And he taps "Tap to hear"
    Then the speech is stopped

  Scenario: No screen of the Quick test says Hold to hear
    Given Lampas is opened with a Greek voice and the Quick test is on its first question
    Then no button is named "Hold to hear"

  Scenario: The glosses can still be tapped after hearing the word
    Given Lampas is opened with a Greek voice and the Quick test is on its first question
    When he taps "Tap to hear"
    And he taps the right gloss
    Then the tapped gloss is green and he can go on

  Scenario: With no Greek voice a tap shows the help instead of speaking
    Given Lampas is opened with only an English voice and the Quick test is on its first question
    When he taps "Tap to hear"
    Then nothing is spoken
    And the notice "No Greek voice" is shown
