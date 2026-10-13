Feature: About you
  The tutor should meet the student where he is (mw-1vuvq6.1). Settings > About you keeps a small profile on the phone: age,
  pace, ways of learning, background, why, and a short list of notes the tutor has learned. Every field is optional, he can see,
  change or clear it, and what is kept rides every tutor grist as `learner_profile`.

  Scenario: About you keeps the student's profile
    Given Lampas is opened on Settings with nothing kept about him
    When he opens "About you" in Settings
    And he fills in his age "34", chooses the pace "Steady" and the ways "Hearing" and "Doing"
    Then the phone keeps the age "34", the pace "steady" and the ways "hearing / doing"
    When Lampas is closed and opened again on "About you"
    Then the page shows the age "34", the pace "Steady" and the ways "Hearing / Doing"
    When he taps "Clear"
    Then the page shows no age, no pace and no ways
    And the phone keeps nothing about him

  Scenario: Background and why are kept in his own words
    Given Lampas is opened on Settings with nothing kept about him
    When he opens "About you" in Settings
    And he writes the background "Two years of Spanish, no Greek" and the why "To read John with my son"
    Then the phone keeps the background "Two years of Spanish, no Greek" and the why "To read John with my son"

  Scenario: A note the tutor learned can be edited or removed
    Given Lampas is opened on Settings with the notes kept about him "Likes a story first / Tires after ten minutes"
    When he opens "About you" in Settings
    Then the page shows the notes "Likes a story first / Tires after ten minutes"
    When he edits the note "Likes a story first" to "Likes a picture first"
    Then the phone keeps the notes "Likes a picture first / Tires after ten minutes"
    When he removes the note "Tires after ten minutes"
    Then the page now shows the notes "Likes a picture first"
    And the phone now keeps the notes "Likes a picture first"

  Scenario: A talk with the tutor carries the profile
    Given Lampas is opened on Romans 8 with the age "34", the pace "quick" and the ways "hearing / doing" kept about him
    When he talks about verse 11 and sends "What is this about?"
    Then the mill received 1 grist
    And grist number 1 carries the learner profile with the age "34", the pace "quick" and the ways "hearing / doing"

  Scenario: A talk with nothing kept about him sends no profile
    Given Lampas is opened on Romans 8 with nothing kept about him
    When he talks about verse 11 and sends "What is this about?"
    Then the mill received 1 grist
    And grist number 1 carries no learner profile

  Scenario: The tutor learns how he likes to learn
    Given Lampas is opened on Romans 8 with nothing kept about him, and the tutor will learn from his talk that his ways are "hands-on"
    When he talks about verse 11 and sends "I only learn by trying it myself"
    Then the mill received 1 grist
    When he opens "About you" from the Reader
    Then About you shows the learned ways "hands-on, from a talk"
    When Lampas is closed and opened again on Romans 8
    And he talks about verse 11 again and sends "What does the next word mean?"
    Then the mill received 2 grists
    And grist number 2 carries the learned field "ways" with the value "hands-on"

  Scenario: The tutor guesses, he corrects
    Given Lampas is opened on Romans 8 with nothing kept about him, and the tutor will guess from his talk that his age is "adult"
    When he talks about verse 11 and sends "Could you say that more simply?"
    Then the mill received 1 grist
    When he opens "About you" from the Reader
    Then About you shows the guess "Lampas guesses: adult (from your talks)"
    When he changes the guess to "40s"
    Then About you shows the learned age "40s, from you"
    And the phone keeps no guess for the age

  Scenario: A guess never overrides what he set
    Given Lampas is opened on Romans 8 with the age "34" kept about him, and the tutor will guess from his talk that his age is "adult"
    When he talks about verse 11 and sends "Could you say that more simply?"
    Then the mill received 1 grist
    When he opens "About you" from the Reader
    Then About you shows the suggestion "Lampas suggests: adult (from your talks)"
    And the page shows the age "34"
    And the phone keeps the age "34"
