import { createIntl, createIntlCache } from "react-intl";
import { buildFactions, buildStrategyCards } from "../../data/GameData";
import { Optional } from "../types/types";
import { objectEntries } from "../util";
import { hasTech } from "../api/techs";

function readyExhaustedPlanets(
  gameData: StoredGameData,
  updates: Record<string, any>,
) {
  for (const [planetId, planet] of objectEntries(gameData.planets ?? {})) {
    if (planet.state === "EXHAUSTED") {
      updates[`planets.${planetId}.state`] = "READIED";
    }
  }
}

function readyExhaustedTechs(
  factions: Partial<Record<FactionId, Faction>>,
  updates: Record<string, any>,
  options?: { skipShareKnowledge?: boolean },
) {
  for (const [factionId, faction] of objectEntries(factions ?? {})) {
    for (const [techId, tech] of objectEntries(faction.techs ?? {})) {
      if (
        options?.skipShareKnowledge &&
        tech.shareKnowledge &&
        tech.state !== "purged"
      ) {
        continue;
      }
      if (tech.state === "exhausted") {
        updates[`factions.${factionId}.techs.${techId}.state`] = "ready";
      }
    }
  }
}

export class AdvancePhaseHandler implements Handler {
  constructor(
    public gameData: StoredGameData,
    public data: AdvancePhaseData,
  ) {
    this.data.event.factions = structuredClone(gameData.factions);
    this.data.event.planets = structuredClone(gameData.planets ?? {});
    this.data.event.state = structuredClone(gameData.state);
    this.data.event.strategycards = structuredClone(
      gameData.strategycards ?? {},
    );
  }

  validate(): boolean {
    switch (this.gameData.state.phase) {
      case "STRATEGY": {
        const numFactions = Object.keys(this.gameData.factions).length;
        const numPickedCards = Object.values(
          this.gameData.strategycards ?? {},
        ).reduce((numCards, card) => {
          if (card.faction) {
            return numCards + 1;
          }
          return numCards;
        }, 0);
        if (numFactions < 5) {
          return numFactions * 2 === numPickedCards;
        }
        return numFactions === numPickedCards;
      }
    }
    // TODO: Pass lock value so that this can be validated.
    return true;
  }

