"use client";

import { CSSProperties, use, useEffect } from "react";
import TimerDisplay from "./components/TimerDisplay/TimerDisplay";
import { TimerContext } from "./context/contexts";
import { useTimers } from "./context/dataHooks";

interface FactionTimerProps {
  active: boolean;
  factionId: FactionId | "Unknown";
  style?: CSSProperties;
  width?: number;
}

export function StaticFactionTimer({
  factionId,
  style,
  width,
}: FactionTimerProps) {
  const timers = useTimers();
  const factionTimer = timers[factionId] ?? 0;
  return <TimerDisplay time={factionTimer} style={style} width={width} />;
}

export function FactionTimer({ active, factionId, style }: FactionTimerProps) {
  const timers = useTimers();
  const timerFns = use(TimerContext);

  const factionTimer = timers[factionId] ?? 0;

  useEffect(() => {
    if (!active) {
      return;
    }
    return timerFns.activateTimer(factionId);
  }, [factionId, timerFns, active]);

  return <TimerDisplay time={factionTimer} style={style} />;
}

export function FactionSecondaryTimer({
  factionId,
  active,
  style,
}: FactionTimerProps & { active: boolean }) {
  const timers = useTimers();
  const timerFns = use(TimerContext);

  const factionTimer = timers[`${factionId}-secondary`] ?? 0;

  useEffect(() => {
    if (!active) {
      return;
    }
    return timerFns.activateTimer(`${factionId}-secondary`);
  }, [factionId, timerFns, active]);

  return <TimerDisplay time={factionTimer} hideHours style={style} />;
}
