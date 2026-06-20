import {
  getActionCardTargets,
  getAllVotes,
  getPlayedRiders,
  getPromissoryTargets,
} from "./actionLog";
import {
  getCurrentAgendaLogEntries,
  getCurrentPhasePreviousLogEntries,
} from "./api/actionLog";
import { hasTech } from "./api/techs";
import { hasLeader } from "./factions";
import { getAgendaVotingOrder } from "./helpers";
import {
  applyAllPlanetAttachments,
  filterToClaimedPlanets,
} from "./planets";
import { ActionLog } from "./types/types";

export function canFactionVote(
  faction: Faction,
  agendas: Partial<Record<AgendaId, Agenda>>,
  state: GameState,
  currentTurn: ActionLog,
  leaders: Partial<Record<LeaderId, Leader>>,
) {
  if (faction.id === "Nekro Virus") {
    return false;
  }
  const hasXxchaCommander = hasLeader("Elder Qanoj", faction, leaders);
  if (hasXxchaCommander) {
    return true;
  }
  const politicalSecrets = getPromissoryTargets(
    currentTurn,
    "Political Secret",
  );
  if (politicalSecrets.includes(faction.id)) {
    return false;
  }
  const assassinatedRep = getActionCardTargets(
    currentTurn,
    "Assassinate Representative",
  )[0];
  if (assassinatedRep === faction.id) {
    return false;
  }
  const riders = getPlayedRiders(currentTurn);
  for (const rider of riders) {
    if (rider.faction === faction.id) {
      return false;
    }
  }
  const publicExecution = agendas["Public Execution"];
  if (
    publicExecution &&
    publicExecution.resolved &&
    publicExecution.target === faction.id &&
    publicExecution.activeRound === state.round
  ) {
    return false;
  }
  return true;
}

export function computeRemainingAgendaVotes(
  factionId: FactionId,
  factions: Partial<Record<FactionId, Faction>>,
  planets: Partial<Record<PlanetId, Planet>>,
  attachments: Partial<Record<AttachmentId, Attachment>>,
  agendas: Partial<Record<AgendaId, Agenda>>,
  options: Options,
  state: GameState,
  currentPhasePrevious: ActionLog,
  leaders: Partial<Record<LeaderId, Leader>>,
  techs: Partial<Record<TechId, Tech>>,
) {
  const representativeGovernment = agendas["Representative Government"];

  if (representativeGovernment && representativeGovernment.passed) {
    return {
      influence: 0,
      extraVotes: 1,
    };
  }
  const ownedPlanets = filterToClaimedPlanets(planets, factionId);
  const updatedPlanets = applyAllPlanetAttachments(ownedPlanets, attachments);

  const filteredPlanets = updatedPlanets.filter((planet) => {
    if (planet.state === "EXHAUSTED" || planet.state === "PURGED") {
      return false;
    }
    if (factionId !== state?.ancientBurialSites) {
      return true;
    }
    return (
      !planet.types.includes("CULTURAL") &&
      !planet.attributes.includes("all-types")
    );
  });

  const orderedPlanets = filteredPlanets.sort((a, b) => {
    const aRatio =
      a.resources > 0 ? a.influence / a.resources : Number.MAX_SAFE_INTEGER;
    const bRatio =
      b.resources > 0 ? b.influence / b.resources : Number.MAX_SAFE_INTEGER;
    if (aRatio !== bRatio) {
      return bRatio - aRatio;
    }
    if (a.influence !== b.influence) {
      return b.influence - a.influence;
    }
    if ((a.attributes ?? []).length !== (b.attributes ?? []).length) {
      return (a.attributes ?? []).length - (b.attributes ?? []).length;
    }
    return 0;
  });

  const faction = factions[factionId];
  if (!faction) {
    return {
      influence: 0,
      extraVotes: 0,
    };
  }

  const votesCast = getAllVotes(currentPhasePrevious)
    .filter((voteEvent) => {
      return voteEvent.faction === factionId;
    })
    .reduce((votes, voteEvent) => {
      return votes + voteEvent.votes;
    }, 0);

  let influenceNeeded = votesCast;
  let planetCount = 0;
  let remainingVotes = 0;
  if (options.hide?.includes("PLANETS")) {
    remainingVotes = Math.max((faction.availableVotes ?? 0) - votesCast, 0);
  } else {
    const hasXxchaHero = leaders["Xxekir Grom"]?.state === "readied";
    for (const planet of orderedPlanets) {
      let planetInfluence = planet.influence;
      if (factionId === "Xxcha Kingdom") {
        if (options.expansions.includes("CODEX THREE") && hasXxchaHero) {
          planetInfluence += planet.resources;
        }
      }
      if (influenceNeeded > 0 && planetInfluence <= influenceNeeded) {
        influenceNeeded -= planetInfluence;
        continue;
      }
      planetCount++;

      remainingVotes += planetInfluence;
    }

    if (influenceNeeded > 0) {
      remainingVotes = Math.max(remainingVotes - influenceNeeded, 0);
    }
  }

  let extraVotes = 0;
  if (factionId === "Argent Flight") {
    extraVotes += Object.keys(factions).length;
  }
  const hasXxchaCommander = hasLeader("Elder Qanoj", faction, leaders);
  if (hasXxchaCommander) {
    extraVotes += planetCount;
  }
  const hasPredictiveIntelligence = hasTech(
    faction,
    techs["Predictive Intelligence"],
  );
  if (hasPredictiveIntelligence) {
    extraVotes += 3;
  }
  const councilPreserve = hasCouncilPreserve(factionId, planets);
  if (councilPreserve) {
    extraVotes += 5;
  }

  return {
    influence: remainingVotes,
    extraVotes,
  };
}

