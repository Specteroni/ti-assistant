import { IntlShape } from "react-intl";
import { hasTech } from "./api/techs";
import { getCombatValues } from "./techs";
import {
  antiFighterBarrage,
  bombardment,
  planetaryShield,
  production,
  spaceCannon,
  sustainDamage,
  unitTypeString,
} from "./strings";

export interface UnitCard {
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

export function getBaseUnitCards(intl: IntlShape): UnitCard[] {
  return [
    {
      id: "Carrier",
      name: unitTypeString("Carrier", intl),
      stats: { capacity: 4, combat: 9, cost: 3, move: 1 },
      type: "Carrier",
    },
    {
      id: "Cruiser",
      name: unitTypeString("Cruiser", intl),
      stats: { combat: 7, cost: 2, move: 2 },
      type: "Cruiser",
    },
    {
      abilities: [antiFighterBarrage("9(x2)", intl)],
      id: "Destroyer",
      name: unitTypeString("Destroyer", intl),
      stats: { combat: 9, cost: 1, move: 2 },
      type: "Destroyer",
    },
    {
      abilities: [sustainDamage(intl), bombardment("5", intl)],
      id: "Dreadnought",
      name: unitTypeString("Dreadnought", intl),
      stats: { capacity: 1, combat: 5, cost: 4, move: 1 },
      type: "Dreadnought",
    },
    {
      id: "Fighter",
      name: unitTypeString("Fighter", intl),
      stats: { combat: 9, cost: "1(x2)" },
      type: "Fighter",
    },
    {
      id: "Infantry",
      name: unitTypeString("Infantry", intl),
      stats: { combat: 8, cost: "1(x2)" },
      type: "Infantry",
    },
    {
      abilities: [spaceCannon("6", intl), planetaryShield(intl)],
      id: "PDS",
      name: unitTypeString("PDS", intl),
      stats: {},
      type: "PDS",
    },
    {
      abilities: [production("X", intl)],
      description: intl.formatMessage(
        {
          id: "Units.Space Dock.Description",
          defaultMessage:
            "This unit's PRODUCTION value is equal to 2 more than the resource value of this planet.{br}Up to 3 fighters in this system do not count against your ships' capacity.",
          description: "Description for the base Space Dock unit.",
        },
        { br: "\n\n" },
      ),
      id: "Space Dock",
      name: unitTypeString("Space Dock", intl),
      stats: {},
      type: "Space Dock",
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

export function getCurrentUnitCards(
  faction: Faction,
  techs: Partial<Record<TechId, Tech>>,
  upgrades: Partial<Record<TFUnitUpgradeId, TFUnitUpgrade>>,
  intl: IntlShape,
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
