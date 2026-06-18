import type { CSSProperties } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import FormattedDescription from "./components/FormattedDescription/FormattedDescription";
import { useOutcome } from "./context/agendaDataHooks";
import { useViewOnly } from "./context/dataHooks";
import { InfoRow } from "./InfoRow";
import { SelectableRow } from "./SelectableRow";
import { agendaTypeString, outcomeString } from "./util/strings";
import { rem } from "./util/util";

interface AgendaReferenceProps {
  agenda: Agenda;
  compact?: boolean;
  style?: CSSProperties;
}

export function AgendaReference({
  agenda,
  compact,
  style,
}: AgendaReferenceProps) {
  const intl = useIntl();

  return (
    <div
      className="flexColumn"
      style={{
        alignItems: "stretch",
        boxSizing: "border-box",
        gap: rem(6),
        padding: compact ? `${rem(6)} ${rem(10)}` : rem(8),
        width: "100%",
        ...style,
      }}
    >
      <div
        className="flexRow"
        style={{
          alignItems: "baseline",
          flexWrap: "wrap",
          gap: rem(8),
          justifyContent: "space-between",
          width: "100%",
        }}
      >
        <div
          style={{
            fontFamily: "var(--main-font)",
            fontSize: compact ? rem(20) : rem(24),
          }}
        >
          {agenda.name}
        </div>
        <div
          style={{
            fontSize: compact ? rem(14) : rem(18),
            opacity: 0.75,
          }}
        >
          [{agendaTypeString(agenda.type, intl)}]
        </div>
      </div>
      {agenda.elect !== "For/Against" ? (
        <div
          style={{
            fontFamily: "var(--main-font)",
            fontSize: compact ? rem(15) : rem(18),
          }}
        >
          <FormattedMessage
            id="EAsvAe"
            defaultMessage="Elect {outcomeType}"
            description="Text explaining what players should be voting for."
            values={{ outcomeType: outcomeString(agenda.elect, intl) }}
          />
        </div>
      ) : null}
      <div
        style={{
          fontSize: compact ? rem(15) : rem(18),
          lineHeight: 1.25,
          textAlign: "left",
          whiteSpace: "pre-line",
        }}
      >
        <FormattedDescription description={agenda.description} />
      </div>
    </div>
  );
}

function InfoContent({ agenda }: { agenda: Agenda }) {
  const intl = useIntl();

  return (
    <div
      style={{
        boxSizing: "border-box",
        width: "100%",
        minWidth: rem(320),
        padding: rem(4),
        whiteSpace: "pre-line",
        textAlign: "center",
        fontSize: rem(32),
      }}
    >
      <div className="flexColumn" style={{ gap: rem(32) }}>
        {agenda.elect !== "For/Against" ? (
          <div
            style={{
              paddingTop: rem(12),
              fontFamily: "var(--main-font)",
            }}
          >
            <FormattedMessage
              id="EAsvAe"
              defaultMessage="Elect {outcomeType}"
              description="Text explaining what players should be voting for."
              values={{ outcomeType: outcomeString(agenda.elect, intl) }}
            />
          </div>
        ) : null}
        <FormattedDescription description={agenda.description} />
      </div>
    </div>
  );
}

interface AgendaRowProps {
  agenda: Agenda;
  removeAgenda?: (agendaId: AgendaId) => void;
  hideOutcome?: boolean;
}

export function AgendaRow({
  agenda,
  removeAgenda,
  hideOutcome,
}: AgendaRowProps) {
  const viewOnly = useViewOnly();
  const intl = useIntl();

  const outcome = useOutcome(agenda.id, intl);

  const textColor = "var(--foreground-color)";

  return (
    <SelectableRow
      itemId={agenda.id}
      removeItem={removeAgenda}
      viewOnly={viewOnly}
    >
      <InfoRow
        infoTitle={
          <div className="flexColumn" style={{ fontSize: rem(40) }}>
            {agenda.name}
            <div style={{ fontSize: rem(24) }}>
              [{agendaTypeString(agenda.type, intl)}]
            </div>
          </div>
        }
        infoContent={<InfoContent agenda={agenda} />}
      >
        <div
          className="flexColumn"
          style={{
            color: textColor,
            alignItems: "flex-start",
            whiteSpace: "nowrap",
          }}
        >
          <div>{agenda.name}</div>
          {agenda.target && !hideOutcome ? <div>[{outcome}]</div> : null}
        </div>
      </InfoRow>
    </SelectableRow>
  );
}
