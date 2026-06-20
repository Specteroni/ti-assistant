import { getFirestore } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { canEditGame } from "../../../../server/util/fetch";
import {
  updateLocalGame,
  useLocalFileDb,
} from "../../../../server/util/localStore";
import { getFirestoreAdmin } from "../../../../src/util/server";

interface ChangeOptionData {
  option: string;
  value: any;
}

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

  const data = (await req.json()) as ChangeOptionData;

  if (useLocalFileDb()) {
    return updateLocalGame(gameId, "games", "timers", (gameData) => {
      gameData.options[data.option] = data.value;
      gameData.sequenceNum = (gameData.sequenceNum ?? 0) + 1;
      if (gameData.timers) {
        gameData.timers.paused = false;
      }

      return NextResponse.json({ success: true });
    });
  }

  const db = await getFirestoreAdmin();

  const game = await db.collection("games").doc(gameId).get();

  if (!game.exists) {
    return new Response("Game not found", {
      status: 404,
    });
  }

  await db
    .collection("games")
    .doc(gameId)
    .update({
      [`options.${data.option}`]: data.value,
    });

  // TODO: Consider returning something else.
  return NextResponse.json({ success: true });
}
