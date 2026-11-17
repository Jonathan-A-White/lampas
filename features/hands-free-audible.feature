@uc-hands-free-audible @greek
Feature: Hands-free opens his audio Bible in Audible: 'read John 3 in Audible' (mw-rl10piw.11, the epic mw-rl10piw)
  'read', 'open', 'go to', 'play' and 'listen to' a place that ends 'in Audible' or 'on Audible' open The Word of Promise in the Audible app at the chapter (src/handsFree/audible.ts,
  PROVISIONAL: the words 'in Audible' pick Audible and plain 'read John 3' stays the voice inside Lampas, features/hands-free-commands.feature). Lampas's own reading stops and nothing is left for
  the close to resume; the Reader opens at the chapter; it says the place and 'in Audible'; then it opens the link made at that moment, through the door the Listen in Audible tap uses
  (tests/unit/hands-free-audible.test.ts holds the plan's session). A browser may refuse to open another app when no finger touched the screen (NOT KNOWN on his phone): with the page still in front
  after the wait it says 'Touch the screen once to open Audible', and the next touch in 30 s opens the link, made anew at that touch. With Audio Bible Off it says so and opens nothing.
  How the words become a place is tests/unit/hands-free-passage.test.ts. The OpenEnv is a fake the test works by hand; the recogniser is tests/support/fake-recognizer.ts, the speech the
  honest fake of tests/support/fake-speech.ts.

  Scenario: 'read John 3 in Audible' while John 1 is read: the Reader opens at John 3, the place is said, the reading stops and Audible is opened once
    Given Hands-free is On with Audio Bible On and "John 1" is open in English on a phone that speaks English
    And John 1 is being read aloud at verse 2
    When he says the wake word
    And he says "read John 3 in Audible" and is quiet for 1.5 seconds
    Then the phone says "John 3, in Audible" in English
    When the phone has said it
    Then the Reader is at John 3 and Lampas is reading nothing
    And the one link opened is Audible's for John 3, made at the moment it opened
    When the page goes away and the wait passes
    Then nothing more is said

  Scenario: The page is still in front: it asks for one touch, and a touch within 30 seconds opens the link made at that touch
    Given Hands-free is On with Audio Bible On and "John 1" is open in English on a phone that speaks English
    When he says the wake word
    And he says "read John 3 in Audible" and is quiet for 1.5 seconds
    And the phone says "John 3, in Audible" in English and has said it
    And the wait passes with the page still in front
    Then the phone says "Touch the screen once to open Audible" in English
    When 10 seconds later he touches the screen
    Then the links opened are Audible's for John 3, made at the moment it opened and again at the touch
    And "Touch the screen once to open Audible" was said once

  Scenario: With no touch for 30 seconds it lets go
    Given Hands-free is On with Audio Bible On and "John 1" is open in English on a phone that speaks English
    When he says the wake word
    And he says "read John 3 in Audible" and is quiet for 1.5 seconds
    And the phone says "John 3, in Audible" in English and has said it
    And the wait passes with the page still in front
    And 30 seconds pass
    And he touches the screen
    Then the one link opened is Audible's for John 3, made at the moment it opened

  Scenario: Audio Bible Off: it says to turn it on, opens nothing and the reading goes on
    Given Hands-free is On with Audio Bible Off and "John 1" is open in English on a phone that speaks English
    And John 1 is being read aloud at verse 2
    When he says the wake word
    And he says "read John 3 in Audible" and is quiet for 1.5 seconds
    Then the phone says "Turn on Audio Bible in Settings first" in English
    When the phone has said it
    Then no link was opened and the Reader is still at John 1
    And the reading of John 1 goes on at verse 2

  Scenario: Back in front after the page was hidden: the wake listening runs again and the mark shows
    Given Hands-free is On with Audio Bible On and "John 1" is open in English on a phone that speaks English
    When the page is hidden
    Then the wake is not listening
    When the page is in front again
    Then the wake is listening and the mark shows that Hands-free is waiting
