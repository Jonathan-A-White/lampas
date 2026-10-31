@uc-drill-it @greek
Feature: Drill it on the idea sheet
  The idea sheet (features/idea-sheet.feature) says where he stands on an idea with a slider named "Your level" and three stops:
  "Not yet", "Learning" and "I know it". It rests on the idea's level and has no Got it or I know this button. Sliding to
  "Learning" puts the idea on the frontier, due tomorrow; sliding to "I know it" starts Drill it to prove it (src/DrillItScreen.tsx:
  the idea's title, "Step N of M", one question at a time, a Hint and Stop), and only a pass keeps the slider there, with the
  pill "Proved by drill". A failed run slides it back to "Learning" (frontier) and says what is Strong and what is Weak, by
  facet. "Mark known without a drill" under the slider keeps the one-tap solid, and a "Drill it" button opens the same walk
  at any time (a run is saved, the idea turns solid only if it was proved). The sheet teaches only its own idea and takes every
  idea under it to be solid: when one is not, the sheet says "This builds on <title>. Prove it first." with a button to go there,
  and sliding to "Learning" or "I know it" first asks whether to go there. The noun also builds on "Breathing marks" and "The iota
  under a letter" (mw-5r3p30.234): every scenario starts with those two solid, so the one it names, "Accents and stress", decides.

  A run that does not prove the idea and leaves weak facets makes "Your drill plan" (src/data/grammar/drillPlan.ts, mw-i7xe0n.4): a
  short drill on each weak facet, the easiest first, then "Prove it", a full Drill it. The result shows the plan with "Start the first
  drill"; the Goal screen says "Drill plan: N to go" for each idea with a plan open; the steps come up in Review, due now and a day
  apart; a short drill answered with a miss comes back tomorrow; a passed Prove it makes the idea solid, "Proved by drill", and closes
  the plan. No tutor is asked anything.

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

  # His words (Postern general 2026-10-14, mw-5r3p30.355), on Omicron's step 4: "comprehensive clean up needed". Every choice of 'What sound does it make?' is
  # one short sound label of one shape; the rule of a letter (chi's 'before α, ο, ω, ου or a consonant') stays on its sheet and in the Hint.
  Scenario: Omicron's sound step shows four short choices of one shape
    Given Lampas is opened on Romans 8 with the goal "1 John 1" and a fake Postern
    When he opens the letter sheet of "omicron" from the alphabet sheet
    And he taps Drill it on the letter sheet
    And he answers right until step 4 of Drill it
    Then step 4 asks "What sound does it make?" with four short choices, one of them "o, as in “or”, short"

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

  Scenario: A Hint marks the answer hinted, strikes the wrong answers it takes away and says so
    Given Lampas is opened on Romans 8 with the goal "1 John 1", "Accents and stress" solid, "The noun" at the frontier and a fake Postern
    And he opens the idea sheet of "noun" from the Goal screen
    And he taps Drill it on the idea sheet
    When he taps Hint, sees the answers struck through and the line, and answers the question right
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
    Then he is then asked "You are learning Accents and stress. Switch to The noun?"
    And he taps the button "Switch"
    Then the idea "noun" is frontier, set by the sheet, and its review is due in 1 day at step 0

  Scenario: Go there opens the foundation and leaves the level as it was
    Given Lampas is opened on Romans 8 with the goal "1 John 1", "Accents and stress" at the frontier, no level for "The noun" and a fake Postern
    And he opens the idea sheet of "noun" from the Goal screen
    When he slides to "I know it"
    And he taps "Go there"
    Then a second idea sheet titled "Accents and stress" opens over the first
    And Drill it is gone
    And the idea "noun" has no level

  Scenario: A failed run makes a drill plan, shown on the result and on the Goal screen
    Given Lampas is opened on Romans 8 with the goal "1 John 1", "Accents and stress" solid, no level for "The noun" and a fake Postern
    And he opens the idea sheet of "noun" from the Goal screen
    When he slides to "I know it"
    And he answers the first question right and every other one wrong until Drill it ends
    Then Drill it shows "Your drill plan" with the steps "What it is", "Finding it in a verse" and "Prove it"
    And Drill it has a button "Start the first drill"
    And the Goal screen says "Drill plan: 3 to go"
    And no request went to the tutor

  Scenario: A short drill of the plan is done on the result, and the next one is due tomorrow
    Given Lampas is opened on Romans 8 with the goal "1 John 1", "Accents and stress" solid, no level for "The noun" and a fake Postern
    And he opens the idea sheet of "noun" from the Goal screen
    And he slides to "I know it"
    And he answers the first question right and every other one wrong until Drill it ends
    When he taps "Start the first drill"
    Then a short drill opens on "The noun" about "What it is"
    When he answers every question of the short drill right and taps Done
    Then the Goal screen says "Drill plan: 2 to go"
    And the plan's step "Finding it in a verse" is due in 1 day
    And Drill it no longer has a button "Start the first drill"

  Scenario: A short drill answered with misses stays on the plan and comes back tomorrow
    Given Lampas is opened on Romans 8 with the goal "1 John 1", "Accents and stress" solid, no level for "The noun" and a fake Postern
    And he opens the idea sheet of "noun" from the Goal screen
    And he slides to "I know it"
    And he answers the first question right and every other one wrong until Drill it ends
    When he taps "Start the first drill"
    And he answers every question of the short drill wrong and taps Done
    Then the Goal screen says "Drill plan: 3 to go"
    And the plan's step "What it is" is due in 1 day

  Scenario: The plan's steps come up in Review, and a passed Prove it makes the noun solid and ends the plan
    Given Lampas is opened on Romans 8 with the goal "1 John 1", "Accents and stress" solid, no level for "The noun" and a fake Postern
    And he opens the idea sheet of "noun" from the Goal screen
    And he slides to "I know it"
    And he answers the first question right and every other one wrong until Drill it ends
    And he taps "Start the first drill"
    And he answers every question of the short drill right and taps Done
    When a day passes and he starts a Review round
    Then Review's first card is the plan step "Finding it in a verse" of "The noun"
    When he starts the drill on the card and answers every question of the short drill right and taps Done
    Then the Goal screen says "Drill plan: 1 to go"
    When another day passes and he starts a Review round
    Then Review's first card is now the plan step "Prove it" of "The noun"
    When he starts the drill on the card and answers every question right until Drill it ends
    And he taps Done on Drill it
    Then the card says "Proved by drill."
    And the idea "noun" is solid, proved by drill, and its run is kept as proved
    And no drill plan is kept for "noun"
    And the Goal screen has no line "Drill plan"
