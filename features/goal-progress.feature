Feature: See my goal move
  The Governor's goal ("Read 1 John 1:1") must be seen moving: "help me move frontier to solid and the next low hanging fruit to
  frontier". A strip under the Reader's header says where he stands on it; the Goal screen (#/goal) shows two bars, words and
  grammar, each cut into solid, frontier and not yet, with Place me, Learn next, Next words and Read it as the ways to move them
  (src/GoalStrip.tsx, src/GoalScreen.tsx, docs/grammar.md 'The Goal screen'). The counts are progressToward's (src/data/grammar/needs.ts).

  Scenario: With the goal 1 John 1:1 and his seed the strip reads the counts of progressToward
    Given Lampas is opened on Romans 8 with the goal "1 John 1:1" and his seed words
    Then the strip reads "Goal: 1 John 1:1" with the counts progressToward gives for his words and ideas

  Scenario: No goal, no strip
    Given Lampas is opened on Romans 8 with no goal
    Then there is no goal strip
    When he sets the goal "1 John 1:1"
    Then the goal strip appears
    When he clears the goal
    Then the goal strip is gone

  Scenario: The Goal screen's bars count solid, frontier and not yet for words and ideas
    Given the goal is "1 John 1:1" and he knows no word and no idea
    And the words "λόγος" and "ζωή" are solid and "ἀρχή" and "ἀκούω" are learning and "ὁράω" is dropped
    And the ideas "alphabet", "breathings" and "accents" are solid and "noun" is frontier
    When he opens the Goal screen
    Then the title says "Read 1 John 1:1"
    And the words bar says solid 2, frontier 2 and not yet 12
    And the ideas bar says solid 3, frontier 1 and not yet 26
    And the screen says "Solid when both are full"

  Scenario: Learn next names the earliest not-yet idea of BMA Tutor's sequence with its lesson and opens its sheet
    Given the goal is "1 John 1:1" and he knows no word and no idea
    And the ideas "alphabet", "breathings" and "accents" are solid and "noun" is not yet
    When he opens the Goal screen
    Then Learn next says "The noun · Your first words"
    When he taps Learn next
    Then the idea sheet is open on "The noun"

  Scenario: Next words lists three dictionary forms and Add makes one learning, and the words bar moves
    Given the goal is "1 John 1:1" and he knows no word and no idea
    When he opens the Goal screen
    Then Next words lists "ὅς", "ὁ" and "ἐγώ"
    And the words bar says solid 0, frontier 0 and not yet 16
    When he adds "ὅς" to his words
    Then "ὅς" is a word he is learning
    And the words bar now says solid 0, frontier 1 and not yet 15
    And Next words now lists "ὁ", "ἐγώ" and "εἰμί"

  Scenario: Got it on the idea sheet moves the ideas bar
    Given the goal is "1 John 1:1" and he knows no word and no idea
    And the ideas "alphabet", "breathings" and "accents" are solid and "noun" is not yet
    When he opens the Goal screen
    And he taps Learn next
    And he taps Got it on the idea sheet
    Then the ideas bar says solid 3, frontier 1 and not yet 26
    When he closes the idea sheet
    Then Learn next says "The article · Your first words"

  Scenario: The lists behind the bars show the items by level, and an idea opens its sheet
    Given the goal is "1 John 1:1" and he knows no word and no idea
    And the word "λόγος" is solid
    And the idea "alphabet" is solid
    When he opens the Goal screen
    And he taps the words bar
    Then the words list has "λόγος" under Solid with the meaning "word"
    And the words list has "ὅς" under Not yet
    When he taps the ideas bar
    Then the ideas list has "The Greek alphabet" under Solid
    When he taps the idea "The noun" in the ideas list
    Then the idea sheet is open on "The noun"

  Scenario: The Goal screen says when he was placed
    Given the goal is "1 John 1:1" and he knows no word and no idea
    When he opens the Goal screen
    Then the screen offers Place me and does not say he was placed
    When an idea was placed on 3 Oct 2026
    And he opens the Goal screen again
    Then the screen says "Placed on 3 Oct" and offers Place again

  Scenario: Place me opens the placement
    Given the goal is "1 John 1:1" and he knows no word and no idea
    When he opens the Goal screen
    And he taps Place me
    Then the placement screen is open

  Scenario: Read it opens the Reader on 1 John 1 with verse 1 selected
    Given the goal is "1 John 1:1" and he knows no word and no idea
    When he opens the Goal screen
    And he taps Read it
    Then the Reader is open on 1 John 1 with verse 1 selected

  Scenario: Read it on a whole book opens its first chapter
    Given the goal is "1 John" and he knows no word and no idea
    When he opens the Goal screen
    And he taps Read it
    Then the Reader is open on 1 John 1 with no verse selected

  Scenario: Change goes to the Goal in Settings and Back returns to the Reader
    Given the goal is "1 John 1:1" and he knows no word and no idea
    When he opens the Goal screen
    And he taps Change
    Then the Settings screen is open
    When he returns to the Goal screen
    And he taps the back button
    Then the Reader is open

  Scenario: Without a goal the Goal screen asks for one
    Given no goal is set and he knows no word and no idea
    When he opens the Goal screen
    Then the screen says "No goal yet"
    And there is no Read it button

  Scenario: The Goal screen is remembered across a reopen
    Given the goal is "1 John 1:1" and he knows no word and no idea
    When he opens the Goal screen
    And he closes the app and opens it again
    Then the Goal screen is open
