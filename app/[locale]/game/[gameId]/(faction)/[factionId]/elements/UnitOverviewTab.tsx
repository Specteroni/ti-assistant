import { useIntl } from "react-intl";
import FormattedDescription from "../../../../../../../src/components/FormattedDescription/FormattedDescription";
import UnitStats from "../../../../../../../src/components/UnitStats/UnitStats";
import UnitIcon from "../../../../../../../src/components/Units/Icons";
import {
  useTechs,
  useUpgrades,
} from "../../../../../../../src/context/dataHooks";
import { useFaction } from "../../../../../../../src/context/factionDataHooks";
import {
  getCurrentUnitCards,
  UnitCard,
} from "../../../../../../../src/util/unitCards";
import { rem } from "../../../../../../../src/util/util";

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
