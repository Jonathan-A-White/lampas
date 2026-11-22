Feature: Ask the Bible talk for a sermon and it plays in the app (mw-qtu3zvz.84, docs/sermons.md 'Play by asking')
  In a Bible talk (typed, or by voice through Hands-free) he asks for a sermon: 'play a sermon on this chapter', 'play Lightning in Clay Pots', 'play a sermon on faith'. The request tells the tutor
  the sermons of the passage and which of them play in the app (a video); the tutor answers in one short line with the title and preacher and runs the command play-sermon (`do`) with the row's
  '<source>:<id>'. The command opens S1's player with openSermon(row, {auto: true}) once the answer has been said, so the sermon starts with no tap. With no match the tutor says so and runs
  nothing; a sermon the app cannot play (a text sermon, or one the request did not list) is refused, and the line under the answer says so. Postern is the fake, whose mill answers as a scenario sets.

  @uc-sermons @greek
  Scenario: He asks for a sermon on the chapter and the best match plays with no tap
    Given Lampas is opened on Romans 8 with video sermons, and the tutor answers a sermon ask by playing "testvideo:clay"
    And he opens Talk
    When he sends "play a sermon on this chapter"
    Then the sermon player opens on "Lightning in Clay Pots"
    And the sermon starts with no tap
    And the sheet says "Lightning in Clay Pots, preached by Phil Morgan"
    And the request told the tutor that "testvideo:clay" plays in the app and "testvideo:notes" does not

  @uc-sermons @greek
  Scenario: Several sermons fit, the tutor names them and the first plays
    Given Lampas is opened on Romans 8 with video sermons, and the tutor answers a sermon ask by playing "testvideo:faith"
    And he opens Talk
    When he sends "play a sermon on faith"
    Then the sermon player opens on "Faith that Works"
    And the sheet says "Also: Lightning in Clay Pots"

  @uc-sermons @greek
  Scenario: No sermon fits, the tutor says so and nothing plays
    Given Lampas is opened on Romans 8 with video sermons, and the tutor answers a sermon ask with none listed
    And he opens Talk
    When he sends "play a sermon on the tabernacle"
    Then the sheet says "No sermon of the tabernacle is listed"
    And no sermon player is open

  @uc-sermons @greek
  Scenario: A text sermon, or one that was never listed, is refused and nothing plays
    Given Lampas is opened on Romans 8 with video sermons, and the tutor answers a sermon ask by playing "testvideo:notes"
    And he opens Talk
    When he sends "play a sermon on grace"
    Then the sheet says "Could not play"
    And no sermon player is open
