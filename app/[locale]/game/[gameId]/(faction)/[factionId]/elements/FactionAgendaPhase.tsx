import React, { useRef } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import {
  AgendaReference,
  AgendaRow,
} from "../../../../../../../src/AgendaRow";
import LabeledDiv from "../../../../../../../src/components/LabeledDiv/LabeledDiv";
import LabeledLine from "../../../../../../../src/components/LabeledLine/LabeledLine";
import { Selector } from "../../../../../../../src/components/Selector/Selector";
import FactionComponents from "../../../../../../../src/components/FactionComponents/FactionComponents";
import {
  getTargets,
  translateOutcome,
} from "../../../../../../../src/components/VoteBlock/VoteBlock";
import {
  useActionLog,
  useAgendas,
  useAttachments,
  useLeaders,
  useOptions,
  usePlanets,
  useStrategyCards,
  useTechs,
  useViewOnly,
} from "../../../../../../../src/context/dataHooks";
import { useFactions } from "../../../../../../../src/context/factionDataHooks";
import { useObjectives } from "../../../../../../../src/context/objectiveDataHooks";
import { useGameState } from "../../../../../../../src/context/stateDataHooks";
import { ClientOnlyHoverMenu } from "../../../../../../../src/HoverMenu";
import PlanetDiv from "../../../../../../../src/components/PlanetRow/PlanetDiv";
import InfluenceSVG from "../../../../../../../src/icons/planets/Influence";
import { SelectableRow } from "../../../../../../../src/SelectableRow";
import {
  getActiveAgenda,
  getFactionVotes,
  getSelectedEligibleOutcomes,
  getSpeakerTieBreak,
} from "../../../../../../../src/util/actionLog";
import {
  getCurrentAgendaLogEntries,
  getCurrentPhasePreviousLogEntries,
} from "../../../../../../../src/util/api/actionLog";
import { useDataUpdate } from "../../../../../../../src/util/api/dataUpdate";
import { Events } from "../../../../../../../src/util/api/events";
import {
  canFactionVote,
  computeRemainingAgendaVotes,
} from "../../../../../../../src/util/agendaVoting";
import { computeVotes } from "../../../../../../../src/util/agendaVotes";
import { getUncommittedAgendaFactions } from "../../../../../../../src/util/helpers";
import {
  applyAllPlanetAttachments,
  filterToClaimedPlanets,
} from "../../../../../../../src/util/planets";
import { Optional } from "../../../../../../../src/util/types/types";
import { rem } from "../../../../../../../src/util/util";
import styles from "../faction-page.module.scss";

