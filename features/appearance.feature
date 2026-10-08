Feature: Appearance and speech speed in Settings
  Settings has Theme (Phone | Light | Dark, default Phone: the phone's own colour scheme, followed live), Text size
  (Small | Normal | Large | Largest, default Normal: the phone's own text size, 85% to 160%) and, beside the reading
  voices, a speed for English and a speed for Greek, each from 0.5 to 1.5, each set on its own and each starting at
  normal (1.0). The speed of a language is given to every utterance in that language. Every choice is kept in the
  settings store, told to the bus and survives a close.

  Scenario: Theme Phone follows a dark colour scheme and a light one
    Given Lampas is opened on a phone whose colour scheme is dark, with nothing saved
    Then the Theme in Settings is Phone
    And the page follows the phone's colour scheme
    And the browser bar colour is the dark one
    When the phone switches to a light colour scheme
    Then the browser bar colour is the light one
    And the page still follows the phone's colour scheme

  Scenario: Theme Dark makes the reader dark whatever the phone says
    Given Lampas is opened on a phone whose colour scheme is light, with nothing saved
    Then the browser bar colour is the light one
    When he sets Theme to Dark in Settings
    Then the bus has heard the theme is dark
    And the page is dark
    And the browser bar colour is the dark one
    When he sets Theme to Light in Settings
    Then the page is light
    And the browser bar colour is the light one

  Scenario: Text size Large makes the verse text larger and every tap target stays at least 44 px tall
    Given Lampas is opened on a phone whose colour scheme is dark, with nothing saved
    Then the Text size in Settings is Normal
    And the page text is at 100% of the phone's size
    When he sets Text size to Large in Settings
    Then the bus has heard the text size is 130
    And the page text has become 130% of the phone's size

  Scenario: a slower Greek rate slows a Greek speaker button and leaves English at its own rate, and a slower English rate slows English only
    Given Lampas is opened on a phone whose colour scheme is dark, with nothing saved
    Then the English speed in Settings is 1 and the Greek speed is 1
    When he sets the Greek speed to 0.6 in Settings
    Then the bus has heard the speeds are English 1 and Greek 0.6
    And a Greek speaker button speaks at 0.6
    And English is spoken at 1
    When he sets the English speed to 0.8 in Settings
    Then English is spoken at 0.8
    And a Greek speaker button still speaks at 0.6

  Scenario: Theme, Text size and both rates survive a reload
    Given Lampas is opened on a phone whose colour scheme is light, with nothing saved
    When he sets Theme to Dark in Settings
    And he sets Text size to Largest in Settings
    And he sets the English speed to 0.7 in Settings
    And he sets the Greek speed to 1.3 in Settings
    And Lampas is reopened at the Settings address
    Then the Theme in Settings is Dark
    And the Text size in Settings is Largest
    And the English speed in Settings is 0.7 and the Greek speed is 1.3
    And the page is dark
    And the page text is at 160% of the phone's size
    And a Greek speaker button speaks at 1.3
    And English is spoken at 0.7
