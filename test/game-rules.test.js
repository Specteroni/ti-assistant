const assert = require("node:assert/strict");

const { updateGameData } = require("../src/util/api/handler.ts");
const { Events } = require("../src/util/api/events.ts");
const { canExhaustTech } = require("../src/util/techs.ts");
const { getVotesAfterPlanetStateChange } = require("../src/util/votes.ts");
const {
  ClaimPlanetHandler,
  UnclaimPlanetHandler,
} = require("../src/util/model/claimPlanet.ts");
const {
  UpdatePlanetStateHandler,
} = require("../src/util/model/updatePlanetState.ts");
const {
  UpdateTechStateHandler,
} = require("../src/util/model/updateTechState.ts");
const {
  AdvancePhaseHandler,
} = require("../src/util/model/advancePhase.ts");
const {
  computeRemainingVotes,
} = require("../src/components/VoteBlock/VoteBlock.tsx");

function baseGame(overrides = {}) {
  return {
    factions: {
      "Embers of Muaat": {
        id: "Embers of Muaat",
        color: "red",
        order: 1,
        mapPosition: 0,
        techs: {},
      },
      "Xxcha Kingdom": {
        id: "Xxcha Kingdom",
        color: "green",
        order: 2,
        mapPosition: 1,
        techs: {},
      },
    },
    options: {
      expansions: [],
    },
    planets: {},
    players: {},
    state: {
      phase: "ACTION",
      round: 1,
      speaker: "Embers of Muaat",
    },
    sequenceNum: 1,
    ...overrides,
  };
}

function applyUpdates(gameData, updates) {
  const next = structuredClone(gameData);
  updateGameData(next, updates);
  return next;
}

test("claiming an unowned planet exhausts it the first time", () => {
  const gameData = baseGame({
    planets: {
      "Mecatol Rex": {},
    },
  });

  const handler = new ClaimPlanetHandler(
    gameData,
    Events.ClaimPlanetEvent("Embers of Muaat", "Mecatol Rex"),
  );

  assert.equal(handler.validate(), true);
  assert.equal(
    handler.getUpdates()["planets.Mecatol Rex.state"],
    "EXHAUSTED",
  );
});

test("capturing a planet from another player restores the previous planet state", () => {
  const gameData = baseGame({
    planets: {
      "Mecatol Rex": {
        owner: "Xxcha Kingdom",
        state: "READIED",
      },
    },
  });

  const handler = new ClaimPlanetHandler(
    gameData,
    Events.ClaimPlanetEvent("Embers of Muaat", "Mecatol Rex"),
  );

  assert.equal(handler.data.event.prevOwner, "Xxcha Kingdom");
  assert.equal(
    handler.getUpdates()["planets.Mecatol Rex.state"],
    "READIED",
  );
});

test("unclaiming a planet restores its previous owner and state when it was captured this turn", () => {
  const gameData = baseGame({
    actionLog: [
      {
        timestampMillis: 10,
        data: {
          action: "CLAIM_PLANET",
          event: {
            faction: "Embers of Muaat",
            planet: "Mecatol Rex",
            prevOwner: "Xxcha Kingdom",
            prevState: "EXHAUSTED",
          },
        },
      },
    ],
    planets: {
      "Mecatol Rex": {
        owner: "Embers of Muaat",
        state: "READIED",
      },
    },
  });

  const handler = new UnclaimPlanetHandler(
    gameData,
    Events.UnclaimPlanetEvent("Embers of Muaat", "Mecatol Rex"),
  );

  const updates = handler.getUpdates();
  assert.equal(updates["planets.Mecatol Rex.owner"], "Xxcha Kingdom");
  assert.equal(updates["planets.Mecatol Rex.state"], "EXHAUSTED");
});

test("planet state updates remember previous state and cancel a readied log entry", () => {
  const gameData = baseGame({
    planets: {
      "Mecatol Rex": {
        owner: "Embers of Muaat",
        state: "EXHAUSTED",
      },
    },
  });

  const handler = new UpdatePlanetStateHandler(
    gameData,
    Events.UpdatePlanetStateEvent("Mecatol Rex", "READIED"),
  );

  assert.equal(handler.data.event.prevState, "EXHAUSTED");
  assert.equal(handler.getUpdates()["planets.Mecatol Rex.state"], "READIED");
  assert.equal(
    handler.getActionLogAction({
      timestampMillis: 1,
      data: Events.UpdatePlanetStateEvent("Mecatol Rex", "EXHAUSTED"),
    }),
    "DELETE",
  );
});

