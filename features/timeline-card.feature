Feature: The timeline's cards, the verse tap and the chapter turn
  A tap on an event of the timeline strip raises its card from the strip's foot (mw-fnvjof.17.317.3, docs/timeline-design.md 'The card'): its title, its date (with "about" wherever
  the data gives a year and no day) and length, its verses as chips and its people. A verse chip moves the text: one of the open chapter brings its verse to the top of the
  passage, one of another chapter opens that chapter, and the strip follows to the new chapter's time. A life opens the person's card, whose rows open the events; the ruler,
  where it is busy, lists what found no lane. jsdom has no layout: the steps give the strip a box of 390 by 282 px, and the layout, the scroll and the flight are proven by
  tests/e2e/timeline-card.spec.ts.

  Scenario: A tap on an event shows its card: title, date, verses and people
    Given the Timeline is docked beside "Isaiah 1"
    When he presses the mark "Prophecies of Isaiah, about 759 to 697 BC"
    Then the card is headed "Prophecies of Isaiah"
    And the card says "about 759 to 697 BC · 62 years"
    And the card has the verse chip "Isaiah 1–66", marked as the open chapter's
    And the card names "Isaiah" in plain words
    And the mark "Prophecies of Isaiah, about 759 to 697 BC" is the chosen one
    When he presses "Close" on the card
    Then the strip has no card
    And no mark is the chosen one

  Scenario: Escape shuts the card, and so does a second tap on its mark
    Given the Timeline is docked beside "Isaiah 1"
    When he presses the mark "Prophecies of Isaiah, about 759 to 697 BC"
    Then the card is headed "Prophecies of Isaiah"
    When he presses Escape
    Then the strip has no card
    When he presses the mark "Prophecies of Isaiah, about 759 to 697 BC" once more
    Then the card is back, headed "Prophecies of Isaiah"
    When he presses the same mark again
    Then the card is gone

  Scenario: A verse chip of the open chapter brings its verse to the top of the passage
    Given the Timeline is docked beside "Isaiah 1"
    When he presses the mark "Prophecies of Isaiah, about 759 to 697 BC"
    And he presses the verse chip "Isaiah 1–66"
    Then verse 1 is brought to the top of the passage
    And the Reader is still on "Isaiah 1"
    And the card is headed "Prophecies of Isaiah"

  Scenario: A life opens the person's card, and a row opens the event
    Given the Timeline is docked beside "Isaiah 1"
    When he presses the mark "Hezekiah, about 752 to 697 BC"
    Then the card is headed "Hezekiah"
    And the card says "about 752 to 697 BC · 55 years"
    And the card has the rows "Reign of Hezekiah" with "726 to 697 BC" and "Death of Hezekiah" with "697 BC"
    When he presses the row "Reign of Hezekiah"
    Then the card changes to "Reign of Hezekiah"
    And the card now says "about 726 to 697 BC · 29 years"
    And the card has the verse chip "2 Kings 18–20", of another chapter
    And the card offers the person "Hezekiah" as a button

  Scenario: A verse chip of another book opens that chapter, and the strip follows to its time
    Given the Timeline is docked beside "Isaiah 1"
    When he presses the mark "Hezekiah, about 752 to 697 BC"
    And he presses the row "Reign of Hezekiah"
    And he presses the verse chip "2 Kings 18–20"
    Then the Reader opens "2 Kings 18"
    And verse 1 is brought to the top of the passage
    And the strip comes to stand on "2 Kings 18"
    And the strip has no card

  Scenario: The ruler, where it is busy, lists what found no lane, and a row opens its card
    Given the Timeline is docked beside "Isaiah 1"
    When he presses the ruler where several marks have no lane
    Then the card is headed as that place on the ruler is named
    And the card has a row for each mark there
    When he presses the first row of the card
    Then the card is headed with that row's name
    And that row's mark is the chosen one
