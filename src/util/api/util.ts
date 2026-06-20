import Cookies from "js-cookie";

const RECENT_GAME_IDS_KEY = "tia-recent-game-ids";

export function setGameId(gameId: string) {
  if (!Cookies.get("gameid") || Cookies.get("gameid") !== gameId) {
    Cookies.set("gameid", gameId);
  }
  rememberRecentGameId(gameId);
}

export function getRecentGameIds() {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const storedGameIds = window.localStorage.getItem(RECENT_GAME_IDS_KEY);
    if (!storedGameIds) {
      return [];
    }
    const parsedGameIds = JSON.parse(storedGameIds);
    if (!Array.isArray(parsedGameIds)) {
      return [];
    }
    return parsedGameIds.filter((gameId): gameId is string => {
      return typeof gameId === "string" && gameId.length > 0;
    });
  } catch {
    return [];
  }
}

export function rememberRecentGameId(gameId: string) {
  if (typeof window === "undefined" || !gameId) {
    return;
  }
  const recentGameIds = getRecentGameIds();
  const nextGameIds = [
    gameId,
    ...recentGameIds.filter((storedGameId) => storedGameId !== gameId),
  ].slice(0, 5);
  try {
    window.localStorage.setItem(
      RECENT_GAME_IDS_KEY,
      JSON.stringify(nextGameIds),
    );
  } catch {}
}

export function getGameId() {
  return Cookies.get("gameid");
}

export function arrayUnion<Type>(array: Type[], value: Type) {
  const set = new Set(array);
  set.add(value);
  return Array.from(set);
}

export function arrayRemove<Type>(array: Type[], value: Type) {
  const set = new Set(array);
  set.delete(value);
  return Array.from(set);
}

export function updateArray<Type>(array: Type[], add: Type[], remove: Type[]) {
  const set = new Set(array);
  for (const value of add) {
    set.add(value);
  }
  for (const value of remove) {
    set.delete(value);
  }
  return Array.from(set);
}

export async function getter(url: string) {
  const res = await fetch(url, {
    method: "GET",
    credentials: "include",
  });
  return await res.json();
}

export async function poster(
  url: string,
  data: any,
  timestamp: number,
  gameTime: number,
): Promise<any> {
  data.gameTime = gameTime;
  data.timestamp = timestamp;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(data),
    });
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Request failed");
  }

  const responseText = await res.text();
  let val: any = {};
  if (responseText) {
    try {
      val = JSON.parse(responseText);
    } catch {
      val = { message: responseText };
    }
  }

  if (res.status !== 200) {
    throw new Error(val.message ?? responseText ?? "Request failed");
  }
  return val;
}

export function hasScoredObjective(factionId: FactionId, objective: Objective) {
  return (objective.scorers ?? []).includes(factionId);
}
