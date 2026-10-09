Feature: Tips
  Lampas lets him start right away and helps him grow with it. At most once a day, at the start of a sitting and only online, the
  phone sends a 'tips' grist (bsv-kit/grist, as the tutor does) holding a summary of what he uses and the ids of the tips he was
  shown. The answer is a small card under the Reader's header strip. 'Show me' opens the screen the tip is about, 'Not now'
  dismisses it. The ids shown are kept in Dexie and sent next time. Settings has a Tips switch, On by default; Off sends nothing.
  These scenarios run against a fake Postern whose mill opens the grist and answers it.

  Scenario: With Tips On and no tip today a grist is sent and the card shows
    Given Lampas is opened with Tips On, no tip yet today, and a mill that offers the tip "try-review"
    Then the mill received one grist for the lampas app, kind tips
    And its input carries a usage summary and no shown tips
    And the tip card under the Reader's header says "Try Review" with Show me and Not now

  Scenario: Not now keeps the id and no second grist is sent that day
    Given Lampas is opened with Tips On, no tip yet today, and a mill that offers the tip "try-review"
    When he taps Not now on the tip card
    Then the tip card is gone
    And the tip "try-review" is kept as shown
    When Lampas is opened again the same day
    Then the mill received no more grists
    And no tip card shows

  Scenario: The next day the shown ids are sent and a tip already shown is never shown again
    Given Lampas is opened with Tips On, no tip yet today, and a mill that offers the tip "try-review"
    When he taps Not now on the tip card
    And Lampas is opened the next day, and the mill offers "try-review" again
    Then the mill received a second grist whose input lists the shown tip "try-review"
    And no tip card shows

  Scenario: A tip he has not answered is still there when he comes back, without a new grist
    Given Lampas is opened with Tips On, no tip yet today, and a mill that offers the tip "try-review"
    When Lampas is opened again the same day
    Then the mill received no more grists
    And the tip card under the Reader's header says "Try Review" with Show me and Not now

  Scenario: Show me opens the screen the tip is about and closes the card
    Given Lampas is opened with Tips On, no tip yet today, and a mill that offers the tip "try-review"
    When he taps Show me on the tip card
    Then the Review screen is shown
    And the tip "try-review" is kept as shown

  Scenario: A tip with no screen has one button, Got it
    Given Lampas is opened with Tips On, no tip yet today, and a mill that offers a tip with no screen
    Then the tip card has Got it and no Show me

  Scenario: Tips Off sends nothing
    Given Lampas is opened with Tips Off and a mill that offers the tip "try-review"
    Then the mill received no grist
    And no tip card shows

  Scenario: Offline nothing is sent
    Given Lampas is opened with Tips On, no tip yet today, offline
    Then the mill received no grist
    And no tip card shows

  Scenario: A mill with no tip to offer leaves no card
    Given Lampas is opened with Tips On, no tip yet today, and a mill that has no tip
    Then the mill received one grist for the lampas app, kind tips
    And no tip card shows

  Scenario: Tips is a setting, On by default, and Off stops the sends
    Given Lampas is opened on Settings with Tips unset
    Then the Tips setting reads On
    When he sets Tips to Off
    Then the bus has heard Tips is off
    And the Tips setting reads Off
