Feature: Test me on the grammar, and meet me where I am
  The Governor: "Test me on the grammar required (in a wise way) to see where I'm at. If I'm struggling on easy things, no need to test
  harder things. In fact, keep going easier (all the way down to alphabet and it's pronunciation)." The placement (#/placement, opened
  by Place me in Settings > Goal) asks two questions an idea on the grammar his goal needs, in the order of the approach he chose; it
  goes easier when he misses, stops asking harder things, writes a level for every idea it asked and ends on Where you are. The rules
  are PROVISIONAL (src/data/grammar/placement.ts). Twenty questions make a sitting; a paused one goes on another day.

  Scenario: The test starts on the grammar 1 John 1:1 needs, in the order of my approach
    Given his goal is "Read 1 John 1:1" and he knows nothing yet
    When he opens the placement
    Then it says "Placement: Read 1 John 1:1"
    When he starts the placement
    Then the question line says "Question 1 · the noun · BMA Tutor L1"

  Scenario: When I miss the easy things it goes easier, down to the letters
    Given his goal is "Read 1 John 1:1" and he knows nothing yet
    When he opens the placement
    And he starts the placement
    And he answers 16 questions wrong
    Then the question line says "Question 17 · Omega · BMA Tutor L1"
    And the idea "noun" is not yet
    And the idea "punctuation" is also not yet

  Scenario: It does not ask the harder things after that
    Given his goal is "Read 1 John 1:1" and he knows nothing yet
    When he opens the placement
    And he starts the placement
    And he answers 4 questions wrong
    And he answers 2 questions right
    Then no idea after the noun has a level
    And the idea "iota-subscript" is solid

  Scenario: The end card says where I am
    Given his goal is "Read 1 John 1:1" and he knows nothing yet
    When he opens the placement
    And he starts the placement
    And he answers 4 questions wrong
    And he answers 2 questions right
    Then the end card says "Where you are: solid 1, frontier 0, not yet 2; untested"
    And the end card lists "The noun" as "Not yet" under Nouns
    And the bus has heard the placement is done
    When he taps "Back to the goal"
    Then the Goal screen is open

  Scenario: Place me in Settings opens it
    Given his goal is "Read 1 John 1:1" and he knows nothing yet
    When he opens Settings
    And he taps "Place me"
    Then it says "Placement: Read 1 John 1:1"

  Scenario: A paused placement goes on tomorrow
    Given his goal is "Read 1 John 1:1" and he knows nothing yet
    When he opens the placement
    And he starts the placement
    And he answers 20 questions right
    Then it says "Paused after 20 questions"
    When he comes back tomorrow
    Then the screen offers "20 questions answered so far"
    When he taps "Go on"
    Then the question line says "Question 21"

  Scenario: Placement is remembered across a reopen
    Given his goal is "Read 1 John 1:1" and he knows nothing yet
    When he opens the placement
    And he starts the placement
    And he answers 3 questions right
    And Lampas is closed and opened again
    Then it says "Placement: Read 1 John 1:1"
    And the screen offers "3 questions answered so far"
