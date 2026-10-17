Feature: The tutor offers the Greek gently to a reader who is not learning it
  A reader whose Reader is in English and who is not learning the Greek is answered in English. When his question shows real interest in the original, the tutor may
  leave ONE line offering to show the Greek, `greek_offer` {kind word | view, text}, which the Talk sheet draws as a button (mw-yrmkdf.4). A tap on a word offer opens the
  Greek word's sheet; a tap on a view offer switches the Reader to Greek. A no, spoken or typed (the tutor's `offer_reply` decline), is written to the memory index as
  "said no to the Greek offer <date>", and nothing more is offered until he asks for Greek himself (`greek_asked`), which clears the line. At most one offer a talk. These
  scenarios run against a fake Postern whose mill answers each talk with the answer the scenario names.

  Scenario: The offer is a button that opens the Greek word
    Given Lampas is opened on Romans 8 in English behind a fake Postern whose tutor offers the Greek word
    When he opens the talk and asks "What does love really mean here?"
    Then the request told the tutor the Reader shows English
    And the talk shows the button "Want to see the Greek word?"
    When he taps "Want to see the Greek word?"
    Then the word sheet for "ἀγαπάω" is open over the talk

  Scenario: The offer can switch the Reader to Greek
    Given Lampas is opened on Romans 8 in English behind a fake Postern whose tutor offers the Greek view
    When he opens the talk and asks "What does the original say here?"
    Then the talk shows the button "Want to read this chapter in Greek?"
    When he taps "Want to read this chapter in Greek?"
    Then the Reader shows the Greek

  Scenario: A no is remembered and nothing more is offered
    Given Lampas is opened on Romans 8 in English behind a fake Postern whose tutor offers the Greek view
    When he opens the talk and asks "What does the original say here?"
    Then the talk shows the button "Want to read this chapter in Greek?"
    When the tutor will take his next words as a no
    And he says "no thanks"
    Then the second bible-talk grist carries the pending offer of kind greek with the text "Want to read this chapter in Greek?"
    And the memory index says he said no to the Greek offer
    And the talk shows no button "Want to read this chapter in Greek?"
    When the tutor offers the Greek view again
    And he asks again "why do translations differ?"
    Then the third bible-talk grist carries the memory line "said no to the Greek offer"
    And the talk still shows no button "Want to read this chapter in Greek?"

  Scenario: Only one offer is kept in a talk
    Given Lampas is opened on Romans 8 in English behind a fake Postern whose tutor offers the Greek view
    When he opens the talk and asks "What does the original say here?"
    Then the talk shows the button "Want to read this chapter in Greek?"
    When he says "and what about the next word?"
    Then the talk shows exactly 1 button "Want to read this chapter in Greek?"

  Scenario: A phone that holds only the example words is offered the Greek
    Given Lampas is opened on Romans 8 in English on a phone that still holds only the 63 example words, behind a fake Postern whose tutor offers the Greek word
    When he opens the talk and asks "What does love really mean in Romans 8:28?"
    Then the request told the tutor the Reader shows English
    And the request told the tutor he has no solid words and is learning none
    And the talk shows the button "Want to see the Greek word?"

  Scenario: Example words he has answered make him a Greek learner
    Given Lampas is opened on Romans 8 in English on a phone that still holds only the 63 example words, behind a fake Postern whose tutor offers the Greek word
    When he opens the talk and asks "What does love really mean in Romans 8:28?"
    Then the request told the tutor he knows 53 solid words

