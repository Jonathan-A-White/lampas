@uc-reading-ladder @greek
Feature: A sound or word he keeps missing gets a drill, and review on the schedule
  The reading check tallies the sounds (Greek) or words (English) among the words he misread in his last five readings in that language
  (features/reading-history.feature). When one is missed in two of those readings, the reading panel offers 'Drill this sound' (Greek) or
  'Drill these words' (English). The drill is a sheet: a card with the one thing to remember (the sounds tier's rule, with a speaker), then five
  short New Testament words heavy in that sound, easiest first (or his misread words), each read aloud with the same verse-read grist at word size,
  then back to the ladder. A drilled unit goes on the back-off schedule as a review of kind `sound`, shown on the Review screen like the paradigms.

  Scenario: Two misses of ου in his last five readings offer a drill of the sound
    Given Lampas is opened on Romans 8 in Greek behind a fake Postern that finds nothing to fix
    And he misread an ου word in 2 of his last 5 readings in Greek
    When he opens the reading check of verse 28
    Then the reading panel offers "Drill this sound" and not "Drill these words"

  Scenario: One miss shows no drill
    Given Lampas is opened on Romans 8 in Greek behind a fake Postern that finds nothing to fix
    And he misread an ου word in 1 of his last 5 readings in Greek
    When he opens the reading check of verse 28
    Then the reading panel offers neither "Drill this sound" nor "Drill these words"

  Scenario: The drill shows the rule and five words containing ου
    Given Lampas is opened on Romans 8 in Greek behind a fake Postern that finds nothing to fix
    And he misread an ου word in 2 of his last 5 readings in Greek
    When he opens the reading check of verse 28
    And he opens the drill with "Drill this sound"
    Then the drill shows the rule "ου says oo" with a speaker
    When he taps "Start the drill"
    And he skips through the words of the drill
    Then the drill showed 5 different words, each containing ου

  Scenario: Finishing the drill schedules a sound review within the first step of the schedule
    Given Lampas is opened on Romans 8 in Greek behind a fake Postern that finds nothing to fix
    And he misread an ου word in 2 of his last 5 readings in Greek
    When he opens the reading check of verse 28
    And he opens the drill with "Drill this sound"
    And he taps "Start the drill"
    And he reads each of the 5 words of the drill aloud
    Then the drill says "Drilled ου"
    And his reading history still holds only the 5 readings he made
    And a review of kind "sound" for "el:diphthong-ou" is due within the first step of the schedule
    When he leaves the drill with "Back to the ladder"
    Then the drill is closed

  Scenario: English offers a drill of the words he misread
    Given Lampas is opened on Romans 8 in English behind a fake Postern that finds nothing to fix
    And he misread the word "blessed" in 2 of his last 5 readings in English
    And he also misread the word "predestined" in 1 of his last 5 readings in English
    When he opens the reading check of verse 28
    Then the reading panel offers "Drill these words" and not "Drill this sound"
    When he opens the drill with "Drill these words"
    Then the drill lists the words "blessed" and "predestined"

  Scenario: A drilled sound that is due is asked on the Review screen
    Given Lampas is opened on the Review screen with the sound "el:diphthong-ou" due
    Then Review says "Due today: 1 sound"
    When he taps "Start"
    Then Review asks about the sound "ου"
