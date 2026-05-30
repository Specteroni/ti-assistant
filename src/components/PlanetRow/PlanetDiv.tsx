import { CSSProperties, KeyboardEvent, MouseEvent, use } from "react";
import { ModalContext } from "../../context/contexts";
import {
  useAttachments,
  useOptions,
  useViewOnly,
} from "../../context/dataHooks";
import { SymbolX } from "../../icons/svgs";
import FlipSVG from "../../icons/ui/Flip";
import { useDataUpdate } from "../../util/api/dataUpdate";
import { Events } from "../../util/api/events";
import { getPlanetTypeColor } from "../../util/planets";
import { Optional } from "../../util/types/types";
import { getRadialPosition, rem } from "../../util/util";
import FactionComponents from "../FactionComponents/FactionComponents";
import PlanetIcon from "../PlanetIcon/PlanetIcon";
import ResourcesIcon from "../ResourcesIcon/ResourcesIcon";
import UnitIcon from "../Units/Icons";
import styles from "./PlanetDiv.module.scss";
import {
  AttachMenu,
  canTogglePlanetExhaustion,
  getAttributeIcon,
  usePlanetExhaustion,
} from "./PlanetRow";

interface PlanetDivProperties extends CSSProperties {
  "--color": string;
  "--border-color": string;
}

function TypeOrFactionIcon({ planet }: { planet: Planet }) {
  if (planet.types.length > 0) {
    return <PlanetIcon types={planet.types} size={18} />;
  }

  if (planet.faction) {
    return <FactionComponents.Icon size={18} factionId={planet.faction} />;
  }

  return null;
}

export default function PlanetDiv({ planet }: { planet: Planet }) {
  const viewOnly = useViewOnly();
  const planetExhaustion = usePlanetExhaustion(planet);
  const canToggleExhaustion = !viewOnly && canTogglePlanetExhaustion(planet);

  let indexStart = 4;

  let leftAttribute = planet.attributes.reduce(
    (attribute: Optional<PlanetAttribute>, curr) => {
      if (curr === "legendary") {
        return curr;
      }
      if (curr === "demilitarized" && attribute !== "legendary") {
        return curr;
      }
      if (curr === "tomb" && !attribute) {
        return curr;
      }
      return attribute;
    },
    undefined,
  );

  const leftColor = getPlanetTypeColor(planet.types[0]);
  const rightColor = planet.types[1]
    ? getPlanetTypeColor(planet.types[1])
    : leftColor;
  const thirdColor = planet.types[2]
    ? getPlanetTypeColor(planet.types[2])
    : rightColor;

  const borderColor = `${leftColor} ${rightColor} ${leftColor} ${thirdColor}`;
  const properties: PlanetDivProperties = {
    "--color": rightColor,
    "--border-color": borderColor,
  };

  function togglePlanetExhaustion() {
    if (!canToggleExhaustion) {
      return;
    }
    planetExhaustion.toggle();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }
    event.preventDefault();
    togglePlanetExhaustion();
  }

  return (
    <div
      className={`${styles.PlanetDivWrapper} hiddenButtonParent ${
        planetExhaustion.exhausted ? styles.ExhaustedWrapper : ""
      }`}
      style={properties}
    >
      <div
        className={`${styles.PlanetDiv} ${
          canToggleExhaustion ? styles.ExhaustablePlanet : ""
        } ${planetExhaustion.exhausted ? styles.ExhaustedPlanet : ""}`}
        onClick={togglePlanetExhaustion}
        onKeyDown={handleKeyDown}
        role={canToggleExhaustion ? "button" : undefined}
        tabIndex={canToggleExhaustion ? 0 : undefined}
        aria-pressed={
          canToggleExhaustion ? planetExhaustion.exhausted : undefined
        }
        aria-label={
          canToggleExhaustion
            ? planetExhaustion.exhausted
              ? `Ready ${planet.name}`
              : `Exhaust ${planet.name}`
            : undefined
        }
        title={
          canToggleExhaustion
            ? planetExhaustion.exhausted
              ? "Ready planet"
              : "Exhaust planet"
            : undefined
        }
      >
        <div
          style={{
            display: "flex",
            width: "100%",
            height: "100%",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 2,
          }}
        >
          <ResourcesIcon
            resources={planet.resources}
            influence={planet.influence}
            height={54}
          />
        </div>
        <div
          style={{
            position: "absolute",
            right: rem(8),
            top: rem(14),
            opacity: 0.75,
            zIndex: 1,
            width: "min-content",
          }}
        >
          <TypeOrFactionIcon planet={planet} />
        </div>
        {leftAttribute ? (
          <div
            style={{
              position: "absolute",
              width: rem(16),
              height: rem(16),
              left: rem(10),
              top: rem(35),
              zIndex: 1,
            }}
          >
            {getAttributeIcon(leftAttribute, planet.name, planet.ability)}
          </div>
        ) : null}
        {planet.attributes.map((attribute, index) => {
          let adjustedIndex = indexStart - index;
          let offset = -0.1;
          const position: CSSProperties = getRadialPosition(
            adjustedIndex,
            /* numOptions= */ 12,
            offset,
            /* circleSize= */ 66,
            /* size= */ 16,
          );
          if (attribute === leftAttribute || attribute === "all-types") {
            indexStart++;
            return null;
          }
          return (
            <div
              key={index}
              style={{
                position: "absolute",
                width: rem(16),
                height: rem(16),
                zIndex: 3,
                ...position,
              }}
            >
              {getAttributeIcon(attribute, planet.name, planet.ability)}
            </div>
          );
        })}
        <ExhaustButton planet={planet} />
        <ChangeOwnerButton planet={planet} />
        <AttachButton planet={planet} />
      </div>
      <div
        className={`${styles.BottomSection} ${
          planetExhaustion.exhausted ? styles.ExhaustedBottomSection : ""
        }`}
        style={{ minWidth: "100%", borderColor }}
      >
        {planet.name}
      </div>
      <StructureSection planet={planet} />
    </div>
  );
}

