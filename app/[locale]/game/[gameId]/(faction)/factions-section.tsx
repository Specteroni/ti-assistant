"use client";

import { usePathname } from "next/navigation";
import { useContext } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import FactionCircle from "../../../../../src/components/FactionCircle/FactionCircle";
import { FactionPanelModal } from "../../../../../src/components/FactionPanel";
import {
  useCurrentTurn,
  useOptions,
  useStrategyCards,
  useViewOnly,
} from "../../../../../src/context/dataHooks";
import { ModalContext } from "../../../../../src/context/contexts";
import {
  useFaction,
  useFactions,
} from "../../../../../src/context/factionDataHooks";
import {
  FactionOrdering,
  useActiveFactionId,
  useCompleteOrderedFactionIds,
} from "../../../../../src/context/gameDataHooks";
import {
  useFinalPhase,
  useGameState,
  usePhase,
} from "../../../../../src/context/stateDataHooks";
import { LockedButtons } from "../../../../../src/LockedButton";
import { getLogEntries } from "../../../../../src/util/actionLog";
import {
  getFactionBorder,
  getFactionColor,
} from "../../../../../src/util/factions";
import { getStrategyCardsForFaction } from "../../../../../src/util/helpers";
import { phaseString } from "../../../../../src/util/strings";
import { Optional } from "../../../../../src/util/types/types";
import { rem } from "../../../../../src/util/util";
import { setupPhaseComplete } from "../main/phase/setup/SetupPhase";
import { statusPhaseComplete } from "../main/phase/status/StatusPhase";
import { useDataUpdate } from "../../../../../src/util/api/dataUpdate";
import { Events } from "../../../../../src/util/api/events";

function NextPhaseButtons({ factionId }: { factionId: FactionId }) {
  const currentTurn = useCurrentTurn();
  const dataUpdate = useDataUpdate();
  const factions = useFactions();
  const options = useOptions();
  const state = useGameState();
  const viewOnly = useViewOnly();

  const intl = useIntl();
  const isSpeaker = factionId === state.speaker;

  const revealedObjectives = getLogEntries<RevealObjectiveData>(
    currentTurn,
    "REVEAL_OBJECTIVE",
  ).map((logEntry) => logEntry.data.event.objective);

  switch (state.phase) {
    case "SETUP":
      if (!isSpeaker) {
        return null;
      }
      return (
        <div className="flexColumn" style={{ marginTop: rem(8) }}>
          <LockedButtons
            unlocked={setupPhaseComplete(factions, revealedObjectives, options)}
            buttons={[
              {
                text: intl.formatMessage({
                  id: "lYD2yu",
                  description: "Text on a button that will start a game.",
                  defaultMessage: "Start Game",
                }),
                onClick: () => {
                  dataUpdate(Events.AdvancePhaseEvent());
                },
                primary: true,
              },
            ]}
            viewOnly={viewOnly}
          />
        </div>
      );
    case "STRATEGY":
      if (!isSpeaker) {
        return null;
      }
      if (state.activeplayer === "None") {
        return (
          <div className="flexColumn" style={{ marginTop: rem(8) }}>
            <button
              className="primary"
              onClick={() => {
                dataUpdate(Events.AdvancePhaseEvent());
              }}
              disabled={viewOnly}
            >
              <FormattedMessage
                id="8/h2ME"
                defaultMessage="Advance to {phase} Phase"
                description="Text on a button that will advance the game to a specific phase."
                values={{
                  phase: phaseString("ACTION", intl),
                }}
              />
            </button>
          </div>
        );
      }
      return null;
    case "ACTION":
      if (!isSpeaker) {
        return null;
      }
      return (
        <div className="flexColumn" style={{ marginTop: rem(8) }}>
          <LockedButtons
            unlocked={state.activeplayer === "None"}
            buttons={[
              {
                text: intl.formatMessage(
                  {
                    id: "8/h2ME",
                    defaultMessage: "Advance to {phase} Phase",
                    description:
                      "Text on a button that will advance the game to a specific phase.",
                  },
                  { phase: phaseString("STATUS", intl) },
                ),
                onClick: () => {
                  dataUpdate(Events.AdvancePhaseEvent());
                },
                primary: true,
              },
            ]}
            viewOnly={viewOnly}
          />
        </div>
      );
    case "STATUS":
      let buttons = [];
      if (!state.agendaUnlocked) {
        buttons.push({
          text: intl.formatMessage({
            id: "5WXn8l",
            defaultMessage: "Start Next Round",
            description: "Text on a button that will start the next round.",
          }),
          primary: false,
          onClick: () => {
            dataUpdate(Events.AdvancePhaseEvent(/* skipAgenda= */ true));
          },
        });
      }
      if (isSpeaker) {
        buttons.push({
          text: intl.formatMessage(
            {
              id: "8/h2ME",
              defaultMessage: "Advance to {phase} Phase",
              description:
                "Text on a button that will advance the game to a specific phase.",
            },
            { phase: phaseString("AGENDA", intl) },
          ),
          primary: true,
          onClick: () => {
            dataUpdate(Events.AdvancePhaseEvent());
          },
        });
      }
      if (buttons.length === 0) {
        return null;
      }
      return (
        <div className="flexColumn" style={{ marginTop: rem(8) }}>
          <LockedButtons
            unlocked={statusPhaseComplete(currentTurn)}
            buttons={buttons}
            viewOnly={viewOnly}
          />
        </div>
      );
    case "AGENDA":
      return (
        <div className="flexColumn" style={{ marginTop: rem(8) }}>
          <LockedButtons
            unlocked={state.agendaNum === 3}
            buttons={[
              {
                text: intl.formatMessage({
                  id: "5WXn8l",
                  defaultMessage: "Start Next Round",
                  description:
                    "Text on a button that will start the next round.",
                }),
                onClick: () => {
                  dataUpdate(Events.AdvancePhaseEvent(/* skipAgenda= */ true));
                },
                primary: true,
              },
            ]}
            viewOnly={viewOnly}
          />
        </div>
      );
  }
  return null;
}

