Feature: Ask for more
  Settings > More has Ask for more, a page for asks that grow the app: an approach or programme, a study resource, a text or a
  translation. The page leads with Ask the tutor, the easiest way: it opens a talk with "I'd like Lampas to have " already typed,
  and the tutor offers to send the ask to the makers. Below it, Or fill in a form offers a short form for each of the four kinds;
  Send posts one grist of the kind feedback, carrying the form's kind and its fields.

  Scenario: Settings shows Ask for more, and its page leads with Ask the tutor
    Given Settings is open in the app behind a fake Postern
    Then Settings > More has the row "Ask for more"
    When he taps "Ask for more"
    Then the page "Ask for more" is open
    And its first button is "Ask the tutor"
    And under it "Or fill in a form" offers the four kinds

  Scenario: Ask the tutor opens a talk with the ask begun in the composer
    Given the Ask for more page is open in the app
    When he taps "Ask the tutor"
    Then a tutor talk is open
    And its composer holds "I'd like Lampas to have "
    And nothing has been sent to the mill

  Scenario Outline: Each form sends one feedback grist with its kind and fields
    Given the Ask for more page is open in the app
    When he opens the form "<form>"
    Then its Send button is disabled
    When he fills in the name "<name>", the reason "<why>" and the link "<link>"
    And he taps Send on the form
    Then the form says "Sent: the factory has it"
    And the mill received one feedback grist of kind "<kind>" with the name "<name>", the reason "<why>", the link "https://<link>" and the app version
    And the bus has heard feedback-sent for "<kind>"
    And the phone keeps one request of kind "<kind>" with the words "<name>: <why>"
    And Your requests lists it as "<label>"

    Examples:
      | form                     | kind           | name           | why                                    | link                 | label                 |
      | An approach or programme | approach       | Polis method   | It teaches Greek by speaking it.       | polisjerusalem.org   | Approach or programme |
      | A study resource         | study-resource | Logeion        | To look up a word in several lexicons. | logeion.uchicago.edu | Study resource        |
      | A text                   | text           | The Septuagint | To read the Old Testament in Greek.    | example.org/lxx      | Text                  |
      | A translation            | translation    | The ESV        | To read it beside the Greek.           | esv.org              | Translation           |

  Scenario: A form sends with the name alone
    Given the Ask for more page is open in the app
    When he opens the form "A translation"
    And he types only the name "The NASB"
    And he taps Send on the form
    Then the mill received one feedback grist of kind "translation" with the name "The NASB" alone and the app version

  Scenario: A mill that is down shows Could not reach the tutor and Retry
    Given the Ask for more page is open in the app and the mill is down
    When he opens the form "A study resource"
    And he types only the name "Logeion"
    And he taps Send on the form
    Then the form shows "Could not reach the tutor" and a Retry button
    When the mill is back and he taps Retry
    Then the form says "Sent: the factory has it"

  Scenario: With no licence the page says asking needs one, and offers no tutor and no form
    Given the Ask for more page is open on a phone with no licence
    Then the page shows "Needs a licence"
    And it has no "Ask the tutor" button and no form
