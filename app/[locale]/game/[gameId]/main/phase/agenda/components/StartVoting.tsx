import { FormattedMessage } from "react-intl";
import { useCurrentAgenda } from "../../../../../../../../src/context/actionLogDataHooks";
import { useViewOnly } from "../../../../../../../../src/context/dataHooks";
import { useGameState } from "../../../../../../../../src/context/stateDataHooks";
import { useDataUpdate } from "../../../../../../../../src/util/api/dataUpdate";
import { Events } from "../../../../../../../../src/util/api/events";

export default function StartVoting() {
  const currentAgenda = useCurrentAgenda();
  const dataUpdate = useDataUpdate();
  const state = useGameState();
  const viewOnly = useViewOnly();

  if (!currentAgenda) {
    return null;
  }

  if (state.votingStarted) {
    return null;
  }
  return (
    <button
      style={{
        alignSelf: "center",
        backgroundColor: viewOnly
          ? "var(--disabled-bg)"
          : "var(--interactive-bg)",
        border: "2px solid var(--neutral-border)",
        borderRadius: "0.375rem",
        boxShadow: viewOnly ? "none" : "0 0 0 1px var(--background-color)",
        color: viewOnly ? "var(--passed-text)" : "var(--foreground-color)",
        cursor: viewOnly ? "not-allowed" : "pointer",
        fontFamily: "var(--main-font)",
        fontSize: "1.1rem",
        padding: "0.25rem 0.75rem",
        width: "fit-content",
      }}
      onClick={() => {
        dataUpdate(Events.StartVotingEvent());
      }}
      disabled={viewOnly}
    >
      <FormattedMessage
        id="gQ0twG"
        description="Text on a button that will start the voting part of Agenda Phase."
        defaultMessage="Start Voting"
      />
    </button>
  );
}
