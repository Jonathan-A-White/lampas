Feature: Ask for another approach
  The end of Settings > Grammar approach has a button, Ask for another approach. It opens a sheet where he says what approach he
  wants and how it teaches, adds up to four screenshots or photos (shrunk on the phone) and names who to credit, with a link if
  there is one. Send posts one grist of the kind feedback for the lampas app to the factory, with the pictures attached. The
  receiving side is Postern's. Four is the most files bsv-kit lets one grist carry.

  Scenario: Ask for another approach at the end of Settings > Grammar approach opens the sheet
    Given Settings is open behind a fake Postern
    Then Ask for another approach is the last control of the Grammar approach section
    When he taps Ask for another approach
    Then the sheet "Ask for another approach" is open with its three fields and Send
    And the Send button is disabled

  Scenario: Send is disabled until the text and the credit are filled
    Given the Ask for another approach sheet is open
    When he types the approach "Teach the cases with colours, one at a time."
    Then the Send button is disabled
    When he types the credit name "Anna Example"
    Then the Send button is enabled

  Scenario: Sending with two pictures posts one grist for the lampas app, kind feedback, with two image attachments
    Given the Ask for another approach sheet is open
    And he adds two pictures
    And he types the approach "Teach the cases with colours, one at a time."
    And he types the credit name "Anna Example"
    And he types the credit link "https://example.org/greek"
    When he taps Send
    Then the mill received one grist for the lampas app of the kind feedback
    And its input has kind grammar-approach, the text, the credit name and link and the app version
    And it carries two image attachments, each shrunk and under 300 KB
    And the bus has heard feedback-sent for grammar-approach

  Scenario: The answer shows Sent: the factory has it
    Given the Ask for another approach sheet is filled in and the mill answers
    When he taps Send
    Then the sheet shows "Sent: the factory has it"
    And Done closes the sheet

  Scenario: A mill that is down shows Could not reach the tutor and Retry
    Given the Ask for another approach sheet is filled in and the mill is down
    When he taps Send
    Then the sheet shows "Could not reach the tutor" and a Retry button
    When the mill is back and he taps Retry
    Then the sheet shows "Sent: the factory has it"

  Scenario: A fifth picture is refused with a line saying four at most
    Given the Ask for another approach sheet is open
    And he adds four pictures
    When he adds one more picture
    Then the sheet says "Four pictures at most"
    And four pictures are listed
    When he removes the first picture
    Then three pictures are listed
