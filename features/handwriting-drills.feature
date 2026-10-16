Feature: Write it: writing a letter by hand, as a memory aid
  His want (Postern general 2026-10-14, mw-86e9r1.51): a reader with a stylus is offered handwriting in the letter lessons and drills, "as a memory
  aid, not as if they will ever actually hand write something". A web page sees a pen only once it touches the screen (a pointer event whose
  pointerType is 'pen'): from then on the phone keeps "pen seen", like a setting. Settings > Handwriting drills is Automatic (the default: on once
  a pen has been seen), On or Off. With it on, each letter's lesson (its sheet, after How it sounds) has a Write it part, and the letter drill mixes
  in Write it questions. A Write it card shows the letter's name and sound, a writing pad (pen or finger), Clear, Check and Skip, each as easy as
  the other. The first one he meets says why in two plain lines. A letter is learnt in three stages, two rights at each: Trace (the letter faint
  under the pad, its strokes drawn first), Copy (the letter beside the pad) and From memory (only its name and sound). The letter's sound plays as he
  starts writing. The check, on the phone and with no tutor, judges which letter it is, not neatness, size or slant; "Not quite" draws the right
  strokes and offers a retry, never a score. Skip never costs progress, a stage, a level or a drill's score.

  Scenario: Settings has Handwriting drills, Automatic by default, and no pen has been seen
    Given Lampas is opened on Romans 8 with the goal "1 John 1:1" and no pen seen
    When he opens Settings
    Then Settings has the group "Handwriting drills" with "Automatic", "On" and "Off", and "Automatic" is chosen
    And the Handwriting drills row says "No pen seen on this phone yet."

  Scenario: A pen touching the screen is kept on the phone
    Given Lampas is opened on Romans 8 with the goal "1 John 1:1" and no pen seen
    When a pen touches the screen
    Then the phone keeps "pen seen"
    When he opens Settings
    Then the Handwriting drills row says "A pen has touched this screen."

  Scenario: Automatic with no pen seen: no Write it in the letter lesson
    Given Lampas is opened on Romans 8 with the goal "1 John 1:1" and no pen seen
    When he opens the letter sheet of "omicron" from the alphabet sheet
    Then the letter sheet has no Write it part

  Scenario: Once a pen is seen the letter lesson has Write it, after How it sounds, saying why
    Given Lampas is opened on Romans 8 with the goal "1 John 1:1" and no pen seen
    When a pen touches the screen
    And he opens the letter sheet of "omicron" from the alphabet sheet
    Then the letter sheet has a Write it part after "How it sounds"
    And it says "Writing a letter by hand helps it stick. You never need to write Greek to read the Bible."
    When he taps "Write it" on the letter sheet
    Then the Write it card asks him to trace "ο" with the letter faint under the pad
    And the card shows the name "Omicron" and its sound
    And the card has "Clear", "Check" and "Skip", all the same size

  Scenario: Trace, then copy, then from memory: two rights at each stage
    Given Lampas is opened on Romans 8 with the goal "1 John 1:1" and a pen seen
    When he opens the letter sheet of "omicron" from the alphabet sheet
    And he taps "Write it" on the letter sheet
    And he writes "ο" with the pen and taps Check
    Then the card says "Right"
    And the sound of "ο" was played as he started writing
    When he taps "Write it again"
    And he writes "ο" with the pen and taps Check again
    And he goes on from the card
    Then the card now asks him to copy "ο" with the letter beside the pad
    When he writes "ο" with a finger twice and taps Check each time
    Then the card asks him to write "Omicron" from memory, with no letter shown
    When he writes "ο" with the pen twice from memory and taps Check each time
    Then the letter sheet says Omicron is written from memory

  Scenario: The wrong letter is not quite: the right strokes are drawn and he tries again, with no score
    Given Lampas is opened on Romans 8 with the goal "1 John 1:1" and a pen seen
    When he opens the letter sheet of "omicron" from the alphabet sheet
    And he taps "Write it" on the letter sheet
    And he writes "σ" with the pen and taps Check
    Then the card says "Not quite" and draws the strokes of "ο"
    And the card shows no score
    When he taps "Try again"
    Then the pad is empty and the card still asks him to trace "ο"

  Scenario: Skip costs nothing
    Given Lampas is opened on Romans 8 with the goal "1 John 1:1" and a pen seen
    When he opens the letter sheet of "omicron" from the alphabet sheet
    And he taps "Write it" on the letter sheet
    And he writes "ο" with the pen and taps Check
    And he taps "Write it again"
    And he skips it
    Then the Write it card is closed
    And Omicron's writing still has 1 right at Trace
    And Omicron's level has not changed

  Scenario: Off: no Write it anywhere, even with a pen seen
    Given Lampas is opened on Romans 8 with the goal "1 John 1:1" and a pen seen
    And Handwriting drills is "Off"
    When he opens the letter sheet of "omicron" from the alphabet sheet
    Then the letter sheet has no Write it part
    When he starts the letter drill on the alphabet sheet
    Then the first round has no Write it question

  Scenario: With a pen seen the letter drill mixes in Write it questions, and skipping one keeps the score
    Given Lampas is opened on Romans 8 with the goal "1 John 1:1" and a pen seen
    When he starts the letter drill on the alphabet sheet
    Then the first round has 2 Write it questions among its 10
    When he answers the round right and skips every Write it question
    Then the round says "8 of 8 right"
