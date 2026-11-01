Feature: The Hebrew ladder on the Goal and Placement screens
  The Goal, Placement, Drill it and the idea sheet draw the ladder of the language in hand (mw-gdcyf98.10, src/data/grammar/languageInHand.ts, docs/layout/grammar.md): the
  chapter's where a chapter is open, else the one language he chose, else, with both chosen, the language of the Greek | Hebrew segment at the top of the Goal and Placement
  screens (src/ui/SourceSegment.tsx). The Hebrew ladder has one idea so far, the alphabet: on the Goal it is a card that can be taught and marked known (the level is written
  and its review row is scheduled), and a placement on it begins at that foundation. At English only there is no Goal.

  @uc-grammar-ladder @hebrew
  Scenario: With Hebrew chosen the Goal shows the Hebrew alphabet
    Given Hebrew is the only language chosen and the Goal screen is open
    Then the Goal lists "The Hebrew alphabet" as Not yet
    And no Greek idea or Greek goal is on the screen
    And the screen has no Greek and Hebrew segment
    When he opens "The Hebrew alphabet" and marks it known without a drill
    Then the Goal lists "The Hebrew alphabet" as Solid
    And "he-alphabet" has the level solid and a review row

  @uc-grammar-ladder @hebrew
  Scenario: The Hebrew alphabet is taught from its sheet in Hebrew type
    Given Hebrew is the only language chosen and the Goal screen is open
    When he opens "The Hebrew alphabet"
    Then the sheet teaches it with the Hebrew shown right to left in lang he
    And the sheet offers no Drill it

  @uc-placement @hebrew
  Scenario: Placement on the Hebrew ladder places at its foundation
    Given Hebrew is the only language chosen and the Goal screen is open
    When he taps Place me and then Start from the letters
    Then the placement says "Where you are: solid 0, frontier 0, not yet 0; untested 70"
    And it says Learn next on the Goal screen opens "The Hebrew alphabet"

  @uc-grammar-ladder @greek @hebrew
  Scenario: With both chosen the segment switches ladders and the Greek one is as before
    Given both languages are chosen, the goal is "Read 1 John 1:1" and the Goal screen is open
    Then the segment has Greek pressed and the Goal is "Read 1 John 1:1"
    When he taps "Hebrew" on the segment
    Then the Goal lists "The Hebrew alphabet" as Not yet
    And the Goal shows no Greek goal
    When he goes back to "Greek" on the segment
    Then the Goal is "Read 1 John 1:1" again with Words and Grammar ideas bars
    And no Hebrew idea is on the screen

  @uc-grammar-ladder @hebrew
  Scenario: With Greek only no Hebrew idea is anywhere
    Given Greek is the only language chosen, the goal is "Read 1 John 1:1" and the Goal screen is open
    Then the Goal is "Read 1 John 1:1" with Words and Grammar ideas bars
    And no Hebrew idea is on the screen
    And the screen has no Greek and Hebrew segment
    When he opens the Grammar ideas list
    Then the list has "The Greek alphabet" and no Hebrew idea

  @uc-grammar-ladder @hebrew
  Scenario: The Goal link is in the Learning group of either language at Learning and of neither at English only
    Given Hebrew is the only language chosen
    Then the Learning group of Settings has a Goal link
    When Greek is the only language chosen
    Then the Learning group of Settings still has a Goal link
    When English only is chosen
    Then the Learning group of Settings has no Goal link

  @uc-grammar-ladder @hebrew
  Scenario: At English only the Goal screen has no ladder
    Given English only is chosen and the Goal screen is open
    Then the Goal says "No language chosen" and lists no idea

  @uc-lessons @hebrew
  Scenario: A Hebrew passage lesson opens its verses in Hebrew and Check passes it by reading
    Given Hebrew is the only language chosen and every Hebrew idea is solid
    When he opens the Goal screen
    Then Learn next says "Read Jonah 1:1-3"
    When he taps Learn next
    Then the Verse view is open, headed "Jonah 1:1-3"
    And the Verse view shows verses 1 to 3 of Jonah 1 and no other, in Hebrew
    And the Lesson strip names the lesson's ideas as chips and offers "Check"
    And no lesson is marked read or passed
    When he taps "Check" in the Lesson strip
    Then the sheet "Check: Jonah 1:1-3" asks a tap-the-word question on each verse
    When he answers all of them right but the last
    Then the end card says it is passed
    And the lesson "Jonah 1:1-3" is passed in the table
    And each idea asked has a review recorded
    When he opens the Goal screen again
    Then the Goal is learning the idea he missed and offers no lesson to read

  @uc-lessons @hebrew
  Scenario: A Hebrew passage lesson missed stays read and the Goal still offers it
    Given Hebrew is the only language chosen and every Hebrew idea is solid
    And the Verse view is open on the Hebrew lesson "Jonah 1:1-3"
    When he taps "Check" in the Lesson strip
    And he answers every question wrong
    Then the end card says it is read, not passed
    And the lesson "Jonah 1:1-3" is read in the table
    When he opens the Goal screen
    Then Learn next says "Read Jonah 1:1-3"

  @uc-lessons @hebrew
  Scenario: With Read lessons to me On a Hebrew idea sheet reads itself, Hebrew in the Hebrew voice
    Given a phone with an English and a Hebrew voice
    And Read lessons to me is On
    When the idea sheet of "he-alphabet" is opened
    Then the phone speaks the title "The Hebrew alphabet" in "en-US"
    And the phone speaks some Hebrew in "he-IL"
    And the text of the lesson is still on screen
    And the speaker is named Stop reading

  @uc-lessons @hebrew
  Scenario: With Read lessons to me Off a Hebrew idea sheet stays silent until the speaker is tapped
    Given a phone with an English and a Hebrew voice
    And Read lessons to me is Off
    When the idea sheet of "he-alphabet" is opened
    Then the phone has spoken nothing
    When he taps Read aloud
    Then the phone speaks the title "The Hebrew alphabet" in "en-US"
