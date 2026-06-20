import { FormattedMessage, useIntl } from "react-intl";
import LabeledDiv from "../../../../../../../../src/components/LabeledDiv/LabeledDiv";
import {
  translateOutcome,
} from "../../../../../../../../src/components/VoteBlock/VoteBlock";
import {
  useActionLog,
  useAgendas,
  useAttachments,
  useLeaders,
  useOptions,
  usePlanets,
  useStrategyCards,
  useTechs,
  useViewOnly,
} from "../../../../../../../../src/context/dataHooks";
import { useFactions } from "../../../../../../../../src/context/factionDataHooks";
import { useObjectives } from "../../../../../../../../src/context/objectiveDataHooks";
import { useGameState } from "../../../../../../../../src/context/stateDataHooks";
import {
  getActiveAgenda,
  getSelectedEligibleOutcomes,
  getSelectedSubAgenda,
  getSpeakerTieBreak,
} from "../../../../../../../../src/util/actionLog";
import {
  getCurrentAgendaLogEntries,
  getCurrentPhasePreviousLogEntries,
  getCurrentTurnLogEntries,
} from "../../../../../../../../src/util/api/actionLog";
import { useDataUpdate } from "../../../../../../../../src/util/api/dataUpdate";
import { Events } from "../../../../../../../../src/util/api/events";
import {
  canFactionVote,
  computeRemainingAgendaVotes,
} from "../../../../../../../../src/util/agendaVoting";
import { computeVotes } from "../../../../../../../../src/util/agendaVotes";
import { getUncommittedAgendaFactions } from "../../../../../../../../src/util/helpers";
import { ActionLog } from "../../../../../../../../src/util/types/types";
import { objectKeys, rem } from "../../../../../../../../src/util/util";
import AgendaDetails from "./AgendaDetails";
import CovertLegislation from "./CovertLegislation";

