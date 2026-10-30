Feature: The Tutor door and Hand settings (mw-5r3p30.879, part A of mw-5r3p30.843)
  Settings > The tutor > Asking the tutor has a Tutor door row, Two-finger tap (the default) or Floating ?, and Settings > Reading > Layout a Hand row, Left or Right
  (Right to start). The first time he picks Floating ? the app asks which hand he holds his phone in, once. Both are kept on the phone and are rows the tutor does not read or change.

  Scenario: The Tutor door starts at Two-finger tap
    Given Settings is open at the page of "The tutor"
    Then the "Tutor door" row shows "Two-finger tap" chosen

  Scenario: Floating ? asks the hand once and is kept across a reload
    Given Settings is open at the page of "The tutor"
    When he chooses "Floating ?" for the "Tutor door"
    Then the app asks "Which hand do you hold your phone in?"
    When he answers "Left"
    Then the app no longer asks
    And the setting "tutorDoor" is kept as "floating"
    And his hand is kept as "left"
    When Settings is opened again after a reload
    Then the "Tutor door" row shows "Floating ?" chosen
    And the app does not ask which hand

  Scenario: Hand starts at Right and is kept across a reload
    Given Settings is open at the page of "Reading"
    Then the "Hand" row shows "Right" chosen
    When he chooses "Left" for the "Hand"
    Then the setting "hand" is kept as "left"
    When Settings is opened again after a reload
    Then the "Hand" row still shows "Left" chosen