function useCurrentFactionIdFromPath() {
  const pathname = usePathname();
  const pathParts = pathname.split("/").filter(Boolean);
  const gameIndex = pathParts.indexOf("game");
  const factionId = gameIndex >= 0 ? pathParts[gameIndex + 2] : undefined;
  return factionId ? (decodeURIComponent(factionId) as FactionId) : undefined;
}

export default function FactionsSection({}) {
  const factionId = useCurrentFactionIdFromPath();
  const phase = usePhase();
  const finalPhase = useFinalPhase();

  let ordering: FactionOrdering;
  let tieBreak: Optional<FactionOrdering>;
  let orderTitle = <></>;
  switch (phase) {
    case "SETUP":
    case "STRATEGY":
    case "EDICT":
    case "UNKNOWN":
      orderTitle = (
        <FormattedMessage
          id="L4UH+0"
          description="An ordering of factions based on the speaker."
          defaultMessage="Speaker Order"
        />
      );
      ordering = "SPEAKER";
      break;
    case "ACTION":
    case "STATUS":
      orderTitle = (
        <FormattedMessage
          id="09baik"
          description="An ordering of factions based on initiative."
          defaultMessage="Initiative Order"
        />
      );
      ordering = "INITIATIVE";
      break;
    case "AGENDA":
      orderTitle = (
        <FormattedMessage
          id="rbtRWF"
          description="An ordering of factions based on voting."
          defaultMessage="Voting Order"
        />
      );
      ordering = "VOTING";
      break;
    case "END":
      ordering = "VICTORY_POINTS";
      switch (finalPhase) {
        case "ACTION":
        case "STATUS":
          tieBreak = "INITIATIVE";
          break;
        default:
          tieBreak = "SPEAKER";
          break;
      }
      break;
  }

  const orderedFactionIds = useCompleteOrderedFactionIds(ordering, tieBreak);

  return (
    <div
      className="flexColumn"
      style={{
        width: "100%",
        gap: rem(4),
        fontSize: rem(18),
      }}
    >
      {factionId ? <NextPhaseButtons factionId={factionId} /> : null}
      {orderTitle}
      <div
        className="flexRow"
        style={{ width: "100%", alignItems: "space-evenly", gap: 0 }}
      >
        {orderedFactionIds.map((factionId) => {
          return <LocalFactionCircle key={factionId} factionId={factionId} />;
        })}
      </div>
    </div>
  );
}

function LocalFactionCircle({ factionId }: { factionId: FactionId }) {
  const activeFactionId = useActiveFactionId();

  const faction = useFaction(factionId);
  const options = useOptions();

  const { openModal } = useContext(ModalContext);
  const phase = usePhase();
  const strategyCards = useStrategyCards();

  if (!faction) {
    return null;
  }

  const isActive =
    (phase === "ACTION" || phase === "STRATEGY") &&
    activeFactionId === factionId;
  const borderColor = faction.passed
    ? "var(--passed-text)"
    : getFactionBorder(faction);
  const cards = getStrategyCardsForFaction(strategyCards, factionId);
  return (
    <FactionCircle
      key={faction.id}
      borderColor={borderColor}
      factionId={faction.id}
      onClick={() =>
        openModal(<FactionPanelModal factionId={factionId} options={options} />)
      }
      style={{
        backgroundColor: isActive ? "#333" : undefined,
        boxShadow: isActive ? "var(--border-color) 0 0 8px 4px" : undefined,
      }}
      tag={
        cards.length > 0 ? (
          <div
            style={{
              fontSize: rem(18),
              color: cards[0]?.used ? "var(--passed-text)" : cards[0]?.color,
            }}
          >
            {cards[0]?.order}
          </div>
        ) : undefined
      }
      tagBorderColor={cards[0]?.used ? "var(--passed-text)" : cards[0]?.color}
    />
  );
}
