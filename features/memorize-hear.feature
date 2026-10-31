@uc-memorize @greek
Feature: Lampas hears me recall a verse
  The phone writes down what I say from memory, in the language of the verse. Greek is heard as Greek or not at all, never as English words. A phone that cannot hear Greek lets me
  grade myself. A verse in the Weave, which mixes the two languages, is recorded and checked by the mill.

  Scenario: I say the verse in Greek and the phone listens in Greek
    Given the Memorize session is open on "Rom.8.28" in Greek
    When I hold the bar and say the whole verse in Greek
    Then the phone listened in Greek and only in Greek
    And the recall is judged against the Greek and passes

  Scenario: My phone cannot hear Greek: I grade myself
    Given the Memorize session is open on "Rom.8.28" in Greek
    And my phone cannot take dictation in Greek
    When I hold the bar and say the whole verse in Greek
    Then the session says "This phone cannot hear Greek. Say it, then grade yourself."
    When I tap "I had it"
    Then the recall of "Rom.8.28" in Greek is kept as graded by myself and passes

  Scenario: A Weave recall is recorded and checked by the mill
    Given the Memorize session is open on "Rom.8.28" in the Weave with his solid words "εἴδω" and "ἀγαπάω"
    When I hold the bar and say the whole verse as the weave shows it
    Then the mill is sent my recording with the verse as the weave shows it, each piece in its language
    And no dictation was started
    When the mill answers that it was well read
    Then the recall of "Rom.8.28" in the Weave is kept as checked by the mill and passes
