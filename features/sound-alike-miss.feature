Feature: A missed 'Words that sound alike' question says the words sound alike
  A question of 'Words that sound alike' (mw-86e9r1.7) asks him to hear a word and tap how it is spelt, where the pronunciation says the word and its twin
  the same (ἡμεῖς and ὑμεῖς are both ee-MEES). Missing it used to say only 'Not quite. It is λύομεν.', the line of any grammar question, when the one
  thing to learn is that the ear cannot decide and the spelling does (mw-86e9r1.44).

  Scenario: A wrong spelling says the two words sound alike and to trust the spelling
    Given a "Words that sound alike" question in Modern Greek
    When he taps a spelling that is not the answer
    Then the feedback says "Not quite." with the right spelling
    And a line under it says the two words sound alike and the spelling tells them apart

  Scenario: A right spelling has no such line
    Given a "Words that sound alike" question in Modern Greek
    When he taps the right spelling
    Then the feedback says "Right."
    And no line says the two words sound alike
