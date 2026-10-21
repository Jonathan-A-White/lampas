Feature: Review asks grammar ideas, and asks them before words
  A grammar idea he is drilling comes back on the same back-off schedule as a word. Review draws the due ideas first,
  from the passage of his goal (or the chapter he has open), and asks each one as a question about that passage: the
  ending of a form, the form to tap in a verse, a letter, the stressed syllable. A weak idea is multiple choice; a strong
  one is a flashcard he grades himself.

  Scenario: Review counts ideas before words
    Given the idea "case-genitive" is due
    And 2 of his words are due
    When Lampas is opened on the Reader
    And he opens Review from Settings
    Then the Review screen says "Due today: 1 idea, 2 words"

  Scenario: A paradigm ending asked and answered right moves the idea on the schedule
    Given his goal is "1 John 1"
    And the idea "case-genitive" is due and was right once before
    And he has opened the table "noun-endings"
    And the draw asks "case-genitive" as a paradigm ending
    When Lampas is opened on the Reader
    And he opens Review from Settings
    And he starts the review
    Then the question blanks the end of a form and offers four endings
    When he taps the right ending
    Then the right ending turns green
    And "case-genitive" is on step 1 and due in 3 days
    And "case-genitive" is at the frontier

  # mw-svw421.5: an ending is asked only of a form whose table he has opened, and the table is one tap away after the answer.
  Scenario: An ending is asked only once its table is open
    Given his goal is "1 John 1"
    And the idea "case-genitive" is due
    And the draw would ask "case-genitive" as a paradigm ending if its table were open
    When Lampas is opened on the Reader
    And he opens Review from Settings
    And he starts the review
    Then the question is to tap the form
    When he opens the table "Noun endings" on the Paradigms screen
    And he opens Review from Settings again
    And he starts the review again
    Then the question blanks the end of a form and offers four endings
    And there is no "See the table" button
    When he taps the right ending
    Then "See the table" is shown
    When he taps "See the table"
    Then the Paradigms screen shows the table "Noun endings" to Drill
    When he goes Back
    Then the Review question is still on screen, answered

  Scenario: Tap the form shows the verse's words and the right one turns green
    Given his goal is "1 John 1"
    And the idea "case-dative" is due
    And the draw asks "case-dative" as tap the form
    When Lampas is opened on the Reader
    And he opens Review from Settings
    And he starts the review
    Then the question shows the words of one verse as buttons
    When he taps the right word
    Then the right word turns green
    And "case-dative" has one right review and no lapse

  # mw-emk3xt.2: no question asked what a form or a clause means; the verse's own English chunks answer it.
  Scenario: Review asks what a chunk says
    Given his goal is "1 John 1"
    And the idea "case-genitive" is due
    And the draw asks "case-genitive" as what a chunk says
    When Lampas is opened on the Reader
    And he opens Review from Settings
    And he starts the review
    Then the card shows the Greek large with Tap to hear and four English chunks
    When he taps the right English chunk
    Then the right English chunk turns green
    And "case-genitive" has one right review and no lapse
    And the letters of the chunk are credited

  Scenario: A strong idea asked what a chunk says shows the Greek and Show reveals the English
    Given his goal is "1 John 1"
    And the idea "case-genitive" is due on step 3
    And the draw asks "case-genitive" as what a chunk says
    When Lampas is opened on the Reader
    And he opens Review from Settings
    And he starts the review
    Then the card shows the Greek of a chunk and no options
    When he taps Show
    Then the English of the chunk is shown

  # mw-emk3xt.3: the Parsing drill's steps as one Review question, right only when every step is.
  Scenario: A full parsing in Review
    Given his goal is "1 John 1"
    And he knows every word and every idea of "1 John 1"
    And the idea "tense-perfect" is due on step 3
    And the draw asks "tense-perfect" as a full parsing of five steps
    When Lampas is opened on the Reader
    And he opens Review from Settings
    And he starts the review
    Then the card says "1 of 5" and asks the part of speech
    When he taps the right answer at every step
    Then the last step turns green and the full parsing is shown
    And "tense-perfect" has one right review and no lapse
    And five right answers are in the drills table for the word

  Scenario: A wrong step ends a full parsing and shows it in plain words
    Given his goal is "1 John 1"
    And he knows every word and every idea of "1 John 1"
    And the idea "tense-perfect" is due on step 3
    And the draw asks "tense-perfect" as a full parsing of five steps
    When Lampas is opened on the Reader
    And he opens Review from Settings
    And he starts the review
    And he taps the right answer at the first step
    Then the card says "2 of 5" and asks the tense
    When he taps a wrong answer
    Then the wrong answer turns red and the right one green
    And the full parsing is shown in plain words
    And "tense-perfect" has one wrong review
    And two answers are in the drills table for the word, one right and one wrong

  # mw-emk3xt.3: nothing asked who acts and who is acted on, which is what the cases are for.
  Scenario: Who does it
    Given his goal is "John 1"
    And he knows every word and every idea of "John 1"
    And the idea "case-nominative" is due
    And the draw asks "case-nominative" as "Tap the one who does it"
    When Lampas is opened on the Reader
    And he opens Review from Settings
    And he starts the review
    Then the card shows the words of one verse as buttons under "Tap the one who does it"
    When he taps the subject
    Then the subject turns green
    And "case-nominative" has one right review and no lapse

  # mw-br588b.3: a sentence idea is asked on its verses, not by its definition.
  Scenario: A clause idea is asked on its verse
    Given his goal is "1 John 1"
    And he knows every word and every idea of "1 John 1"
    And the idea "clause-hina" is due
    And the draw asks "clause-hina" as a use in "1 John 1:3"
    When Lampas is opened on the Reader
    And he opens Review from Settings
    And he starts the review
    Then the card shows "1 John 1:3" with ἵνα marked and four uses to choose from
    When he taps the right use
    Then the right use turns green
    And "clause-hina" has one right review and no lapse

  Scenario: A strong clause idea shows the verse and Show reveals its use
    Given his goal is "1 John 1"
    And he knows every word and every idea of "1 John 1"
    And the idea "clause-hina" is due on step 3
    And the draw asks "clause-hina" as a use in "1 John 1:3"
    When Lampas is opened on the Reader
    And he opens Review from Settings
    And he starts the review
    Then the card shows the verse "1 John 1:3" and the question and no options
    When he taps Show
    Then the title of the use is shown

  Scenario: A preposition is asked by the case of a real phrase
    Given his goal is "1 John 1"
    And the idea "preposition-dia" is due
    And the draw asks "preposition-dia" as a preposition's meaning
    When Lampas is opened on the Reader
    And he opens Review from Settings
    And he starts the review
    Then the question shows a New Testament phrase with διά and four meanings
    When he taps the meaning that goes with the phrase's case
    Then the right meaning turns green
    And "preposition-dia" has one right review and no lapse

  Scenario: A strong idea is asked with Show and I knew it
    Given his goal is "1 John 1"
    And the idea "case-genitive" is due on step 3
    When Lampas is opened on the Reader
    And he opens Review from Settings
    And he starts the review
    Then the idea is a flashcard with a Show control and no options
    When he taps Show
    Then the answer is shown with "I knew it" and "Not yet"
    When he taps "I knew it"
    Then "case-genitive" has one right review and no lapse

  Scenario: A wrong answer brings the idea back tomorrow
    Given his goal is "1 John 1"
    And the idea "case-dative" is due
    And the draw asks "case-dative" as tap the form
    When Lampas is opened on the Reader
    And he opens Review from Settings
    And he starts the review
    And he taps a wrong word
    Then the wrong word turns red and the right one green
    And "case-dative" is on step 0 and due in 1 day with one lapse

  Scenario: With no goal the question comes from the chapter he has open
    Given he has 1 John 2 open and no goal
    And the idea "case-genitive" is due
    When Lampas is opened on the Reader
    And he opens Review from Settings
    And he starts the review
    Then the question is about a verse of 1 John 2

  # mw-emk3xt.4: every passage question is drawn from the verses at his level. 1 John 1 has a finite verb in every verse, so with the verbs not yet none is at his level there;
  # Romans 8:6 has no verb at all and a genitive.
  Scenario: Review asks from verses at his level
    Given his goal is "Romans 8"
    And he knows every word of "Romans 8" and every idea but the verbs'
    And the idea "case-genitive" is due
    Then 20 draws of "case-genitive" are all about "Romans 8:6", a verse with a genitive and no verb, though other verses have one
