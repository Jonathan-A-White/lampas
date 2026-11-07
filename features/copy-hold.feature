@uc-copy @greek
Feature: The row a hold on a verse number draws
  A hold on a verse number copies the verse at once (features/copy-format.feature). In place of a toast a small quiet row then shows for about 3 seconds: what was copied ("Copied Romans 8:13") and the ends
  that differ, Verse, Paragraph, Pericope and Chapter, and Share. A tap on an end copies again from the held verse to that end and the row says the new range; Share sends whatever range is held.
  The row has no button for the tutor: the question mark is his one door. (mw-5r3p30.1074; Romans 8 stands for the fixture: verse 13 is in the paragraph 12-14, the pericope 12-17 and the chapter to 39.)

  Scenario: A hold on a verse number copies the verse and draws the row with the ends and Share
    Given Lampas is opened on Romans 8 in Paragraph layout
    When he holds the number of verse 13
    Then the phone's clipboard holds the line "— Romans 8:13 (MSB)"
    And the row says "Copied Romans 8:13"
    And the row offers, in order, "Verse", "Paragraph", "Pericope", "Chapter" and "Share"
    And the row marks "Verse" as the end
    And the Verse view is not open

  Scenario: A tap on Paragraph copies to the end of the paragraph
    Given Lampas is opened on Romans 8 in Paragraph layout
    When he holds the number of verse 13
    And he taps "Paragraph" on the row
    Then the phone's clipboard holds the line "— Romans 8:13-14 (MSB)"
    And the phone's clipboard holds the passage text numbered "13 " and "14 "
    And the row says "Copied Romans 8:13-14"
    And the row marks "Paragraph" as the end

  Scenario: A tap on Pericope copies to the end of the pericope
    Given Lampas is opened on Romans 8 in Paragraph layout
    When he holds the number of verse 13
    And he taps "Pericope" on the row
    Then the phone's clipboard holds the line "— Romans 8:13-17 (MSB)"
    And the row says "Copied Romans 8:13-17"

  Scenario: A tap on Chapter copies to the end of the chapter
    Given Lampas is opened on Romans 8 in Paragraph layout
    When he holds the number of verse 13
    And he taps "Chapter" on the row
    Then the phone's clipboard holds the line "— Romans 8:13-39 (MSB)"
    And the row says "Copied Romans 8:13-39"

  Scenario: A tap on Verse takes a wider copy back
    Given Lampas is opened on Romans 8 in Paragraph layout
    When he holds the number of verse 13
    And he taps "Chapter" on the row
    And he goes back by touching "Verse" on the row
    Then the phone's clipboard holds the line "— Romans 8:13 (MSB)"
    And the row says "Copied Romans 8:13"
    And the row marks "Verse" as the end

  Scenario: In Verse by verse there is no Paragraph
    Given Lampas is opened on Romans 8 in Verse by verse layout
    When he holds the number of verse 13
    Then the row offers, in order, "Verse", "Pericope", "Chapter" and "Share"

  Scenario: An end that reaches no further than one before it is left out
    Given Lampas is opened on Romans 8 in Paragraph layout
    When he holds the number of verse 14
    Then the row offers, in order, "Verse", "Pericope", "Chapter" and "Share"

  Scenario: At the chapter's last verse the row shows Share alone beside what it copied
    Given Lampas is opened on Romans 8 in Paragraph layout
    When he holds the number of verse 39
    Then the row says "Copied Romans 8:39"
    And the row offers, in order, "Share"

  Scenario: A hold on another verse moves the row to that verse
    Given Lampas is opened on Romans 8 in Paragraph layout
    When he holds the number of verse 13
    And he holds the number of verse 16
    Then the row says "Copied Romans 8:16"
    And the phone's clipboard holds the line "— Romans 8:16 (MSB)"

  Scenario: The row goes by itself
    Given Lampas is opened on Romans 8 in Paragraph layout
    When he holds the number of verse 13
    Then the row goes by itself

  Scenario: A tap on the row starts its time again
    Given Lampas is opened on Romans 8 in Paragraph layout
    When he holds the number of verse 13
    And after two seconds he touches "Paragraph" on the row
    And two more seconds go by
    Then the row says "Copied Romans 8:13-14"

  Scenario: Share sends the plain verse and the row goes when the sheet opens
    Given Lampas is opened on Romans 8 in Paragraph layout
    And the phone can share
    When he holds the number of verse 13
    And he taps "Share" on the row
    Then the phone's share was handed the verse text and the title "Romans 8:13"
    And the row is gone

  Scenario: Share sends the range that was chosen
    Given Lampas is opened on Romans 8 in Paragraph layout
    And the phone can share
    When he holds the number of verse 13
    And he taps "Pericope" on the row
    And he goes on to touch "Share" on the row
    Then the phone's share was handed the verse text and the title "Romans 8:13-17"

  Scenario: A phone with no share keeps what was copied and says so
    Given Lampas is opened on Romans 8 in Paragraph layout
    When he holds the number of verse 13
    And he taps "Share" on the row
    Then the row says "Copied Romans 8:13. This phone cannot share."

  Scenario: The row has no control for the tutor
    Given Lampas is opened on Romans 8 in Paragraph layout
    When he holds the number of verse 13
    Then the row has no button for the tutor

  Scenario: The question mark tapped while the row is up opens the Talk on the range held
    Given Lampas is opened on Romans 8 in Paragraph layout
    When he holds the number of verse 13
    And he taps "Paragraph" on the row
    And the row says "Copied Romans 8:13-14"
    And he taps the question mark
    Then the Talk sheet is open as "Talk about Romans 8:13-14"
    And the row is gone

  Scenario: The question mark tapped when no row is up opens the Talk as it always did
    Given Lampas is opened on Romans 8 in Paragraph layout
    When he taps the question mark
    Then the Talk sheet is open as "Talk about Romans 8"

  Scenario: A section heading's hold is a toast with no row, as before
    Given Lampas is opened on Romans 8 in Paragraph layout
    When he holds the heading "Walking by the Spirit"
    Then the Reader says "Copied Romans 8:1-11"
    And the row is gone

  Scenario: A phone that refuses the clipboard opens the Verse view on the range
    Given Lampas is opened on Romans 8 on a phone that refuses the clipboard
    When he holds the number of verse 13
    Then the Verse view is open on verse 13 with the text shown selected to copy by hand
