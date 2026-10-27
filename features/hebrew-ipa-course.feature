Feature: Learn the IPA sounds of Hebrew, an optional lesson behind a setting
  The Goal screen's Optional section (src/ipa/OptionalEntry.tsx, mw-gdcyf98.24, PROVISIONAL until the Governor confirms) offers "Learn the IPA sounds" for Greek, as it always has, and
  "Learn the IPA sounds of Hebrew" while his Hebrew dial is above 0. The setting "IPA lesson" (Settings > Listening > Pronunciation, On to start) takes both away while it is Off. The
  Hebrew course is the Greek one on the Israeli pronunciation: "Why learn it?" first, a card for each sound (the symbol, the key word of his English accent, the Hebrew letters that
  make it, the voice saying a Hebrew word that has it), a drill both ways and a pass check; what he has done is kept apart from the Greek course's. Nothing else names the course.

  Scenario: The Hebrew entry shows when he reads Hebrew, and not when he reads Greek only
    Given Lampas is opened on the Goal screen with his Hebrew dial at "Learning"
    Then the Optional section has the entries "Learn the IPA sounds" and "Learn the IPA sounds of Hebrew"
    When Lampas is opened on the Goal screen with his Hebrew dial at "Just English"
    Then the Optional section has the entry "Learn the IPA sounds" alone

  Scenario: Turning the IPA lesson Off takes both entries away
    Given Lampas is opened on the Goal screen with his Hebrew dial at "Learning"
    When he turns "IPA lesson" Off
    Then the Goal screen has no Optional section
    When he turns "IPA lesson" On
    Then the Optional section has the entries "Learn the IPA sounds" and "Learn the IPA sounds of Hebrew"

  Scenario: The Hebrew course opens on Why learn it? and says first that it is not needed
    Given Lampas is opened on the Goal screen with his Hebrew dial at "Learning"
    When he taps the entry "Learn the IPA sounds of Hebrew"
    Then "Why learn it?" shows with the line "You do not need this for Lampas or for reading Hebrew. It is only here if you want it." first
    When he taps "Not now"
    Then the Goal screen shows again
    And the Hebrew course has kept nothing, and the Greek course neither

  Scenario: A card gives a Hebrew sound its symbol, key word, Hebrew letters and a Hebrew word to hear
    Given he has opened the Hebrew course and tapped "Start"
    Then the course lists every sound the Israeli pronunciation says, none of them opened yet
    When he opens the sound "/ʃ/"
    Then the card shows the symbol "/ʃ/", the key word "as in “ship”", the Hebrew letters of that sound drawn right to left and a Hebrew word that has it
    When he taps "Hear it"
    Then the Hebrew voice is handed that word

  Scenario: What he does in the Hebrew course is kept apart from the Greek course
    Given he has opened the Hebrew course and tapped "Start"
    And he has opened the sounds "/ʃ/", "/s/" and "/a/"
    When he goes back to the Goal screen and opens the Greek course
    Then it opens on "Why learn it?"
    When he goes back to the Goal screen and opens the Hebrew course again
    Then it opens on the sounds and says "3 of 24 sounds opened"

  Scenario: The Hebrew drill asks both ways and a wrong answer comes back until it is right twice
    Given he has opened the Hebrew course and tapped "Start"
    And he has opened the sounds "/ʃ/", "/s/" and "/a/"
    When he starts the drill
    Then each question is a hear question with symbols to pick, or a see question with key words to pick
    When he answers the first question wrong
    Then it says "Not quite" and the answer
    When he goes on, answering every question right, until the first question has been right twice
    Then that question was asked wrong, then right, then right

  Scenario: The Hebrew pass check of every sound both ways passes and offers IPA in the hints
    Given he has opened the Hebrew course and tapped "Start"
    When he starts the pass check
    Then it asks every sound both ways, once each
    When he answers every question right
    Then he is told "You passed." with "48 of 48 right"
    And "Show IPA in hints" is offered
    And the Hebrew course is kept as passed, and the Greek course is not

  Scenario: Nothing else names the course
    Given Lampas is opened on the Goal screen with his Hebrew dial at "Learning"
    Then no other part of the Goal screen mentions the course than its two entries
    And the course is named on no other screen
