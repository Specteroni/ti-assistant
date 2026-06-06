export function mergeLocalTimers(currentTimers: Timers, snapshotTimers: Timers) {
  const mergedTimers = structuredClone(snapshotTimers);

  for (const [timerId, currentValue] of Object.entries(currentTimers)) {
    const snapshotValue = snapshotTimers[timerId];
    if (typeof currentValue !== "number") {
      continue;
    }
    if (typeof snapshotValue !== "number") {
      mergedTimers[timerId] = currentValue;
      continue;
    }
    mergedTimers[timerId] = Math.max(currentValue, snapshotValue);
  }

  return mergedTimers;
}
