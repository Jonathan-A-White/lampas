Feature: A Memorize session takes me from reading a verse to saying it from nothing
  Where a verse is on its schedule picks how much of it I see: a new verse starts with read and say, a verse I know has more words gone each time, and the long check is
  from nothing. I hear it, hold the bar and say it from memory, and Lampas shows me what I missed and when it comes back.

  Scenario: A new verse starts with read and say
    Given the verse "John.1.16" is new in English
    When I open its Memorize session
    Then the session says "Read and say"
    And every word of the verse is shown

  Scenario: A verse I know starts with more words gone
    Given the verse "John.1.16" is at step 3 in English
    When I open its Memorize session
    Then the session says "Three quarters of the words gone"
    And 8 of its 10 words are blanks

  Scenario: The long check is from nothing
    Given the verse "John.1.16" is at the 90-day check in English
    When I open its Memorize session
    Then the session says "From nothing"
    And no word of the verse is shown

  Scenario: I miss a word and it comes back tomorrow
    Given the verse "John.1.16" is at step 2 in English
    When I open its Memorize session
    And I hold the bar and say the verse without the words "fullness" and "upon"
    Then the session says "Not yet: 2 words missed"
    And the words "fullness" and "upon" are marked
    And the session says "Due tomorrow"
    And the recall is kept as said with a score of 0.8
