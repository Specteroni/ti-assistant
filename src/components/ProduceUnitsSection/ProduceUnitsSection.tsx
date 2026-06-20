import { use, useMemo, useState } from "react";
import { useIntl } from "react-intl";
import {
  useAttachments,
  usePlanets,
  useTechs,
  useUpgrades,
  useViewOnly,
} from "../../context/dataHooks";
import { ModalContext } from "../../context/contexts";
import { useFaction } from "../../context/factionDataHooks";
import { hasTech } from "../../util/api/techs";
import { useDataUpdate } from "../../util/api/dataUpdate";
import { Events } from "../../util/api/events";
import {
  applyAllPlanetAttachments,
  filterToClaimedPlanets,
} from "../../util/planets";
import { getCurrentUnitCards, UnitCard } from "../../util/unitCards";
import { rem } from "../../util/util";
import Card from "../Card/Card";
import { ModalContent } from "../Modal/Modal";
import PlanetDiv from "../PlanetRow/PlanetDiv";
import UnitIcon from "../Units/Icons";

type UnitSelection = Partial<Record<UnitType, number>>;

export default function ProduceUnitsSection({
  factionId,
}: {
  factionId: FactionId;
}) {
  const viewOnly = useViewOnly();
  const { openModal, popModal } = use(ModalContext);

  return (
    <Card label="Production">
      <button
        type="button"
        onClick={() =>
          openModal(
            <ModalContent title="Produce Units">
              <ProduceUnitsCalculator
                closeFn={popModal}
                factionId={factionId}
                viewOnly={viewOnly}
              />
            </ModalContent>,
          )
        }
        disabled={viewOnly}
        style={{
          alignSelf: "flex-start",
          backgroundColor: "var(--interactive-bg)",
          border: "2px solid var(--neutral-border)",
          borderRadius: rem(6),
          fontFamily: "var(--main-font)",
          padding: `${rem(6)} ${rem(12)}`,
        }}
      >
        Produce Units
      </button>
    </Card>
  );
}