export default function FactionAgendaPhase({
  factionId,
}: {
  factionId: FactionId;
}) {
  const actionLog = useActionLog();
  const agendas = useAgendas();
  const attachments = useAttachments();
  const dataUpdate = useDataUpdate();
  const factions = useFactions();
  const intl = useIntl();
  const leaders = useLeaders();
  const objectives = useObjectives();
  const options = useOptions();
  const planets = usePlanets();
  const state = useGameState();
  const strategyCards = useStrategyCards();
  const techs = useTechs();
  const viewOnly = useViewOnly();
  const voteRef = useRef<HTMLDivElement>(null);
  const currentAgendaLog = getCurrentAgendaLogEntries(actionLog);
  const isSpeaker = factionId === state.speaker;

  function saveCastVotes(element: HTMLDivElement) {
    if (!canEditVotes) {
      return;
    }
    if (element.innerText !== "") {
      const numerical = parseInt(element.innerText);
      if (!isNaN(numerical)) {
        dataUpdate(
          Events.CastVotesEvent(
            factionId,
            numerical,
            factionVotes?.extraVotes ?? 0,
            factionVotes?.target,
          ),
        );
        element.innerText = numerical.toString();
      }
    }
    element.innerText = factionVotes?.votes?.toString() ?? "0";
  }

  async function completeAgenda() {
    const tieBreak = getSpeakerTieBreak(currentAgendaLog);
    const target =
      tieBreak ?? (selectedTargets.length === 1 ? selectedTargets[0] : undefined);
    if (!target || !currentAgenda) {
      return;
    }
    dataUpdate(Events.ResolveAgendaEvent(currentAgenda.id, target));
  }

  async function commitVotes() {
    await dataUpdate(Events.EndTurnEvent({}));
  }

  async function abstainAndCommit() {
    if (!isActiveVoter) {
      return;
    }
    await dataUpdate(
      Events.CastVotesEvent(
        factionId,
        /* votes= */ 0,
        /* extraVotes= */ 0,
        "Abstain",
      ),
    );
    await dataUpdate(Events.EndTurnEvent({}));
  }

  async function startVoting() {
    if (!isSpeaker || state.votingStarted) {
      return;
    }
    await dataUpdate(Events.StartVotingEvent());
  }

  let currentAgenda: Optional<Agenda>;
  const activeAgenda = getActiveAgenda(currentAgendaLog);
  if (activeAgenda) {
    currentAgenda = agendas[activeAgenda];
  }

  if (!currentAgenda) {
    if (!isSpeaker) {
      return null;
    }
    const orderedAgendas = Object.values(agendas ?? {}).sort((a, b) => {
      if (a.name < b.name) {
        return -1;
      }
      return 1;
    });
    return (
      <LabeledDiv
        label={
          <FormattedMessage
            id="5R8kPv"
            description="Label for a section for actions by the speaker."
            defaultMessage="Speaker Actions"
          />
        }
        innerStyle={{ paddingTop: rem(12) }}
      >
        <ClientOnlyHoverMenu
          label={
            <FormattedMessage
              id="ZAYAbS"
              description="Instruction telling the speaker to reveal an agenda."
              defaultMessage="Reveal and Read one Agenda"
            />
          }
        >
          <div
            className="flexRow"
            style={{
              maxWidth: "85vw",
              gap: rem(4),
              display: "grid",
              gridAutoFlow: "column",
              gridTemplateRows: "repeat(8, auto)",
              whiteSpace: "nowrap",
              padding: rem(8),
              alignItems: "stretch",
              justifyContent: "flex-start",
              overflowX: "auto",
            }}
          >
            {orderedAgendas.map((agenda) => {
              return (
                <button
                  key={agenda.id}
                  style={{ writingMode: "horizontal-tb" }}
                  onClick={() =>
                    dataUpdate(Events.RevealAgendaEvent(agenda.id))
                  }
                  disabled={viewOnly}
                >
                  {agenda.name}
                </button>
              );
            })}
          </div>
        </ClientOnlyHoverMenu>
      </LabeledDiv>
    );
  }

  const faction = factions[factionId];
  if (!faction) {
    return null;
  }
  const factionVotes = getFactionVotes(currentAgendaLog, factionId);

  const localAgenda = structuredClone(currentAgenda);
  const eligibleOutcomes = getSelectedEligibleOutcomes(currentAgendaLog);
  if (localAgenda && eligibleOutcomes && eligibleOutcomes !== "None") {
    localAgenda.elect = eligibleOutcomes;
  }
  const representativeGovernmentPassed =
    agendas["Representative Government"]?.passed;
  const targets = getTargets(
    localAgenda,
    factions,
    strategyCards,
    planets,
    agendas,
    objectives,
    options,
    intl,
  );
  const totalVotes = computeVotes(
    currentAgenda,
    currentAgendaLog,
    Object.keys(factions).length,
    !!representativeGovernmentPassed,
  );
  const maxVotes = Object.values(totalVotes).reduce((maxVotes, voteCount) => {
    return Math.max(maxVotes, voteCount);
  }, 0);
  const selectedTargets = Object.entries(totalVotes)
    .filter(([_, voteCount]) => {
      return voteCount === maxVotes;
    })
    .map(([target, _]) => {
      return target;
    });
  const isTie = selectedTargets.length !== 1;

  let { influence, extraVotes } = computeRemainingAgendaVotes(
    factionId,
    factions,
    planets,
    attachments,
    agendas,
    options,
    state,
    getCurrentPhasePreviousLogEntries(actionLog),
    leaders,
    techs,
  );
  const agendaNum = state.agendaNum ?? 1;
  if (agendaNum > 2) {
    return null;
  }
  const tieBreak = getSpeakerTieBreak(currentAgendaLog);
  const resolveTarget =
    tieBreak ?? (selectedTargets.length === 1 ? selectedTargets[0] : undefined);
  const resolveOutcome =
    translateOutcome(
      resolveTarget,
      localAgenda?.elect,
      planets,
      factions,
      objectives,
      agendas,
      strategyCards,
      intl,
    ) ?? resolveTarget;
  const outcomes = new Set<OutcomeType>();
  Object.values(agendas ?? {}).forEach((agenda) => {
    if (agenda.target || agenda.elect === "???") return;
    outcomes.add(agenda.elect);
  });
  const label = agendaNum === 1 ? "FIRST AGENDA" : "SECOND AGENDA";
  const factionCanVote = canFactionVote(
    faction,
    agendas,
    state,
    currentAgendaLog,
    leaders,
  );
  const hasVotableTarget =
    !!factionVotes?.target && factionVotes?.target !== "Abstain";
  const items = Math.min((targets ?? []).length, 12);
  const isActiveVoter = state.votingStarted && state.activeplayer === factionId;
  const votingComplete = state.votingStarted && state.activeplayer === "None";
  const activeVoter =
    state.activeplayer && state.activeplayer !== "None"
      ? state.activeplayer
      : undefined;
  const showWaitingForStart = !state.votingStarted && !isSpeaker;
  const showWaitingForTurn =
    state.votingStarted && !!activeVoter && !isActiveVoter;
  const uncommittedFactions = new Set(
    state.votingStarted ? getUncommittedAgendaFactions(state, factions) : [],
  );
  const canEditVotes =
    !state.votingStarted || uncommittedFactions.has(factionId);
  const committedVoteTotal =
    (factionVotes?.votes ?? 0) + (factionVotes?.extraVotes ?? 0);
  const canCommitVotes =
    isActiveVoter &&
    (!factionCanVote ||
      (!!factionVotes?.target &&
        factionVotes.target !== "Abstain" &&
        committedVoteTotal > 0));
  const votingPlanets = applyAllPlanetAttachments(
    filterToClaimedPlanets(planets, factionId).filter((planet) => {
      return (
        planet.state !== "PURGED" &&
        !planet.attributes.includes("space-station") &&
        !planet.attributes.includes("ocean") &&
        !planet.attributes.includes("synthetic")
      );
    }),
    attachments,
  );

  return (
    <>
      <div className="largeFont" style={{ width: "100%" }}>
        <LabeledDiv label={label}>
          <AgendaRow
            agenda={currentAgenda}
            removeAgenda={
              isSpeaker
                ? () => {
                    if (!currentAgenda) {
                      return;
                    }
                    dataUpdate(Events.HideAgendaEvent(currentAgenda.id));
                  }
                : undefined
            }
          />
        </LabeledDiv>
      </div>
      {currentAgenda.id === "Covert Legislation" ? (
        eligibleOutcomes ? (
          <LabeledDiv
            label={
              <FormattedMessage
                id="+BcBcX"
                description="Label for a section showing the eligible outcomes."
                defaultMessage="Eligible Outcomes"
              />
            }
            innerStyle={{ paddingTop: rem(8) }}
          >
            <SelectableRow
              itemId={eligibleOutcomes}
              removeItem={
                isSpeaker
                  ? () => dataUpdate(Events.SelectEligibleOutcomesEvent("None"))
                  : undefined
              }
              viewOnly={viewOnly}
            >
              <div style={{ display: "flex", fontSize: rem(18) }}>
                {eligibleOutcomes}
              </div>
            </SelectableRow>
          </LabeledDiv>
        ) : isSpeaker ? (
          <LabeledDiv
            label={
              <FormattedMessage
                id="5R8kPv"
                description="Label for a section for actions by the speaker."
                defaultMessage="Speaker Actions"
              />
            }
            style={{ marginTop: rem(4) }}
            innerStyle={{ paddingTop: rem(12) }}
          >
            <ClientOnlyHoverMenu
              label={
                <FormattedMessage
                  id="cKaLW8"
                  description="Text on a hover menu for revealing eligible outcomes."
                  defaultMessage="Reveal Eligible Outcomes"
                />
              }
            >
              <div
                className="flexColumn"
                style={{
                  padding: rem(8),
                  gap: rem(4),
                  alignItems: "stretch",
                  justifyContent: "flex-start",
                }}
              >
                {Array.from(outcomes).map((outcome) => {
                  return (
                    <button
                      key={outcome}
                      onClick={() =>
                        dataUpdate(Events.SelectEligibleOutcomesEvent(outcome))
                      }
                      disabled={viewOnly}
                    >
                      {outcome}
                    </button>
                  );
                })}
              </div>
            </ClientOnlyHoverMenu>
          </LabeledDiv>
        ) : null
      ) : null}
      {isSpeaker && !state.votingStarted ? (
        <div
          className="flexRow"
          style={{ justifyContent: "center", width: "100%" }}
        >
          <button
            type="button"
            style={agendaButtonStyle(false, viewOnly)}
            onClick={startVoting}
            disabled={viewOnly}
          >
            <FormattedMessage
              id="gQ0twG"
              description="Text on a button that will start the voting part of Agenda Phase."
              defaultMessage="Start Voting"
            />
          </button>
        </div>
      ) : null}
      <div
        className="flexColumn"
        style={{ alignItems: "stretch", width: "100%" }}
      >
        <AgendaReference
          agenda={localAgenda}
          compact
          style={{
            border: `${"1px"} solid var(--neutral-border)`,
            borderRadius: rem(8),
            marginBottom: rem(8),
          }}
        />
        <LabeledLine leftLabel={`Vote on ${currentAgenda.name}`} />
        {!factionCanVote ? (
          <div className="flexColumn" style={{ gap: rem(8) }}>
            <div className="flexRow">
              <FormattedMessage
                id="c4LYqr"
                description="Text informing a player that they cannot vote."
                defaultMessage="Cannot Vote"
              />
            </div>
          </div>
        ) : (
          <React.Fragment>
            {showWaitingForStart ? <VotingLockedNotice /> : null}
            {showWaitingForTurn ? (
              <VotingLockedNotice activeVoter={activeVoter} />
            ) : null}
            <div
              className="flexColumn"
              style={{
                paddingLeft: rem(8),
                width: "100%",
                alignItems: "flex-start",
              }}
            >
              <Selector
                hoverMenuLabel={
                  <FormattedMessage
                    id="cHsAYk"
                    description="Text on hover menu for selecting voting outcome."
                    defaultMessage="Select Outcome"
                  />
                }
                selectedLabel="Selected Outcome"
                options={targets}
                selectedItem={factionVotes?.target}
                toggleItem={(itemId, add) => {
                  if (!canEditVotes) {
                    return;
                  }
                  if (add) {
                    dataUpdate(
                      Events.CastVotesEvent(
                        factionId,
                        /* votes= */ 0,
                        /* extraVotes= */ 0,
                        itemId,
                      ),
                    );
                  } else {
                    dataUpdate(
                      Events.CastVotesEvent(
                        factionId,
                        /* votes= */ 0,
                        /* extraVotes= */ 0,
                        undefined,
                      ),
                    );
                  }
                }}
                viewOnly={viewOnly || !canEditVotes}
              />
              <div
                className="flexRow"
                style={{
                  width: "100%",
                  justifyContent: "flex-start",
                  alignItems: "center",
                }}
              >
                Available Votes:
                <div className={styles.VotingBlock}>
                  <div className={styles.InfluenceSymbol}>
                    <InfluenceSVG influence={influence} />
                  </div>

                  <div style={{ fontSize: rem(16) }}>+ {extraVotes}</div>
                </div>
              </div>
              <div
                className="flexRow"
                style={{
                  width: "100%",
                  justifyContent: "flex-start",
                  alignItems: "center",
                }}
              >
                Cast Votes:
                <div
                  className="flexRow"
                  style={{
                    justifyContent: "flex-start",
                    flexShrink: 0,
                    gap: rem(12),
                    fontSize: rem(24),
                    paddingLeft: rem(12),
                  }}
                >
                  {(factionVotes?.votes ?? 0 > 0) ? (
                    <div
                      className="arrowDown"
                      onClick={() => {
                        if (!canEditVotes) {
                          return;
                        }
                        dataUpdate(
                          Events.CastVotesEvent(
                            factionId,
                            (factionVotes?.votes ?? 0) - 1,
                            factionVotes?.extraVotes ?? 0,
                            factionVotes?.target,
                          ),
                        );
                      }}
                    ></div>
                  ) : (
                    <div style={{ width: rem(12) }}></div>
                  )}
                  <div
                    className="flexRow"
                    ref={voteRef}
                    contentEditable={hasVotableTarget && canEditVotes}
                    suppressContentEditableWarning={true}
                    onClick={(e) => {
                      if (!hasVotableTarget || !canEditVotes) {
                        return;
                      }
                      e.currentTarget.innerText = "";
                    }}
                    onBlur={(e) => saveCastVotes(e.currentTarget)}
                    style={{
                      opacity: canEditVotes ? 1 : 0.7,
                      width: rem(32),
                    }}
                  >
                    {factionVotes?.votes ?? 0}
                  </div>
                  {factionVotes?.target &&
                  factionVotes?.target !== "Abstain" ? (
                    <div
                      className="arrowUp"
                      onClick={() => {
                        if (!canEditVotes) {
                          return;
                        }
                        dataUpdate(
                          Events.CastVotesEvent(
                            factionId,
                            (factionVotes?.votes ?? 0) + 1,
                            factionVotes?.extraVotes ?? 0,
                            factionVotes?.target,
                          ),
                        );
                      }}
                    ></div>
                  ) : null}
                </div>
              </div>
              <AgendaVotingPlanets
                canEditVotes={canEditVotes}
                planets={votingPlanets}
              />
            </div>
          </React.Fragment>
        )}
        <div
          className="flexRow"
          style={{
            gap: rem(8),
            justifyContent: "center",
            paddingTop: rem(8),
            width: "100%",
          }}
        >
          <button
            type="button"
            onClick={commitVotes}
            disabled={viewOnly || !canCommitVotes}
            style={agendaButtonStyle(false, viewOnly || !canCommitVotes)}
          >
            <FormattedMessage
              id="Agenda.CommitVotes"
              defaultMessage="Commit Votes"
              description="Text on a button that commits a player's agenda votes and advances voting order."
            />
          </button>
          <button
            type="button"
            className={factionVotes?.target === "Abstain" ? "selected" : ""}
            onClick={abstainAndCommit}
            disabled={viewOnly || !isActiveVoter}
            style={agendaButtonStyle(
              factionVotes?.target === "Abstain",
              viewOnly || !isActiveVoter,
            )}
          >
            <FormattedMessage
              id="LaXLjN"
              defaultMessage="Abstain"
              description="Outcome choosing not to vote."
            />
          </button>
        </div>
        <LabeledLine />
        {votingComplete && isTie ? (
          !tieBreak ? (
            isSpeaker ? (
              <LabeledDiv
                label={
                  <FormattedMessage
                    id="5R8kPv"
                    description="Label for a section for actions by the speaker."
                    defaultMessage="Speaker Actions"
                  />
                }
                innerStyle={{ paddingTop: rem(12) }}
              >
                <ClientOnlyHoverMenu
                  label={
                    <FormattedMessage
                      id="Kzzn9t"
                      description="Text on a hover menu for the speaker choosing the outcome."
                      defaultMessage="Choose outcome if tied"
                    />
                  }
                >
                  <div
                    className="flexRow"
                    style={{
                      maxWidth: "85vw",
                      gap: rem(4),
                      whiteSpace: "nowrap",
                      padding: rem(8),
                      alignItems: "stretch",
                      display: "grid",
                      gridAutoFlow: "column",
                      gridTemplateRows: `repeat(${items}, auto)`,
                      justifyContent: "flex-start",
                      overflowX: "auto",
                    }}
                  >
                    {selectedTargets.length > 0
                      ? selectedTargets.map((target) => {
                          return (
                            <button
                              key={target}
                              style={{ writingMode: "horizontal-tb" }}
                              onClick={() =>
                                dataUpdate(Events.SpeakerTieBreakEvent(target))
                              }
                              disabled={viewOnly}
                            >
                              {target}
                            </button>
                          );
                        })
                      : targets.map((target) => {
                          if (target.id === "Abstain") {
                            return null;
                          }
                          return (
                            <button
                              key={target.id}
                              style={{ writingMode: "horizontal-tb" }}
                              onClick={() =>
                                dataUpdate(
                                  Events.SpeakerTieBreakEvent(target.id),
                                )
                              }
                              disabled={viewOnly}
                            >
                              {target.name}
                            </button>
                          );
                        })}
                  </div>
                </ClientOnlyHoverMenu>
              </LabeledDiv>
            ) : null
          ) : (
            <LabeledDiv
              label="SPEAKER TIE BREAK"
              innerStyle={{ paddingTop: rem(8) }}
            >
              <SelectableRow
                itemId={tieBreak}
                removeItem={
                  isSpeaker
                    ? () => dataUpdate(Events.SpeakerTieBreakEvent("None"))
                    : undefined
                }
                viewOnly={viewOnly}
              >
                {tieBreak}
              </SelectableRow>
            </LabeledDiv>
          )
        ) : null}
        {isSpeaker && votingComplete ? (
          <div
            className="flexRow"
            style={{ width: "100%", justifyContent: "center" }}
          >
            <button
              onClick={completeAgenda}
              disabled={viewOnly || !resolveTarget}
            >
              {resolveTarget ? (
                <FormattedMessage
                  id="GR4fXA"
                  defaultMessage="Resolve with Outcome: {outcome}"
                  description="Text on a button that resolves the current agenda with a specific outcome."
                  values={{ outcome: resolveOutcome }}
                />
              ) : (
                <FormattedMessage
                  id="Agenda.ResolveNeedsTieBreak"
                  defaultMessage="Choose Tie-Break to Resolve"
                  description="Disabled button text telling the speaker to choose a tied outcome before resolving the agenda."
                />
              )}
            </button>
          </div>
        ) : null}
      </div>
    </>
  );
}

