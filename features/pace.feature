Feature: Lampas offers new words at a pace I can keep
  Settings says how many new words a day Lampas may offer: Off, 3, 5 or 10, 3 until I choose. When more than 20 words are
  due, or my last review round went under 60 percent right, the header offers no new words and Settings says to clear my
  reviews first. After a clean week of reviews it offers one notch more. The thresholds are PROVISIONAL.

  Scenario: Settings offers New words a day with Off, 3, 5, 10
    Given Lampas is opened on Settings with nothing chosen for pace
    Then New words a day offers "Off", "3", "5" and "10", and "3" is chosen
    When he taps "5" under New words a day
    Then "5" is chosen under New words a day and is kept

  Scenario: with 25 words due the header offers no new words and Settings says Dialled back
    Given Lampas is opened on Romans 8 with his seed words for pace
    And 25 of his words are due
    Then the Reader shows no New words strip for pace
    When he opens Settings
    Then Settings says "Dialled back: clear your reviews first" under New words a day

  Scenario: Off hides the New words chip
    Given Lampas is opened on Romans 8 with his seed words for pace
    Then the chip under the Reader's header reads "New 3" for pace
    When he turns New words a day Off
    Then the Reader shows no New words strip for pace
