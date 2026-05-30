import { createIntl, createIntlCache } from "react-intl";
import { buildAttachments, buildPlanets } from "../../data/GameData";
import { applyAllPlanetAttachments } from "../planets";

function getAncientBurialSitesPlanets(
  gameData: StoredGameData,
  factionId: FactionId,
) {
  const cache = createIntlCache();
  const intl = createIntl({ locale: "en" }, cache);
  const attachments = buildAttachments(gameData, intl);
  const planets = applyAllPlanetAttachments(
    Object.values(buildPlanets(gameData, intl)).filter(
      (planet): planet is Planet => !!planet,
    ),
    attachments,
  );

  return planets.filter((planet) => {
    if (planet.owner !== factionId) {
      return false;
    }
    if (planet.state === "PURGED") {
      return false;
    }
    if (
      planet.attributes.includes("ocean") ||
      planet.attributes.includes("space-station") ||
      planet.attributes.includes("synthetic")
    ) {
      return false;
    }
    return (
      planet.types.includes("CULTURAL") ||
      planet.attributes.includes("all-types")
    );
  });
}

// Should only be used for non-component cards
export class PlayActionCardHandler implements Handler {
  constructor(
    public gameData: StoredGameData,
    public data: PlayActionCardData
  ) {
    if (
      this.data.event.card === "Ancient Burial Sites" &&
      this.data.event.target !== "None"
    ) {
      const prevPlanetStates = this.data.event.prevPlanetStates ?? {};
      for (const planet of getAncientBurialSitesPlanets(
        this.gameData,
        this.data.event.target,
      )) {
        prevPlanetStates[planet.id] = planet.state ?? "READIED";
      }
      this.data.event.prevPlanetStates = prevPlanetStates;
    }
  }

  validate(): boolean {
    return true;
  }

  getUpdates(): Record<string, any> {
    const updates: Record<string, any> = {
      [`state.paused`]: false,
      [`sequenceNum`]: "INCREMENT",
    };

    if (
      this.data.event.card === "Ancient Burial Sites" &&
      this.data.event.target !== "None"
    ) {
      for (const planet of getAncientBurialSitesPlanets(
        this.gameData,
        this.data.event.target,
      )) {
        updates[`planets.${planet.id}.state`] = "EXHAUSTED";
      }
    }

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

export class UnplayActionCardHandler implements Handler {
  constructor(
    public gameData: StoredGameData,
    public data: UnplayActionCardData
  ) {}

  validate(): boolean {
    return true;
  }

  getUpdates(): Record<string, any> {
    const updates: Record<string, any> = {
      [`state.paused`]: false,
      [`sequenceNum`]: "INCREMENT",
    };

    if (this.data.event.card === "Ancient Burial Sites") {
      let prevPlanetStates = this.data.event.prevPlanetStates;
      for (const logEntry of this.gameData.actionLog ?? []) {
        if (
          logEntry.data.action === "PLAY_ACTION_CARD" &&
          logEntry.data.event.card === this.data.event.card &&
          logEntry.data.event.target === this.data.event.target
        ) {
          prevPlanetStates = logEntry.data.event.prevPlanetStates;
          break;
        }
      }
      for (const [planetId, state] of Object.entries(prevPlanetStates ?? {})) {
        updates[`planets.${planetId}.state`] = state;
      }
    }

    return updates;
  }

  getLogEntry(): ActionLogEntry<GameUpdateData> {
    return {
      timestampMillis: Date.now(),
      data: this.data,
    };
  }

  getActionLogAction(entry: ActionLogEntry<GameUpdateData>): ActionLogAction {
    if (
      entry.data.action === "PLAY_ACTION_CARD" &&
      entry.data.event.card === this.data.event.card &&
      entry.data.event.target === this.data.event.target
    ) {
      return "DELETE";
    }

    return "IGNORE";
  }
}
