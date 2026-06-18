"use client";

import dynamic from "next/dynamic";
import { use } from "react";
import { FormattedMessage } from "react-intl";
import { AgendaReference } from "../../../../../../src/AgendaRow";
import FactionComponents from "../../../../../../src/components/FactionComponents/FactionComponents";
import LabeledDiv from "../../../../../../src/components/LabeledDiv/LabeledDiv";
import { SettingsContext } from "../../../../../../src/context/contexts";
import {
  useAgendas,
  useAttachments,
  useCurrentTurn,
  useLeader,
  useOptions,
  usePlanets,
} from "../../../../../../src/context/dataHooks";
import {
  useFactionColors,
  useFactions,
  useIsFactionPassed,
  useNumFactions,
} from "../../../../../../src/context/factionDataHooks";
import {
  FactionOrdering,
  useActiveFactionId,
  useCompleteOrderedFactionIds,
  useManualFactionVPs,
  useScoredFactionVPs,
} from "../../../../../../src/context/gameDataHooks";
import {
  useFinalPhase,
  useGameState,
  usePhase,
} from "../../../../../../src/context/stateDataHooks";
import { FactionSummary } from "../../../../../../src/FactionSummary";
import InfluenceSVG from "../../../../../../src/icons/planets/Influence";
import PlanetMenuSVG from "../../../../../../src/icons/ui/PlanetMenu";
import { StaticFactionTimer } from "../../../../../../src/Timer";
import {
  getActiveAgenda,
  getSelectedEligibleOutcomes,
} from "../../../../../../src/util/actionLog";
import { getAgendaVotingOrder } from "../../../../../../src/util/helpers";
import {
  applyAllPlanetAttachments,
  filterToClaimedPlanets,
} from "../../../../../../src/util/planets";
import { computePlanetSummaryValues } from "../../../../../../src/util/planetSummary";
import { SummaryLabel } from "../../../../../../src/util/settings";
import { rem } from "../../../../../../src/util/util";
import styles from "./SummaryColumn.module.scss";
import FactionIcon from "../../../../../../src/components/FactionIcon/FactionIcon";

const FactionPanel = dynamic(
  () => import("../../../../../../src/components/FactionPanel"),
  {
    loading: () => <div className="popupIcon">&#x24D8;</div>,
    ssr: false,
  },
);

export default function SummaryColumn() {
  const phase = usePhase();
  const numFactions = useNumFactions();
  const finalPhase = useFinalPhase();

  let order: FactionOrdering = "SPEAKER";
  let tieBreak: FactionOrdering = "SPEAKER";
  if (phase === "END") {
    order = "VICTORY_POINTS";
    tieBreak =
      finalPhase === "ACTION" || finalPhase === "STATUS"
        ? "INITIATIVE"
        : "SPEAKER";
  }

  const orderedFactionIds = useCompleteOrderedFactionIds(order, tieBreak);

  if (phase === "AGENDA") {
    return <AgendaSummaryColumn />;
  }

  let title = (
    <FormattedMessage
      id="L4UH+0"
      description="An ordering of factions based on the speaker."
      defaultMessage="Speaker Order"
    />
  );
  switch (order) {
    case "VICTORY_POINTS":
      title = (
        <FormattedMessage
          id="KiioBO"
          description="An ordering of factions based on end game scoring."
          defaultMessage="Final Score"
        />
      );
      break;
  }

  return (
    <div
      className={styles.SummaryColumn}
      style={{
        gap: numFactions < 8 ? rem(12) : 0,
        paddingTop: undefined, // numFactions === 8 ? rem(48) : undefined,
      }}
    >
      {numFactions < 8 ? <div className="flexRow">{title}</div> : null}

      {orderedFactionIds.map((factionId) => {
        return <FactionDiv key={factionId} factionId={factionId} />;
      })}
    </div>
  );
}

