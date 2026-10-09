Feature: Play my reading back, and Developer mode
  After a reading check (features/reading-check.feature) the clip he recorded is kept with its result, so the result has 'Play my
  reading' to hear himself again. Download is a debugging option: 'Download my recording' stays hidden until Developer mode is on.
  Developer mode is found by tapping the version number on About 7 times within 3 seconds; it then has a switch in Settings
  and stays across reloads. The recorder and the mill are fakes (tests/support/fake-recorder.ts, fake-postern.ts).

  Scenario: After a check, Play my reading plays the clip he recorded
    Given Lampas is opened on Romans 8 with a reading check he has just made
    Then the result has "Play my reading"
    When he taps "Play my reading"
    Then an audio element plays a blob that holds the recording
    And the button now says "Stop my reading"
    When he stops it with "Stop my reading"
    Then the audio element is paused and the button says "Play my reading"

  Scenario: Download my recording is hidden until Developer mode is on
    Given Lampas is opened on Romans 8 with a reading check he has just made
    Then the result has no "Download my recording"

  Scenario: With Developer mode on, Download my recording saves the clip as lampas-ref-time.webm
    Given Lampas is opened on Romans 8 with a reading of verse 28 kept at 12:00 UTC on 9 October 2026
    And Developer mode is on
    When he taps "Download my recording"
    Then the phone is given the file "lampas-rom.8.28-20261009T120000Z.webm" holding the recording

  Scenario: Seven taps within 3 seconds on the version number on About turn Developer mode on
    Given Lampas is opened on About
    When he taps the version number 7 times
    Then About says "Developer mode is on"
    And Settings has the switch "Developer mode" set to "On"

  Scenario: Fewer than seven taps, or taps spread over more than 3 seconds, do nothing
    Given Lampas is opened on About
    When he taps the version number 6 times
    And 4 seconds go by
    And he taps the version number 6 times again
    Then Settings has no "Developer mode"

  Scenario: Developer mode stays after the app is opened again, and can be switched off
    Given Lampas is opened on About
    And he taps the version number 7 times
    When Lampas is opened again on Settings
    Then Settings has the switch "Developer mode" set to "On"
    When he sets "Developer mode" to "Off"
    Then the switch "Developer mode" reads "Off"
