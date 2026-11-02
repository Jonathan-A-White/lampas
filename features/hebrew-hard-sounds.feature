@uc-sound-lessons @hebrew
Feature: Hebrew hard sounds, optional lessons on the sounds his English makes hard
  The Goal screen (Learn) has a section "Hard sounds of Hebrew (optional)" below the main path while his Hebrew dial is above 0 (mw-5r3p30.912, PROVISIONAL until the Governor confirms),
  as "Hard sounds (optional)" is Greek's. It lists the Hebrew lessons written for his English accent, each Not yet or Done: one a sound, chet, ayin, resh and tsade, taught on the Israeli
  pronunciation. A lesson is the Greek one over Hebrew: why it is hard for you, start from a sound you know, hear it, tell them apart (the pair drill "Which did you hear?"), try it
  (hold to say a word, then hear the Hebrew voice) and the same Done. The words are drawn right to left in the Hebrew face and said in the Hebrew voice. Nothing pushes them.

  Scenario: The Goal lists the Hebrew hard sounds for his accent and opens one
    Given Lampas is opened on the Goal screen with his Hebrew dial at "Learning"
    Then the Goal screen has a "Hard sounds of Hebrew (optional)" section below "See the whole path"
    And it lists every Hebrew lesson written for an American ear, each "Not yet"
    And the Greek "Hard sounds (optional)" section lists none of them
    When he opens the lesson "Saying the chet" from the Hebrew section
    Then the lesson shows "Step 1 of 5" and the heading "Why it is hard for you"
    And the lesson shows no IPA
    When he taps "Next" until the last step
    Then each step showed its heading in turn: "Start from a sound you know", "Hear it", "Which did you hear?", "Try it"

  Scenario: The Hebrew section is for a reader of Hebrew
    Given Lampas is opened on the Goal screen with his Hebrew dial at "Just English"
    Then the Goal screen has no "Hard sounds of Hebrew (optional)" section

  Scenario: A British ear gets the Hebrew lessons written for it
    Given Lampas is opened on the Goal screen with his Hebrew dial at "Learning" and the accent "british"
    Then it lists every Hebrew lesson written for a British ear, each "Not yet"

  Scenario: A Hebrew word in a lesson is drawn right to left and said in the Hebrew voice
    Given Lampas is opened on the Goal screen with his Hebrew dial at "Learning"
    When he opens the lesson "Saying the resh" from the Hebrew section
    And he goes on to the step "Hear it"
    Then every word is drawn right to left in Hebrew
    When he taps "Hear" on the first word
    Then the Hebrew voice is handed that word

  Scenario: The pair drill says a Hebrew word and asks which of the pair it was
    Given Lampas is opened on the Goal screen with his Hebrew dial at "Learning"
    When he opens the lesson "Saying the tsade" from the Hebrew section
    And he goes on to the step "Which did you hear?"
    And he taps "Start the drill"
    Then the Hebrew voice is handed the word of the first round
    And he chooses the word that was said and it says "Right"
    When he goes through the rounds to "See my score"
    Then the score shows "You got 10 of 10"

  Scenario: Done marks a Hebrew lesson Done
    Given Lampas is opened on the Goal screen with his Hebrew dial at "Learning"
    When he opens the lesson "Saying the ayin" from the Hebrew section
    And he goes on to the end and taps "Done"
    Then the Goal screen shows again
    And the Hebrew lesson "Saying the ayin" is "Done" in the section

  Scenario: A Hebrew letter sheet links to its lesson, and Back returns to the sheet
    Given Hebrew is the only language chosen, his Hebrew dial is at "Learning" and the Goal screen is open
    When he opens the sheet of the Hebrew letter "Ayin"
    Then the sheet shows "Learn to say the ayin (optional)"
    When he taps "Learn to say the ayin (optional)" on the sheet
    Then the Hebrew lesson "Saying the ayin" shows "Step 1 of 5"
    When he goes Back
    Then the sheet "Ayin" is on screen over the Goal screen

  Scenario Outline: The letter sheets of chet, resh and tsade open their lessons
    Given Hebrew is the only language chosen, his Hebrew dial is at "Learning" and the Goal screen is open
    When he opens the sheet of the Hebrew letter <letter>
    And he taps <link> on the sheet
    Then the Hebrew lesson <lesson> shows "Step 1 of 5"

    Examples:
      | letter | link                              | lesson          |
      | Chet   | Learn to say the chet (optional)  | Saying the chet  |
      | Resh   | Learn to say the resh (optional)  | Saying the resh  |
      | Tsade  | Learn to say the tsade (optional) | Saying the tsade |

  Scenario: A Hebrew letter sheet with no lesson has no link
    Given Hebrew is the only language chosen, his Hebrew dial is at "Learning" and the Goal screen is open
    When he opens the sheet of the Hebrew letter "Alef"
    Then the sheet does not show "Learn to say it (optional)"
    And the sheet shows no link to a lesson
