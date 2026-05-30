"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./GameMenuButton.module.scss";

export default function GameMenuButton() {
  const pathname = usePathname();
  const pathParts = pathname.split("/").filter(Boolean);
  const gameIndex = pathParts.indexOf("game");
  const gameId = gameIndex >= 0 ? pathParts[gameIndex + 1] : undefined;

  if (!gameId) {
    return null;
  }

  if (pathParts.length === gameIndex + 2) {
    return null;
  }

  return (
    <Link
      href={`/game/${gameId}`}
      className={`outline ${styles.GameMenuButton}`}
      title="Game menu"
    >
      Menu
    </Link>
  );
}