function StructureSection({ planet }: { planet: Planet }) {
  const dataUpdate = useDataUpdate();
  const options = useOptions();

  if (!planet.owner) {
    return null;
  }

  if (options.hide?.includes("STRUCTURES")) {
    return null;
  }

  // TODO: Consider using this for the Triad
  if (
    planet.attributes.includes("demilitarized") ||
    planet.attributes.includes("ocean") ||
    planet.attributes.includes("space-station") ||
    planet.attributes.includes("synthetic")
  ) {
    return null;
  }

  const numPds = planet.pds ?? 0;

  return (
    <div className={`${styles.StructureDiv} ${styles.BottomSection}`}>
      <span
        onClick={() =>
          dataUpdate(
            Events.ToggleStructureEvent(
              planet.id,
              "Space Dock",
              planet.spaceDock ? "Remove" : "Add",
            ),
          )
        }
        style={{ opacity: planet.spaceDock ? 1 : 0.25, cursor: "pointer" }}
      >
        <UnitIcon type="Space Dock" size={12} />
      </span>
      <span
        onClick={() =>
          dataUpdate(
            Events.ToggleStructureEvent(
              planet.id,
              "PDS",
              numPds >= 1 ? "Remove" : "Add",
            ),
          )
        }
        style={{ opacity: numPds >= 1 ? 1 : 0.25, cursor: "pointer" }}
      >
        <UnitIcon type="PDS" size={12} />
      </span>
      <span
        onClick={() =>
          dataUpdate(
            Events.ToggleStructureEvent(
              planet.id,
              "PDS",
              numPds === 2 ? "Remove" : "Add",
            ),
          )
        }
        style={{ opacity: numPds === 2 ? 1 : 0.25, cursor: "pointer" }}
      >
        <UnitIcon type="PDS" size={12} />
      </span>
    </div>
  );
}

