import { TURN_BOUNDARIES } from "./actionLog";
import { updateGameData } from "./handler";
import { getOppositeHandler } from "./opposite";

export function updateActionLog(
  currentData: StoredGameData,
  handler: Handler,
  timestamp: number,
  gameTime: number
) {
  let actionLog = currentData.actionLog;
  if (!actionLog) {
    currentData.actionLog = [];
    actionLog = currentData.actionLog;
  }
  let lastCheck = false;
  for (let i = 0; i < actionLog.length; ++i) {
    if (lastCheck) {
      break;
    }
    const logEntry = actionLog[i];
    if (!logEntry) {
      continue;
    }

    if (TURN_BOUNDARIES.includes(logEntry.data.action)) {
      lastCheck = true;
    }

    const action = handler.getActionLogAction(logEntry);
    switch (action) {
      case "DELETE":
        actionLog.splice(i, 1);
        return;
      case "REPLACE":
        const entry = handler.getLogEntry();
        entry.timestampMillis = timestamp;
        entry.gameSeconds = gameTime;
        actionLog.splice(i, 1);
        actionLog.unshift(entry);
        return;
      case "REWIND_AND_DELETE":
        for (let j = 0; j < i; ++j) {
          const entry = actionLog[j];
          if (!entry) {
            continue;
          }
          const undoHandler = getOppositeHandler(handler.gameData, entry.data);
          if (!undoHandler) {
            continue;
          }
          updateGameData(currentData, undoHandler.getUpdates());
        }
        actionLog.splice(0, i + 1);
        return;
      case "REWIND_AND_REPLACE":
        for (let j = 0; j < i; ++j) {
          const entry = actionLog[j];
          if (!entry) {
            continue;
          }
          const undoHandler = getOppositeHandler(handler.gameData, entry.data);
          if (!undoHandler) {
            continue;
          }
          updateGameData(currentData, undoHandler.getUpdates());
        }
        const newEntry = handler.getLogEntry();
        newEntry.timestampMillis = timestamp;
        newEntry.gameSeconds = gameTime;
        actionLog.splice(0, i + 1, newEntry);
        return;
      case "REWIND_AFTER_AND_DELETE": {
        let deleteCount = 1;
        for (let j = i + 1; j < actionLog.length; ++j) {
          const entry = actionLog[j];
          if (!entry) {
            continue;
          }
          if (
            TURN_BOUNDARIES.includes(entry.data.action) ||
            entry.data.action === "START_VOTING"
          ) {
            break;
          }
          const undoHandler = getOppositeHandler(handler.gameData, entry.data);
          if (!undoHandler) {
            continue;
          }
          updateGameData(currentData, undoHandler.getUpdates());
          deleteCount++;
        }
        actionLog.splice(i, deleteCount);
        return;
      }
    }
  }

  const newEntry = handler.getLogEntry();
  newEntry.timestampMillis = timestamp;
  newEntry.gameSeconds = gameTime;
  actionLog.unshift(newEntry);

  return;
}
