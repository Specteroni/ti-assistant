"use client";

import { useEffect } from "react";
import { setGameId } from "../../../../src/util/api/util";

export default function RememberGame({ gameId }: { gameId: string }) {
  useEffect(() => {
    setGameId(gameId);
  }, [gameId]);

  return null;
}
