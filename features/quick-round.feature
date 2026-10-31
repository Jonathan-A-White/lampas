@uc-placement @greek
Feature: The placement probes the letters and sounds one by one
  The Governor: "The test should have probed more to where it knows what I know and what not. And can fill in specific gaps (maybe some letter sounds
  are hard for me, or letter combinations...)". When the placement walk reaches the letters, sounds and marks (or has nothing above to ask, as when he
  places himself again) it ends in a quick round: one tap on each letter, diphthong, consonant pair and breathing that is not solid yet. Hear and pick
  says it and he taps it; See and pick shows it and he taps its sound. Each answer gives that item its own level; Stop here keeps what was answered.
  The end card and the Goal screen's Learn next name the exact gaps, and Review asks them first. The rules are PROVISIONAL (src/data/grammar/quickRound.ts).

  Scenario: The quick round asks only the letters and combinations that are not solid, and each answer writes its own level
    Given his goal is "Read 1 John 1:1" and his grammar is known except "ξ, ψ, ου"
    When he opens the placement
    And he starts the placement
    Then the quick round says "Quick round 1 of 3"
    When he answers the quick round right, right and wrong
    Then the item "ξ" is solid from the placement
    And the item "ψ" is solid from the placement
    And the item "ου" is not yet from the placement
    And the end card names the gaps "ου"

  Scenario: Stop here keeps what was answered
    Given his goal is "Read 1 John 1:1" and his grammar is known except "ξ, ψ, ου"
    When he opens the placement
    And he starts the placement
    And he answers the quick round right
    And he taps "Stop here"
    Then the item "ξ" is solid from the placement
    And the item "ψ" has no level
    And the item "ου" also has no level
    And the end card names the gaps "ψ and ου"

  Scenario: A second tap on Next does not stop the quick round
    The Tester (mw-hqd5bz.26): the control that moves up under the second finger of a double tap on Next is not tapped in the card's settling moment.

    Given his goal is "Read 1 John 1:1" and his grammar is known except "ξ, ψ, ου"
    When he opens the placement
    And he starts the placement
    And he answers the quick round right and taps Next and at once "Stop here"
    Then the quick round says "Quick round 2 of 3"
    When he reads the question for a moment
    And he taps "Stop here"
    Then the item "ψ" has no level
    And the end card names the gaps "ψ and ου"

  Scenario: Hear and pick says the sound and See and pick shows it
    Given his goal is "Read 1 John 1:1" and his grammar is known except "ξ, ψ, ου"
    When he opens the placement
    And he starts the placement
    And he answers every question of the quick round right
    Then each Hear and pick question was said in Greek, and each See and pick question showed its letter or pair
    And the item "ου" is solid from the placement

  Scenario: The end card, Learn next and Review name the gaps
    Given his goal is "Read 1 John 1:1" and his grammar is known except "ξ, ψ, ου"
    When he opens the placement
    And he starts the placement
    And he answers the quick round wrong, wrong and wrong
    Then the end card names the gaps "ξ, ψ and ου"
    When he taps "Back to the goal"
    Then Learn next says "ξ, ψ and ου"
    And Review's next grammar questions are on "letter-xi, letter-psi, diphthong-ou"

  Scenario: Review asks the gaps nobody has asked yet before any word
    Given his goal is "Read 1 John 1:1" and his grammar is known except "ξ, ψ, ου"
    Then Review's first grammar questions are on "letter-xi, letter-psi, diphthong-ou"
    And no word is asked before them

  Scenario: Review asks a missed gap and the never-asked ones in the order the end card names them
    Given his goal is "Read 1 John 1:1" and his grammar is known except "ξ, ψ, ου"
    When he gets "ξ" wrong in Review
    Then Review's first grammar questions are on "letter-xi, letter-psi, diphthong-ou"
    And no word is asked before them

  Scenario: Learn next names a gap that is not a letter, though no letter is known yet
    The Tester (mw-hqd5bz.28): the end card said "Gaps to work on: rough breathing", Learn next said "The Greek alphabet", and Review asked the breathing first.

    Given his goal is "Read 1 John 1:1", no letter is known, and his grammar is known except "rough breathing"
    When he opens the Goal screen
    Then Learn next says "rough breathing"
    And Review's first grammar questions are on "breathing-rough"

  Scenario: Learn next names the same gaps as the end card, letters first and a mark last
    Given his goal is "Read 1 John 1:1" and his grammar is known except "ξ, ψ, ου, rough breathing"
    When he opens the placement
    And he starts the placement
    And he answers the quick round wrong, wrong, wrong and wrong
    Then the end card names the gaps "ξ, ψ, ου and rough breathing"
    When he taps "Back to the goal"
    Then Learn next says "ξ, ψ, ου and rough breathing"
    And Review's first grammar questions are on "letter-xi, letter-psi, diphthong-ou, breathing-rough"

  Scenario: With no goal set, the Goal screen still names the gaps under Learn next
    Given no goal is set and his grammar is known except "ξ, ψ, ου"
    When he opens the Goal screen
    Then the Goal screen says "No goal yet"
    And Learn next says "ξ, ψ and ου"
    When he taps Learn next
    Then the idea sheet is open
