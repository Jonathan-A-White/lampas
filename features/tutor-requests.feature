Feature: The tutor knows his requests
  The requests he sent to the factory (Your requests, #/requests) ride with every verse-ask and bible-talk request as `requests`: at most the
  10 newest, each with its summary, where it stands (sent, filed, building, landed, declined, adopted-as-setting, built-differently, moved) and what that
  status carries (the version it landed in, the reason it was declined or built another way, the setting it became). The tutor answers 'what happened to my idea' from
  them and, for an idea that became a setting, offers to switch it on. The grinds are read by the mill, so these scenarios prove what the
  phone sends and what it does with a fake tutor's answer; grinds/examples/ hold the live scenarios.

  Scenario Outline: The Bible talk is sent how his request stands, and shows the tutor's answer
    Given Lampas is opened on #/goal behind a fake Postern with the request "Add a sepia theme" <status> <detail>
    When he asks the tutor about this screen "What happened to my idea?" and the tutor answers "<reply>"
    Then the grist carried 1 request, "Add a sepia theme", as <status> <detail>
    And the Talk sheet shows the answer "<reply>"

    Examples:
      | status             | detail                            | reply                                                              |
      | sent               | -                                 | Your idea Add a sepia theme was sent; the factory has not filed it yet. |
      | filed              | -                                 | Your idea Add a sepia theme is filed with the makers.              |
      | building           | -                                 | Your idea Add a sepia theme is being built now.                    |
      | landed             | version 0.1.86                    | Your idea Add a sepia theme landed in version 0.1.86.              |
      | declined           | reason outside what this app is for | Your idea Add a sepia theme was declined: it is outside what this app is for. |
      | adopted-as-setting | setting Settings > Appearance > Theme | Your idea became the setting Theme. Shall I switch it on?     |
      | built-differently  | reason Theme now has a Sepia choice | Your idea Add a sepia theme was built another way: Theme now has a Sepia choice. |
      | moved              | -                                 | Your idea Add a sepia theme is now part of another story.          |

  Scenario: The tutor offers to switch on an adopted setting and a tap does it
    Given Lampas is opened on #/goal behind a fake Postern with the request "Make it dark" adopted-as-setting setting Settings > Appearance > Theme
    When he asks the tutor about this screen "What happened to my idea?" and the tutor answers "Your idea became the setting Theme. Shall I set it to Dark?" with the offer to change Theme to Dark
    Then the Talk sheet shows the offer "Change Theme: Dark"
    When he taps the offer "Change Theme: Dark"
    Then the setting "theme" is saved as "dark"

  Scenario: Only the 10 newest requests are sent, newest first
    Given Lampas is opened on #/goal behind a fake Postern with 12 requests, "Idea 1" the oldest
    When he asks the tutor about this screen "What happened to my ideas?" and the tutor answers "Ten of them."
    Then the grist carried 10 requests, "Idea 12" first and "Idea 3" last

  Scenario: With no request kept the grist carries no requests
    Given Lampas is opened on #/goal behind a fake Postern with 0 requests
    When he asks the tutor about this screen "What happened to my idea?" and the tutor answers "You have sent none."
    Then the grist carried no requests

  Scenario: The Verse view's Ask the tutor is sent his requests too
    Given Lampas is opened on the Verse view of Romans 8 with Ask the tutor chosen behind a fake Postern with the request "Add a sepia theme" landed version 0.1.86
    When he asks "What happened to my idea?" by the composer and the tutor answers "Your idea landed in version 0.1.86."
    Then the verse-ask grist carried 1 request, "Add a sepia theme", as landed version 0.1.86
    And the Verse view shows the answer "Your idea landed in version 0.1.86."
