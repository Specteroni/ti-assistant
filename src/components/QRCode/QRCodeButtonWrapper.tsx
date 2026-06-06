"use client";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { useGameId } from "../../context/dataHooks";
import QRCodeButton from "./QRCodeButton";
import { usePathname } from "next/navigation";
import UndoButton from "../UndoButton/UndoButton";

function getCurrentGameUrl(gameId: string) {
  const locale = window.location.pathname.split("/")[1] || "en";
  return `${window.location.origin}/${locale}/game/${gameId}`;
}

function getQRCode(gameId: string, size: number): Promise<string> {
  return new Promise<string>((resolve) => {
    QRCode.toDataURL(
      getCurrentGameUrl(gameId),
      {
        color: {
          dark: "#cecece",
          light: "#030303",
        },
        width: size,
        margin: 2,
      },
      (err, url) => {
        if (err) {
          throw err;
        }
        resolve(url);
      },
    );
  });
}

export default function QRCodeButtonWrapper() {
  const pathname = usePathname();
  const gameId = useGameId();
  const [qrCode, setCode] = useState<string>("");

  useEffect(() => {
    const makeQRCode = async (gameId: string) => {
      const qrCodePromise = getQRCode(gameId, 280);

      setCode(await qrCodePromise);
    };

    makeQRCode(gameId);
  }, [gameId, pathname]);

  if (!gameId || gameId === "") {
    return null;
  }
  if (!pathname.includes("/game/") && !pathname.includes("/archive/")) {
    return null;
  }

  return <QRCodeButton gameId={gameId} qrCode={qrCode} />;
}

export function UndoButtonWrapper() {
  const pathname = usePathname();
  const gameId = useGameId();

  if (!gameId || gameId === "") {
    return null;
  }
  if (!pathname.includes("/game/") && !pathname.includes("/archive/")) {
    return null;
  }

  return <UndoButton gameId={gameId} />;
}
