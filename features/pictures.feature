Feature: Memory pictures
  A word that has a small picture shows it on its card in Words and beside the word in the quick test, to
  help it stick. A word with no picture shows none, and nothing else changes.

  Scenario: A word with a picture shows it on its Words card
    Given Lampas is opened for the first time
    When he opens Words
    Then the card for "ἀγαπάω" shows a picture
    And that picture has no alt text, the gloss being on the card already

  Scenario: A word with no picture shows none on its Words card
    Given Lampas is opened for the first time
    When he opens Words
    Then the card for "γάρ" shows no picture
    And the card for "γάρ" still shows its gloss and state

  Scenario: A word with a picture shows it in the quick test
    Given Lampas holds only the word "ἀγαπάω"
    When he opens the Quick test
    Then the question shows a picture beside the word

  Scenario: A word with no picture shows none in the quick test
    Given Lampas holds only the word "ἀνάστασις"
    When he opens the Quick test
    Then the question shows no picture
    And he can still answer the question
