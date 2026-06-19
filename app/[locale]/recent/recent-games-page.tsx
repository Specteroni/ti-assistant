"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getRecentGameIds } from "../../../src/util/api/util";
import { rem } from "../../../src/util/util";

export default function RecentGamesPage() {
  const [recentGameIds, setRecentGameIds] = useState<string[]>([]);

  useEffect(() => {
    setRecentGameIds(getRecentGameIds());
  }, []);

  if (recentGameIds.length === 0) {
    return (
      <div
        style={{
          color: "var(--muted-text-color)",
          fontFamily: "var(--main-font)",
          fontSize: rem(22),
          textAlign: "center",
        }}
      >
        No recent games yet
      </div>
    );
  }

  return (
    <div className="flexColumn" style={{ alignItems: "stretch", gap: rem(8) }}>
      {recentGameIds.map((gameId) => {
        return (
          <Link
            key={gameId}
            className="outline"
            href={`/game/${gameId}`}
            style={{
              fontFamily: "var(--main-font)",
              fontSize: rem(32),
              lineHeight: 1,
            }}
          >
            {gameId}
          </Link>
        );
      })}
    </div>
  );
}
