Feature: A one-time tip says a word can be held to hear it
  A long press on a word says it, but nothing on the screen says so. The first time he taps a word, its sheet carries a tip,
  "Long-press a word to hear it", with one button, Got it. Got it dismisses the tip for good: it is kept on the phone, so it is
  not shown again, not on another word, not when Lampas is opened again. Closing the sheet without Got it keeps the tip for the
  next tap. The list of tips and the rule "shown until dismissed" are bsv-kit's (bsv-kit/tips); Lampas draws the tip and keeps
  the dismissals in the phone's localStorage.

  Scenario: The first tap on a word shows the tip
    Given Lampas is opened on Romans 8 and no tip has been dismissed
    When he taps the word "Therefore" in verse 1
    Then the word sheet shows the tip "Long-press a word to hear it" with a Got it button

  Scenario: Got it dismisses the tip for good, across a close and across a new opening
    Given Lampas is opened on Romans 8 and no tip has been dismissed
    When he taps the word "Therefore" in verse 1
    And he taps Got it on the tip
    Then the word sheet shows no tip
    When he closes the word sheet and taps the word "no" in verse 1
    Then the word sheet still shows no tip
    When Lampas is opened again
    And he then taps the word "Therefore" in verse 1
    Then the word sheet shows no tip once more

  Scenario: Closing the sheet without Got it keeps the tip for the next tap
    Given Lampas is opened on Romans 8 and no tip has been dismissed
    When he taps the word "Therefore" in verse 1
    And he closes the word sheet and taps the word "no" in verse 1
    Then the word sheet shows the tip "Long-press a word to hear it" with a Got it button
