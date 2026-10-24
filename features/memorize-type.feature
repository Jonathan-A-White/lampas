Feature: I can type a verse from memory
  Besides saying it, I can type a verse I am learning. English can always be typed. Greek can be typed once I have told Lampas that my phone has a Greek keyboard (the Settings
  switch "Greek keyboard"). The Weave mixes the two languages, so it is only spoken. What I type is checked the way what I say is: capitals, punctuation, accents and breathings do not count.

  Scenario: I type the verse in English
    Given the verse "John.1.16" is new in English
    When I open its Memorize session
    And I tap "Type it"
    And I type "from his fullness we have all received grace upon grace"
    And I check what I typed
    Then the session says "Got it: 10 of 10 words"
    And the recall is kept as typed with a score of 1

  Scenario: I type Greek once I have a Greek keyboard
    Given the verse "Rom.8.28" is new in Greek
    When I open its Memorize session
    Then the session says "Turn on Greek keyboard in Settings to type Greek"
    And there is no way to type
    When I turn on Greek keyboard in Settings
    And I tap "Type it"
    And I type the Greek of the verse without accents
    And I check what I typed
    And the session says "Got it"
    And the recall is kept as typed with a score of 1

  Scenario: Weave is only spoken
    Given the verse "Rom.8.28" is new in the Weave
    When I open its Memorize session
    Then there is no way to type
    And the session offers "Hold to say it"
