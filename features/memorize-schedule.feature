@uc-memorize @greek
Feature: A verse I memorize comes back on the schedule
  A memorized verse is on the same back-off schedule as a word (1, 3, 7, 14, 30, 60 days), one row for each language he learns it in. He recalls it and it comes back
  later; he misses it and it comes back tomorrow. Review does not count his verses: Memorize asks for them by themselves.

  Scenario: A verse I recall twice comes back later
    Given he memorizes "Rom.8.28" in English
    When he recalls "Rom.8.28" in English fully on day 0
    Then "Rom.8.28" in English is due on day 1
    When he recalls "Rom.8.28" in English fully on day 1 again
    Then "Rom.8.28" in English is due on day 4 and no sooner

  Scenario: A verse I miss comes back tomorrow
    Given he memorizes "Rom.8.28" in English
    And "Rom.8.28" in English has been recalled fully twice in a row 3 times
    When he recalls "Rom.8.28" in English with 80 percent on day 30
    Then "Rom.8.28" in English is due on day 31
    And the recall of day 30 is kept with its score and its gap of 25 days

  Scenario: Review does not count my verses
    Given he memorizes "Rom.8.28" in English
    And "John.3.16" in Greek is memorized too
    Then Review counts 0 items due
    And Memorize counts 2 verses due
