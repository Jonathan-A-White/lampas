Feature: Hands-free (mw-rl10piw.5, the switch of the epic mw-rl10piw)
  Hands-free is one setting, Off until he turns it on and On until he turns it off: Settings > Listening > Reading voices > Hands-free, the section's first
  row, and a three-finger tap anywhere in the app. Both go through src/handsFree/switch.ts, so both say 'Hands-free on' or 'Hands-free off' aloud, in the
  English voice (the honest speech fake of tests/support/fake-speech.ts). While it is On a small microphone mark (voice-kit/handsfree) stands at the top
  right with the name 'Hands-free is on', and the screen is kept awake (src/speech/wakeLock.ts, holder 'hands-free'). This story opens no microphone: the
  listening comes with the next story, and navigator.mediaDevices.getUserMedia is never called. A two-finger tap and the Immersive reader are as they were.
  A three-finger tap over a map or the ladder graph (an element marked data-two-finger) does nothing. How it looks at 390 px is proven by
  tests/e2e/hands-free.spec.ts.

  Scenario: Hands-free is Off on a fresh install and no mark shows
    Given a phone that speaks English and keeps the screen awake
    And Lampas is opened on Romans 8 for the first time
    Then the Hands-free mark is not on the screen
    And nothing has been said aloud

  Scenario: A three-finger tap on the Reader turns Hands-free on, a second turns it off, and each says so
    Given a phone that speaks English and keeps the screen awake
    And Lampas is opened on Romans 8 for the first time
    When he taps the Reader with three fingers
    Then the phone says "Hands-free on" in English
    And the Hands-free mark named "Hands-free is on" is on the screen
    And the screen is being kept awake for Hands-free
    When he taps the Reader with three fingers again
    Then the phone then says "Hands-free off" in English
    And the Hands-free mark is not on the screen
    And the screen is no longer kept awake for Hands-free

  Scenario: Turned On in Settings it says so and the mark shows on the Reader, the Settings home and a word sheet
    Given a phone that speaks English and keeps the screen awake
    And Lampas is opened on Romans 8 for the first time
    When he opens Settings > Listening
    Then Hands-free shows "Off" as the one chosen
    And Hands-free is the first row of Reading voices
    When he chooses "On" for Hands-free
    Then the phone says "Hands-free on" in English
    And the Hands-free mark named "Hands-free is on" is on the screen
    When he leaves Settings for the Reader
    Then the Hands-free mark is on the Reader
    When he opens Settings
    Then the Hands-free mark is on the Settings home
    When he leaves Settings for the Reader again
    And he taps the first word of verse 1
    Then the word sheet is open
    And the Hands-free mark is on the word sheet's screen

  Scenario: Hands-free On survives a reload, in silence
    Given a phone that speaks English and keeps the screen awake
    And Lampas is opened on Romans 8 with Hands-free On
    Then the Hands-free mark named "Hands-free is on" is on the screen
    And nothing has been said aloud
    And the screen is being kept awake for Hands-free

  Scenario: A three-finger tap over a map does nothing
    Given a phone that speaks English and keeps the screen awake
    And Lampas is opened on Romans 8 for the first time
    When he taps a map with three fingers
    Then the Hands-free mark is not on the screen
    And nothing has been said aloud
    And Hands-free is still Off

  # 'Pause before it acts' (mw-rl10piw.9): the silence after his words that ends a command is a setting, 1, 1.5, 2, 3 or 4 seconds, 1.5 to start (his decision, mw-6ww.165).
  # The row stands under Hands-free and is always drawn. The session asks for it at each command (tests/unit/hands-free-pause.test.tsx), so a change needs no restart. The wake
  # is voice-kit's fake (tests/support/fake-wake.ts), the recogniser tests/support/fake-recognizer.ts, and time a clock the test moves.

  Scenario: Pause before it acts is 1.5 seconds on a fresh install, in the row under Hands-free
    Given a phone that speaks English and keeps the screen awake
    And Lampas is opened on Romans 8 for the first time
    When he opens Settings > Listening
    Then Pause before it acts shows "1.5 seconds" as the one chosen
    And Pause before it acts is the row under Hands-free

  Scenario: With 3 seconds chosen a pause to think is not the end of the command
    Given a phone that hears the wake word, speaks English and keeps the screen awake
    And Lampas is opened on Romans 8 with Hands-free On
    When he chooses "3 seconds" for Pause before it acts and goes back to the Reader
    And he says the wake word
    And he says "read John"
    And he is quiet for 2 seconds
    Then the command is not taken yet
    When he goes on with "read John 3"
    And he is then quiet for 3 seconds
    Then the phone says "John 3" in English
    When the phone has said it
    Then the Reader is at John 3 and John 3 is read from verse 1

  Scenario: With 1.5 seconds chosen the same words are cut after 'read John'
    Given a phone that hears the wake word, speaks English and keeps the screen awake
    And Lampas is opened on Romans 8 with Hands-free On
    When he says the wake word
    And he says "read John"
    And he is quiet for 1.5 seconds
    Then the command is taken before he says "3"
    And John 3 is not opened
