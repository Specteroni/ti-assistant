import { FormattedMessage, useIntl } from "react-intl";
import FactionComponents from "../../../../../../../../src/components/FactionComponents/FactionComponents";
import LabeledDiv from "../../../../../../../../src/components/LabeledDiv/LabeledDiv";
import VoteBlock, {
  getTargets,
} from "../../../../../../../../src/components/VoteBlock/VoteBlock";
import {
  useActionLog,
  useAgendas,
  useOptions,
  usePlanets,
  useStrategyCards,
  useViewOnly,
} from "../../../../../../../../src/context/dataHooks";
import { useFactions } from "../../../../../../../../src/context/factionDataHooks";
import { useObjectives } from "../../../../../../../../src/context/objectiveDataHooks";
import { useGameState } from "../../../../../../../../src/context/stateDataHooks";
import { ClientOnlyHoverMenu } from "../../../../../../../../src/HoverMenu";
import { SelectableRow } from "../../../../../../../../src/SelectableRow";
import {
  getActiveAgenda,
  getSelectedEligibleOutcomes,
  getSpeakerTieBreak,
} from "../../../../../../../../src/util/actionLog";
import { getCurrentAgendaLogEntries } from "../../../../../../../../src/util/api/actionLog";
import { useDataUpdate } from "../../../../../../../../src/util/api/dataUpdate";
import { Events } from "../../../../../../../../src/util/api/events";
import { computeVotes } from "../../../../../../../../src/util/agendaVotes";
import {
  convertToFactionBorder,
  convertToFactionColor,
} from "../../../../../../../../src/util/factions";
import {
  getAgendaVotingOrder,
  getUncommittedAgendaFactions,
} from "../../../../../../../../src/util/helpers";
import { objectKeys, rem } from "../../../../../../../../src/util/util";

export default function VotingColumn({
  speaker,
  manualVotes,
}: {
  speaker: FactionId;
  manualVotes?: boolean;
}) {
  const actionLog = useActionLog();
  const agendas = useAgendas();
  const factions = useFactions();
  const state = useGameState();

  const votingOrder = getAgendaVotingOrder(state, factions);

  const currentAgendaLog = getCurrentAgendaLogEntries(actionLog);
  const activeAgenda = getActiveAgenda(currentAgendaLog);
  const currentAgenda = activeAgenda ? agendas[activeAgenda] : undefined;

  // Hack the elect field to handle Covert Legislation.
  const localAgenda = currentAgenda
    ? structuredClone(currentAgenda)
    : undefined;
  const eligibleOutcomes = getSelectedEligibleOutcomes(currentAgendaLog);
  if (eligibleOutcomes && eligibleOutcomes !== "None" && localAgenda) {
    localAgenda.elect = eligibleOutcomes;
  }
  const hiddenFactions = new Set(
    state.votingStarted ? getUncommittedAgendaFactions(state, factions) : [],
  );

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        paddingBottom: rem(8),
        alignItems: "flex-end",
        gap: rem(8),
        maxWidth: rem(480),
      }}
    >
      <div
        style={{
          display: "grid",
          gridColumn: "span 4",
          gridTemplateColumns: "subgrid",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <FormattedMessage
            id="ifN0t/"
            defaultMessage="Outcome"
            description="Header for column listing what voting outcome players have selected."
          />
        </div>
        <div
          className="flexColumn"
          style={{
            display: "grid",
            gridTemplateColumns: "subgrid",
            gridColumn: "span 3",
          }}
        >
          <div className="flexRow">
            <FormattedMessage
              id="5FWWeX"
              defaultMessage="Available"
              description="Header for column listing how many votes players have available."
            />
          </div>
          <div className="flexRow">
            <FormattedMessage
              id="VIWZO7"
              defaultMessage="Votes"
              description="Header for column listing how many votes players have cast."
            />
          </div>
          <div className="flexRow">
            <FormattedMessage
              id="X3VPhD"
              defaultMessage="Extra"
              description="Header for column listing how many extra votes players have cast."
            />
          </div>
        </div>
      </div>
      {votingOrder.map((faction) => {
        return (
          <VoteBlock
            key={faction.id}
            factionId={faction.id}
            agenda={localAgenda}
            manualVotes={manualVotes}
            hideVotes={hiddenFactions.has(faction.id)}
            activeVote={faction.id === state.activeplayer}
          />
        );
      })}
      <SpeakerTieBreak speaker={speaker} />
    </div>
  );
}