function ExhaustButton({ planet }: { planet: Planet }) {
  const viewOnly = useViewOnly();
  const { exhausted, toggle } = usePlanetExhaustion(planet);

  if (!planet.owner || planet.state === "PURGED") {
    return null;
  }
  if (
    planet.attributes.includes("ocean") ||
    planet.attributes.includes("space-station") ||
    planet.attributes.includes("synthetic")
  ) {
    return null;
  }

  const position = getRadialPosition(
    0,
    /* numOptions= */ 8,
    /* offset= */ 0,
    /* circleSize= */ 64,
    /* size= */ 20,
  );

  return (
    <button
      className={`${styles.FloatingButton} ${exhausted ? "" : "hiddenButton"}`}
      style={{
        ...position,
        backgroundColor: exhausted
          ? "var(--selected-bg)"
          : "var(--interactive-bg)",
      }}
      onClick={(event: MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        toggle();
      }}
      disabled={viewOnly}
      title={exhausted ? "Ready planet" : "Exhaust planet"}
    >
      <FlipSVG />
    </button>
  );
}

function AttachButton({ planet }: { planet: Planet }) {
  const attachments = useAttachments();
  const { openModal } = use(ModalContext);
  const position = getRadialPosition(
    6,
    /* numOptions= */ 8,
    /* offset= */ 0,
    /* circleSize= */ 64,
    /* size= */ 20,
  );

  function availableAttachments() {
    const planetAttachments = planet.attachments ?? [];
    let available = Object.values(attachments)
      .filter((attachment) => {
        // If attached to this planet, always show.
        if (planetAttachments.includes(attachment.id)) {
          return true;
        }
        // Cannot attach to space stations, oceans, or synthetic planets (i.e. The Triad)
        if (
          planet.attributes.includes("space-station") ||
          planet.attributes.includes("ocean") ||
          planet.attributes.includes("synthetic")
        ) {
          return false;
        }
        if (planet.locked) {
          return false;
        }
        if (planet.id === "Mecatol Rex" && attachment.id !== "Nano-Forge") {
          return false;
        }
        if (attachment.id === "Terraform" && planet.owner === "Titans of Ul") {
          return false;
        }
        if (attachment.required.type) {
          if (!planet.types.includes(attachment.required.type)) {
            return false;
          }
        }
        if (attachment.required.id !== undefined) {
          if (attachment.required.id !== planet.id) {
            return false;
          }
        }
        if (attachment.required.home !== undefined) {
          if (attachment.required.home !== (planet.home ?? false)) {
            return false;
          }
        }
        if (attachment.required.legendary !== undefined) {
          if (
            attachment.required.legendary !==
            planet.attributes.includes("legendary")
          ) {
            return false;
          }
        }
        return true;
      })
      .reduce((result, attachment) => {
        return {
          ...result,
          [attachment.id]: attachment,
        };
      }, {});
    return available;
  }

  if (Object.keys(availableAttachments()).length === 0) {
    return null;
  }

  return (
    <button
      className={`${styles.FloatingButton} hiddenButton`}
      style={position}
      onClick={(event: MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        openModal(<AttachMenu planetId={planet.id} />);
      }}
    >
      ⎗
    </button>
  );
}

function ChangeOwnerButton({ planet }: { planet: Planet }) {
  const dataUpdate = useDataUpdate();

  // TODO: Use this for unclaimed planets.
  if (!planet.owner) {
    return null;
  }

  const position = getRadialPosition(
    7,
    /* numOptions= */ 8,
    /* offset= */ 0,
    /* circleSize= */ 64,
    /* size= */ 20,
  );

  return (
    <button
      className={`${styles.FloatingButton} hiddenButton`}
      style={position}
      onClick={(event: MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        dataUpdate(
          Events.ClaimPlanetEvent(planet.owner as FactionId, planet.id),
        );
      }}
    >
      <SymbolX color="firebrick" />
    </button>
  );
}
