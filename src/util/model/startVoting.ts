import { getAgendaVotingOrder } from "../helpers";

// Should only be used for non-component cards
export class StartVotingHandler implements Handler {
  constructor(public gameData: StoredGameData, public data: StartVotingData) {}

  validate(): boolean {
    return true;
  }

  getUpdates(): Record<string, any> {
    const firstVoter = getAgendaVotingOrder(
      this.gameData.state,
      this.gameData.factions
    )[0];
    const updates: Record<string, any> = {
      [`state.paused`]: false,
      [`sequenceNum`]: "INCREMENT",
      [`state.votingStarted`]: true,
      [`state.activeplayer`]: firstVoter?.id ?? "None",
    };

    return updates;
  }

  getLogEntry(): ActionLogEntry<GameUpdateData> {
    return {
      timestampMillis: Date.now(),
      data: this.data,
    };
  }

  getActionLogAction(entry: ActionLogEntry<GameUpdateData>): ActionLogAction {
    return "IGNORE";
  }
}

export class UnstartVotingHandler implements Handler {
  constructor(public gameData: StoredGameData, public data: StartVotingData) {}

  validate(): boolean {
    return true;
  }

  getUpdates(): Record<string, any> {
    const updates: Record<string, any> = {
      [`state.paused`]: false,
      [`sequenceNum`]: "INCREMENT",
      [`state.votingStarted`]: false,
      [`state.activeplayer`]: "None",
    };

    return updates;
  }

  getLogEntry(): ActionLogEntry<GameUpdateData> {
    return {
      timestampMillis: Date.now(),
      data: this.data,
    };
  }

  getActionLogAction(entry: ActionLogEntry<GameUpdateData>): ActionLogAction {
    if (entry.data.action === "START_VOTING") {
      return "DELETE";
    }

    return "IGNORE";
  }
}
