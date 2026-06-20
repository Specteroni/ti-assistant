import { ReactNode, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import LabeledLine from "../../../../../../../src/components/LabeledLine/LabeledLine";
import ObjectiveRow from "../../../../../../../src/components/ObjectiveRow/ObjectiveRow";
import { useViewOnly } from "../../../../../../../src/context/dataHooks";
import { useObjectives } from "../../../../../../../src/context/objectiveDataHooks";
import { Tab, TabBody } from "../../../../../../../src/Tab";
import { useDataUpdate } from "../../../../../../../src/util/api/dataUpdate";
import { Events } from "../../../../../../../src/util/api/events";
import { objectiveTypeString } from "../../../../../../../src/util/strings";
import { rem } from "../../../../../../../src/util/util";
import ChipGroup from "../../../../../../../src/components/Chip/ChipGroup";

function sortObjectivesByName(objectives: Objective[]) {
  objectives.sort((a, b) => {
    if (a.name > b.name) {
      return 1;
    }
    return -1;
  });
}

function SecretTab({ factionId }: { factionId: FactionId }) {
  const dataUpdate = useDataUpdate();
  const objectives = useObjectives();

  const [editMode, setEditMode] = useState(false);

  const secretObjectives = Object.values(objectives).filter((obj) => {
    return obj.type === "SECRET";
  });
  sortObjectivesByName(secretObjectives);

  function toggleEditMode() {
    setEditMode(!editMode);
  }

  function scoreObj(objectiveId: ObjectiveId, add: boolean) {
    if (add) {
      dataUpdate(Events.ScoreObjectiveEvent(factionId, objectiveId));
    } else {
      dataUpdate(Events.UnscoreObjectiveEvent(factionId, objectiveId));
    }
  }

  const factionSecrets = new Set<Objective>();
  for (const objective of secretObjectives) {
    if (!editMode) {
      if (
        (objective.factions ?? []).includes(factionId) ||
        (objective.scorers ?? []).includes(factionId)
      ) {
        factionSecrets.add(objective);
      }
    } else {
      if (
        !(objective.factions ?? []).includes(factionId) &&
        !(objective.scorers ?? []).includes(factionId)
      ) {
        factionSecrets.add(objective);
      }
    }
  }

  const maxHeight = `calc(100dvh - ${rem(450)})`;

  function editModeButton(objs: Set<Objective>) {
    if (editMode) {
      return <button onClick={toggleEditMode}>Done</button>;
    }
    // It's possible for 5 secret objectives to be scored by a player.
    // 3 normally, 1 from Obsidian, and 1 from Classified Document Leaks.
    if (objs.size <= 4) {
      return (
        <div className="flexColumn" style={{ gap: rem(4) }}>
          <RevealObjectiveButton onClick={toggleEditMode}>
            <FormattedMessage
              id="zlpl9F"
              description="Message telling a player to score a secret objective."
              defaultMessage="Score Secret Objective"
            />
          </RevealObjectiveButton>
        </div>
      );
    }
    return null;
  }

  return (
    <div>
      <div>
        <LabeledLine />
        {factionSecrets.size !== 0 ? (
          <div
            className="flexColumn largeFont"
            style={{
              maxHeight: maxHeight,
              overflow: "auto",
              display: "flex",
              padding: `${rem(4)} 0px`,
              justifyContent: "stretch",
              alignItems: "stretch",
            }}
          >
            {Array.from(factionSecrets).map((obj) => {
              return (
                <ObjectiveRow
                  key={obj.id}
                  factionId={factionId}
                  objectiveId={obj.id}
                  scoreObjective={scoreObj}
                />
              );
            })}
          </div>
        ) : null}
        <div className="flexRow" style={{ padding: rem(4) }}>
          {editModeButton(factionSecrets)}
        </div>
      </div>
    </div>
  );
}

function RevealObjectiveButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        backgroundColor: "var(--interactive-bg)",
        border: "2px solid var(--neutral-border)",
        borderRadius: rem(6),
        boxShadow: "0 0 0 1px var(--background-color)",
        color: "var(--foreground-color)",
        fontFamily: "var(--main-font)",
        fontSize: rem(14),
        padding: `${rem(5)} ${rem(12)}`,
      }}
    >
      {children}
    </button>
  );
}

