import { useIntl } from "react-intl";
import FormattedDescription from "../../../../../../../src/components/FormattedDescription/FormattedDescription";
import UnitStats from "../../../../../../../src/components/UnitStats/UnitStats";
import UnitIcon from "../../../../../../../src/components/Units/Icons";
import {
  useTechs,
  useUpgrades,
} from "../../../../../../../src/context/dataHooks";
import { useFaction } from "../../../../../../../src/context/factionDataHooks";
import { hasTech } from "../../../../../../../src/util/api/techs";
import { getCombatValues } from "../../../../../../../src/util/techs";
import {
  antiFighterBarrage,
  bombardment,
  sustainDamage,
} from "../../../../../../../src/util/strings";
import { rem } from "../../../../../../../src/util/util";

interface UnitCard {
  abilities?: string[];
  description?: string;
  id: string;
  name: string;
  stats: UnitStats;
  type: UnitType;
  upgraded?: boolean;
}

const UNIT_ORDER: Record<UnitType, number> = {
  Flagship: 1,
  "War Sun": 2,
  Dreadnought: 3,
  Carrier: 4,
  Cruiser: 5,
  Destroyer: 6,
  Fighter: 7,
  Infantry: 8,
  Mech: 9,
  PDS: 10,
  "Space Dock": 11,
};

const UPGRADE_ONLY_UNIT_TYPES = new Set<UnitType>([
  "PDS",
  "Space Dock",
  "War Sun",
]);

function getBaseUnitCards(intl: ReturnType<typeof useIntl>): UnitCard[] {
  return [
    {
      id: "Carrier",
      name: "Carrier",
      stats: { capacity: 4, combat: 9, cost: 3, move: 1 },
      type: "Carrier",
    },
    {
      id: "Cruiser",
      name: "Cruiser",
      stats: { combat: 7, cost: 2, move: 2 },
      type: "Cruiser",
    },
    {
      abilities: [antiFighterBarrage("9(x2)", intl)],
      id: "Destroyer",
      name: "Destroyer",
      stats: { combat: 9, cost: 1, move: 2 },
      type: "Destroyer",
    },
    {
      abilities: [sustainDamage(intl), bombardment("5", intl)],
      id: "Dreadnought",
      name: "Dreadnought",
      stats: { capacity: 1, combat: 5, cost: 4, move: 1 },
      type: "Dreadnought",
    },
    {
      id: "Fighter",
      name: "Fighter",
      stats: { combat: 9, cost: "1(x2)" },
      type: "Fighter",
    },
    {
      id: "Infantry",
      name: "Infantry",
      stats: { combat: 8, cost: "1(x2)" },
      type: "Infantry",
    },
  ];
}

function getUnitCardFromTech(tech: Tech & { type: "UPGRADE" }): UnitCard {
  return {
    abilities: tech.abilities,
    description: tech.description,
    id: tech.id,
    name: tech.name,
    stats: tech.stats,
    type: tech.unitType,
    upgraded: true,
  };
}

function getUnitCardFromFactionUnit(unit: Unit): UnitCard {
  return {
    abilities: unit.abilities,
    description: unit.description,
    id: unit.name,
    name: unit.name,
    stats: unit.stats,
    type: unit.type,
    upgraded: false,
  };
}

function getAdjustedFactionUnit(
  unit: Unit,
  factionId: FactionId,
  upgrades: Partial<Record<TFUnitUpgradeId, TFUnitUpgrade>>,
) {
  const adjustedUnit = structuredClone(unit);
  if (
    unit.type === "Flagship" &&
    upgrades["Echo of Ascension"]?.owner === factionId
  ) {
    adjustedUnit.stats.capacity = (unit.stats.capacity ?? 0) + 2;
    adjustedUnit.stats.move = (unit.stats.move ?? 0) + 1;
    const { combat, num } = getCombatValues(unit.stats.combat);
    adjustedUnit.stats.combat = `${combat - 1}(x${num + 1})`;
  }
  if (unit.type === "Mech") {
    if (upgrades["Eidolon Landwaster"]?.owner === factionId) {
      const { combat, num } = getCombatValues(unit.stats.combat);
      adjustedUnit.stats.combat = `${combat}(x${num + 1})`;
    } else if (upgrades["Eidolon Terminus"]?.owner === factionId) {
      const { combat, num } = getCombatValues(unit.stats.combat);
      adjustedUnit.stats.combat =
        num > 0 ? `${combat - 1}(x${num})` : combat - 1;
    } else if (upgrades["Valefar Prime"]?.owner === factionId) {
      adjustedUnit.stats.cost = 1;
    }
  }
  return adjustedUnit;
}

