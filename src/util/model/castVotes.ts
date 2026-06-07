import { getFactionVotes } from "../actionLog";
import { getCurrentTurnLogEntries } from "../api/actionLog";

export class CastVotesHandler implements Handler {
  constructor(public gameData: StoredGameData, public data: CastVotesData) {
    if (this.data.event.undoPlanetStateChange) {
      return;
    }
    if (
      this.data.event.prevVotes !== undefined ||
      this.data.event.prevExtraVotes !== undefined ||
      this.data.event.prevTarget !== undefined
    ) {
      return;
    }

    const currentTurn = getCurrentTurnLogEntries(gameData.actionLog ?? []);
    const previousVotes = getFactionVotes(currentTurn, data.event.faction);
    if (!previousVotes) {
      return;
    }

    this.data.event.prevVotes = previousVotes.votes;
    this.data.event.prevExtraVotes = previousVotes.extraVotes;
    this.data.event.prevTarget = previousVotes.target;
  }

  validate(): boolean {
    return true;
  }

  getUpdates(): Record<string, any> {
    const updates: Record<string, any> = {
      [`state.paused`]: false,
      [`sequenceNum`]: "INCREMENT",
    };

    const planetStateChange = this.data.event.planetStateChange;
    if (this.data.event.undoPlanetStateChange && planetStateChange) {
      updates[`planets.${planetStateChange.planet}.state`] =
        planetStateChange.prevState;
    }

    return updates;
  }

  getLogEntry(): ActionLogEntry<GameUpdateData> {
    if (this.data.event.undoPlanetStateChange) {
      const { faction, votes, extraVotes, target } = this.data.event;
      return {
        timestampMillis: Date.now(),
        data: {
          action: "CAST_VOTES",
          event: {
            faction,
            votes,
            extraVotes,
            target,
          },
        },
      };
    }

    return {
      timestampMillis: Date.now(),
      data: this.data,
    };
  }

  getActionLogAction(entry: ActionLogEntry<GameUpdateData>): ActionLogAction {
    const planetStateChange = this.data.event.planetStateChange;
    if (this.data.event.undoPlanetStateChange && planetStateChange) {
      if (
        entry.data.action === "UPDATE_PLANET_STATE" &&
        entry.data.event.planet === planetStateChange.planet &&
        entry.data.event.state === planetStateChange.state
      ) {
        return this.data.event.target
          ? "REWIND_AND_REPLACE"
          : "REWIND_AND_DELETE";
      }
      return "IGNORE";
    }

    if (
      entry.data.action === "CAST_VOTES" &&
      entry.data.event.faction === this.data.event.faction
    ) {
      if (!this.data.event.target) {
        return "DELETE";
      }
      return "REPLACE";
    }
    return "IGNORE";
  }
}