function AgendaSummaryColumn() {
  const agendas = useAgendas();
  const currentTurn = useCurrentTurn();
  const factions = useFactions();
  const numFactions = useNumFactions();
  const state = useGameState();
  const votingFactionIds = getAgendaVotingOrder(state, factions).map(
    (faction) => faction.id,
  );

  const activeAgenda = getActiveAgenda(currentTurn);
  const currentAgenda = activeAgenda ? agendas[activeAgenda] : undefined;
  const localAgenda = currentAgenda
    ? structuredClone(currentAgenda)
    : undefined;
  const eligibleOutcomes = getSelectedEligibleOutcomes(currentTurn);
  if (eligibleOutcomes && eligibleOutcomes !== "None" && localAgenda) {
    localAgenda.elect = eligibleOutcomes;
  }

  return (
    <div
      className={styles.SummaryColumn}
      style={{
        gap: numFactions < 8 ? rem(8) : rem(4),
        justifyContent: "center",
      }}
    >
      {numFactions < 8 ? (
        <div className="flexRow">
          <FormattedMessage
            id="rbtRWF"
            description="An ordering of factions based on voting."
            defaultMessage="Voting Order"
          />
        </div>
      ) : null}
      {localAgenda ? (
        <LabeledDiv
          label={
            <FormattedMessage
              id="EKBl8x"
              defaultMessage="Agenda"
              description="Label for a section showing the current agenda text."
            />
          }
          className={styles.AgendaReferenceCard}
          innerStyle={{ paddingTop: rem(8) }}
        >
          <AgendaReference agenda={localAgenda} compact />
        </LabeledDiv>
      ) : null}
      <div className={styles.AgendaFactionList}>
        {votingFactionIds.map((factionId) => {
          return <AgendaFactionRow key={factionId} factionId={factionId} />;
        })}
      </div>
    </div>
  );
}

function AgendaFactionRow({ factionId }: { factionId: FactionId }) {
  const attachments = useAttachments();
  const colors = useFactionColors(factionId);
  const manualVPs = useManualFactionVPs(factionId);
  const options = useOptions();
  const planets = usePlanets();
  const scoredVPs = useScoredFactionVPs(factionId);
  const xxekirGrom = useLeader("Xxekir Grom");

  const ownedPlanets = filterToClaimedPlanets(planets, factionId);
  const updatedPlanets = applyAllPlanetAttachments(ownedPlanets, attachments);
  const hasXxchaHeroResources =
    factionId === "Xxcha Kingdom" &&
    xxekirGrom?.state === "readied" &&
    options.expansions.includes("CODEX THREE") &&
    !options.expansions.includes("THUNDERS EDGE");
  const { influence, numPlanets } = computePlanetSummaryValues(
    updatedPlanets,
    hasXxchaHeroResources,
    true,
    true,
  );

  return (
    <div
      className={styles.AgendaFactionRow}
      style={{
        borderColor: colors.border,
        color: colors.color,
      }}
    >
      <div className={styles.AgendaFactionName}>
        <FactionIcon factionId={factionId} size={20} />
        <FactionComponents.Name factionId={factionId} />
      </div>
      <div className={styles.AgendaFactionStat}>
        <span>{manualVPs + scoredVPs}</span>
        <span>VPs</span>
      </div>
      <div className={styles.AgendaFactionIconStat} title="Influence">
        <InfluenceSVG influence={influence} />
      </div>
      <div className={styles.AgendaFactionPlanetStat} title="Planets">
        <span>{numPlanets}</span>
        <PlanetMenuSVG color="var(--foreground-color)" />
      </div>
    </div>
  );
}

function FactionDiv({ factionId }: { factionId: FactionId }) {
  const colors = useFactionColors(factionId);
  const isPassed = useIsFactionPassed(factionId);
  const options = useOptions();
  const phase = usePhase();
  const { settings } = use(SettingsContext);

  const fadeFaction = phase !== "END" && isPassed;

  return (
    <LabeledDiv
      label={
        <FactionSummaryLabel
          factionId={factionId}
          options={options}
          label={settings["fs-left-label"]}
        />
      }
      rightLabel={
        <FactionSummaryLabel
          factionId={factionId}
          options={options}
          label={settings["fs-right-label"]}
        />
      }
      borderColor={fadeFaction ? "var(--hidden-border)" : colors.border}
      color={fadeFaction ? "var(--interactive-bg)" : colors.color}
      innerStyle={{
        filter: fadeFaction ? "brightness(0.6)" : "unset",
      }}
    >
      <FactionSummary factionId={factionId} />
    </LabeledDiv>
  );
}

function FactionSummaryLabel({
  factionId,
  options,
  label,
}: {
  factionId: FactionId;
  options: Options;
  label: SummaryLabel;
}) {
  const activeFactionId = useActiveFactionId();
  const isActive = activeFactionId === factionId;
  switch (label) {
    case "NONE":
      return null;
    case "NAME":
      return (
        <div
          className="flexRow"
          style={{
            gap: "0.25rem",
            fontFamily: isActive ? "var(--main-font)" : undefined,
          }}
        >
          <FactionIcon factionId={factionId} size={16} />
          <FactionComponents.Name factionId={factionId} />
          <FactionPanel factionId={factionId} options={options} />
        </div>
      );
    case "TIMER":
      return (
        <StaticFactionTimer
          active={false}
          factionId={factionId}
          style={{
            fontFamily: isActive ? "var(--main-font)" : undefined,
          }}
          width={isActive ? 84 : 72}
        />
      );
    case "VPS":
      return (
        <>
          <FactionComponents.VPs factionId={factionId} /> VPs
        </>
      );
  }
}
