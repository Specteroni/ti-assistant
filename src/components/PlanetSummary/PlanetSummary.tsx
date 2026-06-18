import { CSSProperties, ReactNode } from "react";
import { useOptions, useViewOnly } from "../../context/dataHooks";
import { useOceans } from "../../context/planetDataHooks";
import { useDataUpdate } from "../../util/api/dataUpdate";
import { Events } from "../../util/api/events";
import { computePlanetSummaryValues } from "../../util/planetSummary";
import { getRadialPosition } from "../../util/util";
import PlanetIcon from "../PlanetIcon/PlanetIcon";
import LegendaryPlanetIcon from "../PlanetIcons/LegendaryPlanetIcon";
import ResourcesIcon from "../ResourcesIcon/ResourcesIcon";
import TechSkipIcon from "../TechSkipIcon/TechSkipIcon";
import styles from "./PlanetSummary.module.scss";

interface PlanetSummaryProps {
  factionId: FactionId;
  planets: Planet[];
  hasXxchaHero: boolean;
  countExhaustedValues?: boolean;
  countExhaustedPlanets?: boolean;
  resourceLabel?: ReactNode;
}

// TODO: Figure out how to display oceans.
export default function PlanetSummary({
  factionId,
  planets,
  hasXxchaHero,
  countExhaustedValues = false,
  countExhaustedPlanets = true,
  resourceLabel,
}: PlanetSummaryProps) {
  const dataUpdate = useDataUpdate();
  const oceans = useOceans();
  const options = useOptions();
  const viewOnly = useViewOnly();

  const hasXxchaHeroResources =
    hasXxchaHero &&
      options.expansions.includes("CODEX THREE") &&
    !options.expansions.includes("THUNDERS EDGE");

  const {
    numPlanets,
    resources,
    influence,
    cultural,
    hazardous,
    industrial,
    legendary,
    techSkips,
    attachments,
  } = computePlanetSummaryValues(
    planets,
    hasXxchaHeroResources,
    countExhaustedValues,
    countExhaustedPlanets,
  );

  const resourceSection = (
    <div className={styles.ResourceSection}>
      <div className={styles.PlanetTotal}>
        {factionId === "Deepwrought Scholarate"
          ? oceans.map((ocean, index) => {
              const position: CSSProperties = getRadialPosition(
                index,
                /* numOptions= */ 9,
                /* offset= */ -0.3,
                /* circleSize= */ 26,
                /* size= */ 4,
              );
              return (
                <div
                  key={ocean.id}
                  title={ocean.name}
                  className={`${styles.OceanElement} ${
                    viewOnly ? styles.viewOnly : ""
                  }`}
                  style={{
                    border: `1px solid ${ocean.owner ? "var(--foreground-color)" : "#444"}`,
                    backgroundColor: ocean.owner
                      ? "var(--foreground-color)"
                      : "var(--background-color)",
                    ...position,
                  }}
                  onClick={
                    viewOnly
                      ? undefined
                      : () => {
                          if (ocean.owner) {
                            dataUpdate(
                              Events.UnclaimPlanetEvent(factionId, ocean.id),
                            );
                          } else {
                            dataUpdate(
                              Events.ClaimPlanetEvent(factionId, ocean.id),
                            );
                          }
                        }
                  }
                ></div>
              );
            })
          : null}
        {numPlanets}
      </div>
      <ResourcesIcon resources={resources} influence={influence} height={50} />
    </div>
  );

  return (
    <div className={styles.PlanetSummary}>
      {resourceLabel ? (
        <div className={styles.ResourceLabelWrapper}>
          <div className={styles.ResourceLabel}>{resourceLabel}</div>
          {resourceSection}
        </div>
      ) : (
        resourceSection
      )}
      <div className={styles.CountSection}>
        <div className={styles.PlanetTypeGrid}>
          <div className={styles.centered}>{cultural || "-"}</div>
          <PlanetIcon types={["CULTURAL"]} size={16} />
          <div className={styles.centered}>{hazardous || "-"}</div>
          <PlanetIcon types={["HAZARDOUS"]} size={16} />
          <div className={styles.centered}>{industrial || "-"}</div>
          <PlanetIcon types={["INDUSTRIAL"]} size={16} />
        </div>
        <div className={styles.PlanetTypeGrid}>
          <LegendaryPlanetIcon />
          <div className={styles.centered}>{legendary || "-"}</div>
          <TechSkipIcon size={16} />
          <div className={styles.centered}>{techSkips || "-"}</div>
          <div className={styles.Attachments}>
            <div className={styles.symbol}>⎗</div>
          </div>
          <div className={styles.centered}>{attachments || "-"}</div>
        </div>
      </div>
    </div>
  );
}
