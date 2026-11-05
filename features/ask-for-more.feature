Feature: Ask for more
  Settings > More has Ask for more, a page for asks that grow the app: an approach or programme, a study resource, a text or a
  translation. Every such ask goes through the tutor (mw-5r3p30.726): the page has one button, Ask the tutor, which opens a talk
  with "I'd like Lampas to have " already typed, and the tutor offers to send the ask to the makers. The page has no form of its own.

  Scenario: Settings shows Ask for more, and its page leads with Ask the tutor
    Given Settings is open in the app behind a fake Postern
    Then Settings > More has the row "Ask for more"
    When he taps "Ask for more"
    Then the page "Ask for more" is open
    And its first button is "Ask the tutor"
    And it has no "Or fill in a form" section and no form

  Scenario: Ask the tutor opens a talk with the ask begun in the composer
    Given the Ask for more page is open in the app
    When he taps "Ask the tutor"
    Then a tutor talk is open
    And its composer holds "I'd like Lampas to have "
    And nothing has been sent to the mill

  Scenario: After the tutor's offer is sent, Sent links to Your requests, where the makers' answer comes back
    Given the Ask for more page is open in the app and the tutor offers to send his ask to the makers
    When he taps "Ask the tutor"
    And he sends "I'd like Lampas to have the Polis method"
    And he taps "Send this to the makers"
    Then the offer says "Sent" and "The answer will come back." with a link "Your requests"
    When he taps the link "Your requests"
    Then the talk is closed
    And the page "Your requests" is open
    And its heading "Your requests" is in view

  Scenario: With no licence the page says asking needs one, and offers no tutor
    Given the Ask for more page is open on a phone with no licence
    Then the page shows "Needs a licence"
    And it has no "Ask the tutor" button
