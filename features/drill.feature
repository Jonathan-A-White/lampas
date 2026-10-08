Feature: A parsing drill on the chapter
  From Romans 8, the chapter he reads, the Parsing drill asks ten words whose lemma he knows (solid or
  learning, the learning ones first). Each word is asked step by step: its part of speech first, then
  for a verb its tense, voice and mood, and for a noun its case, then number and gender. Every step has
  four choices and shows at once whether it was right; a miss shows the right choice and the full
  parsing in words. Every question has two links: Ask the tutor (the Ask box on that verse, with the
  question written for him) and Talk about it (the Talk sheet on that verse). The results are kept per
  word and step.

  Scenario: The Parsing drill on Romans 8 asks ten words he knows, part of speech first
    Given Lampas is opened for the first time
    When he opens the Parsing drill from the Test screen
    Then the first question shows a word of Romans 8 in its verse and asks its part of speech with 4 choices
    When he answers every step of every question rightly
    Then ten different words he knows were asked, each beginning with its part of speech

  Scenario: A verb asks tense, voice and mood in steps and a wrong step shows the right one and the full parsing
    Given Lampas is opened for the first time
    When he opens the Parsing drill from the Test screen
    And he goes on to a verb
    And he answers the part of speech rightly and goes on
    Then the verb is asked its tense
    When he taps a wrong choice for the tense
    Then the tapped choice is red, the right tense is green and the full parsing of the word is shown
    When he goes on to the next step
    Then the verb is asked its voice
    When he answers the voice rightly and goes on
    Then the verb is asked its mood

  Scenario: A noun asks case, number and gender
    Given Lampas is opened for the first time
    When he opens the Parsing drill from the Test screen
    And he goes on to a noun
    And he answers the part of speech rightly and goes on
    Then the noun is asked its case
    When he answers the case rightly and goes on
    Then the noun is asked its number and gender

  Scenario: Ask the tutor opens the Ask box on that verse with the question prefilled
    Given Lampas is opened for the first time
    When he opens the Parsing drill from the Test screen
    And he taps Ask the tutor
    Then the Reader opens on the verse of that word with the Ask box holding the question about the word
    When he goes Back
    Then the drill is on the same question again

  Scenario: Talk about it opens the Talk sheet on that verse
    Given Lampas is opened for the first time
    When he opens the Parsing drill from the Test screen
    And he taps Talk about it
    Then the Talk sheet opens on the verse of that word

  Scenario: The score shows at the end and results survive a reload
    Given Lampas is opened for the first time
    When he opens the Parsing drill from the Test screen
    And he answers every step rightly except the first step of the first word
    Then the score reads one word short of the round
    And every step he answered is kept for its word
    When Lampas is opened again without clearing anything
    Then the steps he answered are still kept for their words
