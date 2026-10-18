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
    Then the question line says "Question 1 · the noun · Lampas ladder L4"

  Scenario: When I miss the easy things it goes easier, down to the letters and marks of the words I missed
    Given his goal is "Read 1 John 1:1" and he knows nothing yet
    When he opens the placement
    And he starts the placement
    And he answers 8 questions wrong
    Then the question line says "Question 9 · Alpha · Lampas ladder L1"
    And the idea "noun" is not yet
    And the idea "accents" is the frontier, the lowest idea he has not proved
    And the alphabet as a whole was not asked

  Scenario: It does not ask the harder things after that
    Given his goal is "Read 1 John 1:1" and he knows nothing yet
    When he opens the placement
    And he starts the placement
    And he answers 4 questions wrong
    And he answers 2 questions right
    Then no idea after the noun has a level
    And the idea "letter-chi" is solid

  Scenario: The end card says where I am
    Given his goal is "Read 1 John 1:1" and he knows nothing yet
    When he opens the placement
    And he starts the placement
    And he answers 8 questions right
    And he answers 2 questions wrong
    Then the question line says "Quick round 1 of"
    When he stops the quick round
    Then the end card says "Where you are: solid 11, frontier 0, not yet 1; untested 42"
    And the end card lists "The noun" as "Solid" under Nouns
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

  Scenario: A paused placement has the way back to the goal, and the Goal screen shows the new answers
    Given his goal is "Read 1 John 1:1" and he knows nothing yet
    When he opens the Goal screen
    And he taps "Place me"
    And he starts the placement
    And he answers 20 questions right
    Then it says "Paused after 20 questions"
    When he taps "Back to the goal"
    Then the Goal screen is open
    And the Goal screen counts some solid ideas

  Scenario: Go on another day returns to the Goal screen when the placement was started there
    Given his goal is "Read 1 John 1:1" and he knows nothing yet
    When he opens the Goal screen
    And he taps "Place me"
    And he starts the placement
    And he answers 20 questions right
    Then it says "Paused after 20 questions"
    When he taps "Go on another day"
    Then the Goal screen is open

  Scenario: Go on another day returns to Settings when the placement was started there
    Given his goal is "Read 1 John 1:1" and he knows nothing yet
    When he opens Settings
    And he taps "Place me"
    And he starts the placement
    And he answers 20 questions right
    Then it says "Paused after 20 questions"
    When he taps "Go on another day"
    Then Settings is open

  Scenario: The intro says plainly what Start from the letters is
    Given his goal is "Read 1 John 1:1" and he knows nothing yet
    When he opens the placement
    Then the screen offers "Start from the letters"
    And the intro line says "Start from the letters is for someone who cannot yet read Greek: no quiz, and Learn next begins with The Greek alphabet"
    And the intro line also says "Start is a quiz of the grammar your goal needs"

  Scenario: The intro with kept answers has no line about Start from the letters
    Given his goal is "Read 1 John 1:1" and he knows nothing yet
    When he opens the placement
    And he starts the placement
    And he answers 3 questions right
    And Lampas is closed and opened again
    Then the screen offers "Go on"
    And the intro has no line about Start from the letters

  Scenario: A total beginner starts from the letters
    Given his goal is "Read 1 John 1:1" and he knows nothing yet
    When he opens the placement
    Then the screen offers "Start from the letters"
    When he taps "Start from the letters"
    Then the end card says "Where you are: solid 0, frontier 0, not yet 0"
    And no idea has a level
    And the placement is no longer kept
    And the screen says he starts with "The Greek alphabet"
    When he goes back to the goal
    Then Learn next says "The Greek alphabet"

  Scenario: Start from the letters keeps the progress he has and the card says so
    Given his goal is "Read 1 John 1:1" and he knows nothing yet
    And he has marked "The Greek alphabet" as I know this
    When he opens the placement
    Then the screen offers "Start from the letters"
    When he taps "Start from the letters"
    Then the end card says "Where you are: solid 1, frontier 0, not yet 0; untested 48"
    And the screen says he has "The Greek alphabet" solid and Learn next opens "Pairs of vowels"
    And no stored level changed
    And the placement is no longer kept
    When he goes back to the goal
    Then Learn next says "Pairs of vowels"
    And the Goal screen counts the grammar ideas as the card did

  Scenario: Start from the letters counts what the Goal counts once single letters are solid
    Given his goal is "Read 1 John 1:1" and he knows nothing yet
    And he has marked the letters "Alpha" and "Beta" as I know this
    When he opens the placement
    Then the screen offers "Start from the letters"
    When he taps "Start from the letters"
    Then the end card says "Where you are: solid 0, frontier 0, not yet 0"
    And the screen says he has "Alpha, Beta" solid and Learn next opens "γ, δ, ε, ζ, η, θ and 16 more letters"
    When he goes back to the goal
    Then the Goal screen counts the grammar ideas as the card did

  Scenario: Start from the letters when every idea is solid says nothing is left for Learn next
    Given his goal is "Read 1 John 1:1" and he knows nothing yet
    And he has marked every idea as I know this
    And he has passed every passage lesson
    When he opens the placement
    Then the screen offers "Start from the letters"
    When he taps "Start from the letters"
    Then the card says nothing is left for Learn next and does not name The Greek alphabet
    And the card names three solid ideas and counts the rest
    When he goes back to the goal
    Then the Goal screen has no Learn next

  Scenario: Start from the letters when every idea is solid and a passage lesson is not passed opens the passage
    Given his goal is "Read 1 John 1:1" and he knows nothing yet
    And he has marked every idea as I know this
    When he opens the placement
    Then the screen offers "Start from the letters"
    When he taps "Start from the letters"
    Then the card says Learn next opens "Read 1 John 1:1-4"
    When he goes back to the goal
    Then Learn next says "Read 1 John 1:1-4"

  Scenario: A total beginner's placement gives no idea a level, with his word list already on the schedule
    Given his goal is "Read 1 John 1:1" and he knows nothing yet
    And his word list is already on the schedule
    When he opens the placement
    Then the screen offers "Start from the letters"
    When he taps "Start from the letters"
    Then the end card says "Where you are: solid 0, frontier 0, not yet 0"
    And no idea has a level

  Scenario: The end card of Start from the letters comes back after a reload, and Back from the Goal returns to it
    Given his goal is "Read 1 John 1:1" and he knows nothing yet
    When he opens the Goal screen
    And he taps "Place me"
    And he starts from the letters
    Then the end card says "Where you are: solid 0, frontier 0, not yet 0"
    And the screen says he starts with "The Greek alphabet"
    When the page is reloaded
    Then the end card still says "Where you are: solid 0, frontier 0, not yet 0"
    And the card still says he starts with "The Greek alphabet"
    When he goes back to the goal
    And he presses the phone's Back
    Then the card says once more he starts with "The Greek alphabet"
    When he goes back to the goal again
    And he places himself again from the Goal screen
    Then the intro offers "Start from the letters"

  Scenario: The end card of a walk comes back after a reload
    Given his goal is "Read 1 John 1:1" and he knows nothing yet
    When he opens the placement
    And he starts the placement
    And he answers 8 questions right
    And he answers 2 questions wrong
    Then the question line says "Quick round 1 of"
    When he stops the quick round
    Then the end card says "Where you are: solid 11, frontier 0, not yet 1; untested 42"
    When the page is reloaded
    Then the end card still says "Where you are: solid 11, frontier 0, not yet 1; untested 42"
    And the end card lists "The noun" as "Solid" under Nouns
    And the placement is no longer kept
