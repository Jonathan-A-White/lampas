Feature: Hard sounds, optional lessons on the sounds his English makes hard
  The Goal screen (Learn) has a section "Hard sounds (optional)" below the main path (mw-5r3p30.361, PROVISIONAL until the Governor confirms). It lists the lessons
  written for his English accent (American or British; IPA reads the American ones), each marked Done or Not yet. Nothing else pushes them: they never block a
  letter, a Drill or the level. A lesson is a data file of typed steps (why it is hard for your accent, start from a sound you know, hear it, tell them apart, try
  it, and it may end with a verse), and one screen draws any of them. A letter sheet whose letter has a lesson links to it with "Learn to say it (optional)" (or the label the lesson gives, "Learn to roll your r (optional)" for the r), and
  Back comes back to the sheet. The sound's IPA shows only when his accent is "IPA (the standard)".

  Scenario: The section lists the lessons for his accent, each Not yet, below the main path
    Given Lampas is opened on the Goal screen with the goal "1 John 1:1"
    Then the Goal screen has a "Hard sounds (optional)" section below "See the whole path"
    And it lists every lesson written for an American ear, each "Not yet"
    And Learn next does not name a hard sound

  Scenario: A British ear gets the lessons written for it
    Given Lampas is opened on the Goal screen with no goal and the accent "british"
    Then it lists every lesson written for a British ear, each "Not yet"

  Scenario: He steps through a lesson, and Done marks it Done
    Given Lampas is opened on the Goal screen with no goal
    When he opens the lesson "Rolling your r" from the section
    Then the lesson shows "Step 1 of 7" and the heading "Why it is hard for you"
    And the lesson says why in American words
    And the lesson shows no IPA
    When he taps "Next" until the last step
    Then each step showed its heading in turn: "Start from a sound you know", "Hear it", "Which did you hear?", "Try it", "A stretch goal", "Read a verse"
    When he goes back to "Which did you hear?" and taps "Hear μέρος"
    Then the Greek voice is handed "μέρος"
    When he goes on to the end and taps "Done"
    Then the Goal screen shows again
    And the lesson "Rolling your r" is "Done" in the section

  Scenario: The verse step marks the sound's letters and opens the verse to read aloud
    Given Lampas is opened on the Goal screen with no goal
    When he opens the lesson "Rolling your r" at its last step
    Then the verse "1 John 1:2" shows with every ρ marked
    When he taps "Read it aloud" on the lesson
    Then the Verse view opens on 1 John 1:2 in Greek with "Read it aloud" chosen
    When he goes Back
    Then the lesson shows its last step again

  Scenario: Without a licence the verse step opens the verse to hear
    Given Lampas is opened on the Goal screen with no goal and no licence
    When he opens the lesson "Rolling your r" at its last step
    Then the lesson offers "Listen to it" and not "Read it aloud"
    When he taps "Listen to it" on the lesson
    Then the Verse view opens on 1 John 1:2 in Greek with "Listen" chosen

  Scenario: The sound's IPA shows only when his accent is IPA
    Given Lampas is opened on the Goal screen with no goal and the accent "ipa"
    When he opens the lesson "Rolling your r" from the section
    Then the lesson shows the sound "/ɾ/"
    And the lesson says why in American words

  Scenario: The Rho sheet links to the lesson, and Back returns to the sheet
    Given Lampas is opened on the Goal screen with the goal "1 John 1:1"
    When he opens the letter sheet of "rho" from the Goal screen
    Then the sheet shows "Learn to roll your r (optional)"
    When he taps "Learn to roll your r (optional)" on the sheet
    Then the lesson "Rolling your r" shows "Step 1 of 7"
    When he goes Back
    Then the letter sheet "Rho" is on screen over the Goal screen

  Scenario: A letter sheet with no lesson has no link
    Given Lampas is opened on the Goal screen with the goal "1 John 1:1"
    When he opens the letter sheet of "alpha" from the Goal screen
    Then the sheet does not show "Learn to say it (optional)"
