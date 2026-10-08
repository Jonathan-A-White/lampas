Feature: A word I get wrong comes back sooner
  Every word he answers in the Quick test goes on a back-off schedule: a word he gets right twice in a row
  comes back after a longer gap (1, 3, 7, 14, 30, 60 days), and a word he gets wrong comes back tomorrow and
  loses two steps. His seeded words start on the schedule, the solid ones spread over the month.

  Scenario: A word I get right twice comes back later
    Given the word "λέγω" is in his list
    When he answers "λέγω" right on day 0
    Then "λέγω" is due on day 1
    When he answers "λέγω" right on day 1 again
    Then "λέγω" is due on day 4 and no sooner

  Scenario: A word I get wrong comes back sooner
    Given the word "λέγω" is in his list
    And "λέγω" has been right twice in a row 3 times
    When he answers "λέγω" wrong on day 30
    Then "λέγω" is due on day 31
    And "λέγω" has lapsed once

  Scenario: His words start on the schedule
    Given 40 solid words and 5 learning words are in his list
    When Lampas is opened after the upgrade
    Then the 5 learning words are due now
    And the 40 solid words are due over the next 30 days
