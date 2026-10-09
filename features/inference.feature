Feature: What my right answers show
  The Governor (Postern, 2026-10-09): "I got some things right, can it infer that I know the alphabet? It will learn more as I try to
  read. The test should have probed more to where it knows what I know and what not. And can fill in specific gaps (maybe some letter
  sounds are hard for me, or letter combinations...)". A Greek form he reads right shows he knows the letters, sounds and marks it is
  spelt with: three right uses and no miss make a letter, a pair or a mark solid (inferred), the alphabet is solid when all 24 letters
  are, and Learn next names the weak letters, not the whole alphabet. The rules are PROVISIONAL (src/data/grammar/inference.ts,
  docs/grammar.md 'Placement').

  Scenario: A placement that reads right credits the letters its forms use
    Given his goal is "Read 1 John 1:1" and he knows nothing yet
    When he opens the placement
    And he starts the placement
    And he answers 8 questions right
    And he answers 2 questions wrong
    Then the letter "letter-omicron" is solid, inferred from his answers
    And the placement did not ask the letter "letter-omicron"
    And the letter "letter-xi" has no level
    When he opens the Goal screen
    Then Learn next does not say "The Greek alphabet"
    And Learn next names the letters that are not solid

  Scenario: Learn next names the weak letters, not the alphabet
    Given the goal is "Read 1 John 1:1" and he knows no word and no idea
    And all the letters are solid but ξ and ψ
    When he opens the Goal screen
    Then Learn next says "Learn next: ξ and ψ · The Greek letters"
    And the idea "alphabet" is not solid

  Scenario: With all 24 letters solid the alphabet is solid
    Given the goal is "Read 1 John 1:1" and he knows no word and no idea
    And all the letters are solid but ξ and ψ
    When he makes the letters ξ and ψ solid
    Then the idea "alphabet" is solid, inferred from his answers
    When he opens the Goal screen
    Then Learn next says "Learn next: Breathing marks · Marks over the letters"

  Scenario: Right answers in Review after the placement move a foundation idea to solid
    Given the goal is "Read 1 John 1:1" and he knows no word and no idea
    And the placement left "accents" not yet
    And 3 of his words are due
    When he opens Review and starts
    And he answers 3 questions right
    Then the idea "accents" is solid, inferred from his answers
    When he opens the Goal screen
    Then the grammar bar says solid 1, frontier 0 and not yet 29
