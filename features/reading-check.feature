Feature: Reading check, English first
  In the English view he holds Read on a verse and reads it aloud. The recording goes to the mill as a verse-read grist
  (bsv-kit/grist, through Postern); the mill scores it and the verse comes back with the words to fix marked, each broken
  into chunks to say. 'Read these again' walks the marked words, then the whole verse. The Greek check is a later story:
  in the Greek view the Read button says so. These scenarios run against a fake Postern whose mill opens the grist
  (its audio attachment included) and answers it, and a fake recorder; the live backend is tried by `npm run e2e:live`.

  Scenario: Holding Read on 8:28 and releasing sends a verse-read grist with the verse's English and one audio attachment
    Given Lampas is opened on Romans 8 in English with a reading check behind a fake Postern
    And he selects verse 28
    When he holds Read for 2 seconds and lets go
    Then the mill received one grist for the lampas app, kind verse-read
    And its input carries the reference "Romans 8:28", the English of verse 28 as target_text, and the language "en"
    And the grist carries one audio attachment of type "audio/webm"
    And the fake Postern was sent that recording

  Scenario: The answer marks the focus words in the verse and a tap shows their chunks
    Given Lampas is opened on Romans 8 in English with a reading check behind a fake Postern
    And he selects verse 28
    When he holds Read for 2 seconds and lets go
    Then the verse in the reading check shows "together" and "purpose" marked to fix
    And the other words of the verse are not marked
    When he taps the marked word "together"
    Then its chunks show as "to · geth · er" with a speaker to hear it

  Scenario: Read these again walks the marked words and then the whole verse
    Given Lampas is opened on Romans 8 in English with a reading check behind a fake Postern
    And he selects verse 28
    And he holds Read for 2 seconds and lets go
    When he taps "Read these again"
    Then the walk shows the word "together" as word 1 of 2 in chunks "to · geth · er"
    When he taps "Next word" again
    Then the walk shows the word "purpose" as word 2 of 2 in chunks "pur · pose"
    When he goes on with "On to the whole verse"
    Then the walk shows the whole verse with the button "Read the whole verse again"
    When he holds "Read the whole verse again" for 2 seconds and lets go
    Then the mill received 2 grists for the lampas app, kind verse-read

  Scenario: A reading with nothing to fix says it is well read
    Given Lampas is opened on Romans 8 in English with a reading check that finds nothing to fix
    And he selects verse 28
    When he holds Read for 2 seconds and lets go
    Then the reading check says "Well read"
    And there is no Read these again button

  Scenario: A press under 500 ms sends nothing and says Hold while you read
    Given Lampas is opened on Romans 8 in English with a reading check behind a fake Postern
    And he selects verse 28
    When he presses Read for a fifth of a second and lets go
    Then the reading check says "Hold while you read"
    And the mill received no grist

  Scenario: Sliding off the button drops the reading
    Given Lampas is opened on Romans 8 in English with a reading check behind a fake Postern
    And he selects verse 28
    When he holds Read and slides off the button
    Then the reading check says "Dropped. Hold to try again"
    And the mill received no grist

  Scenario: While the mill has not answered the box says Waiting with the seconds
    Given Lampas is opened on Romans 8 in English with a reading check behind a fake Postern that holds its answers
    And he selects verse 28
    When he holds Read for 2 seconds and lets go
    Then the reading check says it is waiting, with seconds
    And Read cannot be held while it waits
    When the mill answers
    Then the verse in the reading check shows "together" and "purpose" marked to fix

  Scenario: A microphone that is turned off says so
    Given Lampas is opened on Romans 8 in English with a reading check and the microphone turned off
    And he selects verse 28
    When he holds Read for 2 seconds and lets go
    Then the reading check says "The microphone is turned off for this page"
    And the mill received no grist

  Scenario: A backend that cannot be reached shows Could not reach with Retry, and Retry sends the same recording
    Given Lampas is opened on Romans 8 in English with a reading check behind a fake Postern that cannot be reached
    And he selects verse 28
    When he holds Read for 2 seconds and lets go
    Then the reading check says "Could not reach the tutor" with a Retry button
    When the backend comes back and he taps Retry
    Then the verse in the reading check shows "together" and "purpose" marked to fix

  Scenario: The result is still there after reopening
    Given Lampas is opened on Romans 8 in English with a reading check behind a fake Postern
    And he selects verse 28
    And he holds Read for 2 seconds and lets go
    And the reading of verse 28 has arrived
    When he reopens Lampas and selects verse 28
    Then the verse in the reading check shows "together" and "purpose" marked to fix
    And the mill received one grist for the lampas app, kind verse-read

  Scenario: The Read button on the verse itself records the same way and selects the verse
    Given Lampas is opened on Romans 8 in English with a reading check behind a fake Postern
    When he holds the Read button on verse 28 for 2 seconds and lets go
    Then verse 28 is selected
    And the mill received one grist for the lampas app, kind verse-read
    And the verse in the reading check shows "together" and "purpose" marked to fix

  Scenario: The Greek view says the Greek reading check is coming
    Given Lampas is opened on Romans 8 in Greek with a reading check behind a fake Postern
    When he selects verse 28
    Then the reading check says "Greek reading check is coming"
    And there is no Read button
    And the mill received no grist
