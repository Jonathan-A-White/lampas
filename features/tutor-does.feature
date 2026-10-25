Feature: What the tutor does shows on the Talk sheet
  The tutor drives the app (mw-t3xu9a). When its answer asks for a fact of the app first (`asks`), the sheet says so in one short line, 'Looking at your Logos books', until the second answer
  lands, and says it to a screen reader. A command it runs (`do`) shows the app's own line for what it did, with Undo when the command can be undone; Undo puts it back and the line says
  'Put back'. A command that needs his yes (kind confirm) shows a button named by the command and runs only on the tap. A place it opens (`go`) closes the sheet and is a step of Back,
  so Back returns to the same talk. An answer that asked for nothing never shows the looking line.

  Scenario: The tutor looks at his books first, and the sheet says so until the second answer comes
    Given Lampas is opened on Romans 8 and the tutor asks for "works" before it answers
    And he opens Talk
    When he sends "which commentaries do I have on this chapter"
    Then the sheet says "Looking at your Logos books"
    And the live region says "Looking at your Logos books"
    And the follow-up carries what was asked for "works"
    When the tutor gives its second answer
    Then the answer shows in the sheet
    And the sheet no longer says "Looking at your"

  Scenario: An answer that asks for nothing never shows the looking line
    Given Lampas is opened on Romans 8 and the tutor answers at once
    And he opens Talk
    When he sends "what does grace mean"
    Then the answer shows in the sheet
    And the line "Looking at your" was never kept for this talk

  Scenario: A change the tutor made shows what it did, and Undo puts it back and says so
    Given Lampas is opened on Romans 8 and the tutor answers with a do that sets the theme to dark
    And he opens Talk
    When he sends "make it dark"
    Then the sheet says "Changed: Theme: Dark" with an Undo button
    And the theme is "dark"
    When he taps Undo on that line
    Then the sheet says "Put back"
    And the sheet has no Undo button
    And the theme is back to "phone"

  Scenario: A command that needs his yes shows a button and runs only on the tap
    Given Lampas is opened on Romans 8 and the tutor answers with a do of the confirm command "forget-note"
    And he opens Talk
    When he sends "forget my note on this chapter"
    Then the sheet says "Forget the note about Romans 8?" with a "Forget note" button
    And the command has not run
    When he taps "Forget note" in the sheet
    Then the command has run once
    And the sheet says "Forgot the note"
    And the sheet has no "Forget note" button

  Scenario: A place the tutor opens is a step of Back, and Back returns to the same talk
    Given Lampas is opened on Romans 8 and the tutor takes him to "review" when he asks for it
    And he opens Talk
    When he sends "what does grace mean"
    And he sends "take me to my review"
    Then the Review screen is open
    And the Talk sheet is closed
    When he taps the phone's Back
    Then the Talk sheet is open again
    And the talk shows his 2 messages
    And the Review screen is not open
