@uc-copy @greek
Feature: When you copy
  The Verse view's Copy and Share always give the words as he reads them (English, Greek, Hebrew or the Weave, the view on now, with the variants and readings
  he has on); there is no choice of text (mw-5r3p30.873). Settings > Reading > When you copy chooses Reference (after, before or off), Verse numbers (on or off)
  and Link (on or off), and says what Copy gives. With the defaults it is the words, then the reference, then the link on a last line of its own.

  Scenario: Copy with the defaults gives the verse, its reference after it and its link
    Given Lampas is opened on Romans 8 with When you copy at its defaults
    When he taps the number of verse 11
    And he taps "Copy"
    Then the phone's clipboard holds the English of verse 11, then the line "— Romans 8:11 (MSB)", then the link of Romans 8:11
    And the Verse view says "Copied"

  Scenario: Copy with Reference before
    Given Lampas is opened on Romans 8 with When you copy set to Reference "before", Verse numbers "on" and Link "on"
    When he taps the number of verse 11
    And he taps "Copy"
    Then the phone's clipboard starts with the line "Romans 8:11 (MSB)"
    And the phone's clipboard holds the English of verse 11
    And the phone's clipboard ends with the link of Romans 8:11

  Scenario: Copy with Link off ends at the reference
    Given Lampas is opened on Romans 8 with When you copy set to Reference "after", Verse numbers "on" and Link "off"
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
    Given Lampas is opened on Romans 8 with When you copy set to Reference "off", Verse numbers "off" and Link "off"
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

  Scenario: Where the tutor is offered a hold on a verse number copies the verse and does not talk
    Given Lampas is opened on Romans 8 with When you copy at its defaults
    When he holds the number of verse 11
    Then the phone's clipboard holds the English of verse 11, then the line "— Romans 8:11 (MSB)", then the link of Romans 8:11
    And the Reader says "Copied Romans 8:11"
    And no Talk sheet is open and the phone is not listening

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

  # Copy follows every mode he is in (mw-5r3p30.866): with Variants shown, 'As you read it' copies each shown unit's brace after its words
  Scenario: Holding a verse number with Variants shown copies the braces
    Given Lampas is opened on 1 Peter 4 with Variants shown and When you copy at its defaults
    When he holds the number of verse 1
    Then the phone's clipboard starts with "Therefore, since Christ suffered for us {left out NA} in His body,"
    And the phone's clipboard holds "anyone who has suffered {left out NA} in his body is done with sin."

  Scenario: Holding a section heading with Variants shown copies the braces of its verses
    Given Lampas is opened on 1 Peter 4 with Variants shown and When you copy at its defaults
    When he holds the heading "Living for God’s Glory"
    Then the phone's clipboard starts with "1 Therefore, since Christ suffered for us {left out NA} in His body,"
    And the phone's clipboard holds "anyone who has suffered {left out NA} in his body is done with sin."

  Scenario: Holding the place line with Variants shown copies the braces
    Given Lampas is opened on 1 Peter 4 with Variants shown and Turn pages and When you copy at its defaults
    When he holds the place line
    Then the phone's clipboard starts with "1 Therefore, since Christ suffered for us {left out NA} in His body,"
    And the phone's clipboard holds "anyone who has suffered {left out NA} in his body is done with sin."

  Scenario: The Verse view's Copy with Variants shown copies the braces
    Given Lampas is opened on 1 Peter 4:1 with Variants shown and When you copy at its defaults
    When he taps "Copy"
    Then the phone's clipboard starts with "Therefore, since Christ suffered for us {left out NA} in His body,"
    And the phone's clipboard holds "anyone who has suffered {left out NA} in his body is done with sin."

  Scenario: With Variants off the verse is copied plain
    Given Lampas is opened on 1 Peter 4 with Variants off and When you copy at its defaults
    When he holds the number of verse 1
    Then the phone's clipboard starts with "Therefore, since Christ suffered for us in His body,"
    And the phone's clipboard has no "{"

  # The Text row is gone (mw-5r3p30.873): a phone that stored one keeps it unread and copies as it reads
  Scenario: A phone that stored Text "english" copies as it reads, braces and all
    Given Lampas is opened on 1 Peter 4:1 with Variants shown and the old setting Text "english" stored
    When he taps "Copy"
    Then the phone's clipboard starts with "Therefore, since Christ suffered for us {left out NA} in His body,"
    And the phone's clipboard holds "{left out NA}"

  # The Text row is gone (mw-5r3p30.873): a phone that stored one keeps it unread and copies as it reads
  Scenario: A phone that stored Text "original" copies as it reads, braces and all
    Given Lampas is opened on 1 Peter 4:1 with Variants shown and the old setting Text "original" stored
    When he taps "Copy"
    Then the phone's clipboard starts with "Therefore, since Christ suffered for us {left out NA} in His body,"
    And the phone's clipboard holds "{left out NA}"

  # The Text row is gone (mw-5r3p30.873): a phone that stored one keeps it unread and copies as it reads
  Scenario: A phone that stored Text "both" copies as it reads, braces and all
    Given Lampas is opened on 1 Peter 4:1 with Variants shown and the old setting Text "both" stored
    When he taps "Copy"
    Then the phone's clipboard starts with "Therefore, since Christ suffered for us {left out NA} in His body,"
    And the phone's clipboard holds "{left out NA}"
