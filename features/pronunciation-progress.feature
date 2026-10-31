@uc-pronunciation @greek
Feature: Sound progress is kept for each pronunciation
  The letters, sounds and marks are learned in a pronunciation (Modern Greek today, Erasmian next): what he proved in one he has not proved in the other,
  so switching in Settings starts the sounds again in the new one and keeps the old one's progress. The grammar ideas are one level for all
  (src/data/grammar/soundScope.ts, docs/pronunciation.md 'Sound progress'). The Goal screen tells him once.

  Scenario: Switching the pronunciation starts the sounds again, keeps the grammar ideas and tells him once
    Given a second pronunciation "Erasmian Greek" is registered
    And the goal is "1 John 1:1" and in Modern Greek "breathings" and "case-genitive" are solid
    When he opens the Goal screen
    Then the Goal screen has no note about a switch
    And the solid ideas include "Breathing marks" and "The genitive case"
    When he switches the pronunciation to "Erasmian Greek" in Settings
    And he goes to the Goal screen
    Then the Goal screen says "You switched to Erasmian Greek: the sounds start again here. Your Modern Greek progress is kept."
    And the solid ideas include "The genitive case" but not "Breathing marks"
    And the grammar ideas' counts are the same as in Modern Greek
    When he opens the Goal screen once more
    Then the Goal screen shows no note about a switch

  Scenario: Switching back gives him the old sounds as they were
    Given a second pronunciation "Erasmian Greek" is registered
    And the goal is "1 John 1:1" and in Modern Greek "breathings" and "case-genitive" are solid
    When he switches the pronunciation to "Erasmian Greek" in Settings
    And he switches the pronunciation to "Modern Greek" in Settings
    And he opens the Goal screen
    Then the Goal screen says "You switched to Modern Greek: the sounds start again here. Your Erasmian Greek progress is kept."
    And the solid ideas include "Breathing marks" and "The genitive case"
