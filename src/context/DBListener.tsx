"use client";

import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  Unsubscribe,
} from "firebase/firestore";
import { use, useEffect } from "react";
import DBConnection from "../../src/data/DBConnection";
import { mergeLocalTimers } from "../../src/util/timers";
import { ActionLog } from "../../src/util/types/types";
import { DatabaseFnsContext } from "./contexts";

const LOCAL_FILE_DB_POLL_INTERVAL_MS = 1000;

export default function DBListener({
  gameId,
  archive,
}: {
  gameId: string;
  archive: boolean;
}) {
  const databaseFns = use(DatabaseFnsContext);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_TI_LOCAL_FILE_DB === "1") {
      let pollTimeout: ReturnType<typeof setTimeout>;
      let stopped = false;

      async function pollLocalSnapshot() {
        try {
          const archiveQuery = archive ? "?archive=1" : "";
          const response = await fetch(
            `/api/${gameId}/snapshot${archiveQuery}`,
            {
              cache: "no-store",
              credentials: "include",
            },
          );

          if (response.ok) {
            const snapshot = (await response.json()) as {
              gameData: StoredGameData;
              timers: Timers;
            };
            const currentTimers = databaseFns.getValue<Timers>("timers") ?? {};
            const timers = mergeLocalTimers(currentTimers, snapshot.timers);

            databaseFns.update((storedData) => {
              const nextData = structuredClone(snapshot.gameData);
              nextData.timers = timers;
              nextData.viewOnly = storedData.viewOnly;
              return nextData;
            }, "SERVER");
          }
        } catch (error) {
          console.warn("Unable to sync local game snapshot", error);
        } finally {
          if (!stopped) {
            pollTimeout = setTimeout(
              pollLocalSnapshot,
              LOCAL_FILE_DB_POLL_INTERVAL_MS,
            );
          }
        }
      }

      pollLocalSnapshot();

      return () => {
        stopped = true;
        clearTimeout(pollTimeout);
      };
    }

    const db = DBConnection.get();

    const unlistenFns: Unsubscribe[] = [];

    const gameCollection = archive ? "archive" : "games";
    const timerCollection = archive ? "archiveTimers" : "timers";

    const actionLogQuery = query(
      collection(db, gameCollection, gameId, "actionLog"),
      orderBy("timestampMillis", "desc"),
      limit(10000),
    );
    unlistenFns.push(
      onSnapshot(actionLogQuery, (querySnapshot) => {
        const actionLog: ActionLog = [];
        querySnapshot.forEach((doc) => {
          const logEntry = doc.data() as ActionLogEntry<GameUpdateData>;
          delete logEntry.deleteAt;
          actionLog.push(logEntry);
        });

        databaseFns.update((storedData) => {
          storedData.actionLog = actionLog;
          return storedData;
        }, "SERVER");
      }),
    );

    unlistenFns.push(
      onSnapshot(doc(db, timerCollection, gameId), (doc) => {
        const storedTimers = doc.data() as Timers;

        databaseFns.update((storedData) => {
          if ((storedData.timers?.game ?? 0) > (storedTimers.game ?? 0)) {
            return storedData;
          }
          storedData.timers = storedTimers;
          return storedData;
        }, "SERVER");
      }),
    );

    unlistenFns.push(
      onSnapshot(doc(db, gameCollection, gameId), (doc) => {
        const storedData = doc.data() as StoredGameData;

        databaseFns.update((oldData) => {
          const actionLog = oldData.actionLog ?? [];
          const timers = oldData.timers ?? {};
          const newData = structuredClone(storedData);
          newData.actionLog = actionLog;
          newData.timers = timers;
          return newData;
        }, "SERVER");
      }),
    );
    return () => {
      for (const unlistenFn of unlistenFns) {
        unlistenFn();
      }
    };
  }, [archive, gameId]);

  return null;
}
