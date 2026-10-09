Feature: The next new words, with the easiest verse for each
  As I read a chapter, Lampas picks the few new words worth learning next: the ones the New Testament uses most, never a
  word I already have, a name only after the ordinary words. For each it names the verse where the new word has the most
  of my solid words around it, so I meet the new thing with a lot of help around me.

  Background:
    Given a chapter of nine verses
    And the words "καί" and "εἰμί" are solid, "φῶς" is learning and "κόσμος" is dropped

  Scenario: A word I already have is never new
    When Lampas picks the new words of the chapter
    Then none of "καί", "εἰμί", "φῶς" and "κόσμος" is among them

  Scenario: The commoner word comes first
    When Lampas picks the new words of the chapter
    Then "θεός" comes before "λόγος"
    And "λόγος" also comes before "ἀγάπη"

  Scenario: A name comes after every ordinary word
    When Lampas picks the new words of the chapter
    Then "Παῦλος" is last, though the New Testament uses it more often than "ἀγάπη"

  Scenario: Only as many as I ask for
    When Lampas picks 3 new words of the chapter
    Then they are "θεός", "λόγος" and "ἀγάπη"

  Scenario: The verse with the most solid words around the new word
    When Lampas looks for the easiest verse for "ἀγάπη"
    Then it is verse 5

  Scenario: The shortest verse on a tie
    When Lampas looks for the easiest verse for "θεός"
    Then it is verse 4

  Scenario: Romans 8 gives me something to learn
    Given I am reading Romans 8 with lessons 1 to 9 solid
    When Lampas picks the new words of the chapter
    Then there is at least one, and the first is not a name
