import { useState } from "react";
import { FormattedMessage } from "react-intl";
import FormattedDescription from "../../../../../../../src/components/FormattedDescription/FormattedDescription";
import TechIcon from "../../../../../../../src/components/TechIcon/TechIcon";
import TechPrereqDots from "../../../../../../../src/components/TechSelectHoverMenu/TechPrereqDots";
import UnitStats from "../../../../../../../src/components/UnitStats/UnitStats";
import UnitIcon from "../../../../../../../src/components/Units/Icons";
import {
  useAttachments,
  useOptions,
  usePlanets,
  useRelics,
  useTechs,
  useViewOnly,
} from "../../../../../../../src/context/dataHooks";
import { useFactions } from "../../../../../../../src/context/factionDataHooks";
import { hasTech } from "../../../../../../../src/util/api/techs";
import { useDataUpdate } from "../../../../../../../src/util/api/dataUpdate";
import { Events } from "../../../../../../../src/util/api/events";
import { applyAllPlanetAttachments } from "../../../../../../../src/util/planets";
import {
  canExhaustTech,
  canResearchTech,
  filterToUnownedTechs,
  getFactionPreReqs,
  getTechColor,
  getTechTypeColor,
  sortTechs,
} from "../../../../../../../src/util/techs";
import { rem } from "../../../../../../../src/util/util";

type TechReferenceFilter =
  | "ACTION"
  | "AGENDA"
  | "COMBAT"
  | "MOVEMENT"
  | "PRODUCTION"
  | "STATUS"
  | "PASSIVE";

const TECH_FILTERS: {
  id: TechReferenceFilter;
  label: string;
  title: string;
}[] = [
  {
    id: "ACTION",
    label: "Action",
    title: "Action phase and tactical action technologies",
  },
  {
    id: "MOVEMENT",
    label: "Move",
    title: "Technologies used when moving ships or moving through systems",
  },
  {
    id: "COMBAT",
    label: "Combat",
    title: "Technologies used during space combat, invasion, or bombardment",
  },
  {
    id: "PRODUCTION",
    label: "Produce",
    title: "Technologies used when producing or placing units",
  },
  {
    id: "AGENDA",
    label: "Agenda",
    title: "Technologies used during the agenda phase or voting",
  },
  {
    id: "STATUS",
    label: "Status",
    title: "Technologies used during the status phase",
  },
  {
    id: "PASSIVE",
    label: "Always",
    title: "Passive technologies and unit upgrades without a specific timing",
  },
];

type TechTypeReferenceFilter = Exclude<TechType, "OTHER">;

const TECH_TYPE_FILTERS: TechTypeReferenceFilter[] = [
  "GREEN",
  "BLUE",
  "YELLOW",
  "RED",
  "UPGRADE",
];

