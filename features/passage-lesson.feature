Feature: A passage lesson opens its verses in the Verse view and Check passes it by reading
  A passage lesson of the approach ('Read 1 John 1:1-4', mw-z370x5.1) opens the Verse view on its range, headed with the range, with a Lesson strip under
  the heading: the lesson's title, its ideas as chips and 'Read it, then Check' (mw-z370x5.2, src/LessonStrip.tsx). Check asks up to eight of Lampas's own
  questions on its verses, a meaning and a parsing of each, easiest verse first (src/data/grammar/passageCheck.ts). Three quarters right passes the lesson;
  under that it stays read, 'Try again tomorrow' puts it in Review and the tutor's Quiz me is beside. Opening the view marks nothing; only Check writes.

  Scenario: A lesson opens its passage
    Given the goal is "1 John" and every idea it needs is solid but "tense-aorist", which is frontier
    When he opens the Goal screen
    Then Learn next says "Read 1 John 1:1-4"
    When he taps Learn next
    Then the Verse view is open, headed "1 John 1:1-4"
    And the Verse view shows verses 1 to 4 of 1 John 1 and no other
    And the Lesson strip names the lesson's ideas as chips and offers "Check"
    And no lesson is marked read or passed
    When he presses the phone's Back
    Then the Goal screen is open

  Scenario: Check passes the lesson by reading
    Given the goal is "1 John" and every idea it needs is solid but "tense-aorist", which is frontier
    And the Verse view is open on the lesson "1 John 1:1-4"
    When he taps "Check" in the Lesson strip
    Then the sheet "Check: 1 John 1:1-4" asks 8 questions on verses 1 to 4, a meaning and a parsing of each
    When he answers 7 of them right and the last wrong
    Then the end card says "Passed: 7 of 8"
    And the lesson "1 John 1:1-4" is passed in the table with the score 7 of 8
    And each idea asked has a review recorded
    When he opens the Goal screen
    Then Learn next says "Read 1 John 1:5-10"

  Scenario: A miss keeps it read
    Given the goal is "1 John" and every idea it needs is solid but "tense-aorist", which is frontier
    And the Verse view is open on the lesson "1 John 1:1-4" with a quiz behind a fake Postern
    When he taps "Check" in the Lesson strip
    And he answers 4 of 8 questions right
    Then the end card says "Read: 4 of 8"
    And the end card names the ideas he missed
    And the lesson "1 John 1:1-4" is read in the table
    When he taps "Try again tomorrow" on the end card
    Then a lesson row is on the schedule, due in 1 day
    When he chooses "Quiz me" on the end card
    Then the mill received one grist for the lampas app, kind bible-talk, in quiz mode about "1 John 1:1-4"
    When a day passes and he opens Review
    Then Review says "Due today: 1 lesson"
    When he taps the due lesson "1 John 1:1-4"
    Then the Verse view is open, headed "1 John 1:1-4"
