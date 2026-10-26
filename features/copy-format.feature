Feature: When you copy
  Settings > Reading > When you copy chooses what the Verse view's Copy gives for the verse, passage or chapter it shows: Text (English, the original or
  both), Reference (after, before or off), Verse numbers (on or off) and Link (on or off). With the defaults it is the English, then the reference,
  then the link on a last line of its own.

  Scenario: Copy with the defaults gives the verse, its reference after it and its link
    Given Lampas is opened on Romans 8 with When you copy at its defaults
    When he taps the number of verse 11
    And he taps "Copy"
    Then the phone's clipboard holds the English of verse 11, then the line "— Romans 8:11 (MSB)", then the link of Romans 8:11
    And the Verse view says "Copied"

  Scenario: Copy with Text both and Reference before
    Given Lampas is opened on Romans 8 with When you copy set to Text "both", Reference "before", Verse numbers "on" and Link "on"
    When he taps the number of verse 11
    And he taps "Copy"
    Then the phone's clipboard starts with the line "Romans 8:11 (MSB)"
    And the phone's clipboard holds the Greek of verse 11 in a paragraph of its own after the English
    And the phone's clipboard ends with the link of Romans 8:11

  Scenario: Copy with Link off ends at the reference
    Given Lampas is opened on Romans 8 with When you copy set to Text "english", Reference "after", Verse numbers "on" and Link "off"
    When he taps the number of verse 11
    And he taps "Copy"
    Then the phone's clipboard ends with the line "— Romans 8:11 (MSB)"
    And the phone's clipboard has no link

  Scenario: Copy on a passage numbers its verses and names the range
    Given Lampas is opened on Romans 8 with When you copy at its defaults
    When he taps the heading "Walking by the Spirit"
    And he taps "Copy"
    Then the phone's clipboard starts with "1 Therefore there is now no condemnation"
    And the phone's clipboard holds "2 For in Christ Jesus the law of the Spirit"
    And the phone's clipboard holds the line "— Romans 8:1-11 (MSB)"
    And the phone's clipboard ends with the link of Romans 8:1-11

  Scenario: Copy on a passage with Verse numbers off leaves the numbers out
    Given Lampas is opened on Romans 8 with When you copy set to Text "english", Reference "off", Verse numbers "off" and Link "off"
    When he taps the heading "Walking by the Spirit"
    And he taps "Copy"
    Then the phone's clipboard starts with "Therefore there is now no condemnation"
    And the phone's clipboard has no reference

  Scenario: Copy on a whole chapter names the chapter
    Given Lampas is opened on the whole of Romans 8 with When you copy at its defaults
    When he taps "Copy"
    Then the phone's clipboard starts with "1 Therefore there is now no condemnation"
    And the phone's clipboard holds the line "— Romans 8 (MSB)"
    And the phone's clipboard ends with the link of Romans 8:1-39
