import { use } from "react";
import { DatabaseFnsContext } from "../../context/contexts";
import { poster } from "./util";

export function useUndo() {
  const databaseFns = use(DatabaseFnsContext);
  return async (gameId: string) => {
    const data: GameUpdateData = {
      action: "UNDO",
    };

    const now = Date.now();
    const gameTime: number = databaseFns.getValue("timers.game") ?? 0;

    const updatePromise = poster(
      `/api/${gameId}/dataUpdate`,
      data,
      now,
      gameTime,
    );

    try {
      return await updatePromise;
    } catch (_) {
      databaseFns.reset();
    }
  };
}
