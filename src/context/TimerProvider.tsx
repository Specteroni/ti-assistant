"use client";

import {
  PropsWithChildren,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { DatabaseFnsContext, TimerContext } from "./contexts";
import { useViewOnly } from "./dataHooks";

const TIMER_SAVE_INTERVAL_MS =
  process.env.NEXT_PUBLIC_TI_LOCAL_FILE_DB === "1" ? 5000 : 15000;

export default function TimerProvider({ children }: PropsWithChildren) {
  const databaseFns = use(DatabaseFnsContext);
  const viewOnly = useViewOnly();

  const activeTimersRef = useRef(new Set<string>());
  const lastIncreaseRef = useRef(Date.now());

  const updateTimers = useCallback((storedData: StoredGameData) => {
    const updatedTimers = structuredClone(storedData.timers ?? {});

    for (const timer of activeTimersRef.current) {
      const prevTimer = updatedTimers[timer] ?? 0;
      updatedTimers[timer] = prevTimer + 1;
    }
    storedData.timers = updatedTimers;
    return storedData;
  }, []);

  const tick = useCallback(() => {
    const timers = databaseFns.getValue<Timers>("timers");
    if (!timers || timers.paused) {
      return;
    }

    const timeDiffMillis = Date.now() - lastIncreaseRef.current;
    if (timeDiffMillis / 1000 > 1 && activeTimersRef.current.size > 0) {
      lastIncreaseRef.current = Date.now();
      databaseFns.update(updateTimers, "CLIENT");
    }
  }, [databaseFns, updateTimers]);

  const activateTimer = useCallback((timer: string) => {
    activeTimersRef.current.add(timer);
    return () => {
      activeTimersRef.current.delete(timer);
    };
  }, []);

  const saveTimers = useCallback(() => {
    if (viewOnly) {
      return;
    }

    // Don't update if we haven't updated the timers in over 10 seconds.
    const timeDiffMillis = Date.now() - lastIncreaseRef.current;
    if (timeDiffMillis / 1000 > 10) {
      return;
    }
    databaseFns.saveTimers();
  }, [databaseFns, viewOnly]);

  useEffect(() => {
    const timeoutIds: NodeJS.Timeout[] = [];
    timeoutIds.push(setInterval(tick, 100));

    timeoutIds.push(setInterval(saveTimers, TIMER_SAVE_INTERVAL_MS));
    return () => {
      for (const timeoutId of timeoutIds) {
        clearInterval(timeoutId);
      }
    };
  }, [saveTimers, tick]);

  const timerFns = useMemo(() => ({ activateTimer }), [activateTimer]);

  return (
    <TimerContext.Provider value={timerFns}>
      {children}
    </TimerContext.Provider>
  );
}
