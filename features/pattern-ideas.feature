@uc-grammar-ladder @greek
Feature: Pattern ideas: how a form is built
  The ladder has ideas for how a Greek form is built (src/data/grammar/ladder.ts: a word as a stem and an ending, a dictionary entry,
  the three declensions, the augment, tense signs, reduplication, principal parts, contract verbs, -μι verbs, εἰμί and οἶδα). A word's
  pattern ideas are read off its dictionary form and its code (src/data/grammar/patterns.ts patternsOf), so a goal passage needs them like
  any idea: the Goal screen lists them and the idea sheet of one shows words of the passage that use it (docs/grammar.md 'Patterns').

  Scenario: A passage needs the patterns its words use
    Given the goal is "1 John 1" and he knows no word and no idea
    When he opens the Goal screen
    And he taps the ideas bar
    Then the ideas list has "The verb εἰμί", "The augment" and "The third declension"
    And the passage needs count "eimi", "augment" and "declension-3" with an example from 1 John 1
    When he taps the idea "The augment" in the ideas list
    Then the idea sheet is open on "The augment"
    And the idea sheet of the augment shows up to three examples from "1 John 1"
