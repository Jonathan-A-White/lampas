Feature: The tutor offers the Greek gently to a reader who is not learning it
  A reader whose Reader is in English and who is not learning the Greek is answered in English. When his question shows real interest in the original, the tutor may
  leave ONE line offering to raise the Greek dial one step, `greek_offer` {kind word | view, text}, which the Talk sheet draws as a button (mw-yrmkdf.4, mw-3ased2.3). A tap raises
  the dial through its own function (and on a word offer then opens the Greek word's sheet); either way the sheet in front says so (mw-yrmkdf.10). A no, spoken or typed (the tutor's `offer_reply` decline), is written to the memory index as
  "said no to the Greek offer <date>", and nothing more is offered until he asks for Greek himself (`greek_asked`), which clears the line. At most one offer a talk. These
  scenarios run against a fake Postern whose mill answers each talk with the answer the scenario names.

  Scenario: The offer is a button that opens the Greek word
    Given Lampas is opened on Romans 8 in English behind a fake Postern whose tutor offers the Greek word
    When he opens the talk and asks "What does love really mean here?"
    Then the request told the tutor the Reader shows English
    And the request told the tutor the Greek dial is Just English, with Curious next
    And the talk shows the button "Want to try Curious: see this Greek word?"
    When he taps "Want to try Curious: see this Greek word?"
    Then the Greek dial is Curious
    And the word sheet for "ἀγαπάω" is open over the talk

  Scenario: The offer raises the Greek dial one step and nothing more
    Given Lampas is opened on Romans 8 in English behind a fake Postern whose tutor offers the Greek view
    When he opens the talk and asks "What does the original say here?"
    Then the talk shows the button "Want to raise the Greek to Curious?"
    When he taps "Want to raise the Greek to Curious?"
    Then the Greek dial is Curious
    And the Reader still shows English with the Weave off

  Scenario: A tap on the view offer is confirmed in the Talk sheet
    Given Lampas is opened on Romans 8 in English behind a fake Postern whose tutor offers the Greek view
    When he opens the talk and asks "What does the original say here?"
    Then the talk shows the button "Want to raise the Greek to Curious?"
    And the talk shows no confirmation
    When he taps "Want to raise the Greek to Curious?"
    Then the talk confirms "The Greek dial is now Curious."

  Scenario: A tap on the word offer is confirmed in the Talk sheet
    Given Lampas is opened on Romans 8 in English behind a fake Postern whose tutor offers the Greek word
    When he opens the talk and asks "What does love really mean here?"
    And he taps "Want to try Curious: see this Greek word?"
    Then the talk confirms "The Greek dial is now Curious. Opened the Greek word."

  Scenario: A no is remembered and nothing more is offered
    Given Lampas is opened on Romans 8 in English behind a fake Postern whose tutor offers the Greek view
    When he opens the talk and asks "What does the original say here?"
    Then the talk shows the button "Want to raise the Greek to Curious?"
    When the tutor will take his next words as a no
    And he says "no thanks"
    Then the second bible-talk grist carries the pending offer of kind greek with the text "Want to raise the Greek to Curious?"
    And the memory index says he said no to the Greek offer
    And the talk shows no button "Want to raise the Greek to Curious?"
    When the tutor offers the Greek view again
    And he asks again "why do translations differ?"
    Then the third bible-talk grist carries the memory line "said no to the Greek offer"
    And the talk still shows no button "Want to raise the Greek to Curious?"

  Scenario: Only one offer is kept in a talk
    Given Lampas is opened on Romans 8 in English behind a fake Postern whose tutor offers the Greek view
    When he opens the talk and asks "What does the original say here?"
    Then the talk shows the button "Want to raise the Greek to Curious?"
    When he says "and what about the next word?"
    Then the talk shows exactly 1 button "Want to raise the Greek to Curious?"

  Scenario: A phone that holds only the example words is offered the Greek
    Given Lampas is opened on Romans 8 in English on a phone that still holds only the 63 example words, behind a fake Postern whose tutor offers the Greek word
    When he opens the talk and asks "What does love really mean in Romans 8:28?"
    Then the request told the tutor the Reader shows English
    And the request told the tutor he has no solid words and is learning none
    And the talk shows the button "Want to try Curious: see this Greek word?"

  Scenario: Example words he has answered make him a Greek learner
    Given Lampas is opened on Romans 8 in English on a phone that still holds only the 63 example words, behind a fake Postern whose tutor offers the Greek word
    When he opens the talk and asks "What does love really mean in Romans 8:28?"
    Then the request told the tutor he knows 53 solid words