// TODO: Rename to Objective Tab
export default function ObjectiveTab({ factionId }: { factionId: FactionId }) {
  const dataUpdate = useDataUpdate();
  const objectives = useObjectives();
  const viewOnly = useViewOnly();

  const intl = useIntl();

  const [tabShown, setTabShown] = useState("STAGE ONE");
  const [editMode, setEditMode] = useState(false);
  const [removeMode, setRemoveMode] = useState(false);

  function addObj(objectiveId: ObjectiveId) {
    dataUpdate(Events.RevealObjectiveEvent(objectiveId));
    setEditMode(false);
  }
  function scoreObj(objectiveId: ObjectiveId, add: boolean) {
    if (add) {
      dataUpdate(Events.ScoreObjectiveEvent(factionId, objectiveId));
    } else {
      dataUpdate(Events.UnscoreObjectiveEvent(factionId, objectiveId));
    }
  }

  let filteredObjectives = Object.values(objectives ?? {}).filter((obj) => {
    return (editMode && !obj.selected) || (!editMode && obj.selected);
  });

  sortObjectivesByName(filteredObjectives);

  const stageOneObjectives = filteredObjectives.filter((obj) => {
    return obj.type === "STAGE ONE";
  });

  const stageTwoObjectives = filteredObjectives.filter((obj) => {
    return obj.type === "STAGE TWO";
  });

  const secretObjectives = filteredObjectives.filter((obj) => {
    return obj.type === "SECRET";
  });

  const otherObjectives = filteredObjectives.filter((obj) => {
    return obj.type === "OTHER";
  });

  function toggleEditMode() {
    setRemoveMode(false);
    setEditMode(!editMode);
  }

  function editModeButton(stage: ObjectiveType) {
    if (editMode) {
      return <button onClick={toggleEditMode}>Done</button>;
    }
    switch (stage) {
      case "STAGE ONE":
        let maxStageOne = 6;
        for (const objective of stageOneObjectives) {
          if (objective.phase) {
            maxStageOne = 7;
          }
        }
        if (stageOneObjectives.length < maxStageOne) {
          return (
            <RevealObjectiveButton onClick={toggleEditMode}>
              <FormattedMessage
                id="6L07nG"
                description="Text telling the user to reveal an objective."
                defaultMessage="Reveal Objective"
              />
            </RevealObjectiveButton>
          );
        } else if (
          stageOneObjectives.length === 5 &&
          stageTwoObjectives.length !== 6
        ) {
          return (
            <RevealObjectiveButton onClick={toggleEditMode}>
              Reveal Objective (Incentive Program [For])
            </RevealObjectiveButton>
          );
        }
        return null;
      case "STAGE TWO":
        if (stageTwoObjectives.length < 5) {
          return (
            <RevealObjectiveButton onClick={toggleEditMode}>
              <FormattedMessage
                id="6L07nG"
                description="Text telling the user to reveal an objective."
                defaultMessage="Reveal Objective"
              />
            </RevealObjectiveButton>
          );
        } else if (
          stageTwoObjectives.length === 5 &&
          stageOneObjectives.length !== 6
        ) {
          return (
            <RevealObjectiveButton onClick={toggleEditMode}>
              Reveal Objective (Incentive Program [Against])
            </RevealObjectiveButton>
          );
        }
        return null;
      case "SECRET":
        if (secretObjectives.length < 3) {
          return (
            <div className="flexColumn" style={{ gap: rem(4) }}>
              <RevealObjectiveButton onClick={toggleEditMode}>
                <FormattedMessage
                  id="6L07nG"
                  description="Text telling the user to reveal an objective."
                  defaultMessage="Reveal Objective"
                />
              </RevealObjectiveButton>
              <div>This will not reveal to other players</div>
            </div>
          );
        } else if (secretObjectives.length === 3) {
          return (
            <RevealObjectiveButton onClick={toggleEditMode}>
              Reveal Objective (Classified Document Leaks [For])
            </RevealObjectiveButton>
          );
        }
        return null;
      case "OTHER":
        return (
          <RevealObjectiveButton onClick={toggleEditMode}>
            <FormattedMessage
              id="6L07nG"
              description="Text telling the user to reveal an objective."
              defaultMessage="Reveal Objective"
            />
          </RevealObjectiveButton>
        );
    }
  }

  function changeTab(tabName: string) {
    if (tabShown === tabName) {
      setEditMode(false);
      setRemoveMode(false);
      setTabShown("");
    } else {
      setEditMode(false);
      setRemoveMode(false);
      setTabShown(tabName);
    }
  }

  function canRemoveObjective(obj: Objective) {
    if (!removeMode || editMode) {
      return false;
    }
    if (obj.type === "STAGE ONE" && (obj.scorers ?? []).length > 0) {
      return false;
    }
    return true;
  }

  const maxHeight = `calc(100dvh - ${rem(420)})`;

  return (
    <div>
      <ChipGroup
        style={{
          margin: "auto",
          position: "sticky",
          top: rem(41),
        }}
      >
        <Tab selectTab={changeTab} id="STAGE ONE" selectedId={tabShown}>
          {objectiveTypeString("STAGE ONE", intl)}
        </Tab>
        <Tab selectTab={changeTab} id="STAGE TWO" selectedId={tabShown}>
          {objectiveTypeString("STAGE TWO", intl)}
        </Tab>
        <Tab selectTab={changeTab} id="secret" selectedId={tabShown}>
          {objectiveTypeString("SECRET", intl)}
        </Tab>
        <Tab selectTab={changeTab} id="other" selectedId={tabShown}>
          {objectiveTypeString("OTHER", intl)}
        </Tab>
      </ChipGroup>
      {tabShown && tabShown !== "secret" ? (
        <div className="flexRow" style={{ padding: `${rem(6)} 0 0` }}>
          <RemoveModeToggle
            active={removeMode}
            activeLabel={
              <FormattedMessage
                id="ObjectiveTab.RemoveModeOn"
                defaultMessage="Removing Objectives"
                description="Toggle label indicating objective removal mode is active."
              />
            }
            inactiveLabel={
              <FormattedMessage
                id="ObjectiveTab.RemoveModeOff"
                defaultMessage="Remove Objectives"
                description="Toggle label enabling objective removal mode."
              />
            }
            setActive={(active) => {
              setEditMode(false);
              setRemoveMode(active);
            }}
            viewOnly={viewOnly}
          />
        </div>
      ) : null}
      <TabBody id="STAGE ONE" selectedId={tabShown}>
        <div className="largeFont">
          <LabeledLine />
          {stageOneObjectives.length !== 0 ? (
            <div
              className="flexColumn"
              style={{
                maxHeight: maxHeight,
                overflow: "auto",
                display: "flex",
                padding: `${rem(4)} 0px`,
                justifyContent: "stretch",
                alignItems: "stretch",
              }}
            >
              {stageOneObjectives.map((obj) => {
                return (
                  <ObjectiveRow
                    key={obj.id}
                    factionId={factionId}
                    objectiveId={obj.id}
                    scoreObjective={scoreObj}
                    removeObjective={
                      canRemoveObjective(obj)
                        ? () => dataUpdate(Events.HideObjectiveEvent(obj.id))
                        : undefined
                    }
                    addObjective={editMode ? () => addObj(obj.id) : undefined}
                  />
                );
              })}
            </div>
          ) : null}
          {editModeButton("STAGE ONE") ? (
            <div className="flexRow" style={{ padding: `${rem(8)} 0px` }}>
              {editModeButton("STAGE ONE")}
            </div>
          ) : null}
        </div>
      </TabBody>
      <TabBody id="STAGE TWO" selectedId={tabShown}>
        <div className="largeFont">
          <LabeledLine />
          {stageTwoObjectives.length !== 0 ? (
            <div
              className="flexColumn"
              style={{
                maxHeight: maxHeight,
                overflow: "auto",
                display: "flex",
                padding: `${rem(4)} 0px`,
                justifyContent: "stretch",
                alignItems: "stretch",
              }}
            >
              {stageTwoObjectives.map((obj) => {
                return (
                  <ObjectiveRow
                    key={obj.id}
                    factionId={factionId}
                    objectiveId={obj.id}
                    scoreObjective={scoreObj}
                    removeObjective={
                      canRemoveObjective(obj)
                        ? () => dataUpdate(Events.HideObjectiveEvent(obj.id))
                        : undefined
                    }
                    addObjective={editMode ? () => addObj(obj.id) : undefined}
                  />
                );
              })}
            </div>
          ) : null}
          {editModeButton("STAGE TWO") ? (
            <div className="flexRow" style={{ padding: `${rem(8)} 0px` }}>
              {editModeButton("STAGE TWO")}
            </div>
          ) : null}
        </div>
      </TabBody>
      <TabBody id="secret" selectedId={tabShown}>
        <SecretTab factionId={factionId} />
      </TabBody>
      <TabBody id="other" selectedId={tabShown}>
        <div className="largeFont">
          <LabeledLine />
          {otherObjectives.length !== 0 ? (
            <div
              className="flexColumn"
              style={{
                maxHeight: maxHeight,
                overflow: "auto",
                display: "flex",
                padding: `${rem(4)} 0px`,
                justifyContent: "stretch",
                alignItems: "stretch",
              }}
            >
              {otherObjectives.map((obj) => {
                return (
                  <ObjectiveRow
                    key={obj.id}
                    factionId={factionId}
                    objectiveId={obj.id}
                    scoreObjective={scoreObj}
                    removeObjective={
                      canRemoveObjective(obj)
                        ? () => dataUpdate(Events.HideObjectiveEvent(obj.id))
                        : undefined
                    }
                    addObjective={editMode ? () => addObj(obj.id) : undefined}
                  />
                );
              })}
            </div>
          ) : null}
          {editModeButton("OTHER") ? (
            <div className="flexRow" style={{ padding: `${rem(8)} 0px` }}>
              {editModeButton("OTHER")}
            </div>
          ) : null}
        </div>
      </TabBody>
    </div>
  );
}

function RemoveModeToggle({
  active,
  activeLabel,
  inactiveLabel,
  setActive,
  viewOnly,
}: {
  active: boolean;
  activeLabel: ReactNode;
  inactiveLabel: ReactNode;
  setActive: (active: boolean) => void;
  viewOnly: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={() => setActive(!active)}
      disabled={viewOnly}
      style={{
        backgroundColor: active ? "var(--red-tech-color)" : "var(--interactive-bg)",
        border: `2px solid ${
          active ? "var(--red-tech-color)" : "var(--neutral-border)"
        }`,
        borderRadius: rem(6),
        boxShadow: active
          ? `0 0 ${rem(8)} var(--red-tech-color)`
          : "0 0 0 1px var(--background-color)",
        color: "var(--foreground-color)",
        fontFamily: "var(--main-font)",
        fontSize: rem(14),
        padding: `${rem(3)} ${rem(10)}`,
      }}
    >
      {active ? activeLabel : inactiveLabel}
    </button>
  );
}
