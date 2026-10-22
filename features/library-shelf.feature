Feature: His shelf, kept in the library table
  His Logos library is a shelf (docs/design/library-at-scale.md 3.2, mw-rfjjzd.3): one row in the Dexie library table for each book he has touched, On or Pinned, and no row
  for a book that is Off. The first time the shelf is read after the update, the old keys (the lexicons ticked under Logos, the grammar books, the works and the devotional
  draw) become rows: the first lexicon ticked and Black are Pinned, the rest On. The readers written for those keys read the rows, so every screen of today shows the same.
  A kind holds at most 3 pins; Bibles hold one at a time; a Devotional cannot be Pinned.

  Scenario: The first open makes rows from the old keys
    Given the old keys hold the lexicons "bdag, louwnida" ticked, the grammar books "black, gone" ticked, the works "calvin-commentaries, calvin-institutes-lcc" ticked and a draw of two devotionals
    When the shelf is first opened
    Then the library table has the lexicons "bdag, louwnida" On, with "bdag" Pinned
    And the library table has the grammar book "black" Pinned and no row for "gone"
    And the library table has the volumes of the works "calvin-commentaries, calvin-institutes-lcc" On
    And the library table has the two devotionals of the draw On

  Scenario: The old readers answer from the rows
    Given the old keys hold the lexicons "bdag, louwnida" ticked, the grammar books "black, gone" ticked, the works "calvin-commentaries, calvin-institutes-lcc" ticked and a draw of two devotionals
    When the shelf is first opened
    Then the Logos lexicons ticked are "bdag, louwnida"
    And getGrammarBooks answers "black, gone"
    And getWorks answers "calvin-commentaries, calvin-institutes-lcc"
    And the devotional draw is the two devotionals
    When he ticks the lexicon "dbl" and unticks "louwnida"
    Then the lexicons ticked now are "bdag, dbl"
    And the old key resourceOption.logos still holds what it held

  Scenario: A phone with no old keys starts with the books that start ticked
    Given the old keys hold nothing
    When the shelf is first opened
    Then the Logos lexicons ticked are "bdag"
    And getGrammarBooks answers "black"
    And getWorks answers nothing
    And the devotional draw is every devotional

  Scenario: All on and All off for a kind
    Given the old keys hold nothing
    When he sets every lexicon On
    Then every catalogue lexicon is On
    And the lexicon "bdag" is still Pinned
    When he sets every lexicon Off
    Then no lexicon is on the shelf

  Scenario: A fourth pin in a kind is refused
    Given the old keys hold nothing
    When he pins the lexicons "louwnida, dbl"
    Then the shelf pins 3 lexicons
    When he pins the lexicon "ednt"
    Then the shelf refuses with "too-many-pins" and still pins 3 lexicons

  Scenario: Bibles hold one On
    Given the old keys hold nothing
    When he sets the Bible "LLS:1.0.710" On
    And he sets the Bible "LLS:NIV2011" On
    Then the shelf holds the one Bible "LLS:NIV2011"
    And setting every Bible On is refused with "one-at-a-time"

  Scenario: A Devotional cannot be Pinned
    Given the old keys hold nothing
    When he pins the devotional "LLS:20.10.1"
    Then the shelf refuses with "no-pin-for-devotionals" and still pins 0 devotionals
