@uc-sound-lessons @greek
Feature: Record yourself on a Hard sounds lesson's Try it step
  The 'Try it' step of a Hard sounds lesson (mw-5r3p30.363, PROVISIONAL until the Governor confirms) lets him hear himself next to the Greek voice. He holds a bar
  to say the sound or word, and on letting go hears his try, then the Greek voice, with Again to hear both once more. The recording is made by the one recorder
  Read it aloud uses (src/audio/recorder.ts), kept only in memory on the phone, sent nowhere, and dropped when the step closes. With the microphone refused the
  step says so and still plays the Greek voice.

  Scenario: He holds to say a word, then hears his try and the Greek voice, and Again
    Given Lampas is opened on the "Try it" step of the lesson "Rolling your r"
    When he holds the bar to say "πατήρ" for 2 seconds
    Then he hears his try, a clip that holds the recording
    When his try ends
    Then the Greek voice is handed "πατήρ" after his try
    And the step says "The Greek voice"
    When he taps "Again"
    Then he hears his try again, then the Greek voice again

  Scenario: Nothing leaves the device, and the recording is dropped when the step closes
    Given Lampas is opened on the "Try it" step of the lesson "Rolling your r"
    When he holds the bar to say "πατήρ" for 2 seconds
    Then nothing was sent from the phone and nothing of the recording is kept
    When he taps "Next"
    Then his try is dropped: its sound stopped and its address let go

  Scenario: A microphone that is turned off says so, and the Greek voice still plays
    Given Lampas is opened on the "Try it" step of the lesson "Rolling your r" with the microphone turned off
    When he holds the bar to say "πατήρ" for 2 seconds
    Then the step says the microphone is turned off
    And the Greek voice is handed "πατήρ" with no try before it
