Feature: Learning to read Hebrew: the letters
  The Hebrew ladder's first tiers (mw-gdcyf98.11, src/data/grammar/hebrew/): the alphabet, each of the 22 letters, the final forms and the rest, each an idea with its card. On the
  Goal with Hebrew chosen, Learn next names the Hebrew alphabet and, once that is known, Alef; Alef's sheet teaches the letter in Hebrew type and its sound is the Israeli
  scheme's lesson, and "Hear it" speaks the letter in the Hebrew voice. "Your level" moved to "Learning" on The Hebrew alphabet starts the letter drill over the 27 glyphs (the 22
  letters and the 5 final forms), drawn right to left; "Drill it" on a letter asks its name, its sound and a word that holds it, and runs to "Proved". The Greek letter drill is as it
  was, and with Greek only no Hebrew letter is anywhere.

  @uc-letter-drill @hebrew
  Scenario: Learn next offers the Hebrew alphabet and then Alef
    Given Hebrew is the only language chosen and the Goal screen is open
    Then Learn next on the Goal is "The Hebrew alphabet"
    When he opens "The Hebrew alphabet" and marks it known without a drill
    Then Learn next on the Goal has moved on to "Alef"

  @uc-letter-drill @hebrew
  Scenario: Alef's sheet teaches it and Hear it speaks Hebrew
    Given Hebrew is the only language chosen, the Hebrew alphabet is known and the Goal screen is open
    When he taps Learn next
    Then the sheet is "Alef" and shows the letter "א" right to left in lang he
    And the sheet says how Alef sounds in the Israeli scheme
    And the sheet's card says what the letter is without naming a sound
    When he taps "Hear it"
    Then the phone is asked to say "א" in the Hebrew voice

  @uc-letter-drill @hebrew
  Scenario: The letter drill in Hebrew runs over the 27 glyphs to its end
    Given Hebrew is the only language chosen and the Goal screen is open
    When he opens "The Hebrew alphabet" and slides "Your level" to "Learning"
    Then the letter drill opens on a round of 8 questions
    And its glyphs are drawn right to left in the Hebrew face
    When he goes on in rounds, answering every question right, until the drill is complete
    Then the drill says every letter is right, and "27 of 27 right so far"
    And the drill asked the 22 letters and the 5 final forms
    When he taps "Done"
    Then the letter drill is closed and "The Hebrew alphabet" is at the frontier

  @uc-drill-it @uc-letter-drill @hebrew
  Scenario: Drill it on Alef asks its name, a word that holds it and runs to Proved
    Given Hebrew is the only language chosen, the Hebrew alphabet is known and the Goal screen is open
    When he opens "Alef" and taps "Drill it"
    Then Drill it asks "What is this letter called?" first
    When he answers every question right until Drill it ends
    Then Drill it says "Proved"
    And a question asked a word that holds the letter, and "he-letter-alef" has the level solid and a review row

  @uc-letter-drill @greek
  Scenario: The Greek letter drill is as it was
    Given Greek is the only language chosen, the goal is "1 John 1:1" and the Goal screen is open
    When he opens the idea sheet of "The Greek alphabet" and slides "Your level" to "Learning"
    Then the letter drill opens on a round of 8 questions and none of it is Hebrew
    When he answers the whole round right
    Then the round says "8 of 8 right" and "8 of 48 right so far"

  @uc-letter-drill @hebrew
  Scenario: With Greek only no Hebrew letter is anywhere
    Given Greek is the only language chosen, the goal is "1 John 1:1" and the Goal screen is open
    Then the Goal shows no Hebrew letter and no Hebrew idea
    When he opens the idea sheet of "The Greek alphabet" from the Goal list
    Then the sheet shows no Hebrew letter