function SpeakerTieBreak({ speaker }: { speaker: FactionId }) {
  const actionLog = useActionLog();
  const agendas = useAgendas();
  const dataUpdate = useDataUpdate();
  const factions = useFactions();
  const intl = useIntl();
  const objectives = useObjectives();
  const options = useOptions();
  const planets = usePlanets();
  const state = useGameState();
  const strategyCards = useStrategyCards();
  const viewOnly = useViewOnly();

  if (state.activeplayer && state.activeplayer !== "None") {
    return null;
  }

  const currentAgendaLog = getCurrentAgendaLogEntries(actionLog);
  const activeAgenda = getActiveAgenda(currentAgendaLog);
  const currentAgenda = activeAgenda ? agendas[activeAgenda] : undefined;
  if (!currentAgenda) {
    return null;
  }

  const localAgenda = currentAgenda
    ? structuredClone(currentAgenda)
    : undefined;
  const eligibleOutcomes = getSelectedEligibleOutcomes(currentAgendaLog);
  if (eligibleOutcomes && eligibleOutcomes !== "None" && localAgenda) {
    localAgenda.elect = eligibleOutcomes;
  }

  const representativeGovernmentPassed =
    agendas["Representative Government"]?.passed;

  const votes = computeVotes(
    currentAgenda,
    currentAgendaLog,
    objectKeys(factions).length,
    !!representativeGovernmentPassed,
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
  const isTie = selectedTargets.length !== 1;

  if (!isTie) {
    return null;
  }

  const allTargets = getTargets(
    localAgenda,
    factions,
    strategyCards,
    planets,
    agendas,
    objectives,
    options,
    intl,
  );

  let items = selectedTargets.length;
  if (items === 0) {
    items = allTargets.length;
  }
  if (items > 10) {
    items = 10;
  }
  const tieBreak = getSpeakerTieBreak(currentAgendaLog);

  if (tieBreak) {
    return (
      <LabeledDiv label="Speaker Tie Break" style={{ gridColumn: "span 4" }}>
        <SelectableRow
          itemId={tieBreak}
          removeItem={() => dataUpdate(Events.SpeakerTieBreakEvent("None"))}
          viewOnly={viewOnly}
        >
          {tieBreak}
        </SelectableRow>
      </LabeledDiv>
    );
  }

  return (
    <LabeledDiv
      label={<FactionComponents.Name factionId={speaker} />}
      color={convertToFactionColor(factions[speaker]?.color)}
      borderColor={convertToFactionBorder(factions[speaker]?.color)}
      style={{ width: "auto", gridColumn: "span 4" }}
    >
      <ClientOnlyHoverMenu
        label={
          <FormattedMessage
            id="Kzzn9t"
            description="Text on a hover menu for the speaker choosing the outcome."
            defaultMessage="Choose outcome if tied"
          />
        }
      >
        <div
          className="flexRow"
          style={{
            alignItems: "stretch",
            justifyContent: "flex-start",
            maxWidth: "92vw",
            overflowX: "auto",
            gap: rem(4),
            padding: rem(8),
            display: "grid",
            gridAutoFlow: "column",
            gridTemplateRows: `repeat(${items}, auto)`,
          }}
        >
          {selectedTargets.length > 0
            ? selectedTargets.map((target) => {
                return (
                  <button
                    key={target}
                    style={{
                      fontSize: rem(14),
                      writingMode: "horizontal-tb",
                    }}
                    onClick={() =>
                      dataUpdate(Events.SpeakerTieBreakEvent(target))
                    }
                    disabled={viewOnly}
                  >
                    {target}
                  </button>
                );
              })
            : allTargets.map((target) => {
                if (target.id === "Abstain") {
                  return null;
                }
                return (
                  <button
                    key={target.id}
                    style={{
                      fontSize: rem(14),
                      writingMode: "horizontal-tb",
                    }}
                    onClick={() =>
                      dataUpdate(Events.SpeakerTieBreakEvent(target.id))
                    }
                    disabled={viewOnly}
                  >
                    {target.name}
                  </button>
                );
              })}
        </div>
      </ClientOnlyHoverMenu>
    </LabeledDiv>
  );
}
