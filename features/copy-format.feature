Feature: When you copy
  Settings > Reading > When you copy chooses what the Verse view's Copy gives for the verse, passage or chapter it shows: Text (as you read it, English, the
  original or both), Reference (after, before or off), Verse numbers (on or off) and Link (on or off). With the defaults it is the text as he reads it
  (English, Greek, Hebrew or the Weave, the view on now), then the reference, then the link on a last line of its own.

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

  Scenario: In the Weave, Copy pastes the woven verse
    Given Lampas is opened on Colossians 3:1 in the Weave with When you copy at its defaults
    When he taps "Copy"
    Then the phone's clipboard holds the woven verse as the Verse view shows it, then the line "— Colossians 3:1 (MSB)"
    And the phone's clipboard holds "χριστῷ"
    And the phone's clipboard has no "Christ"

  Scenario: In the Greek view, Copy pastes the Greek
    Given Lampas is opened on Colossians 3:1 in the Greek view with When you copy at its defaults
    When he taps "Copy"
    Then the phone's clipboard starts with "Εἰ οὖν συνηγέρθητε τῷ χριστῷ τὰ ἄνω ζητεῖτε"

  Scenario: Text English copies the English even in the Weave
    Given Lampas is opened on Colossians 3:1 in the Weave with When you copy set to Text "english"
    When he taps "Copy"
    Then the phone's clipboard starts with "Therefore, since you have been raised with Christ,"

  Scenario: Holding a verse number copies the verse at once where no tutor is offered
    Given Lampas is opened on Romans 8 on a phone with no licence and When you copy at its defaults
    When he holds the number of verse 11
    Then the phone's clipboard holds the English of verse 11, then the line "— Romans 8:11 (MSB)", then the link of Romans 8:11
    And the Reader says "Copied Romans 8:11"
    And the Verse view is not open

  Scenario: Holding a section heading copies its passage
    Given Lampas is opened on Romans 8 with When you copy at its defaults
    When he holds the heading "Walking by the Spirit"
    Then the phone's clipboard starts with "1 Therefore there is now no condemnation"
    And the phone's clipboard holds the line "— Romans 8:1-11 (MSB)"
    And the Reader says "Copied Romans 8:1-11"
    And the Verse view is not open

  Scenario: Holding the place line copies the whole chapter
    Given Lampas is opened on Romans 8 with Turn pages and When you copy at its defaults
    When he holds the place line
    Then the phone's clipboard starts with "1 Therefore there is now no condemnation"
    And the phone's clipboard holds the line "— Romans 8 (MSB)"
    And the Reader says "Copied Romans 8"
    And the Verse view is not open

  Scenario: Holding a verse number in the Greek view copies the Greek
    Given Lampas is opened on Colossians 3 in the Greek view on a phone with no licence and When you copy at its defaults
    When he holds the number of verse 1
    Then the phone's clipboard starts with "Εἰ οὖν συνηγέρθητε τῷ χριστῷ τὰ ἄνω ζητεῖτε"
    And the Reader says "Copied Colossians 3:1"

  Scenario: Where the tutor is offered a hold on a verse number still talks about the verse
    Given Lampas is opened on Romans 8 with When you copy at its defaults
    When he holds the number of verse 11
    Then the Talk sheet is open and nothing was copied

  Scenario: A tap on a verse number still opens the Verse view
    Given Lampas is opened on Romans 8 with Turn pages and When you copy at its defaults
    When he taps the number of verse 11
    Then the Verse view is open and nothing was copied

  Scenario: A tap on a section heading still opens the Verse view
    Given Lampas is opened on Romans 8 with Turn pages and When you copy at its defaults
    When he taps the heading "Walking by the Spirit"
    Then the Verse view is open and nothing was copied

  Scenario: A tap on the place line still opens the Verse view
    Given Lampas is opened on Romans 8 with Turn pages and When you copy at its defaults
    When he taps the place line
    Then the Verse view is open and nothing was copied

  Scenario: A phone that refuses the clipboard shows the text to copy by hand
    Given Lampas is opened on Romans 8 on a phone with no licence and a clipboard that refuses and When you copy at its defaults
    When he holds the number of verse 11
    Then the Verse view is open on verse 11 with the text shown selected to copy by hand