test("planet vote adjustment adds when exhausting and subtracts when readying", () => {
  assert.equal(getVotesAfterPlanetStateChange(4, 3, "EXHAUSTED"), 7);
  assert.equal(getVotesAfterPlanetStateChange(7, 3, "READIED"), 4);
  assert.equal(getVotesAfterPlanetStateChange(2, 5, "READIED"), 0);
  assert.equal(getVotesAfterPlanetStateChange(4, 0, "EXHAUSTED"), 4);
  assert.equal(getVotesAfterPlanetStateChange(4, 3, "PURGED"), 4);
});

test("exhausted and purged planets do not contribute remaining agenda votes", () => {
  const factions = {
    "Embers of Muaat": {
      id: "Embers of Muaat",
      techs: {},
    },
  };
  const planets = {
    "Mecatol Rex": {
      id: "Mecatol Rex",
      owner: "Embers of Muaat",
      influence: 6,
      resources: 1,
      attributes: [],
      types: [],
      state: "READIED",
    },
    Arinam: {
      id: "Arinam",
      owner: "Embers of Muaat",
      influence: 2,
      resources: 1,
      attributes: [],
      types: [],
      state: "EXHAUSTED",
    },
    Bereg: {
      id: "Bereg",
      owner: "Embers of Muaat",
      influence: 1,
      resources: 3,
      attributes: [],
      types: [],
      state: "PURGED",
    },
  };

  const remaining = computeRemainingVotes(
    "Embers of Muaat",
    factions,
    planets,
    {},
    {},
    { expansions: [] },
    { phase: "AGENDA", round: 1, speaker: "Embers of Muaat" },
    [],
    {},
    {},
  );

  assert.deepEqual(remaining, {
    influence: 6,
    extraVotes: 0,
  });
});

test("existing cast votes consume available planet influence", () => {
  const remaining = computeRemainingVotes(
    "Embers of Muaat",
    {
      "Embers of Muaat": {
        id: "Embers of Muaat",
        techs: {},
      },
    },
    {
      "Mecatol Rex": {
        id: "Mecatol Rex",
        owner: "Embers of Muaat",
        influence: 6,
        resources: 1,
        attributes: [],
        types: [],
        state: "READIED",
      },
      Arinam: {
        id: "Arinam",
        owner: "Embers of Muaat",
        influence: 2,
        resources: 1,
        attributes: [],
        types: [],
        state: "READIED",
      },
    },
    {},
    {},
    { expansions: [] },
    { phase: "AGENDA", round: 1, speaker: "Embers of Muaat" },
    [
      {
        timestampMillis: 1,
        data: Events.CastVotesEvent("Embers of Muaat", 6, 0, "For"),
      },
    ],
    {},
    {},
  );

  assert.deepEqual(remaining, {
    influence: 2,
    extraVotes: 0,
  });
});

test("tech exhaustion is detected only for cards that say exhaust this card", () => {
  assert.equal(
    canExhaustTech({
      description: "ACTION: Exhaust this card to do a useful thing.",
      expansion: "BASE",
      id: "Plasma Scoring",
      name: "Test Tech",
      prereqs: [],
      type: "RED",
    }),
    true,
  );
  assert.equal(
    canExhaustTech({
      description: "When you exhaust a planet, gain 1 trade good.",
      expansion: "BASE",
      id: "Plasma Scoring",
      name: "Other Tech",
      prereqs: [],
      type: "RED",
    }),
    false,
  );
  assert.equal(canExhaustTech(undefined), false);
});