function ProduceUnitsCalculator({
  closeFn,
  factionId,
  viewOnly,
}: {
  closeFn: () => void;
  factionId: FactionId;
  viewOnly: boolean;
}) {
  const attachments = useAttachments();
  const dataUpdate = useDataUpdate();
  const faction = useFaction(factionId);
  const intl = useIntl();
  const planets = usePlanets();
  const techs = useTechs();
  const upgrades = useUpgrades();
  const [selectedPlanets, setSelectedPlanets] = useState<PlanetId[]>([]);
  const [selectedUnits, setSelectedUnits] = useState<UnitSelection>({});

  const availablePlanets = useMemo(() => {
    return applyAllPlanetAttachments(
      filterToClaimedPlanets(planets, factionId).filter((planet) => {
        return (
          planet.state !== "EXHAUSTED" &&
          planet.state !== "PURGED" &&
          !planet.attributes.includes("ocean") &&
          !planet.attributes.includes("synthetic")
        );
      }),
      attachments,
    ).sort((a, b) => a.name.localeCompare(b.name));
  }, [attachments, factionId, planets]);

  const unitCards = useMemo(() => {
    if (!faction) {
      return [];
    }
    return getCurrentUnitCards(faction, techs, upgrades, intl).filter(
      isProducibleUnit,
    );
  }, [faction, intl, techs, upgrades]);

  const selectedPlanetSet = new Set(selectedPlanets);
  const selectedPlanetRows = availablePlanets.filter((planet) =>
    selectedPlanetSet.has(planet.id),
  );
  const selectedResources = selectedPlanetRows
    .reduce((total, planet) => total + planet.resources, 0);
  const selectedUnitRows = unitCards
    .map((unit) => ({
      unit,
      quantity: selectedUnits[unit.type] ?? 0,
      cost: getUnitProductionCost(unit, selectedUnits[unit.type] ?? 0),
    }))
    .filter(({ quantity }) => quantity > 0);
  const rawTotalCost = selectedUnitRows.reduce(
    (total, row) => total + row.cost,
    0,
  );
  const sarweenDiscount =
    rawTotalCost > 0 && hasTech(faction, techs["Sarween Tools"]) ? 1 : 0;
  const totalCost = Math.max(0, rawTotalCost - sarweenDiscount);
  const canCommit =
    !viewOnly &&
    selectedPlanets.length > 0 &&
    selectedUnitRows.length > 0 &&
    selectedResources >= totalCost;
  const overpay = totalCost > 0 ? selectedResources - totalCost : 0;

  async function commitProductionSpend() {
    if (!canCommit) {
      return;
    }

    for (const planetId of selectedPlanets) {
      await dataUpdate(Events.UpdatePlanetStateEvent(planetId, "EXHAUSTED"));
    }
    setSelectedPlanets([]);
    setSelectedUnits({});
    closeFn();
  }

  function setUnitQuantity(unitType: UnitType, quantity: number) {
    setSelectedUnits((current) => ({
      ...current,
      [unitType]: Math.max(0, quantity),
    }));
  }

  return (
    <div
      className="flexColumn"
      style={{
        alignItems: "stretch",
        boxSizing: "border-box",
        gap: rem(7),
        maxHeight: "75vh",
        overflowY: "auto",
        padding: rem(8),
        width: "min(90vw, 60rem)",
      }}
    >
      <div
        style={{
          color: "var(--muted-text-color)",
          fontSize: rem(12),
          lineHeight: 1.2,
          textWrap: "balance",
        }}
      >
        Select planets to spend and units to produce. Committing exhausts the
        selected planets.
      </div>
      <SummaryBar
        overpay={overpay}
        sarweenDiscount={sarweenDiscount}
        selectedPlanets={selectedPlanetRows}
        selectedResources={selectedResources}
        totalCost={totalCost}
      />
      <SectionLabel>Planets</SectionLabel>
      <div
        style={{
          alignItems: "flex-start",
          display: "flex",
          flexWrap: "wrap",
          gap: rem(7),
          justifyContent: "center",
          padding: `${rem(2)} 0`,
        }}
      >
        {availablePlanets.map((planet) => {
          const selected = selectedPlanetSet.has(planet.id);
          return (
            <div
              key={planet.id}
              role="button"
              tabIndex={viewOnly ? undefined : 0}
              aria-pressed={selected}
              onClick={() => {
                if (viewOnly) {
                  return;
                }
                setSelectedPlanets((current) => {
                  if (current.includes(planet.id)) {
                    return current.filter((id) => id !== planet.id);
                  }
                  return [...current, planet.id];
                });
              }}
              onKeyDown={(event) => {
                if (viewOnly || (event.key !== "Enter" && event.key !== " ")) {
                  return;
                }
                event.preventDefault();
                setSelectedPlanets((current) => {
                  if (current.includes(planet.id)) {
                    return current.filter((id) => id !== planet.id);
                  }
                  return [...current, planet.id];
                });
              }}
              style={{
                alignItems: "center",
                backgroundColor: selected ? "var(--hovered-bg)" : "transparent",
                border: `2px solid ${
                  selected ? "var(--green-tech-color)" : "var(--neutral-border)"
                }`,
                borderRadius: rem(8),
                boxShadow: selected
                  ? `0 0 ${rem(10)} var(--green-tech-color)`
                  : "0 0 0 1px var(--hidden-border)",
                cursor: viewOnly ? undefined : "pointer",
                display: "flex",
                flexDirection: "column",
                gap: rem(1),
                justifyContent: "center",
                minHeight: rem(92),
                padding: `${rem(3)} ${rem(5)} ${rem(3)}`,
                transform: selected ? `translateY(${rem(-1)})` : undefined,
              }}
            >
              <PlanetDiv canToggleState={false} planet={planet} />
              <span
                style={{
                  color: selected
                    ? "var(--green-tech-color)"
                    : "var(--muted-text-color)",
                  fontFamily: "var(--main-font)",
                  fontSize: rem(10),
                  lineHeight: 1,
                }}
              >
                {selected ? "Selected" : "Tap to spend"}
              </span>
            </div>
          );
        })}
      </div>
      <SectionLabel>Units</SectionLabel>
      <div
        style={{
          display: "grid",
          gap: rem(6),
          gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${rem(
            296,
          )}), 1fr))`,
        }}
      >
        {unitCards.map((unit) => {
          const quantity = selectedUnits[unit.type] ?? 0;
          const cost = getUnitProductionCost(unit, quantity);
          const selected = quantity > 0;
          return (
            <div
              key={`${unit.type}-${unit.id}`}
              style={{
                alignItems: "center",
                backgroundColor: selected
                  ? "var(--hovered-bg)"
                  : "var(--background-color)",
                border: `2px solid ${
                  selected ? "var(--green-tech-color)" : "var(--neutral-border)"
                }`,
                borderRadius: rem(7),
                boxShadow: selected
                  ? `0 0 ${rem(5)} var(--green-tech-color)`
                  : "0 0 0 1px var(--hidden-border)",
                display: "grid",
                gap: rem(6),
                gridTemplateColumns: `${rem(66)} minmax(0, 1fr) auto`,
                minHeight: rem(58),
                padding: rem(7),
              }}
            >
              <div
                style={{
                  alignItems: "center",
                  display: "flex",
                  height: rem(34),
                  justifyContent: "center",
                  overflow: "hidden",
                  width: rem(66),
                }}
              >
                <UnitIcon type={unit.type} size={30} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: "var(--main-font)",
                    fontSize: rem(14),
                    lineHeight: 1.05,
                    overflowWrap: "anywhere",
                  }}
                >
                  {unit.name}
                </div>
                <div
                  style={{
                    color: selected
                      ? "var(--green-tech-color)"
                      : "var(--muted-text-color)",
                    fontSize: rem(10),
                  }}
                >
                  Cost {formatCost(unit.stats.cost)}
                  {selected ? ` · Selected cost ${cost}` : ""}
                </div>
              </div>
              <div
                className="flexRow"
                style={{
                  gap: rem(4),
                  justifyContent: "flex-end",
                  minWidth: rem(84),
                }}
              >
                <button
                  type="button"
                  onClick={() => setUnitQuantity(unit.type, quantity - 1)}
                  disabled={viewOnly || quantity <= 0}
                  style={{
                    fontFamily: "var(--main-font)",
                    fontSize: rem(16),
                    minWidth: rem(26),
                    minHeight: rem(26),
                    padding: 0,
                  }}
                >
                  -
                </button>
                <span
                  style={{
                    fontFamily: "var(--main-font)",
                    fontSize: rem(17),
                    minWidth: rem(18),
                    textAlign: "center",
                  }}
                >
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setUnitQuantity(unit.type, quantity + 1)}
                  disabled={viewOnly}
                  style={{
                    fontFamily: "var(--main-font)",
                    fontSize: rem(16),
                    minWidth: rem(26),
                    minHeight: rem(26),
                    padding: 0,
                  }}
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <div
        className="flexRow"
        style={{
          gap: rem(8),
          justifyContent: "center",
          paddingTop: rem(4),
          width: "100%",
        }}
      >
        <button
          type="button"
          onClick={() => {
            setSelectedPlanets([]);
            setSelectedUnits({});
          }}
          disabled={viewOnly}
        >
          Clear
        </button>
        <button
          type="button"
          onClick={commitProductionSpend}
          disabled={!canCommit}
          style={{
            backgroundColor: canCommit
              ? "var(--interactive-bg)"
              : "var(--background-color)",
            border: "2px solid var(--neutral-border)",
          }}
        >
          Commit Spend
        </button>
      </div>
    </div>
  );
}

function SummaryBar({
  overpay,
  sarweenDiscount,
  selectedPlanets,
  selectedResources,
  totalCost,
}: {
  overpay: number;
  sarweenDiscount: number;
  selectedPlanets: Planet[];
  selectedResources: number;
  totalCost: number;
}) {
  const shortfall = Math.max(0, totalCost - selectedResources);
  return (
    <div
      style={{
        alignItems: "center",
        backgroundColor: "var(--background-color)",
        border: "2px solid var(--neutral-border)",
        borderRadius: rem(8),
        boxShadow: "0 0 0 1px var(--hidden-border)",
        display: "grid",
        gap: rem(6),
        gridTemplateColumns: "repeat(auto-fit, minmax(7rem, 1fr))",
        padding: `${rem(6)} ${rem(8)}`,
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <SummaryMetric label="Resources" value={selectedResources} />
      <SummaryMetric
        label={sarweenDiscount > 0 ? "Cost after Sarween" : "Cost"}
        value={totalCost}
      />
      <div
        style={{
          alignItems: "center",
          display: "flex",
          flexDirection: "column",
          gap: rem(2),
          justifyContent: "center",
          minHeight: rem(34),
        }}
      >
        <span
          style={{
            color:
              shortfall > 0
                ? "var(--red-tech-color)"
                : overpay > 0
                  ? "var(--yellow-tech-color)"
                  : totalCost > 0
                    ? "var(--green-tech-color)"
                    : "var(--muted-text-color)",
            fontFamily: "var(--main-font)",
            fontSize: rem(13),
            lineHeight: 1,
          }}
        >
          {shortfall > 0
            ? `Need ${shortfall} more`
            : overpay > 0
              ? `Overspending by ${overpay}`
              : totalCost > 0
                ? "Exact spend"
                : "Select units"}
        </span>
        <span
          style={{
            color: "var(--muted-text-color)",
            fontSize: rem(10),
            lineHeight: 1.1,
            textAlign: "center",
          }}
        >
          {selectedPlanets.length === 0
            ? "No planets selected"
            : [
                selectedPlanets.map((planet) => planet.name).join(", "),
                sarweenDiscount > 0 ? "Sarween Tools -1" : undefined,
              ]
                .filter(Boolean)
                .join(" · ")}
        </span>
      </div>
    </div>
  );
}

function SummaryMetric({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        alignItems: "center",
        display: "flex",
        flexDirection: "column",
        gap: rem(2),
        justifyContent: "center",
        minHeight: rem(34),
      }}
    >
      <span
        style={{
          color: "var(--muted-text-color)",
          fontFamily: "var(--main-font)",
          fontSize: rem(10),
          lineHeight: 1,
        }}
      >
        {label}
      </span>
      <strong
        style={{
          fontFamily: "var(--main-font)",
          fontSize: rem(21),
          lineHeight: 1,
        }}
      >
        {value}
      </strong>
    </div>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <div
      style={{
        borderBottom: "1px solid var(--neutral-border)",
        color: "var(--muted-text-color)",
        fontFamily: "var(--main-font)",
        fontSize: rem(15),
        lineHeight: 1,
        paddingBottom: rem(2),
      }}
    >
      {children}
    </div>
  );
}

function isProducibleUnit(unit: UnitCard) {
  return unit.stats.cost !== undefined;
}

function getUnitProductionCost(unit: UnitCard, quantity: number) {
  const cost = parseUnitCost(unit.stats.cost);
  if (!cost || quantity <= 0) {
    return 0;
  }
  return Math.ceil(quantity / cost.batchSize) * cost.resources;
}

function parseUnitCost(cost: UnitStats["cost"]) {
  if (typeof cost === "number") {
    return { batchSize: 1, resources: cost };
  }

  const match = cost?.match(/^(\d+)\(x(\d+)\)$/);
  if (!match) {
    return undefined;
  }

  return {
    batchSize: Number(match[2]),
    resources: Number(match[1]),
  };
}

function formatCost(cost: UnitStats["cost"]) {
  if (cost === undefined) {
    return "-";
  }
  return cost.toString().replace("(x", " for ");
}
