Feature: An idea I keep getting right turns solid
  Each grammar idea has a level: solid (he has it), frontier (he is working on it) or not yet. An idea he answers
  on the schedule moves between them by itself: one he keeps getting right turns solid, and one he slips on
  comes back to the frontier. The level is kept (src/data/repositories/grammarLevels.ts) so the placement, the
  idea sheet, the drills and the tutor can set it too. The 14-day step is what makes an idea solid (PROVISIONAL).

  Scenario: An idea I keep getting right turns solid
    Given the idea "case-genitive" is at the frontier
    When he gets "case-genitive" right on 6 days in a row
    Then "case-genitive" is solid

  Scenario: One I slip on comes back to the frontier
    Given the idea "case-genitive" is solid
    When he gets "case-genitive" wrong
    Then "case-genitive" is at the frontier
    And "case-genitive" comes back tomorrow

  Scenario: An idea I have not met starts at the frontier when I first answer it
    Given the idea "case-dative" is not yet known
    When he gets "case-dative" right on 1 day in a row
    Then "case-dative" is at the frontier

  Scenario: A term I marked I know this makes its idea solid
    Given he marked the term "genitive" I know this
    When Lampas is opened after the upgrade
    Then the genitive idea is solid
    And it comes back in 30 days