test("tech state updates remember previous state and cancel when readied", () => {
  const gameData = baseGame({
    factions: {
      "Embers of Muaat": {
        id: "Embers of Muaat",
        techs: {
          "Plasma Scoring": {
            state: "exhausted",
          },
        },
      },
    },
  });

  const handler = new UpdateTechStateHandler(
    gameData,
    Events.UpdateTechStateEvent("Embers of Muaat", "Plasma Scoring", "ready"),
  );

  assert.equal(handler.data.event.prevState, "exhausted");
  assert.equal(
    handler.getUpdates()[
      "factions.Embers of Muaat.techs.Plasma Scoring.state"
    ],
    "ready",
  );
  assert.equal(
    handler.getActionLogAction({
      timestampMillis: 1,
      data: Events.UpdateTechStateEvent(
        "Embers of Muaat",
        "Plasma Scoring",
        "exhausted",
      ),
    }),
    "DELETE",
  );
});

test("agenda phase end readies exhausted planets and exhausted techs", () => {
  const gameData = baseGame({
    factions: {
      "Embers of Muaat": {
        id: "Embers of Muaat",
        techs: {
          "Plasma Scoring": {
            state: "exhausted",
          },
          "Sarween Tools": {
            state: "purged",
          },
        },
      },
    },
    options: {
      expansions: [],
    },
    planets: {
      "Mecatol Rex": {
        owner: "Embers of Muaat",
        state: "EXHAUSTED",
      },
      Arinam: {
        owner: "Embers of Muaat",
        state: "PURGED",
      },
    },
    state: {
      phase: "AGENDA",
      round: 2,
      speaker: "Embers of Muaat",
    },
  });

  const updates = new AdvancePhaseHandler(
    gameData,
    Events.AdvancePhaseEvent(),
  ).getUpdates();

  assert.equal(updates["state.phase"], "STRATEGY");
  assert.equal(updates["state.round"], 3);
  assert.equal(updates["planets.Mecatol Rex.state"], "READIED");
  assert.equal(updates["planets.Arinam.state"], undefined);
  assert.equal(
    updates["factions.Embers of Muaat.techs.Plasma Scoring.state"],
    "ready",
  );
  assert.equal(
    updates["factions.Embers of Muaat.techs.Sarween Tools.state"],
    undefined,
  );
});

test("status phase end readies exhausted planets and non-share-knowledge techs", () => {
  const gameData = baseGame({
    factions: {
      "Embers of Muaat": {
        id: "Embers of Muaat",
        color: "red",
        order: 1,
        mapPosition: 0,
        techs: {
          "Plasma Scoring": {
            state: "exhausted",
          },
          "Sarween Tools": {
            shareKnowledge: true,
            state: "exhausted",
          },
        },
      },
    },
    options: {
      expansions: [],
    },
    planets: {
      "Mecatol Rex": {
        owner: "Embers of Muaat",
        state: "EXHAUSTED",
      },
    },
    state: {
      phase: "STATUS",
      round: 2,
      speaker: "Embers of Muaat",
    },
  });

  const updates = new AdvancePhaseHandler(
    gameData,
    Events.AdvancePhaseEvent(),
  ).getUpdates();

  assert.equal(updates["state.phase"], "AGENDA");
  assert.equal(updates["planets.Mecatol Rex.state"], "READIED");
  assert.equal(
    updates["factions.Embers of Muaat.techs.Plasma Scoring.state"],
    "ready",
  );
  assert.equal(
    updates["factions.Embers of Muaat.techs.Sarween Tools"],
    "DELETE",
  );
  assert.equal(
    updates["factions.Embers of Muaat.techs.Sarween Tools.state"],
    undefined,
  );
});

test("updateGameData applies nested set, delete, and increment operations", () => {
  const gameData = baseGame({
    factions: {
      "Embers of Muaat": {
        commandCounters: 8,
        id: "Embers of Muaat",
        techs: {
          "Plasma Scoring": {
            state: "exhausted",
          },
        },
      },
    },
  });

  const updated = applyUpdates(gameData, {
    "factions.Embers of Muaat.commandCounters": "INCREMENT",
    "factions.Embers of Muaat.techs.Plasma Scoring.state": "DELETE",
    "planets.Mecatol Rex.owner": "Embers of Muaat",
  });

  assert.equal(updated.factions["Embers of Muaat"].commandCounters, 9);
  assert.equal(
    updated.factions["Embers of Muaat"].techs["Plasma Scoring"].state,
    undefined,
  );
  assert.equal(updated.planets["Mecatol Rex"].owner, "Embers of Muaat");
});
