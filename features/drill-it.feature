Feature: Drill it on the idea sheet
  The idea sheet (features/idea-sheet.feature) says where he stands on an idea with a slider named "Your level" and three stops:
  "Not yet", "Learning" and "I know it". It rests on the idea's level and has no Got it or I know this button. Sliding to
  "Learning" puts the idea on the frontier, due tomorrow; sliding to "I know it" starts Drill it to prove it (src/DrillItScreen.tsx:
  the idea's title, "Step N of M", one question at a time, a Hint and Stop), and only a pass keeps the slider there, with the
  pill "Proved by drill". A failed run slides it back to "Learning" (frontier) and says what is Strong and what is Weak, by
  facet. "Mark known without a drill" under the slider keeps the one-tap solid, and a "Drill it" button opens the same walk
  at any time (a run is saved, the idea turns solid only if it was proved). The sheet teaches only its own idea and takes every
  idea under it to be solid: when one is not, the sheet says "This builds on <title>. Prove it first." with a button to go there,
  and sliding to "Learning" or "I know it" first asks whether to go there.

  Scenario: The sheet for The noun has a slider with three stops, resting on its level, and no Got it or I know this button
    Given Lampas is opened on Romans 8 with the goal "1 John 1", "Accents and stress" solid, "The noun" at the frontier and a fake Postern
    When he opens the idea sheet of "noun" from the Goal screen
    Then the idea sheet has a slider "Your level" with the stops "Not yet", "Learning" and "I know it"
    And the slider rests on "Learning"
    And the idea sheet has no button "Got it" and no button "I know this"

  Scenario: The slider rests on Not yet for an idea with no level
    Given Lampas is opened on Romans 8 with the goal "1 John 1", "Accents and stress" solid, no level for "The noun" and a fake Postern
    When he opens the idea sheet of "noun" from the Goal screen
    Then the slider rests on "Not yet"

  Scenario: The slider moves with the arrow keys
    Given Lampas is opened on Romans 8 with the goal "1 John 1", "Accents and stress" solid, no level for "The noun" and a fake Postern
    And he opens the idea sheet of "noun" from the Goal screen
    When he presses the right arrow on the slider
    Then the slider rests on "Learning"
    And the idea "noun" is frontier, set by the sheet, and its review is due in 1 day at step 0
    When he presses the left arrow on the slider
    Then the slider now rests on "Not yet"
    And the idea "noun" is not yet and has no review

  Scenario: Sliding to Learning makes the idea frontier with a review due tomorrow
    Given Lampas is opened on Romans 8 with the goal "1 John 1", "Accents and stress" solid, no level for "The noun" and a fake Postern
    And he opens the idea sheet of "noun" from the Goal screen
    When he slides to "Learning"
    Then the idea "noun" is frontier, set by the sheet, and its review is due in 1 day at step 0
    And the slider rests on "Learning"
    And the idea sheet shows the chip "Frontier since today"

  Scenario: Sliding to I know it starts Drill it at step 1
    Given Lampas is opened on Romans 8 with the goal "1 John 1", "Accents and stress" solid, "The noun" at the frontier and a fake Postern
    And he opens the idea sheet of "noun" from the Goal screen
    When he slides to "I know it"
    Then Drill it opens on "The noun" and says "Step 1 of"
    And it shows a question with its answers, a Hint and Stop

  Scenario: Answering every question right proves the idea, and the slider stays on I know it
    Given Lampas is opened on Romans 8 with the goal "1 John 1", "Accents and stress" solid, "The noun" at the frontier and a fake Postern
    And he opens the idea sheet of "noun" from the Goal screen
    When he slides to "I know it"
    And he answers every question right until Drill it ends
    Then Drill it says "Proved"
    When he taps Done on Drill it
    Then the slider rests on "I know it"
    And the idea sheet shows the chip "Proved by drill today"
    And the idea "noun" is solid, proved by drill, and its run is kept as proved
    And an idea-taught event for "noun" with the outcome "known" was published

  Scenario: A miss takes the next question to an easier step
    Given Lampas is opened on Romans 8 with the goal "1 John 1", "Accents and stress" solid, "The noun" at the frontier and a fake Postern
    And he opens the idea sheet of "noun" from the Goal screen
    And he slides to "I know it"
    When he answers the first question right and the second one wrong
    Then the next question is at a step lower than the one he missed

  Scenario: A failed run shows what was weak, and the slider goes back to Learning
    Given Lampas is opened on Romans 8 with the goal "1 John 1", "Accents and stress" solid, no level for "The noun" and a fake Postern
    And he opens the idea sheet of "noun" from the Goal screen
    When he slides to "I know it"
    And he answers every question wrong until Drill it ends
    Then Drill it says "You have not reached step 1"
    And Drill it lists "Weak:" with the facet of the first question he missed
    When he taps Done on Drill it
    Then the slider rests on "Learning"
    And the idea "noun" is frontier, set by a drill, and its run is kept as not proved

  Scenario: Stop leaves the idea where it was and keeps no run
    Given Lampas is opened on Romans 8 with the goal "1 John 1", "Accents and stress" solid, "The noun" at the frontier and a fake Postern
    And he opens the idea sheet of "noun" from the Goal screen
    And he slides to "I know it"
    When he taps Stop on Drill it
    Then Drill it is gone
    And the slider rests on "Learning"
    And no drill run is kept

  Scenario: A Hint marks the answer hinted
    Given Lampas is opened on Romans 8 with the goal "1 John 1", "Accents and stress" solid, "The noun" at the frontier and a fake Postern
    And he opens the idea sheet of "noun" from the Goal screen
    And he taps Drill it on the idea sheet
    When he taps Hint and answers the question right
    And he answers every question right until Drill it ends
    Then the kept run's first answer is marked hinted

  Scenario: Mark known without a drill makes it solid with no drill
    Given Lampas is opened on Romans 8 with the goal "1 John 1", "Accents and stress" solid, no level for "The noun" and a fake Postern
    And he opens the idea sheet of "noun" from the Goal screen
    When he taps "Mark known without a drill"
    Then Drill it is gone
    And the idea "noun" is solid, set by the sheet, and its review is due in 30 days at the 30-day step
    And the slider rests on "I know it"
    And the idea sheet shows the chip "Solid since today"
    And no drill run is kept

  Scenario: The Drill it button opens Drill it, and a run that is not a proof leaves a solid idea solid
    Given Lampas is opened on Romans 8 with the goal "1 John 1", "Accents and stress" solid, "The noun" solid and a fake Postern
    And he opens the idea sheet of "noun" from the Goal screen
    When he taps Drill it on the idea sheet
    Then Drill it opens on "The noun" and says "Step 1 of"
    When he answers every question wrong until Drill it ends
    And he taps Done on Drill it
    Then the slider rests on "I know it"
    And the idea "noun" is solid, set by the sheet, and its run is kept as not proved

  Scenario: With Accents and stress at the frontier, The noun says it builds on it and the button goes there
    Given Lampas is opened on Romans 8 with the goal "1 John 1", "Accents and stress" at the frontier, "The noun" at the frontier and a fake Postern
    When he opens the idea sheet of "noun" from the Goal screen
    Then the idea sheet says "This builds on Accents and stress"
    When he taps "Go to Accents and stress"
    Then a second idea sheet titled "Accents and stress" opens over the first

  Scenario: With Accents and stress not yet, The noun says it builds on it
    Given Lampas is opened on Romans 8 with the goal "1 John 1", "Accents and stress" not yet, "The noun" at the frontier and a fake Postern
    When he opens the idea sheet of "noun" from the Goal screen
    Then the idea sheet says "This builds on Accents and stress"

  Scenario: With Accents and stress solid, The noun does not say it builds on anything
    Given Lampas is opened on Romans 8 with the goal "1 John 1", "Accents and stress" solid, "The noun" at the frontier and a fake Postern
    When he opens the idea sheet of "noun" from the Goal screen
    Then the idea sheet does not say "This builds on"

  Scenario: Sliding up with a foundation that is not solid asks whether to go there first, and Stay here goes on
    Given Lampas is opened on Romans 8 with the goal "1 John 1", "Accents and stress" at the frontier, no level for "The noun" and a fake Postern
    And he opens the idea sheet of "noun" from the Goal screen
    When he slides to "Learning"
    Then he is asked "Go to Accents and stress first?"
    When he taps "Stay here"
    Then the idea "noun" is frontier, set by the sheet, and its review is due in 1 day at step 0

  Scenario: Go there opens the foundation and leaves the level as it was
    Given Lampas is opened on Romans 8 with the goal "1 John 1", "Accents and stress" at the frontier, no level for "The noun" and a fake Postern
    And he opens the idea sheet of "noun" from the Goal screen
    When he slides to "I know it"
    And he taps "Go there"
    Then a second idea sheet titled "Accents and stress" opens over the first
    And Drill it is gone
    And the idea "noun" has no level
