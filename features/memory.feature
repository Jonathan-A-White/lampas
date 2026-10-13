Feature: Memory
  Lampas keeps notes about the reader on his phone (mw-yrmkdf.1): one short index and named notes (book:, word:, topic:), each with when it
  was changed and by whom. Settings > Memory shows them, lets him edit the index, edit or delete a note, and export or import the lot as one
  file. Nothing is sent to the tutor yet.

  Scenario: Settings > Memory shows the index and the notes
    Given Lampas is opened on Settings with the memory index "Prefers stories first." and the notes "book:Romans / word:λόγος"
    When he opens "Memory" in Settings
    Then the page shows the index "Prefers stories first."
    And the page lists the notes "book:Romans / word:λόγος"
    And the note "word:λόγος" says it was changed by "the tutor"
    And the note "book:Romans" was last changed by "you"

  Scenario: An edit of the index is kept
    Given Lampas is opened on Settings with the memory index "Prefers stories first." and the notes "book:Romans"
    When he opens "Memory" in Settings
    And he adds " Tires after ten minutes." to the index
    Then the phone keeps the index "Prefers stories first. Tires after ten minutes." changed by "me"
    And the page shows the notes section "Notes: / - book:Romans — About book:Romans."

  Scenario: A note can be edited
    Given Lampas is opened on Settings with the memory index "" and the notes "book:Romans / word:λόγος"
    When he opens "Memory" in Settings
    And he edits the note "book:Romans" to "Reads it slowly."
    Then the phone keeps the note "book:Romans" as "Reads it slowly." changed by "me"

  Scenario: A note deleted is gone
    Given Lampas is opened on Settings with the memory index "" and the notes "book:Romans / word:λόγος"
    When he opens "Memory" in Settings
    And he deletes the note "book:Romans"
    Then the page now lists the notes "word:λόγος"
    And the phone now keeps the notes "word:λόγος"

  Scenario: A note he does not confirm deleting stays
    Given Lampas is opened on Settings with the memory index "" and the notes "book:Romans"
    When he opens "Memory" in Settings
    And he asks to delete the note "book:Romans" and then cancels
    Then the page lists the notes "book:Romans"
    And the phone keeps the notes "book:Romans"

  Scenario: Export offers a file and Import reads it back and shows what was read
    Given Lampas is opened on Settings with the memory index "Prefers stories first." and the notes "book:Romans / word:λόγος"
    When he opens "Memory" in Settings
    And he taps "Export"
    Then the phone is offered a memory file
    When he deletes the note "book:Romans"
    And he deletes the note "word:λόγος"
    Then the page now lists no notes
    When he imports the file he was offered
    Then the page shows what was read: "the index and 2 notes: book:Romans, word:λόγος"
    When he taps "Replace my memory"
    Then the page lists the notes "book:Romans / word:λόγος"
    And the phone keeps the index "Prefers stories first." changed by "me"

  Scenario: A file that is not a memory is refused
    Given Lampas is opened on Settings with the memory index "Keep me." and the notes "book:Romans"
    When he opens "Memory" in Settings
    And he imports a file holding "this is not a memory"
    Then the page says "That file is not a Lampas memory."
    And the phone keeps the index "Keep me." changed by "me"
