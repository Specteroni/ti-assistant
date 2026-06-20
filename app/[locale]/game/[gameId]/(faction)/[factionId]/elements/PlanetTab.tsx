import { ReactNode, use, useEffect, useMemo, useRef, useState } from "react";
import { FormattedMessage } from "react-intl";
import { AddPlanetList } from "../../../../../../../src/AddPlanetList";
import { ModalContent } from "../../../../../../../src/components/Modal/Modal";
import PlanetDiv from "../../../../../../../src/components/PlanetRow/PlanetDiv";
import PlanetRow from "../../../../../../../src/components/PlanetRow/PlanetRow";
import ResourcesIcon from "../../../../../../../src/components/ResourcesIcon/ResourcesIcon";
import TechSkipIcon from "../../../../../../../src/components/TechSkipIcon/TechSkipIcon";
import { ModalContext } from "../../../../../../../src/context/contexts";
import {
  useActionLog,
  useAttachments,
  useLeader,
  useOptions,
  usePlanets,
  useViewOnly,
} from "../../../../../../../src/context/dataHooks";
import { useFactions } from "../../../../../../../src/context/factionDataHooks";
import { useGameState } from "../../../../../../../src/context/stateDataHooks";
import { useDataUpdate } from "../../../../../../../src/util/api/dataUpdate";
import { Events } from "../../../../../../../src/util/api/events";
import { computePlanetSummaryValues } from "../../../../../../../src/util/planetSummary";
import { getUncommittedAgendaFactions } from "../../../../../../../src/util/helpers";
import {
  applyAllPlanetAttachments,
  filterToClaimedPlanets,
} from "../../../../../../../src/util/planets";
import { rem } from "../../../../../../../src/util/util";

type CalculatorMode = "EXHAUST" | "READY";
type PlanetTabMode = "spend" | "manage";

