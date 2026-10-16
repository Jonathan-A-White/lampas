Feature: Say it in the letter drill
  The letter drill (features/letter-drill.feature) mixes Say it into its rounds on a phone that can hear him (mw-86e9r1.12): a letter is shown large, he
  holds the bar and says its name or its sound, and the phone's speech recognition checks it against the chosen pronunciation (src/data/grammar/sayIt.ts).
  A miss plays the right sound and shows the right answer. With no microphone to use (the permission denied, or the phone cannot turn speech into
  text) Say it is never asked, and a Say it that cannot be answered for want of the microphone is skipped and never counted against him.

  Scenario: Saying the name of the letter is right
    Given Lampas is opened on Romans 8 with the goal "1 John 1:1", a microphone that hears "beta" and a letter drill that asks "Β" as its Say it question
    When he opens the idea sheet of "alphabet" from the Goal screen
    And he slides "Your level" to "Learning"
    And he answers the questions before the Say it question right
    Then the Say it question shows "Β" and asks him to say it
    When he holds the bar until the phone has heard him and lets go
    Then Say it says he was right and what it heard was "beta"
    And "Β" is counted right in the round
    And the letter "letter-beta" has one more right use

  Scenario: Saying another letter is a miss that plays the right sound
    Given Lampas is opened on Romans 8 with the goal "1 John 1:1", a microphone that hears "delta" and a letter drill that asks "Β" as its Say it question
    When he opens the idea sheet of "alphabet" from the Goal screen
    And he slides "Your level" to "Learning"
    And he answers the questions before the Say it question right
    Then the Say it question shows "Β" and asks him to say it
    When he holds the bar until the phone has heard him and lets go
    Then Say it says he was not right, shows the right answer "Beta" and what it heard was "delta"
    And the voice says the sound of "β"
    And "Β" is not counted right in the round
    And the letter "letter-beta" is counted against

  Scenario: With the microphone denied no Say it question appears
    Given Lampas is opened on Romans 8 with the goal "1 John 1:1", the microphone permission denied and a letter drill that asks "Β" as its Say it question
    When he opens the idea sheet of "alphabet" from the Goal screen
    And he slides "Your level" to "Learning"
    Then the letter drill opens on a round of 8 questions
    And no question of the round is a Say it question

  Scenario: A phone that cannot turn speech into text is never asked to
    Given Lampas is opened on Romans 8 with the goal "1 John 1:1", no speech recognition and a letter drill that asks "Β" as its Say it question
    When he opens the idea sheet of "alphabet" from the Goal screen
    And he slides "Your level" to "Learning"
    Then the letter drill opens on a round of 8 questions
    And no question of the round is a Say it question

  Scenario: A microphone refused at the bar skips Say it and counts nothing against him
    Given Lampas is opened on Romans 8 with the goal "1 John 1:1", a microphone the phone refuses and a letter drill that asks "Β" as its Say it question
    When he opens the idea sheet of "alphabet" from the Goal screen
    And he slides "Your level" to "Learning"
    And he answers the questions before the Say it question right
    And he holds the bar until the phone has answered and lets go
    Then the Say it questions are left out of the round and the drill says why
    And the letter "letter-beta" is not counted against
    And he answers the rest of the round right
    Then the round says "7 of 7 right"
