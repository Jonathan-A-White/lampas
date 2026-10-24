Feature: The text a verse is memorized in
  Lampas helps him memorize verses. Before anything is asked of him, the app knows exactly which words make up a verse in the language he chooses:
  English, Greek, or the weave as it stands for him now, with the Greek of the words he has learned. The Old Testament has no text in Lampas yet.

  Scenario: A verse in English
    Given the verse "Rom.8.28"
    When it is memorized in English
    Then every word is English
    And the first word is "And" and the rest read "we know that all things work together for the good of those who love Him, who are called according to His purpose."

  Scenario: A verse in Greek
    Given the verse "Rom.8.28"
    When it is memorized in Greek
    Then every word is Greek
    And what is said begins "Οἴδαμεν δὲ ὅτι τοῖς ἀγαπῶσιν"

  Scenario: A verse half woven
    Given the verse "Rom.8.28"
    And his solid words are "εἴδω" and "ἀγαπάω"
    When it is memorized woven
    Then "Οἴδαμεν" and "ἀγαπῶσιν" are Greek and every other word is English
    And the first three words are "And", "Οἴδαμεν" and "that"

  Scenario: An Old Testament verse has no text
    Given the verse "Ps.62.1-2"
    When it is memorized in English
    Then it is said that there is no text for it
