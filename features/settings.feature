Feature: Settings
  A Menu (three lines) in the reader's header opens Settings (or Tools), so the reader's header keeps only the chapter, English | Greek
  and the Menu. Settings holds the weave, the reading voices (English and Greek, from the phone's own list) and
  the Greek pronunciation (a list, from the registry in src/speech/pronunciation.ts; Modern Greek is the only entry for now). Every choice is kept in the settings
  store and survives a close; the screen has an address of its own.

  Scenario: The Menu opens Settings and Back returns to the reader
    Given Lampas is opened on a phone with a Greek voice
    When he opens Settings from the reader's Menu
    Then the Settings screen is shown
    And the address is "#/settings"
    When he taps Back on the Settings screen
    Then the reader is shown again

  Scenario: Turning the weave on in Settings weaves the reader
    Given Lampas is opened on a phone with a Greek voice
    When he opens Settings from the reader's Menu
    And he sets Weave to Solid words in Settings
    Then the bus has heard the weave is solid
    When he taps Back on the Settings screen
    Then verse 1 of the reader has woven Greek words
    And the reader's header has no Weave switch

  Scenario: A chosen Greek voice is used by the speaker buttons
    Given Lampas is opened on a phone with two Greek voices
    When he opens Settings from the reader's Menu
    And he chooses the Greek voice "Greek (Cyprus)" in Settings
    And he taps Back on the Settings screen
    And he switches the reader to Greek
    And he taps the play button of verse 1
    Then the phone speaks verse 1 with the voice "Greek (Cyprus)"

  Scenario: The voice pickers list the phone's voices by language, with Phone default first
    Given Lampas is opened on a phone with two Greek voices
    When he opens Settings from the reader's Menu
    Then the Greek voice picker offers "Phone default", "Greek (Greece)" and "Greek (Cyprus)"
    And the English voice picker offers "Phone default" and "English (US)"

  Scenario: Greek pronunciation shows Modern Greek, selected
    Given Lampas is opened on a phone with a Greek voice
    When he opens Settings from the reader's Menu
    And he sets each language on its own
    Then Greek pronunciation lists only "Modern Greek"
    And "Modern Greek" is selected

  Scenario: Settings survive a reload
    Given Lampas is opened on a phone with two Greek voices
    When he opens Settings from the reader's Menu
    And he sets Weave to Solid words in Settings
    And he chooses the Greek voice "Greek (Cyprus)" in Settings
    And he chooses the English voice "English (US)" in Settings
    And Lampas is reopened at the Settings address
    Then the Settings screen is shown
    And Weave is set to Solid words in Settings
    And the Greek voice picker shows "Greek (Cyprus)"
    And the English voice picker shows "English (US)"
    And "Modern" is selected

  Scenario: About is reachable from Settings
    Given Lampas is opened on a phone with a Greek voice
    When he opens Settings from the reader's Menu
    And he taps "About" on the Settings screen
    Then the About screen is shown
