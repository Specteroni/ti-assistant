import CommoditySVG from "../../icons/ui/Commodity";
import { rem } from "../../util/util";
import { PlanetIconWrapper } from "./Wrapper";

export default function CommodityValueIcon() {
  return (
    <div title="Increases commodity value">
      <PlanetIconWrapper color="#cbd5e1">
        <div
          className="flexRow"
          style={{
            position: "relative",
            width: rem(12),
            height: rem(12),
          }}
        >
          <CommoditySVG />
          <span
            style={{
              position: "absolute",
              right: rem(-3),
              bottom: rem(-5),
              color: "var(--foreground-color)",
              fontFamily: "var(--main-font)",
              fontSize: rem(11),
              lineHeight: 1,
              textShadow: "0 0 2px var(--background-color)",
            }}
          >
            +
          </span>
        </div>
      </PlanetIconWrapper>
    </div>
  );
}
