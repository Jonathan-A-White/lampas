Feature: The grammar ladder
  The Governor wants to be taken "all the way down to alphabet and it's pronunciation" and tested "on the grammar required".
  The ladder is the one ordered list of grammar ideas, easy first, each an item the spaced schedule can drill; every
  parsing code of the New Testament names the ideas a word needs. It is a list, not a screen (src/data/grammar/ladder.ts,
  docs/grammar.md); the rungs and tiers are PROVISIONAL.

  Scenario: The ladder starts at the alphabet and its pronunciation
    Given the grammar ladder
    Then its first idea is "The Greek alphabet"
    And the next 24 ideas are the letters, from alpha to omega
    And the letter "Alpha" has the glyphs "α" and "Α" and the sound "a"
    And the sounds, the marks and then the nouns come after the letters

  Scenario: The perfect tense sits above the present
    Given the grammar ladder
    Then "The perfect tense" sits above "The present tense"
    And "The pluperfect tense" sits above "The perfect tense"

  Scenario: A word's parsing names the ideas it needs
    Given the parsing code "V-2RAI-1P-ATT"
    Then it needs "The perfect tense", "The active voice" and "The plural"
    And it needs nothing from the nouns tier
    And the parsing code "PREP" needs only "The preposition"
