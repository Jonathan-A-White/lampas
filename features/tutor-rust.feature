Feature: The tutor notices rust
  A person is not always going forward: he takes a break, comes back, and is rusty. The phone works out which SOLID words and ideas he now slips on (a wrong answer among
  his last 3) or has not met for a long while (a week or more past due), and sends the worst eight, each with its kind, id, title and a plain reason, as `rusty`
  (mw-1vuvq6.6). The tutor says so once in a talk ("You're rusty on X and Y: they were solid before") and offers `rusty_offer`, drawn as 'Move back to Frontier and practise'.
  A tap, or a spoken yes, moves those items to Frontier and opens their practice in Review; nothing moves without it. These scenarios run against a fake Postern whose mill
  answers each talk with the answer the scenario names.

  @uc-learner-summary @greek
  Scenario: The tutor notices rust
    Given he has a solid word he slipped on and a solid idea he has not met for 3 weeks, and Lampas is opened on Romans 8 behind a fake Postern whose tutor says he is rusty
    When he opens the talk and asks "What should I work on?"
    Then the request carried 2 rusty items, "λόγος" first because it "slipped twice this week", then "The genitive case" because it was "not seen for 3 weeks"
    And the talk shows the button "Move back to Frontier and practise"
    And nothing has moved yet
    When he taps "Move back to Frontier and practise"
    Then the word "λόγος" and the idea "case-genitive" are on the Frontier
    And Review is open with a round that asks "λόγος" and "The genitive case"

  @uc-learner-summary @greek
  Scenario: A spoken yes moves them as the tap does
    Given he has a solid word he slipped on and a solid idea he has not met for 3 weeks, and Lampas is opened on Romans 8 behind a fake Postern whose tutor says he is rusty
    When he opens the talk and asks "What should I work on?"
    Then the talk shows the button "Move back to Frontier and practise"
    When the tutor will take his next words as a yes
    And he says "yes, let's practise them"
    Then the second bible-talk grist carries the pending offer of kind rusty with the text "Move back to Frontier and practise"
    And the word "λόγος" and the idea "case-genitive" are on the Frontier
    And Review is open with a round that asks "λόγος" and "The genitive case"

  @uc-learner-summary @greek
  Scenario: A no leaves them where they are
    Given he has a solid word he slipped on and a solid idea he has not met for 3 weeks, and Lampas is opened on Romans 8 behind a fake Postern whose tutor says he is rusty
    When he opens the talk and asks "What should I work on?"
    Then the talk shows the button "Move back to Frontier and practise"
    When the tutor will take his next words as a no
    And he says "not now"
    Then the talk shows no button "Move back to Frontier and practise"
    And nothing has moved yet

  @uc-learner-summary @greek
  Scenario: Nothing rusty, nothing sent
    Given he has only a solid word he reviewed yesterday, and Lampas is opened on Romans 8 behind a fake Postern whose tutor says he is rusty
    When he opens the talk and asks "What should I work on?"
    Then the request carried no rusty items
    And the talk shows no button "Move back to Frontier and practise"

  @uc-learner-summary @hebrew
  Scenario: The tutor notices rust in his Hebrew
    Given he has a solid Hebrew word he slipped on and a solid Hebrew idea he has not met for 3 weeks, and Lampas is opened on Genesis 1 behind a fake Postern whose tutor says he is rusty
    When he opens the talk and asks "What should I work on?"
    Then the request carried 2 rusty Hebrew items, "אֶרֶץ" first because it "slipped twice this week", then "The Hebrew article" because it was "not seen for 3 weeks"
    And the request's learner line says he last met a Hebrew item "1 day ago"
    And the talk shows the button "Move back to Frontier and practise"
    And the talk draws "אֶרֶץ" in the Hebrew face, right to left
    When he taps "Move back to Frontier and practise"
    Then the Hebrew word "אֶרֶץ" and the Hebrew idea "he-article" are on the Frontier
    And Review is open
