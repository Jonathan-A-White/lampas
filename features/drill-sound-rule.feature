Feature: Drill it on a sound that changes by the next letter
  His Chi drill (mw-i7xe0n.7, 2026-10-14): "the drill should catch whether I didn't really get that distinction and help me make that
  distinction". A letter or pair whose sound the chosen pronunciation changes by the letter after it (χ is kh before α and hy before ε) is
  drilled on words of both sides of the rule; 'How is this word said?' offers the same word misread by the rule as a wrong answer (χάρις:
  KHA-rees right, HYA-rees wrong); a wrong pick names the rule in one line; a Hint takes the far answers away first and keeps the misread
  word. The rules, their lines and their words are the scheme's (src/speech/schemes/modern.ts soundRules).

  Scenario: A wrong pick on a word of Chi names the rule of its side
    Given Drill it is open on "Chi"
    When he answers right until he is asked how a word is said
    And he picks the word misread by its rule
    Then Drill it says "Not quite." with the right respelling
    And one line under it names the rule of the word's side

  Scenario: A Hint on a word of Chi keeps the word misread by its rule
    Given Drill it is open on "Chi"
    When he answers right until he is asked how a word is said
    And he taps Hint on Drill it
    Then the word misread by its rule is still there to pick
