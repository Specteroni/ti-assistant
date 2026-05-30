import fs from "node:fs/promises";
import path from "node:path";
import "server-only";
import { BASE_OPTIONS } from "../data/options";
import type { TIASession } from "./fetch";

type GamePath = "archive" | "games";
type TimerPath = "archiveTimers" | "timers";

interface LocalStore {
  archive: Record<string, StoredGameData>;
  archiveTimers: Record<string, Timers>;
  games: Record<string, StoredGameData>;
  passwords: Record<string, string>;
  sessions: Record<string, TIASession>;
  timers: Record<string, Timers>;
}

const EMPTY_STORE: LocalStore = {
  archive: {},
  archiveTimers: {},
  games: {},
  passwords: {},
  sessions: {},
  timers: {},
};

const LOCAL_STORE_PATH = path.join(
  process.cwd(),
  "server",
  "local-dev-db.json",
);

let localStoreQueue: Promise<unknown> = Promise.resolve();

export function useLocalFileDb() {
  return process.env.TIA_LOCAL_FILE_DB === "1";
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

async function readLocalStore(): Promise<LocalStore> {
  try {
    const contents = await fs.readFile(LOCAL_STORE_PATH, "utf-8");
    return {
      ...EMPTY_STORE,
      ...JSON.parse(contents),
    };
  } catch (error: any) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
    return clone(EMPTY_STORE);
  }
}

async function writeLocalStore(store: LocalStore) {
  await fs.mkdir(path.dirname(LOCAL_STORE_PATH), { recursive: true });
  const tempPath = `${LOCAL_STORE_PATH}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(store, null, 2));
  await fs.rename(tempPath, LOCAL_STORE_PATH);
}

async function getLocalStoreSnapshot() {
  await localStoreQueue;
  return readLocalStore();
}

async function updateLocalStore<T>(
  updateFn: (store: LocalStore) => Promise<T> | T,
) {
  const runUpdate = async () => {
    const store = await readLocalStore();
    const result = await updateFn(store);
    await writeLocalStore(store);
    return result;
  };

  const resultPromise = localStoreQueue.then(runUpdate, runUpdate);
  localStoreQueue = resultPromise.then(
    () => undefined,
    () => undefined,
  );
  return resultPromise;
}

function getDefaultGameData(): StoredGameData {
  return {
    factions: {},
    options: BASE_OPTIONS,
    planets: {},
    players: {},
    state: {
      phase: "SETUP",
      speaker: "Vuil'raith Cabal",
      round: 1,
    },
    sequenceNum: 1,
  } satisfies StoredGameData;
}

export async function getLocalGameData(gameId: string, gamePath: GamePath) {
  const store = await getLocalStoreSnapshot();
  const gameData = store[gamePath][gameId];
  if (gameData) {
    return clone(gameData);
  }
  return getDefaultGameData();
}

export async function getLocalTimers(gameId: string, timerPath: TimerPath) {
  const store = await getLocalStoreSnapshot();
  return clone(store[timerPath][gameId] ?? {});
}

export async function localGameExists(gameId: string, gamePath: GamePath) {
  const store = await getLocalStoreSnapshot();
  return !!store[gamePath][gameId];
}

export async function saveLocalGame(
  gameId: string,
  gameData: StoredGameData,
  timers: Timers = {},
) {
  await updateLocalStore((store) => {
    store.games[gameId] = clone(gameData);
    store.timers[gameId] = clone(timers);
  });
}

export async function updateLocalGame<T>(
  gameId: string,
  gamePath: GamePath,
  timerPath: TimerPath,
  updateFn: (gameData: StoredGameData, timers: Timers) => Promise<T> | T,
) {
  return updateLocalStore(async (store) => {
    const gameData = clone(store[gamePath][gameId] ?? getDefaultGameData());
    const timers = clone(store[timerPath][gameId] ?? {});
    gameData.timers = timers;

    const result = await updateFn(gameData, timers);

    store[gamePath][gameId] = clone(gameData);
    store[timerPath][gameId] = clone(gameData.timers ?? timers);

    return result;
  });
}

export async function saveLocalTimers(gameId: string, timers: Timers) {
  await updateLocalStore((store) => {
    store.timers[gameId] = clone(timers);
  });
}

export async function updateLocalTimers<T>(
  gameId: string,
  timerPath: TimerPath,
  updateFn: (timers: Timers) => Promise<T> | T,
) {
  return updateLocalStore(async (store) => {
    const timers = clone(store[timerPath][gameId] ?? {});
    const result = await updateFn(timers);
    store[timerPath][gameId] = clone(timers);
    return result;
  });
}

export async function getLocalGamePassword(gameId: string) {
  const store = await getLocalStoreSnapshot();
  return store.passwords[gameId];
}

export async function setLocalGamePassword(gameId: string, password: string) {
  await updateLocalStore((store) => {
    store.passwords[gameId] = password;
  });
}

export async function getLocalSession(sessionId: string) {
  const store = await getLocalStoreSnapshot();
  return clone(store.sessions[sessionId]);
}

export async function setLocalSession(sessionId: string, session: TIASession) {
  await updateLocalStore((store) => {
    store.sessions[sessionId] = clone(session);
  });
}
