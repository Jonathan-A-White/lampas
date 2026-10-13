Feature: The tutor bridges a question he is not ready for
  Asked about something that rests on grammar he has not learned, the tutor still answers briefly at his level, then names up to three of the
  ideas it rests on (`bridge.missing`, most important first) and offers to take him to the one that is his next step (`bridge.next`, mw-1vuvq6.5).
  The device works out what he lacks from the question and his levels (`missing_foundations`, lowest unmet need first), so the model never guesses
  and the app opens the lowest unmet need whatever the model says. The talk shows 'Take me there: <title>'; a tap, or a spoken yes (carried to the
  tutor as `pending_offer` of kind bridge, like the other offers), opens that idea's sheet over the talk. Back returns to the talk and its history.
  These scenarios run against a fake Postern whose mill answers each talk with the answer the scenario names.

  Scenario: The tutor takes him to the foundation he lacks
    Given only the letters are solid and Lampas is opened on 1 John 1 behind a fake Postern whose tutor names the foundations he lacks
    When he opens the talk and asks "Why is the genitive used in 1 John 1:1?"
    Then the request carried the foundations he lacks, the lowest first, "diphthongs"
    And the talk shows the button "Take me there: Pairs of vowels"
    When he taps "Take me there: Pairs of vowels"
    Then the idea sheet "Pairs of vowels" is open over the talk
    When he goes Back
    Then the talk is shown again with its first turn and the button "Take me there: Pairs of vowels"

  Scenario: A spoken yes takes him there as the tap does, once
    Given only the letters are solid and Lampas is opened on 1 John 1 behind a fake Postern whose tutor names the foundations he lacks
    When he opens the talk and asks "Why is the genitive used in 1 John 1:1?"
    Then the talk shows the button "Take me there: Pairs of vowels"
    When the tutor will take his next words as a yes
    And he says "yes, take me there"
    Then the second bible-talk grist carries the pending offer of kind bridge with the text "Take me there: Pairs of vowels"
    And exactly one idea sheet "Pairs of vowels" is open over the talk
    When he goes Back
    Then the talk is shown again with its first turn and the button "Take me there: Pairs of vowels"

  Scenario: Missing quite a bit, he is shown three and taken to the next step
    Given only the letters are solid and Lampas is opened on 1 John 1 behind a fake Postern whose tutor lists the three most direct of the six
    When he opens the talk and asks "Why is the genitive used in 1 John 1:1?"
    Then the talk lists exactly 3 foundations he is missing and says there is more
    And the talk shows the button "Take me there: Pairs of vowels"
    When he taps "Take me there: Pairs of vowels"
    Then the idea sheet "Pairs of vowels" is open over the talk

  Scenario: A question about no grammar gets no bridge
    Given only the letters are solid and Lampas is opened on 1 John 1 behind a fake Postern whose tutor names the foundations he lacks
    When he opens the talk and asks "What does this verse mean?"
    Then the request carried no foundations
    And the talk shows no button "Take me there: Pairs of vowels"