export function canFactionCastAgendaVotes(
  faction: Faction,
  factions: Partial<Record<FactionId, Faction>>,
  planets: Partial<Record<PlanetId, Planet>>,
  attachments: Partial<Record<AttachmentId, Attachment>>,
  agendas: Partial<Record<AgendaId, Agenda>>,
  options: Options,
  state: GameState,
  currentPhasePrevious: ActionLog,
  currentTurn: ActionLog,
  leaders: Partial<Record<LeaderId, Leader>>,
  techs: Partial<Record<TechId, Tech>>,
) {
  if (!canFactionVote(faction, agendas, state, currentTurn, leaders)) {
    return false;
  }

  const { influence, extraVotes } = computeRemainingAgendaVotes(
    faction.id,
    factions,
    planets,
    attachments,
    agendas,
    options,
    state,
    currentPhasePrevious,
    leaders,
    techs,
  );

  return influence + extraVotes > 0;
}

export function getEligibleAgendaVotingOrder(
  state: GameState,
  factions: Partial<Record<FactionId, Faction>>,
  planets: Partial<Record<PlanetId, Planet>>,
  attachments: Partial<Record<AttachmentId, Attachment>>,
  agendas: Partial<Record<AgendaId, Agenda>>,
  options: Options,
  actionLog: ActionLog,
  leaders: Partial<Record<LeaderId, Leader>>,
  techs: Partial<Record<TechId, Tech>>,
) {
  const currentAgendaLog = getCurrentAgendaLogEntries(actionLog);
  const currentPhasePrevious = getCurrentPhasePreviousLogEntries(actionLog);

  return getAgendaVotingOrder(state, factions).filter((faction) => {
    return canFactionCastAgendaVotes(
      faction,
      factions,
      planets,
      attachments,
      agendas,
      options,
      state,
      currentPhasePrevious,
      currentAgendaLog,
      leaders,
      techs,
    );
  });
}

export function getNextEligibleAgendaVoter(
  state: GameState,
  factions: Partial<Record<FactionId, Faction>>,
  planets: Partial<Record<PlanetId, Planet>>,
  attachments: Partial<Record<AttachmentId, Attachment>>,
  agendas: Partial<Record<AgendaId, Agenda>>,
  options: Options,
  actionLog: ActionLog,
  leaders: Partial<Record<LeaderId, Leader>>,
  techs: Partial<Record<TechId, Tech>>,
) {
  if (!state.activeplayer || state.activeplayer === "None") {
    return undefined;
  }

  const votingOrder = getEligibleAgendaVotingOrder(
    state,
    factions,
    planets,
    attachments,
    agendas,
    options,
    actionLog,
    leaders,
    techs,
  );
  const activeIndex = votingOrder.findIndex(
    (faction) => faction.id === state.activeplayer,
  );

  if (activeIndex === -1) {
    return votingOrder[0];
  }

  return votingOrder[activeIndex + 1];
}

function hasCouncilPreserve(
  factionId: FactionId,
  planets: Partial<Record<PlanetId, Planet>>,
) {
  for (const planet of Object.values(planets)) {
    if (
      planet.owner === factionId &&
      planet.attributes.includes("extra-votes") &&
      planet.state !== "PURGED" &&
      planet.state !== "EXHAUSTED"
    ) {
      return true;
    }
  }
  return false;
}
