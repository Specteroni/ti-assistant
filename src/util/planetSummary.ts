export interface PlanetSummaryValues {
  numPlanets: number;
  resources: number;
  influence: number;
  cultural: number;
  hazardous: number;
  industrial: number;
  legendary: number;
  techSkips: number;
  attachments: number;
}

export function computePlanetSummaryValues(
  planets: Planet[],
  hasXxchaHeroResources: boolean,
  countExhaustedValues = false,
): PlanetSummaryValues {
  const values: PlanetSummaryValues = {
    numPlanets: 0,
    resources: 0,
    influence: 0,
    cultural: 0,
    hazardous: 0,
    industrial: 0,
    legendary: 0,
    techSkips: 0,
    attachments: 0,
  };

  for (const planet of planets) {
    if (planet.state === "PURGED") {
      continue;
    }

    if (
      !planet.attributes.includes("space-station") &&
      !planet.attributes.includes("ocean") &&
      !planet.attributes.includes("synthetic")
    ) {
      values.numPlanets++;
    }

    if (countExhaustedValues || planet.state !== "EXHAUSTED") {
      if (hasXxchaHeroResources) {
        values.resources += planet.resources + planet.influence;
        values.influence += planet.resources + planet.influence;
      } else {
        values.resources += planet.resources;
        values.influence += planet.influence;
      }
    }

    let hasSkip = false;
    for (const attribute of planet.attributes) {
      if (attribute.endsWith("skip")) {
        hasSkip = true;
      }
      if (attribute === "legendary") {
        ++values.legendary;
      }
    }
    if (hasSkip) {
      ++values.techSkips;
    }
    for (const type of planet.types) {
      switch (type) {
        case "CULTURAL":
          ++values.cultural;
          break;
        case "INDUSTRIAL":
          ++values.industrial;
          break;
        case "HAZARDOUS":
          ++values.hazardous;
          break;
      }
    }
    if ((planet.attachments ?? []).length > 0) {
      ++values.attachments;
    }
  }

  return values;
}
