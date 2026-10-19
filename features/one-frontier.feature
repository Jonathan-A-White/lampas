Feature: One frontier idea at a time
  He learns one grammar idea at a time (mw-i7xe0n.6, PROVISIONAL, docs/grammar.md 'One idea at a time'). The idea at the frontier is the one he is
  learning now; the Goal screen names it ("Learning now: ..."). A new idea becomes Learning only when the one before is proved, or when he switches
  on the idea sheet (the old one goes back to Not yet, what he did on it is kept). The placement never leaves more than one idea at the frontier, and
  when the frontier is proved the next idea becomes the frontier by itself.

  Scenario: A placement that found three ideas at the frontier leaves one, and the Goal screen names it
    Given the goal is "1 John 1:1" and the placement found the ideas "case-genitive", "case-dative" and "noun" at the frontier
    When he opens the Goal screen
    Then the Goal screen says "Learning now: The noun" in one place
    And the grammar ideas bar says exactly one idea is at the frontier

  Scenario: Sliding a second idea to Learning asks which of the two he is learning
    Given the goal is "1 John 1:1" and he is learning "case-genitive"
    And he opens the idea sheet of "alphabet" from the Goal screen
    When he slides the level to "Learning"
    Then he is asked "You are learning The genitive case. Switch to The Greek alphabet?"
    And "case-genitive" is still the only idea at the frontier

  Scenario: Keeping the idea he is learning changes nothing
    Given the goal is "1 John 1:1" and he is learning "case-genitive"
    And he opens the idea sheet of "alphabet" from the Goal screen
    And he slides the level to "Learning"
    When he taps "Keep The genitive case"
    Then "case-genitive" is still the only idea at the frontier
    And the idea sheet's slider rests on "Not yet"

  Scenario: Switching puts the old idea back to Not yet and keeps its review
    Given the goal is "1 John 1:1" and he is learning "case-genitive"
    And he opens the idea sheet of "alphabet" from the Goal screen
    And he slides the level to "Learning"
    When he taps "Switch"
    Then "alphabet" is the only idea at the frontier
    And "case-genitive" is Not yet and its review is as it was
    And after he closes the idea sheet the Goal screen says "Learning now: The Greek alphabet" in one place

  Scenario: After Switch, the idea put back to Not yet shows on its sheet what was kept about it
    Given the goal is "1 John 1:1" and he is learning "case-genitive"
    And he opens the idea sheet of "alphabet" from the Goal screen
    And he slides the level to "Learning"
    And he taps "Switch"
    And he closes the idea sheet
    When he opens the idea sheet of "case-genitive" again from the Goal screen
    Then the idea sheet says "Not yet since today"
    And the idea sheet says what was kept: "Kept: next due tomorrow, last answered today, 1 missed"

  Scenario: Proving the idea he is learning makes the next idea the frontier
    Given the goal is "1 John 1:1" and he is learning "case-genitive"
    And he opens the idea sheet of "case-genitive" from the Goal screen
    When he taps Mark known without a drill on the idea sheet
    Then "alphabet" is the only idea at the frontier
    And after he closes the idea sheet the Goal screen says "Learning now: The Greek alphabet" in one place

  Scenario: Marking the alphabet known while it is Learning leaves one idea Learning, and none builds on a letter
    Given the goal is "1 John 1:1" and he is learning "alphabet"
    And he opens the idea sheet of "alphabet" from the Goal screen
    When he taps Mark known without a drill on the idea sheet
    Then exactly one idea is at the frontier and it is not "alphabet"
    And after he closes the idea sheet the Goal screen says "Learning now:" in one place
    And no idea sheet says it builds on a letter of the alphabet

  Scenario: When the idea builds on one that is not solid, Go to is asked first and the switch question only after Stay here
    Given the goal is "1 John 1:1" and he is learning "alphabet"
    And he opens the idea sheet of "noun" from the Goal screen
    When he slides the level to "Learning"
    Then he is asked "Go to Breathing marks first?"
    And "alphabet" is still the only idea at the frontier
    When he taps "Stay here"
    Then he is then asked "You are learning The Greek alphabet. Switch to The noun?"
    And "alphabet" still holds the frontier

  Scenario: The Greek alphabet marked known by hand while omicron is still Not yet leaves no letter for Learn next or the gaps list
    Given he marked "alphabet" known by hand while "letter-omicron" is still Not yet and the other letters are solid
    When Learn next and the gaps list are read
    Then the gaps list names no letter of the alphabet
    And Learn next names no letter of the alphabet
