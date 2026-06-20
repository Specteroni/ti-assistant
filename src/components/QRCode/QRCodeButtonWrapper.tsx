"use client";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { useGameId } from "../../context/dataHooks";
import QRCodeButton from "./QRCodeButton";
import { usePathname } from "next/navigation";
import UndoButton from "../UndoButton/UndoButton";
import { getShareGameUrl } from "../../util/clientUrl";

async function getCurrentGameUrl(gameId: string) {
  const locale = window.location.pathname.split("/")[1] || "en";
  return getShareGameUrl(gameId, locale);
}

async function getQRCode(gameId: string, size: number): Promise<string> {
  const url = await getCurrentGameUrl(gameId);
  return new Promise<string>((resolve, reject) => {
    QRCode.toDataURL(
      url,
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
          reject(err);
          return;
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
    let cancelled = false;
    const makeQRCode = async (gameId: string) => {
      try {
        const qrCode = await getQRCode(gameId, 280);
        if (!cancelled) {
          setCode(qrCode);
        }
      } catch {
        if (!cancelled) {
          setCode("");
        }
      }
    };

    makeQRCode(gameId);
    return () => {
      cancelled = true;
    };
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
