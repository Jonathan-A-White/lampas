Feature: The timeline in the Reader's split
  The Verse view's Split sheet offers Timeline beside the texts and the map (mw-fnvjof.17.317.2, docs/timeline-design.md). Chosen, it docks under the passage: a strip of
  Theographic's dated events and lives that opens at the chapter's time, with Whole Bible on the dock's row, Zoom out and Zoom in at the ruler's end, the data's credit line
  under the strip and the link to Bible Mapper's own timeline. That the dock holds the timeline is kept, so a reload brings it back. jsdom has no layout: the steps give the
  strip a box of 390 by 282 px, and the layout itself is proven by tests/e2e/timeline-dock.spec.ts.

  Scenario: The Split sheet offers Timeline beside the texts and the map
    Given the Reader is open on "Isaiah 1"
    When he taps verse 1 and then "Split"
    Then the sheet "Beside Isaiah 1" offers "Timeline" with "Events and lives by date, from Theographic" under it
    And "Timeline" comes after the texts and before "A map"

  Scenario: Timeline docks a strip at the chapter's time, with the chapter's events and people marked
    Given the Reader is open on "Isaiah 1"
    When he taps verse 1 and then "Split"
    And he chooses "Timeline" in the sheet
    Then the sheet and the Verse view are closed
    And the dock's row reads "Timeline", "Whole Bible" and "Close"
    And "Whole Bible" is not pressed
    And the strip stands on "778 to 678 BC, Isaiah 1"
    And the strip has a button "Prophecies of Isaiah, about 759 to 697 BC"
    And the strip has a button for the life of "Uzziah", "Jotham", "Ahaz" and "Hezekiah"

  Scenario: The credit line shows and the Bible Mapper link opens at the strip's year
    Given the Timeline is docked beside "Isaiah 1"
    Then the dock shows the credit "Theographic Bible Metadata, Robert Rouse, CC BY-SA 4.0; traditional dating (Floyd Nolen Jones, after Ussher)"
    And the link "Timeline at Bible Mapper" opens "https://biblemapper.com/timeline/?date=-728"

  Scenario: Whole Bible zooms out to the whole Bible and back
    Given the Timeline is docked beside "Isaiah 1"
    When he presses "Whole Bible"
    Then "Whole Bible" is pressed
    And the strip stands on "4004 BC to AD 100"
    And the strip has no button "Zoom out" to press
    When he presses "Whole Bible" again
    Then "Whole Bible" is not pressed
    And the strip is back on "778 to 678 BC, Isaiah 1"

  Scenario: Later moves on through time, and the chapter's name at the side goes back
    Given the Timeline is docked beside "Isaiah 1"
    When he presses "Later" three times
    Then the strip stands on "658 to 558 BC"
    And the strip offers "‹ Isaiah 1"
    When he presses "‹ Isaiah 1"
    Then the strip is back on "778 to 678 BC, Isaiah 1"

  Scenario: Zoom in and Zoom out double and halve, and Earlier moves back through time
    Given the Timeline is docked beside "Isaiah 1"
    When he presses "Zoom in"
    Then the strip stands on "753 to 703 BC"
    When he presses "Zoom out" and then "Earlier"
    Then the strip has moved to "818 to 718 BC"

  Scenario: A reload brings the timeline back
    Given the Timeline is docked beside "Isaiah 1"
    When the app is opened again
    Then the dock's row reads "Timeline", "Whole Bible" and "Close"
    And the strip stands on "778 to 678 BC, Isaiah 1"

  Scenario: A text chosen from the dock's name takes the timeline's place
    Given the Timeline is docked beside "Isaiah 1"
    When he taps the dock's name
    Then the sheet "Beside Isaiah 1" has "Timeline" ticked
    When he chooses "English" in the sheet
    Then the dock's name is "English"
    And the dock has no strip

  Scenario: A book with no dated event says so and shows the whole Bible
    Given the Timeline is docked beside "3 John 1"
    Then the dock's name is "No dates for 3 John"
    And the strip stands on "4004 BC to AD 100"
