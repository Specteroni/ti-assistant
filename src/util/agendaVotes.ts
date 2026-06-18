import {
  getActionCardTargets,
  getAllVotes,
  getPromissoryTargets,
} from "./actionLog";
import { ActionLog, Optional } from "./types/types";

export function computeVotes(
  agenda: Optional<Agenda>,
  currentTurn: ActionLog,
  numFactions: number,
  representativeGovernmentPassed: boolean,
  hiddenFactions?: FactionId | Iterable<FactionId>,
) {
  const hiddenFactionSet =
    typeof hiddenFactions === "string"
      ? new Set([hiddenFactions])
      : new Set(hiddenFactions ?? []);
  const currentCouncilor = getActionCardTargets(
    currentTurn,
    "Distinguished Councilor",
  )[0] as Optional<FactionId>;
  const councilPreservePlayer = getActionCardTargets(
    currentTurn,
    "Council Preserve",
  )[0] as Optional<FactionId>;
  const bloodPactUsed =
    getPromissoryTargets(currentTurn, "Blood Pact").length > 0;
  const usingPredictive = getActionCardTargets(
    currentTurn,
    "Predictive Intelligence",
  ) as FactionId[];
  const castVotes: { [key: string]: number } =
    agenda && agenda.elect === "For/Against" ? { For: 0, Against: 0 } : {};
  const voteEvents = getAllVotes(currentTurn);
  voteEvents.forEach((voteEvent) => {
    if (hiddenFactionSet.has(voteEvent.faction)) {
      return;
    }
    const printedVotes = voteEvent.votes ?? 0;
    const manualExtraVotes = voteEvent.extraVotes ?? 0;
    const bonusVotes =
      (voteEvent.faction === "Empyrean" && bloodPactUsed ? 4 : 0) +
      (voteEvent.faction === currentCouncilor ? 5 : 0) +
      (voteEvent.faction === councilPreservePlayer ? 5 : 0) +
      (usingPredictive.includes(voteEvent.faction) ? 3 : 0) +
      (voteEvent.faction === "Argent Flight" &&
      !representativeGovernmentPassed
        ? numFactions
        : 0);
    if (
      voteEvent.target &&
      voteEvent.target !== "Abstain" &&
      printedVotes + manualExtraVotes + bonusVotes > 0
    ) {
      let votes = castVotes[voteEvent.target] ?? 0;
      votes += printedVotes;
      votes += manualExtraVotes;
      votes += bonusVotes;
      castVotes[voteEvent.target] = votes;
    }
  });
  const orderedVotes: {
    [key: string]: number;
  } = Object.keys(castVotes)
    .sort((a, b) => {
      if (a === "For") {
        return -1;
      }
      if (b === "For") {
        return 1;
      }
      if (a < b) {
        return -1;
      }
      return 1;
    })
    .reduce(
      (obj, key) => {
        const votes = castVotes[key];
        if (!votes) {
          return obj;
        }
        obj[key] = votes;
        return obj;
      },
      {} as { [key: string]: number },
    );
  return orderedVotes;
}
