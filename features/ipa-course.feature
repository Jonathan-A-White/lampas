@uc-ipa-course @greek
Feature: Learn the IPA sounds, an optional course
  The Goal screen has an Optional heading with one entry, "Learn the IPA sounds" (src/ipa/OptionalEntry.tsx, mw-5r3p30.356, PROVISIONAL until the Governor confirms), below
  the main path. The course is never needed, counted or prompted for: nothing but that entry opens it. It opens on "Why learn it?", which says first that Lampas and
  reading Greek do not need it, with "Start" and "Not now" the same size. Then each standard sound the Greek pronunciation says has a card (the symbol, the key
  word of his English accent, the Greek letters that make it, the voice saying a Greek word that has it), a drill both ways in which a wrong answer comes back
  until it is right twice, and a pass check of every sound both ways with no hints, which offers "Show IPA in hints" on a pass and names the symbols to practise
  on a fail. What he has done is kept on the device.

  Scenario: The entry sits under Optional, below the main path
    Given Lampas is opened on the Goal screen with the goal "1 John 1:1"
    Then the Goal screen has an "Optional" heading with one entry "Learn the IPA sounds" below "See the whole path" and "Read it"
    And no other part of the Goal screen mentions the course

  Scenario: Why learn it? comes first and Not now leaves nothing behind
    Given Lampas is opened on the Goal screen with no goal
    When he taps the entry "Learn the IPA sounds"
    Then "Why learn it?" shows with the line "You do not need this for Lampas or for reading Greek. It is only here if you want it." first
    And it gives the three reasons: one standard for every language and dictionary, exactness where English key words blur, and the marks used in pronunciation guides
    And "Start" and "Not now" are the same size and weight
    When he taps "Not now"
    Then the Goal screen shows again
    And the course has kept nothing
    And the course is named on no other screen

  Scenario: Start opens the sounds and a card gives a sound four things
    Given he has opened the course and tapped "Start"
    Then the course lists every sound the Greek pronunciation says, none of them opened yet
    When he opens the sound "/ç/"
    Then the card shows the symbol "/ç/", the key word "as in “huge”", the Greek letters of that sound and a Greek word that has it
    When he taps "Hear it"
    Then the Greek voice is handed that word

  Scenario: The key word follows his English accent, and IPA shows American words
    Given he has opened the course and tapped "Start"
    And his English accent is "British"
    When he opens the sound "/o/"
    Then the card shows the key word "as in “lot”"
    When he changes his English accent to "IPA (the standard)"
    And he opens the sound "/o/" again
    Then the card now shows the key word "as in “or”, short"

  Scenario: The drill asks both ways, and a wrong answer comes back until it is right twice
    Given he has opened the course and tapped "Start"
    And he has opened the sounds "/x/", "/ç/" and "/a/"
    When he starts the drill
    Then each question is a hear question with symbols to pick, or a see question with key words to pick
    When he answers the first question wrong
    Then it says "Not quite" and the answer
    When he goes on, answering every question right, until the first question has been right twice
    Then that question was asked wrong, then right, then right
    And "/x/" and "/ç/" were asked next to each other
    When he finishes the round
    Then the round says how many were right and offers "Another round" and "Done"

  Scenario: A pass check of every sound both ways passes and offers IPA in the hints
    Given he has opened the course and tapped "Start"
    When he starts the pass check
    Then it asks every sound both ways, once each, and tells him nothing as he answers
    When he answers every question right
    Then he is told "You passed." with "62 of 62 right"
    And "Show IPA in hints" is offered
    When he taps "Show IPA in hints"
    Then his English accent is "IPA (the standard)"
    And the course is kept as passed

  Scenario: A pass check that fails names the symbols to practise
    Given he has opened the course and tapped "Start"
    When he starts the pass check
    And he answers the first 8 questions wrong and the rest right
    Then he is told "Not yet."
    And the symbols of those questions are named under "Practise these"
    And "Show IPA in hints" is not offered
    And "Try the pass check again" is offered

  Scenario: What he has done is kept
    Given he has opened the course and tapped "Start"
    And he has opened the sounds "/x/", "/ç/" and "/a/"
    When he goes back to the Goal screen and opens the course again
    Then it opens on the sounds, not on "Why learn it?", and says "3 of 31 sounds opened"
