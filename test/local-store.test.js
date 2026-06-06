const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  updateLocalGame,
  updateLocalTimers,
} = require("../server/util/localStore.ts");

const storePath = path.join(process.cwd(), "server", "local-dev-db.json");

function readStore() {
  return JSON.parse(fs.readFileSync(storePath, "utf8"));
}

async function withPreservedLocalStore(fn) {
  const hadStore = fs.existsSync(storePath);
  const original = hadStore ? fs.readFileSync(storePath, "utf8") : undefined;

  try {
    fs.writeFileSync(
      storePath,
      JSON.stringify(
        {
          archive: {},
          archiveTimers: {},
          games: {},
          passwords: {},
          sessions: {},
          timers: {},
        },
        null,
        2,
      ),
    );
    await fn();
  } finally {
    if (hadStore) {
      fs.writeFileSync(storePath, original);
    } else if (fs.existsSync(storePath)) {
      fs.unlinkSync(storePath);
    }
  }
}

test("local game updates serialize read-modify-write operations", async () => {
  await withPreservedLocalStore(async () => {
    const gameId = "race-test";
    const updateCount = 20;

    await Promise.all(
      Array.from({ length: updateCount }, (_, index) =>
        updateLocalGame(gameId, "games", "timers", async (gameData, timers) => {
          await new Promise((resolve) =>
            setTimeout(resolve, index % 3 === 0 ? 2 : 0),
          );
          gameData.sequenceNum += 1;
          timers.game = (timers.game ?? 0) + 1;
        }),
      ),
    );

    const store = readStore();
    assert.equal(store.games[gameId].sequenceNum, 1 + updateCount);
    assert.equal(store.timers[gameId].game, updateCount);
  });
});

test("local timer updates serialize and preserve all increments", async () => {
  await withPreservedLocalStore(async () => {
    const gameId = "timer-race-test";
    const updateCount = 15;

    await Promise.all(
      Array.from({ length: updateCount }, (_, index) =>
        updateLocalTimers(gameId, "timers", async (timers) => {
          await new Promise((resolve) =>
            setTimeout(resolve, index % 4 === 0 ? 2 : 0),
          );
          timers.game = (timers.game ?? 0) + 5;
        }),
      ),
    );

    const store = readStore();
    assert.equal(store.timers[gameId].game, updateCount * 5);
  });
});
