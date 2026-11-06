Feature: Tools
  The Reader's header has a Menu (three lines) where the gear was. It opens a small menu of two rows, Tools and Settings, each an icon beside its word.
  Tools (mw-5r3p30.754) holds what works on the Bible without being the Bible: Your Logos library, Verse lists, Memorize, Paradigms, Words and Review.
  They left Settings; each opens the screen it always opened and Back returns to Tools. The Settings search still finds them, 'in Tools'.

  Scenario: The Menu holds Tools and Settings, each with an icon, and Back closes it
    Given Lampas is opened on Romans 8
    When he opens the Menu
    Then the Menu has the rows "Tools" and "Settings", each with an icon
    When he taps the phone's Back
    Then the Menu is closed
    And the reader is shown

  Scenario: Settings in the Menu opens Settings, as the gear did
    Given Lampas is opened on Romans 8
    When he opens Settings from the reader's Menu
    Then the Settings screen is shown
    And the address is "#/settings"
    And the Settings groups do not list Tools

  Scenario: Tools lists the library, the verse lists, Memorize, Paradigms, Words and Review
    Given Lampas is opened on Romans 8 with Logos on
    When he opens Tools from the reader's Menu
    Then the Tools screen lists "Your Logos library", "Verse lists", "Memorize", "Paradigms", "Words" and "Review" in that order
    And the address is "#/tools"

  Scenario Outline: Each tool opens its screen and Back returns to Tools
    Given Lampas is opened on Romans 8 with Logos on
    When he opens Tools from the reader's Menu
    And he opens the tool "<tool>"
    Then the screen "<screen>" is shown
    When he taps "<back>" on the tool's screen
    Then the Tools screen is shown

    Examples:
      | tool               | screen             | back    |
      | Your Logos library | Your Logos library | ‹ Tools |
      | Verse lists        | Verse lists        | ‹ Tools |
      | Memorize           | Memorize           | ‹ Back  |
      | Paradigms          | Paradigms          | ‹ Tools |
      | Words              | Words              | ‹ Tools |
      | Review             | Review             | ‹ Tools |

  Scenario: The Settings pages no longer hold the tools, and the Settings search finds one and opens it
    Given Lampas is opened on Romans 8 with Logos on
    When he opens Settings from the reader's Menu
    Then no Settings group page holds a row named "Words", "Review", "Paradigms" or "Your Logos library"
    When he searches Settings for "review"
    Then the search lists "Review" in Tools
    When he opens the found tool "Review"
    Then the screen "Review" is shown
