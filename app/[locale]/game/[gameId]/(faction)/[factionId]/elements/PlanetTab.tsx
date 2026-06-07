import { use } from "react";
import { FormattedMessage } from "react-intl";
import { AddPlanetList } from "../../../../../../../src/AddPlanetList";
import Chip from "../../../../../../../src/components/Chip/Chip";
import ChipGroup from "../../../../../../../src/components/Chip/ChipGroup";
import { ModalContent } from "../../../../../../../src/components/Modal/Modal";
import PlanetDiv from "../../../../../../../src/components/PlanetRow/PlanetDiv";
import PlanetRow from "../../../../../../../src/components/PlanetRow/PlanetRow";
import ResourcesIcon from "../../../../../../../src/components/ResourcesIcon/ResourcesIcon";
import {
  ModalContext,
  SettingsContext,
} from "../../../../../../../src/context/contexts";
import {
  useAttachments,
  useLeader,
  useOptions,
  usePlanets,
  useViewOnly,
} from "../../../../../../../src/context/dataHooks";
import { useDataUpdate } from "../../../../../../../src/util/api/dataUpdate";
import { Events } from "../../../../../../../src/util/api/events";
import { computePlanetSummaryValues } from "../../../../../../../src/util/planetSummary";
import {
  applyAllPlanetAttachments,
  filterToClaimedPlanets,
} from "../../../../../../../src/util/planets";
import { rem } from "../../../../../../../src/util/util";

export default function PlanetTab({ factionId }: { factionId: FactionId }) {
  const attachments = useAttachments();
  const dataUpdate = useDataUpdate();
  const options = useOptions();
  const planets = usePlanets();
  const viewOnly = useViewOnly();
  const xxekirGrom = useLeader("Xxekir Grom");
  const { openModal } = use(ModalContext);
  const { settings, updateSetting } = use(SettingsContext);
  const planetView = settings["faction-planet-view"];

  const claimedPlanets = filterToClaimedPlanets(planets, factionId);
  const updatedPlanets = applyAllPlanetAttachments(claimedPlanets, attachments);
  const hasXxchaHeroResources =
    factionId === "Xxcha Kingdom" &&
    xxekirGrom?.state === "readied" &&
    options.expansions.includes("CODEX THREE") &&
    !options.expansions.includes("THUNDERS EDGE");
  const { resources, influence } = computePlanetSummaryValues(
    updatedPlanets,
    hasXxchaHeroResources,
  );
  const numReadiedPlanets = updatedPlanets.filter((planet) => {
    return (
      planet.state !== "EXHAUSTED" &&
      planet.state !== "PURGED" &&
      !planet.attributes.includes("space-station") &&
      !planet.attributes.includes("ocean") &&
      !planet.attributes.includes("synthetic")
    );
  }).length;

  return (
    <>
      <div
        style={{
          alignItems: "center",
          display: "grid",
          gap: rem(8),
          gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)",
          minHeight: rem(40),
          width: "100%",
        }}
      >
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
                      dataUpdate(Events.ClaimPlanetEvent(factionId, planetId))
                    }
                  />
                </ModalContent>,
              )
            }
            disabled={viewOnly}
          >
            <FormattedMessage
              id="PrGqwQ"
              description="Label for adding a planet."
              defaultMessage="Add Planet"
            />
          </button>
        </div>
        <div
          title="Readied planets, resources, and influence"
          style={{ justifySelf: "center" }}
        >
          <RemainingPlanetCounter
            planets={numReadiedPlanets}
            resources={resources}
            influence={influence}
            height={52}
          />
        </div>
        <div style={{ justifySelf: "end" }}>
          <ChipGroup>
            <Chip
              selected={planetView === "CLASSIC"}
              toggleFn={() => updateSetting("faction-planet-view", "CLASSIC")}
              fontSize={12}
            >
              Rows
            </Chip>
            <Chip
              selected={planetView === "GRID"}
              toggleFn={() => updateSetting("faction-planet-view", "GRID")}
              fontSize={12}
            >
              Grid
            </Chip>
          </ChipGroup>
        </div>
      </div>
      {planetView === "GRID" ? (
        <div
          style={{
            alignItems: "flex-start",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "row",
            flexWrap: "wrap",
            gap: rem(8),
            justifyContent: "center",
            padding: `${rem(8)} ${rem(4)} ${rem(16)}`,
            width: "100%",
          }}
        >
          {updatedPlanets.map((planet) => {
            return <PlanetDiv key={planet.id} planet={planet} />;
          })}
        </div>
      ) : (
        <div
          className="largeFont"
          style={{
            boxSizing: "border-box",
            paddingBottom: rem(4),
          }}
        >
          {updatedPlanets.map((planet) => {
            return (
              <PlanetRow
                key={planet.id}
                factionId={factionId}
                planet={planet}
                removePlanet={(planetId) =>
                  dataUpdate(Events.UnclaimPlanetEvent(factionId, planetId))
                }
              />
            );
          })}
        </div>
      )}
    </>
  );
}

function RemainingPlanetCounter({
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
