import express from 'express';

// Both the live API and simulation use these same handlers and scoring rules.
export function createIntelligenceRouter({ getUpcomingBTOs, getRecentResaleTransactions, getAreaDemographics }) {
  const router = express.Router();

  /**
   * POST /api/intelligence/score-area
   * Score an area for lead targeting potential
   * Body: { planningArea, includeResale, includeBTO }
   */
  router.post('/score-area', async (req, res) => {
    try {
      const { planningArea, includeResale = true, includeBTO = true } = req.body;

      if (!planningArea) {
        return res.status(400).json({
          success: false,
          error: 'planningArea is required'
        });
      }

      console.log(`📥 API Request: Score area ${planningArea}`);

      const area = planningArea.toUpperCase();
      let score = 0;
      const factors = {};

      // 1. Get demographics
      try {
        const demographics = await getAreaDemographics(area);
        factors.demographics = demographics;

        // Score based on affluent population (0-40 points)
        const affluentScore = Math.min(demographics.affluentPercentage, 40);
        score += affluentScore;
        factors.affluentScore = affluentScore;

        // Score based on working age population (0-20 points)
        const workingAgeScore = Math.min(demographics.workingAgePercentage / 5, 20);
        score += workingAgeScore;
        factors.workingAgeScore = workingAgeScore;
      } catch (error) {
        console.warn('Demographics unavailable for this area');
        factors.demographics = null;
      }

      // 2. Get recent resale activity (0-20 points)
      if (includeResale) {
        try {
          const resale = await getRecentResaleTransactions(3, area);
          factors.resaleActivity = {
            transactions: resale.totalTransactions,
            avgPrice: resale.byTown[0]?.avgPrice || 0
          };

          // More transactions = higher interest/activity
          const resaleScore = Math.min((resale.totalTransactions / 10), 20);
          score += resaleScore;
          factors.resaleScore = resaleScore;
        } catch (error) {
          console.warn('Resale data unavailable');
          factors.resaleActivity = null;
        }
      }

      // 3. Check for upcoming BTOs (0-20 points)
      if (includeBTO) {
        try {
          const currentYear = new Date().getFullYear();
          const btos = await getUpcomingBTOs(`${currentYear}Q1`, `${currentYear + 2}Q4`);

          const areaBTOs = btos.byTown.find(t => t.town === area);
          if (areaBTOs) {
            factors.btoActivity = {
              projects: areaBTOs.projects.length,
              totalUnits: areaBTOs.totalUnits
            };

            // More units = more potential leads
            const btoScore = Math.min((areaBTOs.totalUnits / 100), 20);
            score += btoScore;
            factors.btoScore = btoScore;
          } else {
            factors.btoActivity = null;
          }
        } catch (error) {
          console.warn('BTO data unavailable');
          factors.btoActivity = null;
        }
      }

      // Normalize score to 0-100
      score = Math.min(Math.round(score), 100);

      // Determine targeting priority
      let priority = 'LOW';
      if (score >= 70) priority = 'HIGH';
      else if (score >= 50) priority = 'MEDIUM';

      res.status(200).json({
        success: true,
        planningArea: area,
        score,
        priority,
        factors,
        recommendation: getRecommendation(score, factors)
      });
    } catch (error) {
      console.error('Intelligence API Error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/intelligence/hot-targets
   * Get top areas to target based on combined intelligence
   * Query params: limit (default: 10), quarters (default: 2024Q1-2025Q4)
   */
  router.get('/hot-targets', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 10;
      const quarterStart = req.query.quarterStart || `${new Date().getFullYear()}Q1`;
      const quarterEnd = req.query.quarterEnd || `${new Date().getFullYear() + 1}Q4`;

      console.log(`📥 API Request: Get hot targets (top ${limit})`);

      // Get all upcoming BTOs
      const btos = await getUpcomingBTOs(quarterStart, quarterEnd);

      // Get recent resale data
      const resale = await getRecentResaleTransactions(3, null);

      // Combine all areas
      const allAreas = new Set([
        ...btos.byTown.map(t => t.town),
        ...resale.byTown.map(t => t.town)
      ]);

      const scores = [];

      for (const area of allAreas) {
        try {
          const demographics = await getAreaDemographics(area);
          const areaBTO = btos.byTown.find(t => t.town === area);
          const areaResale = resale.byTown.find(t => t.town === area);

          // Calculate composite score
          let score = 0;

          // Demographics (40%)
          score += (demographics.affluentPercentage * 0.4);

          // Resale activity (30%)
          if (areaResale) {
            const resaleScore = Math.min((areaResale.count / resale.totalTransactions) * 100, 30);
            score += resaleScore;
          }

          // BTO activity (30%)
          if (areaBTO) {
            const btoScore = Math.min((areaBTO.totalUnits / btos.totalUnits) * 100, 30);
            score += btoScore;
          }

          scores.push({
            planningArea: area,
            score: Math.round(score),
            demographics: {
              affluent: demographics.affluentPercentage,
              population: demographics.totalPopulation
            },
            btoUnits: areaBTO?.totalUnits || 0,
            resaleTransactions: areaResale?.count || 0,
            avgResalePrice: areaResale?.avgPrice || 0
          });
        } catch (error) {
          console.warn(`Skipping ${area}:`, error.message);
        }
      }

      const hotTargets = scores
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      res.status(200).json({
        success: true,
        period: `${quarterStart} to ${quarterEnd}`,
        total: hotTargets.length,
        targets: hotTargets
      });
    } catch (error) {
      console.error('Intelligence API Error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/intelligence/new-movers
   * Identify areas with new movers (BTO completions + recent resales)
   */
  router.get('/new-movers', async (req, res) => {
    try {
      const quarters = req.query.quarters || 2;
      const currentYear = new Date().getFullYear();
      const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);

      const quarterStart = `${currentYear}Q${currentQuarter}`;
      const endQuarter = currentQuarter + parseInt(quarters) - 1;
      const endYear = endQuarter > 4 ? currentYear + 1 : currentYear;
      const quarterEnd = `${endYear}Q${endQuarter > 4 ? endQuarter - 4 : endQuarter}`;

      console.log(`📥 API Request: Get new movers (${quarterStart} to ${quarterEnd})`);

      // Get completing BTOs
      const btos = await getUpcomingBTOs(quarterStart, quarterEnd);

      // Get recent resales (last 3 months)
      const resales = await getRecentResaleTransactions(3, null);

      const newMoverAreas = [];

      const allAreas = new Set([
        ...btos.byTown.map(t => t.town),
        ...resales.byTown.map(t => t.town)
      ]);

      for (const area of allAreas) {
        const areaBTO = btos.byTown.find(t => t.town === area);
        const areaResale = resales.byTown.find(t => t.town === area);

        const newMovers = {
          planningArea: area,
          btoNewMovers: areaBTO?.totalUnits || 0,
          resaleNewMovers: areaResale?.count || 0,
          totalNewMovers: (areaBTO?.totalUnits || 0) + (areaResale?.count || 0)
        };

        if (newMovers.totalNewMovers > 0) {
          newMoverAreas.push(newMovers);
        }
      }

      const topAreas = newMoverAreas
        .sort((a, b) => b.totalNewMovers - a.totalNewMovers)
        .slice(0, parseInt(req.query.limit) || 15);

      res.status(200).json({
        success: true,
        period: `${quarterStart} to ${quarterEnd}`,
        totalAreas: topAreas.length,
        areas: topAreas,
        summary: {
          totalBTOMovers: topAreas.reduce((sum, a) => sum + a.btoNewMovers, 0),
          totalResaleMovers: topAreas.reduce((sum, a) => sum + a.resaleNewMovers, 0),
          grandTotal: topAreas.reduce((sum, a) => sum + a.totalNewMovers, 0)
        }
      });
    } catch (error) {
      console.error('Intelligence API Error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * Helper function to generate recommendations
   */
  function getRecommendation(score, factors) {
    const recommendations = [];

    if (score >= 70) {
      recommendations.push('🎯 HIGH PRIORITY: Excellent area for targeting');

      if (factors.btoActivity) {
        recommendations.push(`📍 ${factors.btoActivity.totalUnits} BTO units - Target pre-move marketing`);
      }

      if (factors.resaleActivity && factors.resaleActivity.transactions > 50) {
        recommendations.push('🏠 High resale activity - Target recent buyers within 3 months');
      }

      if (factors.demographics && factors.demographics.affluentPercentage > 25) {
        recommendations.push('💰 Affluent demographics - Premium product targeting');
      }
    } else if (score >= 50) {
      recommendations.push('⚡ MEDIUM PRIORITY: Good targeting potential');

      if (factors.btoActivity) {
        recommendations.push('Target BTO completions with timing-sensitive offers');
      }

      if (factors.resaleActivity) {
        recommendations.push('Monitor resale activity for opportunities');
      }
    } else {
      recommendations.push('📊 LOW PRIORITY: Limited current opportunity');
      recommendations.push('Consider monitoring for future developments');
    }

    return recommendations;
  }

  return router;
}
