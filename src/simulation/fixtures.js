// Entirely fictional values chosen to exercise high, medium and low outcomes.
// These are not market data or estimates about the named neighbourhoods.
export const fixtures = Object.freeze({
  TAMPINES: { affluentPercentage: 38, workingAgePercentage: 60, transactions: 180, avgPrice: 650000, btoUnits: 1800 },
  BISHAN: { affluentPercentage: 33, workingAgePercentage: 60, transactions: 60, avgPrice: 780000, btoUnits: 600 },
  BEDOK: { affluentPercentage: 28, workingAgePercentage: 60, transactions: 20, avgPrice: 580000, btoUnits: 0 }
});

export const simulationServices = {
  async getAreaDemographics(area) {
    const fixture = fixtures[area.toUpperCase()];
    if (!fixture) throw new Error('No simulation fixture for this area');
    return {
      planningArea: area.toUpperCase(),
      totalPopulation: 100000,
      affluentPercentage: fixture.affluentPercentage,
      workingAgePercentage: fixture.workingAgePercentage,
      population35To54Percentage: fixture.affluentPercentage,
      note: 'Synthetic data. The existing affluentPercentage field is an age-band proxy (35–54), not measured income or wealth.'
    };
  },
  async getRecentResaleTransactions(months, area) {
    const rows = Object.entries(fixtures)
      .filter(([town]) => !area || town === area.toUpperCase())
      .map(([town, fixture]) => ({ town, count: fixture.transactions, avgPrice: fixture.avgPrice }));
    return { period: `${months} months`, totalTransactions: rows.reduce((sum, row) => sum + row.count, 0), byTown: rows, transactions: [] };
  },
  async getUpcomingBTOs(quarterStart, quarterEnd) {
    const byTown = Object.entries(fixtures).filter(([, fixture]) => fixture.btoUnits > 0)
      .map(([town, fixture]) => ({ town, totalUnits: fixture.btoUnits, projects: [{ name: 'Fictional demo project', units: fixture.btoUnits }] }));
    return { quarterStart, quarterEnd, byTown, totalUnits: byTown.reduce((sum, row) => sum + row.totalUnits, 0) };
  }
};
