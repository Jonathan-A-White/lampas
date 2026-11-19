Feature: Devotional sources in Settings > Daily
  Every source of devotionals has its own On | Off in one section of Settings > Daily, "Devotional sources" (mw-r9xo1pj.4): "Logos devotionals" (the ones that are on in Your Logos library) and "Brookfield First" (Morning RePhil).
  Which devotional lists, and Random and Another draw, only from the sources that are On there, by the one draw (src/data/daily/devotionals.ts drawPool). With Logos itself Off the "Logos devotionals" row is not shown
  and no Logos devotional is drawn. Nothing is added to Tools; Library > Devotionals still turns each Logos devotional On and Off.

  Scenario: The section lists both sources
    Given the shelf holds the devotionals "The Heart of Praise, Manual of Family Devotions (Book of Common Prayer)" and Settings > Daily is open with Logos On
    Then the "Devotional sources" section has the sources "Logos devotionals, Brookfield First"
    And "Logos devotionals" is On and says "2 devotionals"
    And the source "Brookfield First" is On and says "Morning RePhil"

  Scenario: Turning Morning RePhil Off takes it out of the picker and the draw
    Given the shelf holds the devotionals "The Heart of Praise, Manual of Family Devotions (Book of Common Prayer)" and Settings > Daily is open with Logos On
    When he turns "Brookfield First" Off
    Then the Which devotional picker offers "Random, The Heart of Praise, Manual of Family Devotions: Arranged from the Book of Common Prayer"
    And Random never draws Morning RePhil in a year of days

  Scenario: Turning Logos devotionals Off leaves only Morning RePhil
    Given the shelf holds the devotionals "The Heart of Praise, Manual of Family Devotions (Book of Common Prayer)" and Settings > Daily is open with Logos On
    When he turns "Logos devotionals" Off
    Then the Which devotional picker offers "Random, Morning RePhil (Brookfield First)"
    And Random never draws a Logos devotional in a year of days
    And Random draws Morning RePhil on some day of a year

  Scenario: With Logos Off the Logos devotionals row is not shown and none is drawn
    Given the shelf holds the devotionals "The Heart of Praise, Manual of Family Devotions (Book of Common Prayer)" and Settings > Daily is open with Logos Off
    Then the "Devotional sources" section has the sources "Brookfield First"
    And Random never draws a Logos devotional in a year of days

  Scenario: Tools has no Devotionals door
    Given the shelf holds the devotionals "The Heart of Praise" and Tools is open with Logos On
    Then Tools has no door "Devotionals"