  getUpdates(): Record<string, any> {
    const updates: Record<string, any> = {
      [`state.paused`]: false,
      [`sequenceNum`]: "INCREMENT",
      [`state.votingStarted`]: "DELETE",
    };
    const cache = createIntlCache();
    const intl = createIntl({ locale: "en" }, cache);
    switch (this.gameData.state.phase) {
      case "SETUP": {
        updates[`state.phase`] = "STRATEGY";
        updates[`state.activeplayer`] = this.gameData.state.speaker;
        break;
      }
      case "STRATEGY": {
        updates[`state.phase`] = "ACTION";
        let minCard = Number.MAX_SAFE_INTEGER;
        let minFaction: Optional<string>;
        const strategyCards = buildStrategyCards(this.gameData, intl);
        for (const strategyCard of Object.values(strategyCards)) {
          if (strategyCard.faction && strategyCard.order < minCard) {
            minCard = strategyCard.order;
            minFaction = strategyCard.faction;
          }
          if (strategyCard.faction) {
            updates[`strategycards.${strategyCard.id}.tradeGoods`] = "DELETE";
          } else {
            updates[`strategycards.${strategyCard.id}.tradeGoods`] =
              "INCREMENT";
          }
        }
        updates[`state.activeplayer`] = minFaction;
        break;
      }
      case "ACTION": {
        updates[`state.phase`] = "STATUS";
        let minCard = Number.MAX_SAFE_INTEGER;
        let minFaction: Optional<string>;
        const strategyCards = buildStrategyCards(this.gameData, intl);
        for (const strategyCard of Object.values(strategyCards)) {
          updates[`strategycards.${strategyCard.id}.used`] = "DELETE";
          if (strategyCard.faction && strategyCard.order < minCard) {
            minCard = strategyCard.order;
            minFaction = strategyCard.faction;
          }
        }
        if (minFaction) {
          updates[`state.activeplayer`] = minFaction;
        } else {
          updates[`state.activeplayer`] = this.gameData.state.speaker;
        }

        Object.values(this.gameData.factions).forEach((faction) => {
          let baseTokens = faction.commandCounters;
          if (baseTokens == undefined) {
            return;
          }
          baseTokens += 2;
          const hasHyper =
            faction.techs["Hyper Metabolism"]?.state === "ready" &&
            (this.gameData.techs ?? {})["Hyper Metabolism"]?.state !== "purged";
          if (hasHyper) {
            baseTokens += 1;
          }
          if (faction.id === "Federation of Sol") {
            baseTokens += 1;
          }
          updates[`factions.${faction.id}.commandCounters`] = Math.min(
            baseTokens,
            16,
          );
        });

        break;
      }
      case "STATUS": {
        updates[`state.activeplayer`] = this.gameData.state.speaker;
        readyExhaustedPlanets(this.gameData, updates);
        const strategyCards = buildStrategyCards(this.gameData, intl);
        const factions = buildFactions(this.gameData, intl);
        for (const strategyCard of Object.values(strategyCards)) {
          updates[`strategycards.${strategyCard.id}.faction`] = "DELETE";
          updates[`strategycards.${strategyCard.id}.order`] = "DELETE";
          updates[`strategycards.${strategyCard.id}.used`] = "DELETE";
        }
        for (const [componentId, component] of Object.entries(
          this.gameData.components ?? {},
        )) {
          if (component.state === "exhausted") {
            updates[`components.${componentId}.state`] = "DELETE";
          }
        }
        for (const [factionId, faction] of objectEntries(factions ?? {})) {
          for (const [techId, tech] of objectEntries(faction.techs ?? {})) {
            if (tech.shareKnowledge && tech.state !== "purged") {
              updates[`factions.${factionId}.techs.${techId}`] = "DELETE";
              continue;
            }
          }
          if (faction.breakthrough?.state === "exhausted") {
            updates[`factions.${factionId}.breakthrough.state`] = "readied";
          }
        }
        readyExhaustedTechs(factions, updates, { skipShareKnowledge: true });
        for (const [leaderId, leader] of Object.entries(
          this.gameData.leaders ?? {},
        )) {
          if (leader.state === "exhausted") {
            updates[`leaders.${leaderId}.state`] = "DELETE";
          }
        }
        if (this.data.event.skipAgenda) {
          updates[`state.phase`] = "STRATEGY";
          updates[`state.round`] = this.gameData.state.round + 1;
        } else {
          const nextPhase = this.gameData.options.expansions.includes(
            "TWILIGHTS FALL",
          )
            ? "EDICT"
            : "AGENDA";
          updates[`state.phase`] = nextPhase;
          updates[`state.agendaNum`] = 1;
          updates[`state.agendaUnlocked`] = true;
        }
        break;
      }
      case "AGENDA":
      case "EDICT": {
        updates[`state.phase`] = "STRATEGY";
        updates[`state.round`] = this.gameData.state.round + 1;
        updates[`state.activeplayer`] = this.gameData.state.speaker;
        updates[`state.agendaNum`] = 1;
        updates[`timers.firstAgenda`] = "DELETE";
        updates[`timers.secondAgenda`] = "DELETE";
        readyExhaustedPlanets(this.gameData, updates);
        readyExhaustedTechs(this.gameData.factions, updates);
        break;
      }
    }

    for (const name of Object.keys(this.gameData.factions)) {
      updates[`factions.${name}.passed`] = "DELETE";
      updates[`factions.${name}.castVotes`] = "DELETE";
    }

    return updates;
  }

  getLogEntry(): ActionLogEntry<GameUpdateData> {
    return {
      timestampMillis: Date.now(),
      data: this.data,
    };
  }

  getActionLogAction(_: ActionLogEntry<GameUpdateData>): ActionLogAction {
    // Should never be possible to put a
    return "IGNORE";
  }
}

export class RewindPhaseHandler implements Handler {
  constructor(
    public gameData: StoredGameData,
    public data: RewindPhaseData,
  ) {}

  validate(): boolean {
    // TODO: Pass lock value so that this can be validated.
    return true;
  }

  getUpdates(): Record<string, any> {
    const state = this.data.event.state as GameState;
    state.paused = false;
    return {
      [`sequenceNum`]: "INCREMENT",
      [`factions`]: this.data.event.factions,
      [`planets`]: this.data.event.planets ?? this.gameData.planets,
      [`state`]: state,
      [`strategycards`]: this.data.event.strategycards,
      [`timers.firstAgenda`]: this.data.event.timers?.firstAgenda ?? 0,
      [`timers.secondAgenda`]: this.data.event.timers?.secondAgenda ?? 0,
    };
  }

  getLogEntry(): ActionLogEntry<GameUpdateData> {
    return {
      timestampMillis: Date.now(),
      data: this.data,
    };
  }

  getActionLogAction(entry: ActionLogEntry<GameUpdateData>): ActionLogAction {
    if (entry.data.action === "ADVANCE_PHASE") {
      return "DELETE";
    }
    return "IGNORE";
  }
}
