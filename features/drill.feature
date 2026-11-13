@uc-parsing-drill @greek
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

  Scenario: The Grammar row on the drill shows and changes the extent, and an empty round offers the widest setting
    Given Lampas is opened for the first time with no grammar level
    When he opens the Parsing drill from the Test screen
    Then the drill's Grammar row has Any chosen
    When he taps Solid on the drill's Grammar row
    Then the Weave's Grammar setting is solid
    And the drill says no form fits his settings and offers Use Any grammar
    When he taps Use Any grammar
    Then the Weave's Grammar setting is any
    And the first question shows a word of Romans 8 in its verse and asks its part of speech with 4 choices

  Scenario: With Grammar on Solid every form uses only grammar he has solid
    Given Lampas is opened for the first time with every idea solid but the participle, which is at the frontier
    And the Weave's Grammar is Solid
    When he opens the Parsing drill from the Test screen
    Then no form asked in the whole round needs the participle

  Scenario: The idea he is learning now comes first when Grammar takes the frontier
    Given Lampas is opened for the first time with every idea solid but the aorist, which he is learning now
    And the Weave's Grammar is Solid and frontier
    When he opens the Parsing drill from the Test screen
    Then the first form asked uses the aorist

  Scenario: Off and + Learning on the drill's Words row are one choice and the screen says so
    Given Lampas is opened for the first time
    When he opens the Parsing drill from the Test screen
    Then the drill's Words row has Off chosen
    And the drill says Off and + Learning ask the same words here
    When he taps + Learning on the drill's Words row
    Then the drill says Off and + Learning ask the same words here
    When he taps Solid on the drill's Words row
    Then the drill does not say Off and + Learning ask the same words here
