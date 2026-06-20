import { useContext, useEffect, useState } from "react";
import { FormattedMessage } from "react-intl";
import Conditional from "../../../../../../../src/components/Conditional/Conditional";
import FactionComponents from "../../../../../../../src/components/FactionComponents/FactionComponents";
import LabeledLine from "../../../../../../../src/components/LabeledLine/LabeledLine";
import { SettingsContext } from "../../../../../../../src/context/contexts";
import {
  useActiveFactionId,
  useOnDeckFactionId,
} from "../../../../../../../src/context/gameDataHooks";
import { useGameState } from "../../../../../../../src/context/stateDataHooks";
import { FactionSummary } from "../../../../../../../src/FactionSummary";
import { Tab, TabBody } from "../../../../../../../src/Tab";
import { rem } from "../../../../../../../src/util/util";
import ObjectiveTab from "./ObjectiveTab";
import PhaseSection from "./PhaseSection";
import PlanetTab from "./PlanetTab";
import ChipGroup from "../../../../../../../src/components/Chip/ChipGroup";
import UnitOverviewTab from "./UnitOverviewTab";
import TechReferenceTab from "./TechReferenceTab";

export default function FactionContent({
  factionId,
}: {
  factionId: FactionId;
}) {
  const activeFactionId = useActiveFactionId();
  const onDeckFactionId = useOnDeckFactionId();
  const { settings } = useContext(SettingsContext);
  const state = useGameState();
  const [tabShown, setTabShown] = useState<string>(
    state.phase === "AGENDA" ? "" : "planets",
  );
  const showPlayerViewIndicator = settings["player-view-faction"] === factionId;
  const showVoteBanner =
    state.phase === "AGENDA" &&
    state.votingStarted &&
    state.activeplayer === factionId;
  const showOnDeckBanner =
    factionId === onDeckFactionId && factionId !== activeFactionId;

  function toggleTabShown(tab: string) {
    if (tabShown === tab) {
      setTabShown("");
    } else {
      setTabShown(tab);
    }
  }

  useEffect(() => {
    setTabShown(state.phase === "AGENDA" ? "" : "planets");
  }, [factionId, state.phase]);

  return (
    <div className="flexColumn" style={{ gap: rem(8), width: "100%" }}>
      {showVoteBanner ? <VoteTurnBanner factionId={factionId} /> : null}
      {showOnDeckBanner ? <OnDeckBanner factionId={factionId} /> : null}
      {showPlayerViewIndicator ? (
        <PlayerViewIndicator factionId={factionId} />
      ) : null}
      <FactionSummary
        factionId={factionId}
        countExhaustedPlanets={false}
        countExhaustedPlanetValues={false}
        showPlanetSummaryLabel
      />
      <div
        style={{
          width: "100%",
          maxWidth: rem(800),
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            flexBasis: "100%",
          }}
        >
          <div
            className="flexColumn"
            style={{
              width: "100%",
              alignItems: "stretch",
              padding: `0 ${rem(8)}`,
            }}
          >
            <PhaseSection factionId={factionId} />
            <LabeledLine
              label={
                <FormattedMessage
                  id="NUNF0C"
                  defaultMessage="Faction Details"
                  description="Label for a section of faction details."
                />
              }
            />
            <div
              className="flexColumn"
              style={{ gap: 0, alignItems: "stretch" }}
            >
              {/* Tabs */}
              <ChipGroup style={{ margin: "auto" }}>
                <Conditional appSection="PLANETS">
                  <Tab
                    selectTab={toggleTabShown}
                    id="planets"
                    selectedId={tabShown}
                  >
                    <FormattedMessage
                      id="1fNqTf"
                      description="Planets."
                      defaultMessage="Planets"
                    />
                  </Tab>
                </Conditional>
                <Conditional appSection="PLANETS">
                  <Tab
                    selectTab={toggleTabShown}
                    id="manage-planets"
                    selectedId={tabShown}
                  >
                    <FormattedMessage
                      id="FactionDetails.ManagePlanets"
                      description="Short label for a faction details tab for editing planet ownership and attachments."
                      defaultMessage="Manage Planets"
                    />
                  </Tab>
                </Conditional>
                <Conditional appSection="OBJECTIVES">
                  <Tab
                    selectTab={toggleTabShown}
                    id="objectives"
                    selectedId={tabShown}
                  >
                    <FormattedMessage
                      id="5Bl4Ek"
                      description="Cards that define how to score victory points."
                      defaultMessage="Objectives"
                    />
                  </Tab>
                </Conditional>
                <Tab selectTab={toggleTabShown} id="units" selectedId={tabShown}>
                  <FormattedMessage
                    id="FactionDetails.Units"
                    description="Short label for a faction details tab showing unit cards."
                    defaultMessage="Units"
                  />
                </Tab>
                <Conditional appSection="TECHS">
                  <Tab
                    selectTab={toggleTabShown}
                    id="researched-tech"
                    selectedId={tabShown}
                  >
                    <FormattedMessage
                      id="FactionDetails.ResearchedTech"
                      description="Short label for a faction details tab showing researched technology cards."
                      defaultMessage="Researched Tech"
                    />
                  </Tab>
                </Conditional>
                <Conditional appSection="TECHS">
                  <Tab
                    selectTab={toggleTabShown}
                    id="unresearched-tech"
                    selectedId={tabShown}
                  >
                    <FormattedMessage
                      id="FactionDetails.UnresearchedTech"
                      description="Short label for a faction details tab showing unselected technology cards."
                      defaultMessage="Unresearched Tech"
                    />
                  </Tab>
                </Conditional>
              </ChipGroup>
              <Conditional appSection="PLANETS">
                <TabBody id="planets" selectedId={tabShown}>
                  <LabeledLine />
                  <PlanetTab
                    active={tabShown === "planets"}
                    factionId={factionId}
                    mode="spend"
                  />
                </TabBody>
              </Conditional>
              <Conditional appSection="PLANETS">
                <TabBody id="manage-planets" selectedId={tabShown}>
                  <LabeledLine />
                  <PlanetTab
                    active={tabShown === "manage-planets"}
                    factionId={factionId}
                    mode="manage"
                  />
                </TabBody>
              </Conditional>

              <Conditional appSection="OBJECTIVES">
                <TabBody id="objectives" selectedId={tabShown}>
                  <LabeledLine />
                  <ObjectiveTab factionId={factionId} />
                </TabBody>
              </Conditional>
              <TabBody id="units" selectedId={tabShown}>
                <LabeledLine />
                <UnitOverviewTab factionId={factionId} />
              </TabBody>
              <Conditional appSection="TECHS">
                <TabBody id="researched-tech" selectedId={tabShown}>
                  <LabeledLine />
                  <TechReferenceTab factionId={factionId} type="researched" />
                </TabBody>
              </Conditional>
              <Conditional appSection="TECHS">
                <TabBody id="unresearched-tech" selectedId={tabShown}>
                  <LabeledLine />
                  <TechReferenceTab factionId={factionId} type="unresearched" />
                </TabBody>
              </Conditional>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlayerViewIndicator({ factionId }: { factionId: FactionId }) {
  return (
    <div
      className="flexRow"
      style={{
        width: "fit-content",
        maxWidth: "calc(100% - 1rem)",
        boxSizing: "border-box",
        justifyContent: "center",
        gap: rem(6),
        padding: `${rem(4)} ${rem(10)}`,
        border: "1px solid var(--neutral-border)",
        borderRadius: rem(4),
        backgroundColor: "var(--interactive-bg)",
        color: "var(--foreground-color)",
        fontFamily: "var(--main-font)",
        fontSize: rem(14),
        lineHeight: 1.1,
        textAlign: "center",
      }}
    >
      <FactionComponents.Icon factionId={factionId} size={16} />
      <span>
        <FormattedMessage
          id="PlayerView.YourView"
          defaultMessage="Your player view"
          description="Indicator showing this browser is assigned to the current player's faction view."
        />
      </span>
    </div>
  );
}

function VoteTurnBanner({ factionId }: { factionId: FactionId }) {
  return (
    <div
      className="flexRow"
      style={{
        width: "calc(100% - 1rem)",
        maxWidth: rem(760),
        boxSizing: "border-box",
        justifyContent: "center",
        gap: rem(8),
        padding: `${rem(6)} ${rem(12)}`,
        border: "1px solid var(--blue-faction-color)",
        borderRadius: rem(4),
        backgroundColor: "rgba(64, 140, 255, 0.18)",
        color: "var(--foreground-color)",
        boxShadow: "0 0 12px rgba(64, 140, 255, 0.45)",
        fontFamily: "var(--main-font)",
        fontSize: rem(18),
        lineHeight: 1.1,
        textAlign: "center",
      }}
    >
      <FactionComponents.Icon factionId={factionId} size={18} />
      <span>
        <FormattedMessage
          id="Agenda.YourTurnToVote"
          defaultMessage="Your turn to vote"
          description="Warning shown to a player when their faction is the active agenda voter."
        />
      </span>
      <FactionComponents.Icon factionId={factionId} size={18} />
    </div>
  );
}

function OnDeckBanner({ factionId }: { factionId: FactionId }) {
  return (
    <div
      className="flexRow"
      style={{
        width: "calc(100% - 1rem)",
        maxWidth: rem(760),
        boxSizing: "border-box",
        justifyContent: "center",
        gap: rem(8),
        padding: `${rem(6)} ${rem(12)}`,
        border: "1px solid var(--yellow-faction-color)",
        borderRadius: rem(4),
        backgroundColor: "rgba(255, 190, 64, 0.18)",
        color: "var(--foreground-color)",
        boxShadow: "0 0 12px rgba(255, 190, 64, 0.45)",
        fontFamily: "var(--main-font)",
        fontSize: rem(18),
        lineHeight: 1.1,
        textAlign: "center",
      }}
    >
      <FactionComponents.Icon factionId={factionId} size={18} />
      <span>
        <FormattedMessage
          id="CA3ilB"
          defaultMessage="You are up next"
          description="Warning shown to a player when their faction is next in turn order."
        />
      </span>
      <FactionComponents.Icon factionId={factionId} size={18} />
    </div>
  );
}
