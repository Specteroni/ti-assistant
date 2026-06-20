import React from "react";
import { useSelectedAction } from "../../../../../../../src/context/actionLogDataHooks";
import { useViewOnly } from "../../../../../../../src/context/dataHooks";
import { useFactionSecondary } from "../../../../../../../src/context/factionDataHooks";
import { useActiveFactionId } from "../../../../../../../src/context/gameDataHooks";
import { useDataUpdate } from "../../../../../../../src/util/api/dataUpdate";
import { Events } from "../../../../../../../src/util/api/events";
import { rem } from "../../../../../../../src/util/util";
import {
  AdditionalActions,
  FactionActionButtons,
  NextPlayerButtons,
} from "../../../main/phase/action/ActionPhase";

export default function FactionActionPhase({
  factionId,
}: {
  factionId: FactionId;
}) {
  const activeFactionId = useActiveFactionId();
  const selectedAction = useSelectedAction();

  if (!activeFactionId) {
    return null;
  }

  if (factionId !== activeFactionId) {
    switch (selectedAction) {
      case "Leadership":
      case "Diplomacy":
      case "Politics":
      case "Construction":
      case "Trade":
      case "Warfare":
      case "Technology":
      case "Imperial":
      case "Lux":
      case "Noctis":
      case "Aeterna":
      case "Amicus":
      case "Calamitas":
      case "Civitas":
      case "Magus":
      case "Tyrannus":
        return (
          <>
            <SecondaryContextBanner selectedAction={selectedAction} />
            <SecondaryCheck factionId={factionId} />
            <AdditionalActions
              factionId={factionId}
              style={{ width: "100%" }}
              secondaryOnly={true}
            />
          </>
        );
    }
    return null;
  }

  return (
    <>
      <FactionActionButtons factionId={factionId} />
      <div
        className="flexColumn"
        style={{ width: "95%", alignItems: "flex-start" }}
      >
        <AdditionalActions
          factionId={factionId}
          style={{ width: "100%", alignItems: "flex-start" }}
          primaryOnly={true}
        />
      </div>
      <div className="flexRow" style={{ width: "100%" }}>
        <NextPlayerButtons activeFactionId={factionId} />
      </div>
    </>
  );
}

function SecondaryContextBanner({
  selectedAction,
}: {
  selectedAction: Action;
}) {
  return (
    <div className="flexRow" style={secondaryContextStyle}>
      <div style={secondaryContextLineStyle} />
      <div className="flexRow" style={secondaryContextContentStyle}>
        <div style={secondaryContextDotStyle} />
        <div className="flexColumn" style={secondaryContextTextStyle}>
          <div style={secondaryContextEyebrowStyle}>Resolving secondary</div>
          <div style={secondaryContextTitleStyle}>{selectedAction}</div>
        </div>
      </div>
      <div style={secondaryContextLineStyle} />
    </div>
  );
}

function SecondaryCheck({ factionId }: { factionId: FactionId }) {
  const dataUpdate = useDataUpdate();
  const secondaryState = useFactionSecondary(factionId);
  const viewOnly = useViewOnly();
  return (
    <div className="flexRow" style={{ gap: rem(8) }}>
      {secondaryState === "PENDING" ? (
        <React.Fragment>
          <button
            type="button"
            onClick={() => {
              dataUpdate(Events.MarkSecondaryEvent(factionId, "DONE"));
            }}
            disabled={viewOnly}
            style={secondaryButtonStyle(viewOnly)}
          >
            Mark Completed
          </button>
          <button
            type="button"
            onClick={() => {
              dataUpdate(Events.MarkSecondaryEvent(factionId, "SKIPPED"));
            }}
            disabled={viewOnly}
            style={secondaryButtonStyle(viewOnly)}
          >
            Skip
          </button>
        </React.Fragment>
      ) : (
        <button
          type="button"
          onClick={() => {
            dataUpdate(Events.MarkSecondaryEvent(factionId, "PENDING"));
          }}
          disabled={viewOnly}
          style={secondaryButtonStyle(viewOnly)}
        >
          Not Done Yet
        </button>
      )}
    </div>
  );
}

function secondaryButtonStyle(disabled = false) {
  return {
    backgroundColor: disabled ? "var(--disabled-bg)" : "var(--interactive-bg)",
    border: "2px solid var(--neutral-border)",
    borderRadius: rem(6),
    boxShadow: disabled ? "none" : "0 0 0 1px var(--background-color)",
    color: disabled ? "var(--passed-text)" : "var(--foreground-color)",
    cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "var(--main-font)",
    fontSize: rem(14),
    padding: `${rem(5)} ${rem(12)}`,
  };
}

const secondaryContextStyle = {
  alignItems: "center",
  gap: rem(8),
  marginBlockEnd: rem(6),
  width: "100%",
};

const secondaryContextLineStyle = {
  backgroundColor: "var(--neutral-border)",
  flex: 1,
  height: rem(1),
  minWidth: rem(24),
  opacity: 0.7,
};

const secondaryContextContentStyle = {
  alignItems: "center",
  backgroundColor: "rgb(255 255 255 / 0.06)",
  borderLeft: "3px solid var(--neutral-border)",
  gap: rem(7),
  padding: `${rem(3)} ${rem(10)}`,
};

const secondaryContextDotStyle = {
  backgroundColor: "var(--neutral-border)",
  borderRadius: "50%",
  boxShadow: "0 0 0 3px rgb(255 255 255 / 0.08)",
  height: rem(7),
  width: rem(7),
};

const secondaryContextTextStyle = {
  alignItems: "flex-start",
  gap: rem(1),
};

const secondaryContextEyebrowStyle = {
  color: "var(--neutral-text)",
  fontSize: rem(9),
  lineHeight: 1,
  textTransform: "uppercase" as const,
};

const secondaryContextTitleStyle = {
  color: "var(--foreground-color)",
  fontSize: rem(15),
  lineHeight: 1,
};
