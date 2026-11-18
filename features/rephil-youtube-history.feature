Feature: Import YouTube history to mark Morning RePhil episodes seen
  He exports his YouTube history once from Google Takeout and chooses its watch-history.json under Settings > Daily. The episodes he watched are marked Seen. The file is read on his phone
  and nothing of it is kept or sent anywhere; the Seen marks are this device's own.

  Scenario: A history of three videos, two of them Morning RePhil, marks exactly those two
    Given Settings > Daily is open with Morning RePhil chosen and no episode seen
    And his watch-history.json lists "Morning RePhil #257", "Morning RePhil #258" and a video that is not Morning RePhil
    When he taps "Import YouTube history" and chooses the file
    Then it says "2 marked seen, 0 already seen"
    And exactly the first two episodes are seen

  Scenario: Importing the same file again marks nothing new
    Given Settings > Daily is open with Morning RePhil chosen and no episode seen
    And his watch-history.json lists "Morning RePhil #257", "Morning RePhil #258" and a video that is not Morning RePhil
    When he taps "Import YouTube history" and chooses the file
    And he taps "Import YouTube history" and chooses the file
    Then it says "0 marked seen, 2 already seen"

  Scenario: An episode is matched by its YouTube video id, else by its exact title
    Given episodes where one has a YouTube id and one has none
    When a history is imported whose entries are the id's video under another title, and the other episode by its exact title with "Watched " before it
    Then both episodes are marked seen
    And a video with the same id but a different title does not mark the episode without an id

  Scenario: Nothing of the file is kept or sent
    Given Settings > Daily is open with Morning RePhil chosen and no episode seen
    And his watch-history.json lists "Morning RePhil #257", "Morning RePhil #258" and a video that is not Morning RePhil
    When he taps "Import YouTube history" and chooses the file
    Then no request left the phone
    And nothing the file said is kept on the phone except the two episodes' ids

  Scenario: Another profile sees no Seen marks
    Given Settings > Daily is open with Morning RePhil chosen and no episode seen
    And his watch-history.json lists "Morning RePhil #257", "Morning RePhil #258" and a video that is not Morning RePhil
    When he taps "Import YouTube history" and chooses the file
    And a second user opens Lampas on their own phone
    Then no episode is seen

  Scenario: A file that is not a watch history says so
    Given Settings > Daily is open with Morning RePhil chosen and no episode seen
    When he chooses a file that is not a watch history
    Then it says "This is not a YouTube watch-history.json. Choose the file from Google Takeout."
    And no episode is seen
