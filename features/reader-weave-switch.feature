Feature: The Reader's switch is English | Weave | Greek
  While the Weave is on, the header switch has three choices: English (plain English, no Greek words), Weave (the English
  woven with the Greek of his words) and Greek. A long press on Weave flips the woven text between the English and the Greek
  word order and says which in a short toast. With the Weave Off the switch is English | Greek, as before.

  Scenario: With the Weave on the switch offers English, Weave and Greek, and Weave is the one chosen
    Given Lampas is opened with nothing saved
    And he sets Weave to Solid words
    Then the language switch offers "English", "Weave" and "Greek"
    And "Weave" is the chosen language
    And verse 1 shows Greek words woven into the English

  Scenario: English shows plain English with no Greek words
    Given Lampas is opened with nothing saved
    And he sets Weave to Solid words
    When he chooses "English" in the language switch
    Then "English" is the chosen language
    And no woven word is shown
    And verse 1 reads as the data's English chunks

  Scenario: Greek is unchanged and Weave brings the woven text back
    Given Lampas is opened with nothing saved
    And he sets Weave to Solid words
    When he chooses "Greek" in the language switch
    Then the Greek view shows the Greek words of verse 1
    And he chooses "Weave" in the language switch
    And verse 1 shows Greek words woven into the English

  Scenario: With the Weave Off the switch is English | Greek
    Given Lampas is opened with nothing saved
    Then the language switch offers "English" and "Greek"

  Scenario: Plain English is remembered after a reload
    Given Lampas is opened with nothing saved
    And he sets Weave to Solid words
    And he chooses "English" in the language switch
    When he reopens Lampas
    Then "English" is the chosen language
    And no woven word is shown

  Scenario: A long press on Weave flips to the Greek word order and says so
    Given Lampas is opened with nothing saved
    And he sets Weave to Solid words
    And verse 1 begins "Therefore there is now no condemnation"
    When he long presses "Weave" in the language switch
    Then a toast says "Greek word order"
    And verse 1 now begins "no Therefore there is now condemnation"
    And "Weave" is the chosen language

  Scenario: A second long press flips back to the English word order
    Given Lampas is opened with nothing saved
    And he sets Weave to Solid words
    And he has long pressed "Weave" in the language switch
    When he long presses "Weave" in the language switch
    Then a toast says "English word order"
    And verse 1 now begins "Therefore there is now no condemnation"

  Scenario: The word order chosen by a long press is remembered after a reload
    Given Lampas is opened with nothing saved
    And he sets Weave to Solid words
    And he has long pressed "Weave" in the language switch
    When he reopens Lampas
    Then verse 1 now begins "no Therefore there is now condemnation"

  Scenario: A tap on Weave does not flip the order
    Given Lampas is opened with nothing saved
    And he sets Weave to Solid words
    When he chooses "Weave" in the language switch
    Then verse 1 begins "Therefore there is now no condemnation"
