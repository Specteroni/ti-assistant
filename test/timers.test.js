const assert = require("node:assert/strict");

const { mergeLocalTimers } = require("../src/util/timers.ts");

test("local timer merge preserves locally-created timer keys", () => {
  const timers = mergeLocalTimers(
    {
      game: 10,
      "Empyrean-secondary": 1,
    },
    {
      game: 10,
    },
  );

  assert.equal(timers["Empyrean-secondary"], 1);
});

test("local timer merge keeps the newer local timer value", () => {
  const timers = mergeLocalTimers(
    {
      game: 12,
      Arborec: 8,
    },
    {
      game: 10,
      Arborec: 4,
    },
  );

  assert.equal(timers.game, 12);
  assert.equal(timers.Arborec, 8);
});

test("local timer merge keeps non-numeric snapshot values", () => {
  const timers = mergeLocalTimers(
    {
      paused: false,
      game: 10,
    },
    {
      paused: true,
      game: 10,
    },
  );

  assert.equal(timers.paused, true);
});
