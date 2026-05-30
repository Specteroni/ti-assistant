export class UpdateTechStateHandler implements Handler {
  constructor(
    public gameData: StoredGameData,
    public data: UpdateTechStateData,
  ) {
    const tech =
      gameData.factions[data.event.faction]?.techs?.[data.event.tech];
    this.data.event.prevState = tech?.state ?? "ready";
  }

  validate(): boolean {
    return true;
  }

  getUpdates(): Record<string, any> {
    return {
      [`state.paused`]: false,
      [`sequenceNum`]: "INCREMENT",
      [`factions.${this.data.event.faction}.techs.${this.data.event.tech}.state`]:
        this.data.event.state,
    };
  }

  getLogEntry(): ActionLogEntry<GameUpdateData> {
    return {
      timestampMillis: Date.now(),
      data: this.data,
    };
  }

  getActionLogAction(entry: ActionLogEntry<GameUpdateData>): ActionLogAction {
    if (
      entry.data.action === "UPDATE_TECH_STATE" &&
      entry.data.event.faction === this.data.event.faction &&
      entry.data.event.tech === this.data.event.tech
    ) {
      if (this.data.event.state === "ready") {
        return "DELETE";
      }
      return "REPLACE";
    }
    return "IGNORE";
  }
}
