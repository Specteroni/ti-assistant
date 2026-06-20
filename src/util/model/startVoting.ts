import { createIntl, createIntlCache } from "react-intl";
import {
  buildAgendas,
  buildAttachments,
  buildFactions,
  buildLeaders,
  buildPlanets,
  buildTechs,
} from "../../data/GameData";
import { getEligibleAgendaVotingOrder } from "../agendaVoting";

// Should only be used for non-component cards
export class StartVotingHandler implements Handler {
  constructor(public gameData: StoredGameData, public data: StartVotingData) {}

  validate(): boolean {
    return true;
  }

  getUpdates(): Record<string, any> {
    const cache = createIntlCache();
    const intl = createIntl({ locale: "en" }, cache);
    const firstVoter = getEligibleAgendaVotingOrder(
      this.gameData.state,
      buildFactions(this.gameData, intl),
      buildPlanets(this.gameData, intl),
      buildAttachments(this.gameData, intl),
      buildAgendas(this.gameData, intl),
      this.gameData.options,
      this.gameData.actionLog ?? [],
      buildLeaders(this.gameData, intl),
      buildTechs(this.gameData, intl),
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
