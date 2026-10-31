@uc-learner-summary @greek
Feature: Welcome back after a break
  After a break of a week or more (the last day he used Lampas is 7 or more days ago), opening the app offers a short 'Welcome back' refresher of the most overdue solid
  words and ideas (mw-1vuvq6.6). Refresh opens a Review round of just those; Not now puts the card away for the day. Nothing is asked of him unless he taps.

  Scenario: Welcome back
    Given his last use of Lampas was 8 days ago and three solid items are overdue
    When Lampas is opened
    Then a Welcome back card names the most overdue first: "ὁδός", "The genitive case", "λόγος"
    When he taps "Refresh"
    Then Review is open with a round that asks "ὁδός", "The genitive case" and "λόγος"

  Scenario: Not now puts it away for the day
    Given his last use of Lampas was 8 days ago and three solid items are overdue
    When Lampas is opened
    Then a Welcome back card names the most overdue first: "ὁδός", "The genitive case", "λόγος"
    When he taps "Not now"
    Then there is no Welcome back card
    When Lampas is opened again
    Then there is still no Welcome back card

  Scenario: No break, no card
    Given his last use of Lampas was 3 days ago and three solid items are overdue
    When Lampas is opened
    Then there is no Welcome back card
