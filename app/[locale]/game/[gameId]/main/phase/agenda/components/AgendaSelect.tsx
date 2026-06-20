import { FormattedMessage } from "react-intl";
import { AgendaRow } from "../../../../../../../../src/AgendaRow";
import {
  useActionLog,
  useAgendas,
  useViewOnly,
} from "../../../../../../../../src/context/dataHooks";
import { useGameState } from "../../../../../../../../src/context/stateDataHooks";
import { ClientOnlyHoverMenu } from "../../../../../../../../src/HoverMenu";
import { getActiveAgenda } from "../../../../../../../../src/util/actionLog";
import { getCurrentAgendaLogEntries } from "../../../../../../../../src/util/api/actionLog";
import { useDataUpdate } from "../../../../../../../../src/util/api/dataUpdate";
import { Events } from "../../../../../../../../src/util/api/events";
import { rem } from "../../../../../../../../src/util/util";

export default function AgendaSelect({
  activeAgenda,
  fontSize,
}: {
  activeAgenda?: AgendaId;
  fontSize?: string;
}) {
  const actionLog = useActionLog();
  const agendas = useAgendas();
  const dataUpdate = useDataUpdate();
  const state = useGameState();
  const viewOnly = useViewOnly();

  const fallbackAgenda = getActiveAgenda(getCurrentAgendaLogEntries(actionLog));
  const currentAgendaId = activeAgenda ?? fallbackAgenda;
  const currentAgenda = currentAgendaId ? agendas[currentAgendaId] : undefined;

  const orderedAgendas = Object.values(agendas).sort((a, b) => {
    if (a.name < b.name) {
      return -1;
    }
    return 1;
  });

  if (currentAgenda) {
    return (
      <AgendaRow
        agenda={currentAgenda}
        removeAgenda={
          state.votingStarted
            ? undefined
            : () => dataUpdate(Events.HideAgendaEvent(currentAgenda.id))
        }
      />
    );
  }

  return (
    <ClientOnlyHoverMenu
      label={
        <FormattedMessage
          id="ZAYAbS"
          description="Instruction telling the speaker to reveal an agenda."
          defaultMessage="Reveal and Read one Agenda"
        />
      }
      buttonStyle={fontSize ? { fontSize } : undefined}
    >
      <div
        className="flexRow"
        style={{
          padding: rem(8),
          maxWidth: "75vw",
          overflowX: "auto",
          gap: rem(4),
          display: "grid",
          gridAutoFlow: "column",
          gridTemplateRows: "repeat(10, auto)",
          alignItems: "stretch",
          justifyContent: "flex-start",
        }}
      >
        {orderedAgendas.map((agenda) => {
          return (
            <button
              key={agenda.id}
              className={agenda.resolved ? "faded" : ""}
              style={{
                fontSize: rem(14),
                writingMode: "horizontal-tb",
              }}
              onClick={() => dataUpdate(Events.RevealAgendaEvent(agenda.id))}
              disabled={viewOnly}
            >
              {agenda.name}
            </button>
          );
        })}
      </div>
    </ClientOnlyHoverMenu>
  );
}