function AgendaVotingPlanets({
  canEditVotes,
  planets,
}: {
  canEditVotes: boolean;
  planets: Planet[];
}) {
  if (planets.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        boxSizing: "border-box",
        paddingTop: rem(8),
        width: "100%",
      }}
    >
      <LabeledLine
        label={
          <FormattedMessage
            id="1fNqTf"
            description="Planets."
            defaultMessage="Planets"
          />
        }
      />
      <div
        style={{
          alignItems: "flex-start",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "row",
          flexWrap: "wrap",
          gap: rem(8),
          justifyContent: "center",
          paddingTop: rem(4),
          width: "100%",
        }}
      >
        {planets.map((planet) => {
          return (
            <PlanetDiv
              key={planet.id}
              canToggleState={canEditVotes}
              planet={planet}
            />
          );
        })}
      </div>
    </div>
  );
}

function VotingLockedNotice({ activeVoter }: { activeVoter?: FactionId }) {
  return (
    <div
      className="flexColumn"
      style={{
        alignItems: "center",
        backgroundColor: "rgba(160, 160, 160, 0.12)",
        border: "2px solid var(--neutral-border)",
        borderRadius: rem(8),
        boxShadow: "0 0 0 1px var(--background-color)",
        boxSizing: "border-box",
        color: "var(--foreground-color)",
        gap: rem(3),
        margin: `${rem(2)} auto ${rem(8)}`,
        padding: `${rem(7)} ${rem(10)}`,
        textAlign: "center",
        width: "min(100%, 38rem)",
      }}
    >
      <div
        className="flexRow"
        style={{
          color: "var(--foreground-color)",
          fontFamily: "var(--main-font)",
          fontSize: rem(18),
          gap: rem(6),
          lineHeight: 1,
        }}
      >
        {activeVoter ? (
          <>
            <FactionComponents.Icon factionId={activeVoter} size={18} />
            <FormattedMessage
              id="Agenda.WaitingForVoter"
              defaultMessage="Waiting for {faction}"
              description="Text telling a player which faction is currently voting."
              values={{ faction: <FactionComponents.Name factionId={activeVoter} /> }}
            />
          </>
        ) : (
          <FormattedMessage
            id="Agenda.WaitingForVotingStart"
            defaultMessage="Waiting for voting to start"
            description="Text telling a player agenda voting has not started yet."
          />
        )}
      </div>
      <div
        style={{
          color: "var(--muted-text)",
          fontSize: rem(12),
          lineHeight: 1.15,
        }}
      >
        <FormattedMessage
          id="Agenda.VotingControlsLocked"
          defaultMessage="Commit and abstain unlock on your turn."
          description="Text explaining why agenda vote submission controls are unavailable."
        />
      </div>
    </div>
  );
}

function agendaButtonStyle(selected = false, disabled = false) {
  return {
    backgroundColor: disabled
      ? "var(--disabled-bg)"
      : selected
        ? "var(--hovered-bg)"
        : "var(--interactive-bg)",
    border: `2px solid ${
      selected && !disabled ? "var(--foreground-color)" : "var(--neutral-border)"
    }`,
    borderRadius: rem(6),
    boxShadow: disabled
      ? "none"
      : selected
      ? `0 0 ${rem(7)} var(--neutral-border)`
      : "0 0 0 1px var(--background-color)",
    color: disabled ? "var(--passed-text)" : "var(--foreground-color)",
    cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "var(--main-font)",
    fontSize: rem(15),
    padding: `${rem(5)} ${rem(12)}`,
  };
}
