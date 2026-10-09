Feature: Reading check, in English and in Greek
  In the Verse view's Read it aloud action (features/verse-view.feature) he holds the bar and reads the verse aloud. The recording goes to the mill as a verse-read grist
  (bsv-kit/grist, through Postern); the mill scores it and the verse comes back with the words to fix marked, each broken
  into chunks to say. 'Read these again' walks the marked words, then the whole verse. The Greek view reads the same way:
  the verse's Greek goes as target_text with the language of the Greek pronunciation he chose in Settings (modern: el), the
  marked words are Greek, broken into Greek syllables with the Greek voice. These scenarios run against a fake Postern whose mill opens the grist
  (its audio attachment included) and answers it, and a fake recorder; the live backend is tried by `npm run e2e:live`.

  Scenario: Holding the bar on 8:28 and releasing sends a verse-read grist with the verse's English and one audio attachment
    Given Lampas is opened on Romans 8 in English with a reading check behind a fake Postern
    And he opens the reading check of verse 28
    When he holds the bar for 2 seconds and lets go
    Then the mill received one grist for the lampas app, kind verse-read
    And its input carries the reference "Romans 8:28", the English of verse 28 as target_text, and the language "en"
    And the grist carries one audio attachment of type "audio/webm"
    And the fake Postern was sent that recording

  Scenario: The answer marks the focus words in the verse and a tap shows their chunks
    Given Lampas is opened on Romans 8 in English with a reading check behind a fake Postern
    And he opens the reading check of verse 28
    When he holds the bar for 2 seconds and lets go
    Then the verse in the reading check shows "together" and "purpose" marked to fix
    And the other words of the verse are not marked
    When he taps the marked word "together"
    Then its chunks show as "to · geth · er" with a speaker to hear it

  Scenario: Read these again walks the marked words and then the whole verse
    Given Lampas is opened on Romans 8 in English with a reading check behind a fake Postern
    And he opens the reading check of verse 28
    And he holds the bar for 2 seconds and lets go
    When he taps "Read these again"
    Then the walk shows the word "together" as word 1 of 2 in chunks "to · geth · er"
    When he taps "Next word" again
    Then the walk shows the word "purpose" as word 2 of 2 in chunks "pur · pose"
    When he goes on with "On to the whole verse"
    Then the walk shows the whole verse with the bar "Hold to read the whole verse again"
    When he holds the bar "Hold to read the whole verse again" for 2 seconds and lets go
    Then the mill received 2 grists for the lampas app, kind verse-read

  Scenario: A reading with nothing to fix says it is well read
    Given Lampas is opened on Romans 8 in English with a reading check that finds nothing to fix
    And he opens the reading check of verse 28
    When he holds the bar for 2 seconds and lets go
    Then the reading check says "Well read"
    And there is no Read these again button

  Scenario: A reading that covers only part of the verse is headed Read the whole verse, not Well read
    Given Lampas is opened on Romans 8 in English with a reading check that heard only part of the verse
    And he opens the reading check of verse 28
    When he holds the bar for 2 seconds and lets go
    Then the reading check says "Read the whole verse"
    And the reading check says "I heard 'and we know that'"
    And the reading check does not say "Well read"
    And there is no Read these again button

  Scenario: A reading with words to fix is headed Words to fix
    Given Lampas is opened on Romans 8 in English with a reading check behind a fake Postern
    And he opens the reading check of verse 28
    When he holds the bar for 2 seconds and lets go
    Then the reading check says "Words to fix"
    And the reading check does not say "Well read"

  Scenario: A hold under about one second sends nothing and says Hold the bar for the whole verse
    Given Lampas is opened on Romans 8 in English with a reading check behind a fake Postern
    And he opens the reading check of verse 28
    When he holds the bar for 800 milliseconds and lets go
    Then the reading check says "Hold the bar for the whole verse"
    And the mill received no grist

  Scenario: A press under 500 ms sends nothing and says Hold while you read
    Given Lampas is opened on Romans 8 in English with a reading check behind a fake Postern
    And he opens the reading check of verse 28
    When he presses the bar for a fifth of a second and lets go
    Then the reading check says "Hold while you read"
    And the mill received no grist

  Scenario: Sliding off the bar drops the reading
    Given Lampas is opened on Romans 8 in English with a reading check behind a fake Postern
    And he opens the reading check of verse 28
    When he holds the bar and slides off the button
    Then the reading check says "Dropped. Hold to try again"
    And the mill received no grist

  Scenario: While the mill has not answered the box says Waiting with the seconds
    Given Lampas is opened on Romans 8 in English with a reading check behind a fake Postern that holds its answers
    And he opens the reading check of verse 28
    When he holds the bar for 2 seconds and lets go
    Then the reading check says it is waiting, with seconds
    And the bar cannot be held while it waits
    When the mill answers
    Then the verse in the reading check shows "together" and "purpose" marked to fix

  Scenario: A microphone that is turned off says so
    Given Lampas is opened on Romans 8 in English with a reading check and the microphone turned off
    And he opens the reading check of verse 28
    When he holds the bar for 2 seconds and lets go
    Then the reading check says "The microphone is turned off for this page"
    And the mill received no grist

  Scenario: A backend that cannot be reached shows Could not reach with Retry, and Retry sends the same recording
    Given Lampas is opened on Romans 8 in English with a reading check behind a fake Postern that cannot be reached
    And he opens the reading check of verse 28
    When he holds the bar for 2 seconds and lets go
    Then the reading check says "Could not reach the tutor" with a Retry button
    When the backend comes back and he taps Retry
    Then the verse in the reading check shows "together" and "purpose" marked to fix

  Scenario: The result is still there after reopening
    Given Lampas is opened on Romans 8 in English with a reading check behind a fake Postern
    And he opens the reading check of verse 28
    And he holds the bar for 2 seconds and lets go
    And the reading of verse 28 has arrived
    When he reopens Lampas and opens the reading check of verse 28
    Then the verse in the reading check shows "together" and "purpose" marked to fix
    And the mill received one grist for the lampas app, kind verse-read

  Scenario: Holding the bar on 8:28 in the Greek view sends a verse-read grist with the verse's Greek as target_text and lang el
    Given Lampas is opened on Romans 8 in Greek with a reading check behind a fake Postern
    And he opens the reading check of verse 28
    When he holds the bar for 2 seconds and lets go
    Then the mill received one grist for the lampas app, kind verse-read
    And its input carries the reference "Romans 8:28", the Greek of verse 28 as target_text, and the language "el"
    And the grist carries one audio attachment of type "audio/webm"

  Scenario: A Greek answer marks the Greek words and a tap shows their syllables with a Greek speaker
    Given Lampas is opened on Romans 8 in Greek with a reading check behind a fake Postern
    And he opens the reading check of verse 28
    When he holds the bar for 2 seconds and lets go
    Then the verse in the reading check shows "συνεργεῖ" and "πρόθεσιν" marked to fix
    And the other words of the Greek verse are not marked
    When he taps the marked word "συνεργεῖ"
    Then its chunks show as "συν · ερ · γεῖ" with a Greek speaker to hear it
    And the speaker says the word in Greek, el-GR

  Scenario: Read these again works in the Greek view
    Given Lampas is opened on Romans 8 in Greek with a reading check behind a fake Postern
    And he opens the reading check of verse 28
    And he holds the bar for 2 seconds and lets go
    When he taps "Read these again"
    Then the walk shows the word "συνεργεῖ" as word 1 of 2 in chunks "συν · ερ · γεῖ"
    When he taps "Next word" again
    Then the walk shows the word "πρόθεσιν" as word 2 of 2 in chunks "πρό · θε · σιν"
    When he goes on with "On to the whole verse"
    Then the walk shows the whole Greek verse with the bar "Hold to read the whole verse again"
    When he holds the bar "Hold to read the whole verse again" for 2 seconds and lets go
    Then the mill received 2 grists for the lampas app, kind verse-read
    And the second grist is in Greek with lang "el"

  Scenario: The English and Greek results of a verse are kept apart
    Given Lampas is opened on Romans 8 in English with a reading check behind a fake Postern
    And he opens the reading check of verse 28
    And he holds the bar for 2 seconds and lets go
    And the verse in the reading check shows "together" and "purpose" marked to fix
    When he closes the Verse view, switches to the Greek view and opens the reading check again
    Then the reading check has no result yet
    When he holds the bar again in Greek for 2 seconds and lets go
    Then the verse in the reading check shows "συνεργεῖ" and "πρόθεσιν" marked to fix
    When he closes the Verse view, switches to the English view and opens the reading check again
    Then the English result is still there with "together" and "purpose" marked to fix
