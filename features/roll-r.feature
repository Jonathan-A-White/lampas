Feature: Rolling your r, an optional lesson on the Greek r for an English speaker
  The Rho sheet (a letter card) offers "Learn to roll your r (optional)" when the pronunciation is Modern Greek (mw-5r3p30.359, PROVISIONAL until the Governor confirms). It
  opens "Rolling your r", a lesson of the Hard sounds engine: why the English r differs, the tap of "butter" and "ladder", the Greek tapped r between vowels, the pairs
  ρ and λ, ρ and δ to tell apart, words to say with a recorder, and, as a stretch, the trill. Every Greek word in it has its speaker. It is marked optional, never pushed,
  and never blocks a letter or a Drill. The sounds' IPA, [ɾ] and [r], shows only when his accent is "IPA (the standard)".

  Scenario: The Rho sheet in Modern Greek offers the lesson, and Back returns to the sheet
    Given Lampas is opened on the Goal screen with the goal "1 John 1:1" in Modern Greek
    When he opens the letter sheet of "rho" from the Goal screen
    Then the sheet shows "Learn to roll your r (optional)"
    When he taps "Learn to roll your r (optional)" on the sheet
    Then the lesson "Rolling your r" shows "Step 1 of 7"
    When he goes Back
    Then the letter sheet "Rho" is on screen over the Goal screen

  Scenario: The Rho sheet in another pronunciation does not offer it
    Given a second pronunciation "Erasmian Greek" is registered and chosen
    And Lampas is opened on the Goal screen with the goal "1 John 1:1" in "erasmian"
    When he opens the letter sheet of "rho" from the Goal screen
    Then the sheet does not show "Learn to roll your r (optional)"
    And the Goal screen has no "Hard sounds (optional)" section

  Scenario: The lesson goes from the tap of butter to the tapped r to the trill
    Given Lampas is opened on the Goal screen with the goal "1 John 1:1" in Modern Greek
    When he opens the lesson "Rolling your r" from the Rho sheet
    Then the lesson says why in words about the English r
    And going on, the step "Start from a sound you know" names "butter" and "ladder"
    And going on, the step "Hear it" has a speaker on "ἀρχῆς" and on "χεῖρες"
    And going on past the pairs, the step "Try it" lets each word be said into the recorder
    And going on, the step "A stretch goal" says it is only a stretch, and has a speaker and a recorder on its words
    And going on, the step "Read a verse" shows 1 John 1:2

  Scenario: The pairs to tell apart are ρ with λ and ρ with δ
    Given Lampas is opened on the Goal screen with the goal "1 John 1:1" in Modern Greek
    When he opens the lesson "Rolling your r" from the Rho sheet
    And he taps "Next" until the step "Which did you hear?"
    Then the pairs shown include one told apart by ρ and λ and one by ρ and δ
    When he starts the drill
    Then the voice says a word of a pair and both words are offered

  Scenario: It is marked optional and never pushed
    Given Lampas is opened on the Goal screen with the goal "1 John 1:1" in Modern Greek
    Then the Goal screen lists "Rolling your r" under "Hard sounds (optional)"
    And Learn next does not name "Rolling your r"
    And the Rho sheet still has its Drill it, with the lesson not done

  Scenario: With an American accent no step shows any IPA
    Given Lampas is opened on the Goal screen with the goal "1 John 1:1" in Modern Greek and the accent "american"
    When he opens the lesson "Rolling your r" from the Rho sheet
    Then no step shows any IPA

  Scenario: With the accent IPA the tap and the trill show their sounds
    Given Lampas is opened on the Goal screen with the goal "1 John 1:1" in Modern Greek and the accent "ipa"
    When he opens the lesson "Rolling your r" from the Rho sheet
    Then the lesson shows the sound "/ɾ/"
    And the stretch step shows the sound "/r/"
