Feature: The Quick test asks the dictionary form
  A word is learned and quizzed in its dictionary form (the lemma). The big Greek word of every Quick test question
  is the lemma, never the inflected form the open chapter happens to use. Once he has answered, the chapter's form
  shows beneath in small grey ("in Romans 8:28 as ἀγαπῶσιν"); that line is PROVISIONAL. Hold to hear says the lemma.

  Scenario: Every question asks the lemma, even for a word whose chapter form differs
    Given Lampas is opened with Romans 8 and the Quick test is on its first question
    Then the prompt of every question of the round is the word's lemma
    And at least one word of the round has a different form in Romans 8

  Scenario: The same lemmas are asked whether or not the chapter loads
    Given Lampas is opened with Romans 8 and the Quick test is on its first question
    When the prompts of the round are noted
    And Lampas is opened with no chapter and the Quick test is on its first question
    Then the prompts of the round are the same as before

  Scenario: The chapter's form shows small beneath only after the answer
    Given Lampas is opened with Romans 8 and a question whose chapter form differs from its lemma
    Then no chapter form is shown
    When he taps the right gloss
    Then the chapter form is shown small and grey as "in Romans 8" followed by the form
    And the prompt is still the lemma

  Scenario: Hold to hear says the lemma
    Given Lampas is opened with Romans 8 and a question whose chapter form differs from its lemma
    When he holds "Hold to hear" for a moment
    Then the phone is told to speak the lemma with lang "el-GR"