function getCurrentUnitCards(
  faction: Faction,
  techs: Partial<Record<TechId, Tech>>,
  upgrades: Partial<Record<TFUnitUpgradeId, TFUnitUpgrade>>,
  intl: ReturnType<typeof useIntl>,
) {
  const cardsByType: Partial<Record<UnitType, UnitCard>> = {};

  for (const unit of getBaseUnitCards(intl)) {
    cardsByType[unit.type] = unit;
  }

  for (const unit of faction.units) {
    const adjustedUnit = getAdjustedFactionUnit(unit, faction.id, upgrades);
    const upgradeTech = unit.upgrade ? techs[unit.upgrade] : undefined;
    if (upgradeTech?.type === "UPGRADE" && hasTech(faction, upgradeTech)) {
      cardsByType[unit.type] = getUnitCardFromTech(upgradeTech);
      continue;
    }
    if (UPGRADE_ONLY_UNIT_TYPES.has(unit.type)) {
      continue;
    }
    cardsByType[unit.type] = getUnitCardFromFactionUnit(adjustedUnit);
  }

  for (const techId of Object.keys(faction.techs) as TechId[]) {
    const tech = techs[techId];
    if (!tech || tech.type !== "UPGRADE" || !hasTech(faction, tech)) {
      continue;
    }
    cardsByType[tech.unitType] = getUnitCardFromTech(tech);
  }

  return Object.values(cardsByType).sort((a, b) => {
    const orderDiff = UNIT_ORDER[a.type] - UNIT_ORDER[b.type];
    if (orderDiff !== 0) {
      return orderDiff;
    }
    return a.name > b.name ? 1 : -1;
  });
}

export default function UnitOverviewTab({ factionId }: { factionId: FactionId }) {
  const faction = useFaction(factionId);
  const intl = useIntl();
  const techs = useTechs();
  const upgrades = useUpgrades();

  if (!faction) {
    return null;
  }

  const unitCards = getCurrentUnitCards(faction, techs, upgrades, intl);

  return (
    <div
      style={{
        display: "grid",
        gap: rem(8),
        gridTemplateColumns: `repeat(auto-fit, minmax(${rem(190)}, 1fr))`,
        padding: rem(6),
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {unitCards.map((unit) => (
        <UnitTile key={`${unit.type}-${unit.id}`} unit={unit} />
      ))}
    </div>
  );
}

function UnitTile({ unit }: { unit: UnitCard }) {
  return (
    <div
      style={{
        border: "1px solid var(--neutral-border)",
        borderRadius: rem(6),
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: rem(8),
        minHeight: rem(160),
        padding: rem(10),
        position: "relative",
      }}
    >
      <div
        className="flexRow"
        style={{
          alignItems: "center",
          gap: rem(8),
          justifyContent: "space-between",
          minWidth: 0,
        }}
      >
        <div
          style={{
            fontFamily: "var(--main-font)",
            fontSize: rem(18),
            lineHeight: 1.1,
            minWidth: 0,
            overflowWrap: "anywhere",
          }}
        >
          {unit.name}
        </div>
        <UnitIcon type={unit.type} size={28} />
      </div>
      <div
        style={{
          fontSize: rem(54),
          transformOrigin: "left top",
        }}
      >
        <UnitStats stats={unit.stats} type={unit.type} />
      </div>
      {unit.abilities?.length ? (
        <div
          style={{
            display: "grid",
            gap: rem(2),
            gridTemplateColumns: "repeat(auto-fit, minmax(5.5rem, 1fr))",
            fontFamily: "var(--main-font)",
            fontSize: rem(13),
            lineHeight: 1.05,
          }}
        >
          {unit.abilities.map((ability) => (
            <div key={ability}>{ability}</div>
          ))}
        </div>
      ) : null}
      {unit.description ? (
        <div
          style={{
            fontSize: rem(13),
            lineHeight: 1.15,
            whiteSpace: "pre-line",
          }}
        >
          <FormattedDescription description={unit.description} />
        </div>
      ) : null}
    </div>
  );
}
