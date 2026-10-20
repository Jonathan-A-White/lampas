Feature: Works of his Logos library in Settings
  Lampas cannot read which books he owns in Logos, so Settings > Study resources has a Works section (mw-5r3p30.675, PROVISIONAL): each commentary or book the tutor may link
  is a switch named by its full title, with its author, all off to start with. A switch he turns on is kept across a reload. The tutor is told only the ones that are on.

  Scenario: Works lists each work by its full title and author, all off
    Given Lampas is opened on Romans 8 with no works switched on
    When he opens Settings
    Then Settings lists the work "Calvin's Commentaries" by "John Calvin", off
    And Settings also lists the work "Institutes of the Christian Religion (Library of Christian Classics)" by "John Calvin", off
    And Settings lists as well the work "Institutes of the Christian Religion (Beveridge)" by "John Calvin", off

  Scenario: A work he switches on is kept across a reload
    Given Lampas is opened on Romans 8 with no works switched on
    When he opens Settings
    And he switches on the work "Calvin's Commentaries"
    Then the works kept are "calvin-commentaries"
    When Lampas is opened again and he opens Settings
    Then Settings lists the work "Calvin's Commentaries" by "John Calvin", on
    And Settings also lists the work "Institutes of the Christian Religion (Beveridge)" by "John Calvin", off
