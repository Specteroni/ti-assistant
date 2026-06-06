export function getVotesAfterPlanetStateChange(
  currentVotes: number,
  planetVotes: number,
  nextState: PlanetState,
) {
  if (planetVotes <= 0) {
    return currentVotes;
  }
  if (nextState === "EXHAUSTED") {
    return currentVotes + planetVotes;
  }
  if (nextState === "READIED") {
    return Math.max(currentVotes - planetVotes, 0);
  }
  return currentVotes;
}
