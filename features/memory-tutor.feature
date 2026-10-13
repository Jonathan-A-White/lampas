Feature: The tutor reads the reader's memory
  Every tutor request carries what Lampas remembers about the reader (mw-yrmkdf.2): the index and the notes the app chose by name for the place, the
  word and the screen. The tutor's answer may append to a note, may change or remove one only when the reader asked for it in his words of that
  turn, and may name notes it wished it had; Lampas counts those and About shows the count and the last names.

  Scenario: A talk carries the index and the notes named for the book
    Given Lampas is opened on Romans 8 with the memory index "Prefers stories first." and the notes "book:Romans / book:John / word:λόγος"
    When he talks about verse 11 and sends "What is this about?"
    Then the mill received 1 grist
    And grist number 1 carries the memory index "Prefers stories first." and the notes "book:Romans"

  Scenario: A talk with nothing remembered sends no memory
    Given Lampas is opened on Romans 8 with the memory index "" and the notes ""
    When he talks about verse 11 and sends "What is this about?"
    Then the mill received 1 grist
    And grist number 1 carries no memory

  Scenario: The tutor appends to a note
    Given Lampas is opened on Romans 8 with the memory index "" and the notes "book:Romans", and the tutor will append "Likes a picture first." to "book:Romans"
    When he talks about verse 11 and sends "Say it with a picture"
    Then the mill received 1 grist
    And the phone keeps the note "book:Romans" as "About book:Romans.\nLikes a picture first." changed by "tutor"

  Scenario: The tutor cannot replace a note he did not ask it to change
    Given Lampas is opened on Romans 8 with the memory index "" and the notes "book:Romans", and the tutor will replace "book:Romans" with "Forgotten." without being directed
    When he talks about verse 11 and sends "What is this about?"
    Then the mill received 1 grist
    And the phone keeps the note "book:Romans" as "About book:Romans." changed by "me"

  Scenario: About shows the notes the tutor wished it had
    Given Lampas is opened on Romans 8 with the memory index "" and the notes "", and the tutor will wish for the notes "topic:aorist / word:ἀγάπη"
    When he talks about verse 11 and sends "What is the aorist?"
    Then the mill received 1 grist
    When he opens "About" from the Reader
    Then About shows "Notes the tutor wished he had: 2"
    And under it the names "topic:aorist / word:ἀγάπη"
