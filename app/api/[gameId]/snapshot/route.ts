import { NextResponse } from "next/server";
import { getGameData, getTimers } from "../../../../server/util/fetch";
import { useLocalFileDb } from "../../../../server/util/localStore";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ gameId: string }> },
) {
  if (!useLocalFileDb()) {
    return new Response("Snapshots are only available in local file mode.", {
      status: 404,
    });
  }

  const { gameId } = await params;
  const url = new URL(req.url);
  const archive = url.searchParams.get("archive") === "1";
  const maxLogEntries = Number(url.searchParams.get("maxLogEntries") ?? 0);

  const gamePath = archive ? "archive" : "games";
  const timerPath = archive ? "archiveTimers" : "timers";

  const [gameData, timers] = await Promise.all([
    getGameData(gameId, gamePath),
    getTimers(gameId, timerPath),
  ]);

  if (
    Number.isInteger(maxLogEntries) &&
    maxLogEntries > 0 &&
    gameData.actionLog &&
    gameData.actionLog.length > maxLogEntries
  ) {
    gameData.actionLog = gameData.actionLog.slice(0, maxLogEntries);
  }

  return NextResponse.json({ gameData, timers });
}
