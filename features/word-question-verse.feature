Feature: A word question's 'in Hebrews 8:9 as ἐκ' line opens the verse with the word marked
  After he answers a word question (the Quick test and Review draw it the same way) the line under the Greek word says where the form stands: 'in Hebrews 8:9 as ἐκ'.
  The reference is a link: a tap opens the verse card the tutor's references open (ReferenceCard), showing that verse in the view he reads in, the Greek
  or the English with the Weave, with the word marked. Closing it returns to the same card, answered as it was.

  Scenario: The reference on an answered card is a link and an unanswered card has no line
    Given a word question for ἐκ in Hebrews 8:9 that he has not answered
    Then the card has no 'in … as …' line
    When he answers it
    Then the line reads "in Hebrews 8:9 as ἐκ" and "Hebrews 8:9" is a link

  Scenario: In the Greek view the card shows the Greek verse with ἐκ marked
    Given the reader's view is Greek
    And a word question for ἐκ in Hebrews 8:9 that he has answered
    When he taps the reference "Hebrews 8:9"
    Then a card headed "Hebrews 8:9" shows the Greek verse
    And the word "ἐκ" is marked on the card

  Scenario: In the English view with ἐκ in the Weave the card shows the verse woven with ἐκ marked
    Given the reader's view is English with the Weave Solid and ἐκ a solid word
    And a word question for ἐκ in Hebrews 8:9 that he has answered
    When he taps the reference "Hebrews 8:9"
    Then a card headed "Hebrews 8:9" shows the English verse
    And the word "ἐκ" is marked on the card
    And the word "ἐκ" stands woven in the English

  Scenario: Closing the card leaves the question answered, and a double tap opens one card
    Given the reader's view is Greek
    And a word question for ἐκ in Hebrews 8:9 that he has answered
    When he taps the reference "Hebrews 8:9" twice quickly
    Then one card is showing
    When he closes the card
    Then no card is showing
    And the question is still answered with the line in place