export default function TechReferenceTab({
  factionId,
  type,
}: {
  factionId: FactionId;
  type: "researched" | "unresearched";
}) {
  const attachments = useAttachments();
  const factions = useFactions();
  const options = useOptions();
  const planets = usePlanets();
  const relics = useRelics();
  const techs = useTechs();
  const faction = factions[factionId];
  const viewOnly = useViewOnly();
  const dataUpdate = useDataUpdate();
  const [selectedFilter, setSelectedFilter] =
    useState<TechReferenceFilter | null>(null);
  const [selectedTypeFilter, setSelectedTypeFilter] =
    useState<TechTypeReferenceFilter | null>(null);
  const [removeMode, setRemoveMode] = useState(false);

  if (!faction) {
    return null;
  }

  const remainingTechs = filterToUnownedTechs(
    getResearchableReferenceTechs(factionId, factions, techs),
    faction,
  );
  const factionPreReqs = getFactionPreReqs(
    faction,
    techs,
    options,
    applyAllPlanetAttachments(Object.values(planets), attachments),
    relics,
  );

  function canFactionResearch(tech: Tech) {
    let isTechOwned = false;
    for (const otherFaction of Object.values(factions)) {
      if (otherFaction.techs[tech.id]) {
        isTechOwned = true;
        break;
      }
    }

    return canResearchTech(
      tech,
      options,
      factionPreReqs,
      faction,
      isTechOwned,
      techs,
    );
  }

  const referenceTechs =
    type === "researched" ? getResearchedTechs(faction, techs) : remainingTechs;
  sortTechs(referenceTechs);
  const eligibleTechIds =
    type === "unresearched"
      ? new Set(
          referenceTechs
            .filter((tech) => canFactionResearch(tech))
            .map((tech) => tech.id),
        )
      : new Set<TechId>();
  const sortedReferenceTechs =
    type === "unresearched"
      ? [...referenceTechs].sort((a, b) => {
          const eligibleDiff =
            Number(eligibleTechIds.has(b.id)) - Number(eligibleTechIds.has(a.id));
          if (eligibleDiff !== 0) {
            return eligibleDiff;
          }
          return 0;
        })
      : referenceTechs;
  const visibleTechs = sortedReferenceTechs.filter((tech) => {
    if (
      selectedFilter &&
      !getTechTimingFilters(tech).includes(selectedFilter)
    ) {
      return false;
    }
    if (selectedTypeFilter && tech.type !== selectedTypeFilter) {
      return false;
    }
    return true;
  });

  return (
    <div className="flexColumn" style={{ alignItems: "stretch", width: "100%" }}>
      {type === "researched" ? (
        <RemoveTechModeToggle
          removeMode={removeMode}
          setRemoveMode={setRemoveMode}
          viewOnly={viewOnly}
        />
      ) : null}
      {referenceTechs.length > 0 ? (
        <TechTimingFilterBar
          selectedFilter={selectedFilter}
          setSelectedFilter={setSelectedFilter}
        />
      ) : null}
      {type === "unresearched" && referenceTechs.length > 0 ? (
        <TechTypeFilterBar
          selectedFilter={selectedTypeFilter}
          setSelectedFilter={setSelectedTypeFilter}
        />
      ) : null}
      {type === "unresearched" && referenceTechs.length > 0 ? (
        <TechEligibilitySummary
          eligibleCount={eligibleTechIds.size}
          totalCount={referenceTechs.length}
        />
      ) : null}
      {referenceTechs.length === 0 ? (
        <div
          className="flexRow"
          style={{
            padding: rem(12),
            color: "var(--neutral-text)",
            fontSize: rem(18),
          }}
        >
          {type === "researched" ? (
            <FormattedMessage
              id="FactionDetails.ResearchedTech.Empty"
              defaultMessage="No researched technologies."
              description="Empty state for a technology reference tab when no technologies have been researched."
            />
          ) : (
            <FormattedMessage
              id="FactionDetails.UnresearchedTech.Empty"
              defaultMessage="No unresearched technologies."
              description="Empty state for a technology reference tab when every available technology has been researched."
            />
          )}
        </div>
      ) : visibleTechs.length === 0 ? (
        <div
          className="flexRow"
          style={{
            padding: rem(12),
            color: "var(--neutral-text)",
            fontSize: rem(18),
          }}
        >
          <FormattedMessage
            id="FactionDetails.TechReference.FilterEmpty"
            defaultMessage="No matching technologies."
            description="Empty state for a technology reference tab when a type filter has no matching technologies."
          />
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 18rem), 1fr))",
            gap: rem(8),
            padding: rem(8),
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          {visibleTechs.map((tech) => (
            <TechReferenceCard
              key={tech.id}
              canResearch={
                type === "unresearched" ? eligibleTechIds.has(tech.id) : undefined
              }
              exhausted={faction.techs[tech.id]?.state === "exhausted"}
              removeMode={type === "researched" && removeMode}
              onRemoveTech={
                type === "researched" && removeMode && !viewOnly
                  ? () => dataUpdate(Events.RemoveTechEvent(factionId, tech.id))
                  : undefined
              }
              onResearchTech={
                type === "unresearched" && !viewOnly
                  ? () => dataUpdate(Events.AddTechEvent(factionId, tech.id))
                  : undefined
              }
              onToggleTechState={
                type === "researched" &&
                !removeMode &&
                canExhaustTech(tech) &&
                faction.techs[tech.id]?.state !== "purged" &&
                !viewOnly
                  ? () =>
                      dataUpdate(
                        Events.UpdateTechStateEvent(
                          factionId,
                          tech.id,
                          faction.techs[tech.id]?.state === "exhausted"
                            ? "ready"
                            : "exhausted",
                        ),
                      )
                  : undefined
              }
              tech={tech}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function RemoveTechModeToggle({
  removeMode,
  setRemoveMode,
  viewOnly,
}: {
  removeMode: boolean;
  setRemoveMode: (removeMode: boolean) => void;
  viewOnly: boolean;
}) {
  return (
    <div
      className="flexRow"
      style={{
        minHeight: rem(38),
        paddingTop: rem(4),
      }}
    >
      <button
        type="button"
        aria-pressed={removeMode}
        onClick={() => setRemoveMode(!removeMode)}
        disabled={viewOnly}
        style={{
          backgroundColor: removeMode
            ? "var(--red-tech-color)"
            : "var(--interactive-bg)",
          border: `2px solid ${
            removeMode ? "var(--red-tech-color)" : "var(--neutral-border)"
          }`,
          borderRadius: rem(6),
          boxShadow: removeMode
            ? `0 0 ${rem(8)} var(--red-tech-color)`
            : "0 0 0 1px var(--background-color)",
          color: "var(--foreground-color)",
          fontFamily: "var(--main-font)",
          fontSize: rem(16),
          padding: `${rem(4)} ${rem(12)}`,
        }}
      >
        {removeMode ? (
          <FormattedMessage
            id="FactionDetails.TechReference.RemoveModeOn"
            defaultMessage="Removing Techs"
            description="Toggle label indicating that researched technologies can be removed."
          />
        ) : (
          <FormattedMessage
            id="FactionDetails.TechReference.RemoveModeOff"
            defaultMessage="Remove Techs"
            description="Toggle label enabling removal of researched technologies."
          />
        )}
      </button>
    </div>
  );
}

function TechEligibilitySummary({
  eligibleCount,
  totalCount,
}: {
  eligibleCount: number;
  totalCount: number;
}) {
  return (
    <div
      className="flexRow"
      style={{
        flexWrap: "wrap",
        justifyContent: "center",
        gap: rem(8),
        padding: `${rem(2)} ${rem(8)} ${rem(6)}`,
        fontFamily: "var(--main-font)",
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: rem(5),
          padding: `${rem(3)} ${rem(8)}`,
          border: "1px solid var(--green-tech-color)",
          borderRadius: rem(6),
          backgroundColor: "var(--interactive-bg)",
          boxShadow: `0 0 ${rem(5)} var(--green-tech-color)`,
          color: "var(--foreground-color)",
          fontSize: rem(14),
          lineHeight: 1,
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: rem(8),
            height: rem(8),
            borderRadius: "50%",
            backgroundColor: "var(--green-tech-color)",
          }}
        />
        <FormattedMessage
          id="FactionDetails.TechReference.EligibleCount"
          defaultMessage="{eligibleCount} of {totalCount} eligible"
          values={{ eligibleCount, totalCount }}
          description="Summary showing how many unresearched technologies are currently eligible to research."
        />
      </span>
      <span
        style={{
          color: "var(--muted-text-color)",
          fontSize: rem(13),
          lineHeight: 1,
        }}
      >
        <FormattedMessage
          id="FactionDetails.TechReference.EligibleFirst"
          defaultMessage="Eligible techs appear first."
          description="Hint explaining the ordering of unresearched technologies."
        />
      </span>
    </div>
  );
}

function TechTimingFilterBar({
  selectedFilter,
  setSelectedFilter,
}: {
  selectedFilter: TechReferenceFilter | null;
  setSelectedFilter: (filter: TechReferenceFilter | null) => void;
}) {
  return (
    <div
      style={{
        alignItems: "center",
        boxSizing: "border-box",
        display: "grid",
        gap: rem(5),
        gridTemplateColumns: "auto minmax(0, 1fr)",
        padding: `${rem(2)} ${rem(6)}`,
        width: "100%",
      }}
    >
      <FilterRowLabel>Timing</FilterRowLabel>
      <div
        className="flexRow"
        style={{
          flexWrap: "wrap",
          justifyContent: "center",
          gap: rem(4),
          minWidth: 0,
        }}
      >
        {TECH_FILTERS.map((filter) => {
          const selected = selectedFilter === filter.id;
          return (
            <button
              key={filter.id}
              type="button"
              aria-pressed={selected}
              title={filter.title}
              onClick={() => setSelectedFilter(selected ? null : filter.id)}
              style={{
                minHeight: rem(24),
                padding: `${rem(2)} ${rem(6)}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: `1px solid ${
                  selected ? "var(--foreground-color)" : "var(--neutral-border)"
                }`,
                borderRadius: rem(999),
                backgroundColor: selected
                  ? "var(--hovered-bg)"
                  : "var(--background-color)",
                boxShadow: selected
                  ? `0 0 ${rem(4)} var(--neutral-border)`
                  : undefined,
                color: "var(--foreground-color)",
                fontFamily: "var(--main-font)",
                fontSize: rem(11),
                lineHeight: 1,
                opacity: selectedFilter && !selected ? 0.5 : 1,
                whiteSpace: "nowrap",
              }}
            >
              {filter.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TechTypeFilterBar({
  selectedFilter,
  setSelectedFilter,
}: {
  selectedFilter: TechTypeReferenceFilter | null;
  setSelectedFilter: (filter: TechTypeReferenceFilter | null) => void;
}) {
  return (
    <div
      style={{
        alignItems: "center",
        boxSizing: "border-box",
        display: "grid",
        gap: rem(8),
        gridTemplateColumns: "auto minmax(0, 1fr)",
        padding: `${rem(2)} ${rem(8)} ${rem(4)}`,
        width: "100%",
      }}
    >
      <FilterRowLabel>Type</FilterRowLabel>
      <div
        className="flexRow"
        style={{
          flexWrap: "wrap",
          justifyContent: "center",
          gap: rem(8),
          minWidth: 0,
        }}
      >
        {TECH_TYPE_FILTERS.map((techType) => {
          const selected = selectedFilter === techType;
          const color = getTechTypeColor(techType);
          return (
            <button
              key={techType}
              type="button"
              aria-pressed={selected}
              aria-label={`Filter ${getTechTypeLabel(techType)}`}
              title={getTechTypeLabel(techType)}
              onClick={() => setSelectedFilter(selected ? null : techType)}
              style={{
                alignItems: "center",
                backgroundColor: selected
                  ? "var(--hovered-bg)"
                  : "var(--background-color)",
                border: `1px solid ${
                  selected ? color : "var(--neutral-border)"
                }`,
                borderRadius: rem(6),
                boxShadow: selected ? `0 0 ${rem(6)} ${color}` : undefined,
                display: "flex",
                height: rem(34),
                justifyContent: "center",
                opacity: selectedFilter && !selected ? 0.5 : 1,
                padding: rem(5),
                width: rem(34),
              }}
            >
              {techType === "UPGRADE" ? (
                <UnitIcon type="Dreadnought" size={22} color={color} />
              ) : (
                <TechIcon type={techType} size={22} color={color} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FilterRowLabel({ children }: { children: string }) {
  return (
    <span
      style={{
        color: "var(--muted-text-color)",
        fontFamily: "var(--main-font)",
        fontSize: rem(13),
        lineHeight: 1,
        textAlign: "right",
        width: rem(52),
      }}
    >
      {children}
    </span>
  );
}

function getTechTypeLabel(type: TechTypeReferenceFilter) {
  switch (type) {
    case "GREEN":
      return "green technologies";
    case "BLUE":
      return "blue technologies";
    case "YELLOW":
      return "yellow technologies";
    case "RED":
      return "red technologies";
    case "UPGRADE":
      return "unit upgrades";
  }
}

function getTechTimingFilters(tech: Tech): TechReferenceFilter[] {
  const text = [
    tech.name,
    tech.description,
    tech.type === "UPGRADE" ? tech.abilities.join(" ") : "",
  ]
    .join(" ")
    .toLowerCase();
  const filters: TechReferenceFilter[] = [];

  if (matchesAny(text, ["agenda", "vote", "voting", "elect"])) {
    filters.push("AGENDA");
  }
  if (matchesAny(text, ["status phase", "during the status", "status step"])) {
    filters.push("STATUS");
  }
  if (
    matchesAny(text, [
      "move",
      "movement",
      "moving",
      "activate a system",
      "activated system",
      "wormhole",
      "system that contains",
      "through systems",
    ])
  ) {
    filters.push("MOVEMENT");
  }
  if (
    matchesAny(text, [
      "combat",
      "space combat",
      "invasion",
      "bombardment",
      "anti-fighter barrage",
      "space cannon",
      "sustain damage",
      "hit",
      "roll",
    ])
  ) {
    filters.push("COMBAT");
  }
  if (
    matchesAny(text, [
      "produce",
      "production",
      "place",
      "unit",
      "units",
      "fighter",
      "infantry",
      "space dock",
    ])
  ) {
    filters.push("PRODUCTION");
  }
  if (
    matchesAny(text, [
      "action:",
      "component action",
      "tactical action",
      "strategy action",
      "action phase",
      "as an action",
      "when you perform",
      "when you resolve",
      "after you activate",
    ])
  ) {
    filters.push("ACTION");
  }

  return filters.length > 0 ? [...new Set(filters)] : ["PASSIVE"];
}

function matchesAny(text: string, needles: string[]) {
  return needles.some((needle) => text.includes(needle));
}

function getResearchedTechs(
  faction: Faction,
  techs: Partial<Record<TechId, Tech>>,
) {
  return (Object.keys(faction.techs) as TechId[])
    .map((techId) => techs[techId])
    .filter((tech): tech is Tech => hasTech(faction, tech));
}

function getResearchableReferenceTechs(
  factionId: FactionId,
  factions: Partial<Record<FactionId, Faction>>,
  techs: Partial<Record<TechId, Tech>>,
) {
  const techsObj: Partial<Record<TechId, Tech>> = {};
  Object.values(techs).forEach((tech) => {
    if (!tech) {
      return;
    }
    if (tech.faction) {
      if (factionId === "Nekro Virus" && !factions[tech.faction]) {
        return;
      } else if (factionId !== "Nekro Virus" && tech.faction !== factionId) {
        return;
      }
    }
    techsObj[tech.id] = tech;
  });

  if (factionId !== "Nekro Virus") {
    Object.values(techsObj).forEach((tech) => {
      if (tech?.type === "UPGRADE" && tech.replaces) {
        delete techsObj[tech.replaces];
      }
    });
  }

  return techsObj;
}

function TechReferenceCard({
  canResearch,
  exhausted,
  removeMode,
  onRemoveTech,
  onResearchTech,
  onToggleTechState,
  tech,
}: {
  canResearch?: boolean;
  exhausted: boolean;
  removeMode?: boolean;
  onRemoveTech?: () => void;
  onResearchTech?: () => void;
  onToggleTechState?: () => void;
  tech: Tech;
}) {
  const color = getTechColor(tech);
  const interactive = !!onToggleTechState;
  const researchable = !!onResearchTech;
  const eligibleForResearch = researchable && canResearch === true;

  return (
    <div
      className="flexColumn"
      style={{
        alignItems: "stretch",
        gap: rem(6),
        padding: rem(8),
        border: onRemoveTech
          ? `2px solid var(--red-tech-color)`
          : eligibleForResearch
          ? `2px solid var(--green-tech-color)`
          : `1px solid ${color}`,
        borderRadius: rem(6),
        backgroundColor: "var(--interactive-bg)",
        boxShadow: onRemoveTech
          ? `0 0 ${rem(7)} var(--red-tech-color)`
          : eligibleForResearch
          ? `0 0 ${rem(7)} var(--green-tech-color)`
          : "0 0 0 1px var(--hidden-border)",
        color: "var(--foreground-color)",
        cursor: interactive ? "pointer" : undefined,
        filter: exhausted ? "grayscale(1)" : undefined,
        minWidth: 0,
        opacity: exhausted ? 0.5 : canResearch === false ? 0.65 : undefined,
      }}
      onClick={onToggleTechState}
      onKeyDown={(event) => {
        if (!interactive || (event.key !== "Enter" && event.key !== " ")) {
          return;
        }
        event.preventDefault();
        onToggleTechState();
      }}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-pressed={interactive ? exhausted : undefined}
      aria-label={
        interactive
          ? exhausted
            ? `Ready ${tech.name}`
            : `Exhaust ${tech.name}`
          : undefined
      }
      title={
        removeMode
          ? "Remove mode is on"
          : interactive
          ? exhausted
            ? "Ready technology"
            : "Exhaust technology"
          : undefined
      }
      >
      {removeMode ? (
        <div
          className="flexRow"
          style={{
            justifyContent: "flex-end",
          }}
        >
          <button
            type="button"
            disabled={!onRemoveTech}
            onClick={(event) => {
              event.stopPropagation();
              onRemoveTech?.();
            }}
            style={{
              backgroundColor: "var(--background-color)",
              border: "2px solid var(--red-tech-color)",
              borderRadius: rem(6),
              color: "var(--foreground-color)",
              fontFamily: "var(--main-font)",
              fontSize: rem(14),
              padding: `${rem(3)} ${rem(10)}`,
            }}
            title={`Remove ${tech.name}`}
          >
            <FormattedMessage
              id="FactionDetails.TechReference.RemoveTech"
              defaultMessage="Remove Tech"
              description="Button label for removing a researched technology."
            />
          </button>
        </div>
      ) : null}
      <div
        className="flexRow"
        style={{
          justifyContent: "space-between",
          alignItems: "center",
          gap: rem(8),
          color,
          minWidth: 0,
        }}
      >
        <div
          className="flexRow"
          style={{
            justifyContent: "flex-start",
            gap: rem(6),
            minWidth: 0,
            fontFamily: "var(--main-font)",
            fontSize: rem(20),
            lineHeight: 1,
          }}
        >
          <TechTypeIcon tech={tech} />
          <span style={{ overflowWrap: "anywhere" }}>{tech.name}</span>
        </div>
        <TechPrereqDots prereqs={tech.prereqs} width={4} />
      </div>
      {researchable ? (
        <div
          className="flexRow"
          style={{
            justifyContent: "space-between",
            gap: rem(8),
            alignItems: "center",
          }}
        >
          <span
            style={{
              color: canResearch
                ? "var(--neutral-text)"
                : "var(--muted-text-color)",
              fontFamily: "var(--main-font)",
              fontSize: rem(13),
              lineHeight: 1,
            }}
          >
            {canResearch ? (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: rem(5),
                  padding: `${rem(3)} ${rem(7)}`,
                  border: "1px solid var(--green-tech-color)",
                  borderRadius: rem(999),
                  backgroundColor: "var(--background-color)",
                  color: "var(--foreground-color)",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: rem(7),
                    height: rem(7),
                    borderRadius: "50%",
                    backgroundColor: "var(--green-tech-color)",
                  }}
                />
                <FormattedMessage
                  id="FactionDetails.TechReference.Eligible"
                  defaultMessage="Eligible"
                  description="Label indicating a technology can be researched with current prerequisites."
                />
              </span>
            ) : (
              <FormattedMessage
                id="FactionDetails.TechReference.Override"
                defaultMessage="Prereqs unmet"
                description="Label indicating a technology normally cannot be researched yet."
              />
            )}
          </span>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onResearchTech();
            }}
            style={{
              backgroundColor: canResearch
                ? "var(--interactive-bg)"
                : "var(--background-color)",
              border: `2px solid ${canResearch ? color : "var(--neutral-border)"}`,
              borderRadius: rem(6),
              color: "var(--foreground-color)",
              fontFamily: "var(--main-font)",
              fontSize: rem(14),
              padding: `${rem(3)} ${rem(10)}`,
            }}
            title={
              canResearch
                ? "Research this technology"
                : "Research anyway if a rule allows it"
            }
          >
            <FormattedMessage
              id="3qIvsL"
              description="Label on a hover menu used to research tech."
              defaultMessage="Research Tech"
            />
          </button>
        </div>
      ) : null}
      <div
        className="flexColumn"
        style={{
          alignItems: "stretch",
          gap: rem(6),
          fontSize: rem(15),
          lineHeight: 1.2,
          whiteSpace: "pre-line",
          textAlign: "left",
        }}
      >
        <FormattedDescription description={tech.description} />
        {tech.type === "UPGRADE" ? <UpgradeTechDetails tech={tech} /> : null}
      </div>
    </div>
  );
}

function TechTypeIcon({ tech }: { tech: Tech }) {
  if (tech.type === "UPGRADE") {
    return <UnitIcon type={tech.unitType} size={18} color={getTechColor(tech)} />;
  }
  if (tech.type === "OTHER") {
    return null;
  }
  return <TechIcon type={tech.type} size={18} color={getTechColor(tech)} />;
}

function UpgradeTechDetails({
  tech,
}: {
  tech: Extract<Tech, { type: "UPGRADE" }>;
}) {
  return (
    <div className="flexColumn" style={{ alignItems: "stretch", gap: rem(6) }}>
      {tech.abilities.length > 0 ? (
        <div
          className="flexRow"
          style={{
            flexWrap: "wrap",
            justifyContent: "flex-start",
            gap: rem(4),
          }}
        >
          {tech.abilities.map((ability) => (
            <span
              key={ability}
              style={{
                padding: `${rem(2)} ${rem(5)}`,
                border: "1px solid var(--neutral-border)",
                borderRadius: rem(4),
                fontFamily: "var(--main-font)",
                fontSize: rem(12),
                lineHeight: 1,
              }}
            >
              {ability.toUpperCase()}
            </span>
          ))}
        </div>
      ) : null}
      <div style={{ fontSize: rem(42) }}>
        <UnitStats stats={tech.stats} type={tech.unitType} />
      </div>
    </div>
  );
}
