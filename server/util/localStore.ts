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
  await fs.writeFile(LOCAL_STORE_PATH, JSON.stringify(store, null, 2));
}

export async function getLocalGameData(gameId: string, gamePath: GamePath) {
  const store = await readLocalStore();
  const gameData = store[gamePath][gameId];
  if (gameData) {
    return clone(gameData);
  }
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

export async function getLocalTimers(gameId: string, timerPath: TimerPath) {
  const store = await readLocalStore();
  return clone(store[timerPath][gameId] ?? {});
}

export async function localGameExists(gameId: string, gamePath: GamePath) {
  const store = await readLocalStore();
  return !!store[gamePath][gameId];
}

export async function saveLocalGame(
  gameId: string,
  gameData: StoredGameData,
  timers: Timers = {},
) {
  const store = await readLocalStore();
  store.games[gameId] = clone(gameData);
  store.timers[gameId] = clone(timers);
  await writeLocalStore(store);
}

export async function saveLocalTimers(gameId: string, timers: Timers) {
  const store = await readLocalStore();
  store.timers[gameId] = clone(timers);
  await writeLocalStore(store);
}

export async function getLocalGamePassword(gameId: string) {
  const store = await readLocalStore();
  return store.passwords[gameId];
}

export async function setLocalGamePassword(gameId: string, password: string) {
  const store = await readLocalStore();
  store.passwords[gameId] = password;
  await writeLocalStore(store);
}

export async function getLocalSession(sessionId: string) {
  const store = await readLocalStore();
  return clone(store.sessions[sessionId]);
}

export async function setLocalSession(sessionId: string, session: TIASession) {
  const store = await readLocalStore();
  store.sessions[sessionId] = clone(session);
  await writeLocalStore(store);
}