export function CastVotesSection({
  hideObjectives,
  showRemainingVotes,
}: {
  hideObjectives?: boolean;
  showRemainingVotes?: boolean;
}) {
  const actionLog = useActionLog();
  const agendas = useAgendas();
  const attachments = useAttachments();
  const dataUpdate = useDataUpdate();
  const factions = useFactions();
  const intl = useIntl();
  const leaders = useLeaders();
  const objectives = useObjectives();
  const options = useOptions();
  const planets = usePlanets();
  const state = useGameState();
  const strategyCards = useStrategyCards();
  const techs = useTechs();
  const viewOnly = useViewOnly();

  if (!state.votingStarted) {
    return null;
  }

  const currentAgendaLog = getCurrentAgendaLogEntries(actionLog);
  const currentAgendaId = getActiveAgenda(currentAgendaLog);
  if (!currentAgendaId) {
    return null;
  }
  const currentAgenda = agendas[currentAgendaId];
  if (!currentAgenda) {
    return null;
  }

  const localAgenda = structuredClone(currentAgenda);
  // Hack for Covert Legislation.
  const eligibleOutcomes = getSelectedEligibleOutcomes(currentAgendaLog);
  if (eligibleOutcomes && eligibleOutcomes !== "None" && localAgenda) {
    localAgenda.elect = eligibleOutcomes;
  }

  const representativeGovernmentPassed =
    agendas["Representative Government"]?.passed;
  const hiddenFactions = state.votingStarted
    ? getUncommittedAgendaFactions(state, factions)
    : [];

  let totalVotes = 0;
  for (const faction of Object.values(factions)) {
    if (
      !canFactionVote(
        faction,
        agendas,
        state,
        getCurrentTurnLogEntries(actionLog),
        leaders,
      )
    ) {
      continue;
    }
    const factionVotes = computeRemainingAgendaVotes(
      faction.id,
      factions,
      planets,
      attachments,
      agendas,
      options,
      state,
      getCurrentPhasePreviousLogEntries(actionLog),
      leaders,
      techs,
    );
    totalVotes += factionVotes.influence;
    totalVotes += factionVotes.extraVotes;
  }

  const votes = computeVotes(
    currentAgenda,
    currentAgendaLog,
    objectKeys(factions).length,
    !!representativeGovernmentPassed,
    hiddenFactions,
  );
  const maxVotes = Object.values(votes).reduce((maxVotes, voteCount) => {
    return Math.max(maxVotes, voteCount);
  }, 0);
  const selectedTargets = Object.entries(votes)
    .filter(([_, voteCount]) => {
      return voteCount === maxVotes;
    })
    .map(([target, _]) => {
      return target;
    });

  for (const numVotes of Object.values(votes)) {
    totalVotes -= numVotes;
  }
  totalVotes = Math.max(totalVotes, 0);

  const selectedSubAgenda = getSelectedSubAgenda(currentAgendaLog);
  const subAgenda = selectedSubAgenda ? agendas[selectedSubAgenda] : undefined;

  function getSelectedOutcome(
    selectedTargets: string[],
    currentTurn: ActionLog,
  ) {
    if (selectedTargets.length === 1) {
      return selectedTargets[0];
    }
    return getSpeakerTieBreak(currentTurn);
  }

  function readyToResolve() {
    if (
      !currentAgenda ||
      !getSelectedOutcome(selectedTargets, currentAgendaLog)
    ) {
      return false;
    }
    if (state.activeplayer && state.activeplayer !== "None") {
      return false;
    }
    const localAgenda =
      currentAgenda.id === "Covert Legislation" ? subAgenda : currentAgenda;
    if (!localAgenda) {
      return false;
    }
    return true;
  }

  function completeAgenda() {
    if (!currentAgenda) {
      return;
    }
    const target = getSelectedOutcome(selectedTargets, currentAgendaLog);
    if (!target) {
      return;
    }

    dataUpdate(Events.ResolveAgendaEvent(currentAgenda.id, target));
  }

  return (
    <LabeledDiv
      label={
        <FormattedMessage
          id="uxvbkq"
          defaultMessage="Results"
          description="Label for section describing the results of voting on an agenda."
        />
      }
    >
      {votes && Object.keys(votes).length > 0 ? (
        <div
          className="flexColumn"
          style={{
            gap: rem(4),
            padding: `${rem(8)} ${rem(20)}`,
            alignItems: "flex-start",
            border: `${"1px"} solid var(--passed-text)`,
            borderRadius: rem(10),
            width: "100%",
          }}
        >
          {Object.entries(votes).map(([target, voteCount]) => {
            let displayText = translateOutcome(
              target,
              localAgenda.elect,
              planets,
              factions,
              objectives,
              agendas,
              strategyCards,
              intl,
            );
            return (
              <div key={target}>
                {displayText}: {voteCount}
              </div>
            );
          })}
        </div>
      ) : null}
      {showRemainingVotes ? (
        <div>
          <FormattedMessage
            id="8j6M9c"
            defaultMessage="Remaining Votes: {votes}"
            description="Label for a section listing out the remaining votes."
            values={{ votes: totalVotes }}
          />
        </div>
      ) : null}
      <CovertLegislation.RevealAgenda />
      <AgendaDetails hideObjectives={hideObjectives} />
      {readyToResolve() ? (
        <div
          className="flexColumn"
          style={{ paddingTop: rem(8), width: "100%" }}
        >
          <button onClick={completeAgenda} disabled={viewOnly}>
            <FormattedMessage
              id="GR4fXA"
              defaultMessage="Resolve with Outcome: {outcome}"
              description="Text on a button that resolves the current agenda with a specific outcome."
              values={{
                outcome: translateOutcome(
                  getSelectedOutcome(selectedTargets, currentAgendaLog),
                  localAgenda?.elect,
                  planets,
                  factions,
                  objectives,
                  agendas,
                  strategyCards,
                  intl,
                ),
              }}
            />
          </button>
        </div>
      ) : null}
    </LabeledDiv>
  );
}
