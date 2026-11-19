@uc-word-sheet @uc-tutor-word @greek
Feature: The word sheet adds the word to his words with the tutor's own control
  The word sheet carries the same Add to my words button the tutor draws under an explained word (src/AddWordButton.tsx, one component for both, mw-5r3p30.1203):
  the same look, the same labels (Add to my words, then On my list, disabled once listed), the same write path (the tutor's add-word command) and the same line for a word Lampas
  only guessed. It sits on the Greek card and on the Hebrew card, and what it adds is a word he is learning, which the Goal screen counts as Frontier.
  (A guessed Septuagint word is features/septuagint.feature's.)

  Scenario: A word he has not learned is added from its sheet and the Goal screen counts it as Frontier
    Given Lampas is opened on 1 John 1 with the goal "1 John 1:1" and no word on his list
    When he taps the word "ἀρχῆς" of verse 1
    Then the word sheet has the button "Add to my words"
    When he taps "Add to my words" on the word sheet
    Then the word sheet's button reads "On my list" and is disabled
    And "ἀρχή" is on his list as a word he is learning
    When he opens the Goal screen
    Then the words bar says Frontier 1

  Scenario: A word already on his list reads On my list at once
    Given Lampas is opened on 1 John 1 with the goal "1 John 1:1" and "ἀρχή" on his list
    When he taps the word "ἀρχῆς" of verse 1
    Then the word sheet's button reads "On my list" and is disabled

  @hebrew
  Scenario: A Hebrew word is added under its language
    Given Lampas is opened on Genesis 1 with the goal "1 John 1:1" and no word on his list
    When he taps the word "בְּרֵאשִׁ֖ית" of verse 1
    And he taps "Add to my words" on the word sheet
    Then the word sheet's button reads "On my list" and is disabled
    And "רֵאשִׁית" is on his list as a Hebrew word he is learning
