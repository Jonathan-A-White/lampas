Feature: The Hand setting (mw-5r3p30.879, part A of mw-5r3p30.843; the Tutor door setting it came with is gone, mw-5r3p30.882)
  Settings > Reading > Layout has a Hand row, Left or Right (Right to start): the side the floating ? sits on. It is kept on the phone and is a row the tutor does not read or change.

  Scenario: Hand starts at Right and is kept across a reload
    Given Settings is open at the page of "Reading"
    Then the "Hand" row shows "Right" chosen
    When he chooses "Left" for the "Hand"
    Then the setting "hand" is kept as "left"
    When Settings is opened again after a reload
    Then the "Hand" row still shows "Left" chosen