export default function PlanetTab({
  active,
  factionId,
  mode = "spend",
}: {
  active: boolean;
  factionId: FactionId;
  mode?: PlanetTabMode;
}) {
  const attachments = useAttachments();
  const actionLog = useActionLog();
  const dataUpdate = useDataUpdate();
  const factions = useFactions();
  const options = useOptions();
  const planets = usePlanets();
  const state = useGameState();
  const viewOnly = useViewOnly();
  const xxekirGrom = useLeader("Xxekir Grom");
  const { openModal } = use(ModalContext);

  const claimedPlanets = filterToClaimedPlanets(planets, factionId);
  const updatedPlanets = applyAllPlanetAttachments(claimedPlanets, attachments);
  const exhaustedPlanetIds = useMemo(() => {
    return getExhaustedPlanetIds(updatedPlanets);
  }, [updatedPlanets]);
  const [spentBaseline, setSpentBaseline] =
    useState<PlanetId[]>(exhaustedPlanetIds);
  const [removeMode, setRemoveMode] = useState(false);
  const actionBaselineRef = useRef<Record<string, boolean>>({});
  const previousActionLogRef = useRef(actionLog);
  const previousUndoCountRef = useRef(state.undoCount ?? 0);
  const spentBaselineRef = useRef<PlanetId[]>(exhaustedPlanetIds);
  const wasAgendaVoteCommitted = useRef(false);
  const hasXxchaHeroResources =
    factionId === "Xxcha Kingdom" &&
    xxekirGrom?.state === "readied" &&
    options.expansions.includes("CODEX THREE") &&
    !options.expansions.includes("THUNDERS EDGE");
  const spentBaselineSet = new Set(spentBaseline);
  const alreadyExhaustedPlanets = updatedPlanets.filter((planet) => {
    return spentBaselineSet.has(planet.id);
  });
  const activePlanets = updatedPlanets.filter((planet) => {
    return !spentBaselineSet.has(planet.id);
  });
  const spentPlanets = updatedPlanets.filter((planet) => {
    return planet.state === "EXHAUSTED" && !spentBaselineSet.has(planet.id);
  });
  const readiedPlanets = updatedPlanets.filter((planet) => {
    return planet.state !== "EXHAUSTED" && spentBaselineSet.has(planet.id);
  });
  const calculatorMode: CalculatorMode | undefined =
    spentPlanets.length > 0
      ? "EXHAUST"
      : readiedPlanets.length > 0
        ? "READY"
        : undefined;
  const calculatorPlanets =
    calculatorMode === "READY" ? readiedPlanets : spentPlanets;
  const { resources: spentResources, influence: spentInfluence } =
    computePlanetSummaryValues(
      calculatorPlanets,
      hasXxchaHeroResources,
      /* countExhaustedValues= */ true,
    );
  const numSpentPlanets = calculatorPlanets.filter((planet) => {
    return (
      planet.state !== "PURGED" &&
      !planet.attributes.includes("space-station") &&
      !planet.attributes.includes("ocean") &&
      !planet.attributes.includes("synthetic")
    );
  }).length;
  const numSpentTechSkips = calculatorPlanets.filter((planet) => {
    return planet.attributes.some((attribute) => attribute.endsWith("skip"));
  }).length;
  const agendaVoteMode = state.phase === "AGENDA";
  const agendaVotingStarted = agendaVoteMode && !!state.votingStarted;
  const uncommittedFactions = new Set(
    agendaVotingStarted ? getUncommittedAgendaFactions(state, factions) : [],
  );
  const agendaVoteCommitted =
    agendaVotingStarted && !uncommittedFactions.has(factionId);
  const agendaBaselineKey = `${agendaVoteCommitted}:${exhaustedPlanetIds.join(
    "|",
  )}`;
  const actionLogKey = actionLog.map(getActionLogEntryKey).join("||");
  const spentBaselineKey = spentBaseline.join("|");

  function resetCalculator() {
    setSpentBaseline(getExhaustedPlanetIds(updatedPlanets));
  }

  function handleCalculatorAction() {
    if (agendaVoteMode || !calculatorMode) {
      return;
    }
    resetCalculator();
  }

  function canTogglePlanetForCalculator(planet: Planet) {
    if (!calculatorMode) {
      return true;
    }

    const wasExhaustedAtBaseline = spentBaselineSet.has(planet.id);
    const isExhausted = planet.state === "EXHAUSTED";

    if (calculatorMode === "EXHAUST") {
      return !isExhausted || !wasExhaustedAtBaseline;
    }

    return wasExhaustedAtBaseline;
  }

  useEffect(() => {
    spentBaselineRef.current = spentBaseline;
    // Keep this as one dependency so React Fast Refresh never sees a changing
    // dependency-list size as planets enter or leave the exhausted set.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spentBaselineKey]);

  useEffect(() => {
    const previousActionLog = previousActionLogRef.current;
    const previousUndoCount = previousUndoCountRef.current;
    const undoCount = state.undoCount ?? 0;
    const currentActionKeys = new Set(actionLog.map(getActionLogEntryKey));

    if (undoCount !== previousUndoCount) {
      const removedPlanetStateActions = previousActionLog.filter((entry) => {
        return (
          entry.data.action === "UPDATE_PLANET_STATE" &&
          !currentActionKeys.has(getActionLogEntryKey(entry))
        );
      });

      const restoredPlanetBaselines: {
        planet: PlanetId;
        wasBelowLine: boolean;
      }[] = [];
      for (const entry of removedPlanetStateActions) {
        if (entry.data.action !== "UPDATE_PLANET_STATE") {
          continue;
        }

        restoredPlanetBaselines.push({
          planet: entry.data.event.planet,
          wasBelowLine:
            actionBaselineRef.current[getActionLogEntryKey(entry)] ??
            (entry.data.event.state === "READIED"),
        });
      }

      if (restoredPlanetBaselines.length > 0) {
        setSpentBaseline((currentBaseline) => {
          const nextBaseline = new Set(currentBaseline);

          for (const { planet, wasBelowLine } of restoredPlanetBaselines) {
            if (wasBelowLine) {
              nextBaseline.add(planet);
            } else {
              nextBaseline.delete(planet);
            }
          }

          return Array.from(nextBaseline);
        });
      }
    }

    for (const entry of actionLog) {
      if (entry.data.action !== "UPDATE_PLANET_STATE") {
        continue;
      }

      const actionKey = getActionLogEntryKey(entry);
      if (actionBaselineRef.current[actionKey] !== undefined) {
        continue;
      }

      actionBaselineRef.current[actionKey] =
        spentBaselineRef.current.includes(entry.data.event.planet);
    }

    for (const entry of previousActionLog) {
      const actionKey = getActionLogEntryKey(entry);
      if (currentActionKeys.has(actionKey)) {
        continue;
      }

      delete actionBaselineRef.current[actionKey];
    }

    previousActionLogRef.current = actionLog;
    previousUndoCountRef.current = undoCount;
    // Keep this as one dependency so React Fast Refresh never sees a changing
    // dependency-list size as actions are added or removed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionLogKey, state.undoCount]);

  useEffect(() => {
    if (mode === "spend" && active && !agendaVoteMode) {
      setSpentBaseline(exhaustedPlanetIds);
    }
    // During agenda voting, committed votes define the next baseline; opening
    // the tab should not make preloaded vote planets "previously exhausted."
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, agendaVoteMode, mode]);

  const spendMode = mode === "spend";
  const displayedActivePlanets = spendMode ? activePlanets : updatedPlanets;
  const displayedAlreadyExhaustedPlanets = spendMode
    ? alreadyExhaustedPlanets
    : [];

  useEffect(() => {
    if (agendaVoteCommitted !== wasAgendaVoteCommitted.current) {
      setSpentBaseline(exhaustedPlanetIds);
    }
    wasAgendaVoteCommitted.current = agendaVoteCommitted;
    // Keep this as one dependency so React Fast Refresh never sees a changing
    // dependency-list size as planets enter or leave the exhausted set.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agendaBaselineKey]);

  return (
    <>
      <div
        style={{
          alignItems: "center",
          display: "grid",
          gap: rem(8),
          gridTemplateColumns: spendMode
            ? "minmax(0, 1fr)"
            : "minmax(0, 1fr) minmax(0, 1fr)",
          minHeight: rem(40),
          width: "100%",
        }}
      >
        {spendMode ? (
          <div
            title="Spent planets, resources, and influence since the last exhaust reset"
            style={{
              alignItems: "flex-start",
              display: "flex",
              flexDirection: "row",
              flexWrap: "wrap",
              gap: rem(8),
              justifyContent: "center",
              justifySelf: "center",
            }}
          >
            <CounterLabel>Calculator:</CounterLabel>
            <button
              onClick={handleCalculatorAction}
              disabled={viewOnly || agendaVoteMode}
              style={{
                background: "var(--background-color)",
                border: "2px solid var(--neutral-border)",
                borderRadius: rem(6),
                boxShadow: "0 0 0 1px var(--interactive-bg)",
                fontFamily: "var(--main-font)",
                fontSize: rem(14.4),
                padding: `${rem(3.6)} ${rem(10.8)}`,
              }}
              title={
                agendaVoteMode
                  ? "Planet calculator updates are disabled during agenda voting"
                  : "Update calculator baseline"
              }
            >
              <CalculatorActionLabel mode={calculatorMode} />
            </button>
            <PlanetValueCounter
              planets={numSpentPlanets}
              resources={spentResources}
              influence={spentInfluence}
              height={52}
            />
            <TechSkipCounter count={numSpentTechSkips} />
          </div>
        ) : (
          <>
            <div style={{ justifySelf: "start" }}>
              <button
                onClick={() =>
                  openModal(
                    <ModalContent
                      title={
                        <FormattedMessage
                          id="PrGqwQ"
                          description="Label for adding a planet."
                          defaultMessage="Add Planet"
                        />
                      }
                    >
                      <AddPlanetList
                        factionId={factionId}
                        planets={planets}
                        addPlanet={(planetId) =>
                          dataUpdate(
                            Events.ClaimPlanetEvent(factionId, planetId),
                          )
                        }
                      />
                    </ModalContent>,
                  )
                }
                disabled={viewOnly}
                style={actionButtonStyle()}
              >
                <FormattedMessage
                  id="PrGqwQ"
                  description="Label for adding a planet."
                  defaultMessage="Add Planet"
                />
              </button>
            </div>
            <div style={{ justifySelf: "end" }}>
              <RemoveModeToggle
                active={removeMode}
                inactiveLabel={
                  <FormattedMessage
                    id="PlanetTab.RemoveModeOff"
                    defaultMessage="Remove Planets"
                    description="Toggle label enabling planet removal mode."
                  />
                }
                activeLabel={
                  <FormattedMessage
                    id="PlanetTab.RemoveModeOn"
                    defaultMessage="Removing Planets"
                    description="Toggle label indicating planet removal mode is active."
                  />
                }
                setActive={setRemoveMode}
                viewOnly={viewOnly}
              />
            </div>
          </>
        )}
      </div>
      {spendMode ? (
        <PlanetGridSections
          activePlanets={displayedActivePlanets}
          alreadyExhaustedPlanets={displayedAlreadyExhaustedPlanets}
          canTogglePlanet={canTogglePlanetForCalculator}
        />
      ) : (
        <PlanetRowSections
          activePlanets={displayedActivePlanets}
          alreadyExhaustedPlanets={displayedAlreadyExhaustedPlanets}
          canTogglePlanet={() => false}
          factionId={factionId}
          mode={mode}
          removeMode={removeMode}
          removePlanet={(planetId) =>
            dataUpdate(Events.UnclaimPlanetEvent(factionId, planetId, true))
          }
        />
      )}
    </>
  );
}

function PlanetGridSections({
  activePlanets,
  alreadyExhaustedPlanets,
  canTogglePlanet,
}: {
  activePlanets: Planet[];
  alreadyExhaustedPlanets: Planet[];
  canTogglePlanet: (planet: Planet) => boolean;
}) {
  return (
    <div
      style={{
        boxSizing: "border-box",
        padding: `${rem(8)} ${rem(4)} ${rem(16)}`,
        width: "100%",
      }}
    >
      <PlanetGrid canTogglePlanet={canTogglePlanet} planets={activePlanets} />
      {alreadyExhaustedPlanets.length > 0 ? (
        <>
          <AlreadyExhaustedDivider />
          <PlanetGrid
            canTogglePlanet={canTogglePlanet}
            planets={alreadyExhaustedPlanets}
          />
        </>
      ) : null}
    </div>
  );
}

function PlanetGrid({
  canTogglePlanet,
  planets,
}: {
  canTogglePlanet: (planet: Planet) => boolean;
  planets: Planet[];
}) {
  return (
    <div
      style={{
        alignItems: "flex-start",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "row",
        flexWrap: "wrap",
        gap: rem(8),
        justifyContent: "center",
        width: "100%",
      }}
    >
      {planets.map((planet) => {
        return (
          <PlanetDiv
            key={planet.id}
            canToggleState={canTogglePlanet(planet)}
            planet={planet}
          />
        );
      })}
    </div>
  );
}

function PlanetRowSections({
  activePlanets,
  alreadyExhaustedPlanets,
  canTogglePlanet,
  factionId,
  mode,
  removeMode,
  removePlanet,
}: {
  activePlanets: Planet[];
  alreadyExhaustedPlanets: Planet[];
  canTogglePlanet: (planet: Planet) => boolean;
  factionId: FactionId;
  mode: PlanetTabMode;
  removeMode: boolean;
  removePlanet: (planetId: PlanetId) => void;
}) {
  return (
    <div
      className="largeFont"
      style={{
        boxSizing: "border-box",
        paddingBottom: rem(4),
        width: "100%",
      }}
    >
      <PlanetRows
        canTogglePlanet={canTogglePlanet}
        factionId={factionId}
        mode={mode}
        planets={activePlanets}
        removeMode={removeMode}
        removePlanet={removePlanet}
      />
      {alreadyExhaustedPlanets.length > 0 ? (
        <>
          <AlreadyExhaustedDivider />
          <PlanetRows
            canTogglePlanet={canTogglePlanet}
            factionId={factionId}
            mode={mode}
            planets={alreadyExhaustedPlanets}
            removeMode={removeMode}
            removePlanet={removePlanet}
          />
        </>
      ) : null}
    </div>
  );
}

function PlanetRows({
  canTogglePlanet,
  factionId,
  mode,
  planets,
  removeMode,
  removePlanet,
}: {
  canTogglePlanet: (planet: Planet) => boolean;
  factionId: FactionId;
  mode: PlanetTabMode;
  planets: Planet[];
  removeMode: boolean;
  removePlanet: (planetId: PlanetId) => void;
}) {
  const spendMode = mode === "spend";

  return (
    <>
      {planets.map((planet) => {
        return (
          <PlanetRow
            key={planet.id}
            canToggleState={canTogglePlanet(planet)}
            factionId={factionId}
            opts={{
              hideAttachButton: spendMode,
              hideManagementControls: spendMode,
              showAttachButton: !spendMode,
            }}
            planet={planet}
            removePlanet={removeMode ? removePlanet : undefined}
          />
        );
      })}
    </>
  );
}

function RemoveModeToggle({
  active,
  activeLabel,
  inactiveLabel,
  setActive,
  viewOnly,
}: {
  active: boolean;
  activeLabel: ReactNode;
  inactiveLabel: ReactNode;
  setActive: (active: boolean) => void;
  viewOnly: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={() => setActive(!active)}
      disabled={viewOnly}
      style={{
        backgroundColor: active ? "var(--red-tech-color)" : "var(--interactive-bg)",
        border: `2px solid ${
          active ? "var(--red-tech-color)" : "var(--neutral-border)"
        }`,
        borderRadius: rem(6),
        boxShadow: active
          ? `0 0 ${rem(8)} var(--red-tech-color)`
          : "0 0 0 1px var(--background-color)",
        color: "var(--foreground-color)",
        fontFamily: "var(--main-font)",
        fontSize: rem(14),
        padding: `${rem(3)} ${rem(10)}`,
      }}
    >
      {active ? activeLabel : inactiveLabel}
    </button>
  );
}

function actionButtonStyle() {
  return {
    backgroundColor: "var(--interactive-bg)",
    border: "2px solid var(--neutral-border)",
    borderRadius: rem(6),
    boxShadow: "0 0 0 1px var(--background-color)",
    color: "var(--foreground-color)",
    fontFamily: "var(--main-font)",
    fontSize: rem(14),
    padding: `${rem(5)} ${rem(12)}`,
  };
}

function AlreadyExhaustedDivider() {
  return (
    <div
      style={{
        alignItems: "center",
        boxSizing: "border-box",
        display: "grid",
        gap: rem(8),
        gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)",
        padding: `${rem(12)} 0 ${rem(8)}`,
        width: "100%",
      }}
    >
      <div style={{ borderTop: "1px solid var(--neutral-border)" }} />
      <span
        style={{
          color: "var(--muted-text-color)",
          fontFamily: "var(--main-font)",
          fontSize: rem(16),
          lineHeight: 1,
          whiteSpace: "nowrap",
        }}
      >
        <FormattedMessage
          id="PlanetTab.AlreadyExhausted"
          defaultMessage="Previously Exhausted"
          description="Divider label for planets that were already exhausted when the planet tab opened or when the calculator was reset."
        />
      </span>
      <div style={{ borderTop: "1px solid var(--neutral-border)" }} />
    </div>
  );
}

function getExhaustedPlanetIds(planets: Planet[]) {
  return planets
    .filter((planet) => planet.state === "EXHAUSTED")
    .map((planet) => planet.id);
}

function getActionLogEntryKey(entry: ActionLogEntry<GameUpdateData>) {
  const event = "event" in entry.data ? JSON.stringify(entry.data.event) : "";
  return [
    entry.timestampMillis,
    entry.gameSeconds ?? "",
    entry.data.action,
    event,
  ].join(":");
}

function CounterLabel({ children }: { children: string }) {
  return (
    <span
      style={{
        color: "var(--muted-text-color)",
        fontFamily: "var(--main-font)",
        fontSize: rem(16),
        lineHeight: 1,
        userSelect: "none",
      }}
    >
      {children}
    </span>
  );
}

function CalculatorActionLabel({
  mode,
}: {
  mode: CalculatorMode | undefined;
}) {
  if (mode === "EXHAUST") {
    return (
      <FormattedMessage
        id="PlanetTab.ExhaustCalculator"
        defaultMessage="Exhaust"
        description="Text on a calculator button that commits selected planet exhaustions."
      />
    );
  }

  if (mode === "READY") {
    return (
      <FormattedMessage
        id="PlanetTab.UnexhaustCalculator"
        defaultMessage="Unexhaust"
        description="Text on a calculator button that commits selected planet readying."
      />
    );
  }

  return (
    <FormattedMessage
      id="PlanetTab.UpdateCalculator"
      defaultMessage="Update"
      description="Text on a calculator button that updates the planet calculator baseline."
    />
  );
}

function TechSkipCounter({ count }: { count: number }) {
  return (
    <div
      title="Exhausted tech-skip planets in this calculator"
      style={{
        alignItems: "center",
        display: "flex",
        flexDirection: "row",
        gap: rem(4),
        height: rem(52),
        justifyContent: "center",
      }}
    >
      <TechSkipIcon size={20} />
      <span
        style={{
          fontFamily: "var(--main-font)",
          fontSize: rem(22),
          lineHeight: 1,
        }}
      >
        {count}
      </span>
    </div>
  );
}

function PlanetValueCounter({
  planets,
  resources,
  influence,
  height,
}: {
  planets: number;
  resources: number;
  influence: number;
  height: number;
}) {
  return (
    <div
      style={{
        height: rem(height * 1.12),
        position: "relative",
        width: rem(height * 1.024),
      }}
    >
      <div
        style={{
          alignItems: "center",
          border: "1px solid var(--interactive-bg)",
          borderRadius: "100%",
          display: "flex",
          flexDirection: "column",
          fontFamily: "var(--main-font)",
          fontSize: rem(height * 0.36),
          gap: 0,
          height: rem(height * 0.544),
          justifyContent: "center",
          lineHeight: 1,
          position: "absolute",
          backgroundColor: "#080808",
          right: 0,
          top: rem(height * 0.032),
          userSelect: "none",
          width: rem(height * 0.544),
        }}
      >
        {planets}
      </div>
      <ResourcesIcon
        resources={resources}
        influence={influence}
        height={height}
      />
    </div>
  );
}
