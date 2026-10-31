@uc-reading-ladder @greek
Feature: Every reading is kept, and the sounds or words he misreads are tallied
  The reading check keeps his last result of a verse (src/data/repositories/readings.ts). It also keeps every reading in a
  history and tallies where he slips, so the ladder can see where he struggles: in the Greek view, the diphthongs and consonant
  pairs (the sounds tier of src/data/grammar/ladder.ts) found in the chunks of each word he misread; in the English view, the
  word itself. The tally counts his last five readings in that language, so a sound he has stopped missing fades out of it.

  Scenario: Two readings of one verse leave two history rows and the last result
    Given he has read Romans 8:28 in English and the mill sent back one word to fix
    When he reads Romans 8:28 in English again and the mill sent back no word to fix
    Then the history holds 2 readings of "rom.8.28"
    And the last result of Romans 8:28 in English is well read, as it was kept before

  Scenario: A Greek word whose chunks hold ου tallies the ου sound
    When he reads Romans 8:28 in Greek and the mill marks "οὐρανοῦ" in the chunks "οὐ", "ρα", "νοῦ"
    Then the Greek tally holds "diphthong-ou" once
    And the Greek tally holds nothing else

  Scenario: A consonant pair that falls across two chunks is tallied
    When he reads Romans 8:28 in Greek and the mill marks "ἄγγελος" in the chunks "ἄγ", "γε", "λος"
    Then the Greek tally holds "pair-gg" once

  Scenario: Two vowels that are two sounds are not a diphthong
    When he reads Romans 8:28 in Greek and the mill marks "προΐστημι" in the chunks "προ", "ΐ", "στη", "μι"
    Then the Greek tally holds nothing

  Scenario: Two words of one reading that hold the same sound tally the reading once
    When he reads Romans 8:28 in Greek and the mill marks "οὐρανοῦ" and "οὖν" in one reading
    Then the Greek tally holds "diphthong-ou" once

  Scenario: An English word he misread tallies the word
    When he reads Romans 8:28 in English and the mill marks "Blessed" in the chunks "bless", "ed"
    Then the English tally holds "blessed" once
    And the Greek tally holds nothing

  Scenario: A reading older than his last five no longer counts
    Given he has read 6 verses in English, the first marking "predestined" and the others marking nothing
    Then the English tally holds nothing
    And the history holds 6 readings

  Scenario: A miss within his last five readings still counts
    Given he has read 5 verses in English, the first marking "predestined" and the others marking nothing
    Then the English tally holds "predestined" once
