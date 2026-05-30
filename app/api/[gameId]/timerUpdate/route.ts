import { NextResponse } from "next/server";
import {
  canEditGame,
  getTimersInTransaction,
} from "../../../../server/util/fetch";
import {
  updateLocalTimers,
  useLocalFileDb,
} from "../../../../server/util/localStore";
import { getFirestoreAdmin } from "../../../../src/util/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ gameId: string }> },
) {
  const { gameId } = await params;

  const canEdit = await canEditGame(gameId);
  if (!canEdit) {
    return new Response("Not authorized", {
      status: 403,
    });
  }

  const data = (await req.json()) as TimerUpdateData;

  if (useLocalFileDb()) {
    if (!data.timestamp) {
      return new Response("Missing info", {
        status: 422,
      });
    }

    return updateLocalTimers(gameId, "timers", (timers) => {
      if ((timers.game ?? 0) > (data.timers.game ?? 0)) {
        return NextResponse.json(timers);
      }

      delete data.timers.paused;
      Object.assign(timers, data.timers);
      return NextResponse.json({ success: true });
    });
  }

  const db = await getFirestoreAdmin();

  const timersRef = db.collection("timers").doc(gameId);

  try {
    await db.runTransaction(async (t) => {
      const timers = await getTimersInTransaction(timersRef, t);

      if (!data.timestamp) {
        return new Response("Missing info", {
          status: 422,
        });
      }

      if ((timers.game ?? 0) > (data.timers.game ?? 0)) {
        return NextResponse.json(timers);
      }

      // Paused should be set elsewhere.
      delete data.timers.paused;

      t.update(timersRef, data.timers);
    });
  } catch (e) {
    console.log("Transaction failed", e);
  }

  return NextResponse.json({ success: true });
}
