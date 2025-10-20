import express from 'express';
import { getDemographicsByArea, getAreaDemographics } from '../services/datagovsg.js';

const router = express.Router();

/**
 * GET /api/demographics/area/:area
 * Get demographics summary for a specific planning area
 */
router.get('/area/:area', async (req, res) => {
  try {
    const { area } = req.params;

    console.log(`📥 API Request: Get demographics for ${area}`);
    const demographics = await getAreaDemographics(area);

    res.status(200).json({
      success: true,
      ...demographics
    });
  } catch (error) {
    console.error('Demographics API Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/demographics/affluent-areas
 * Get areas with highest affluent population percentage
 * Query params: limit (default: 10)
 */
router.get('/affluent-areas', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    console.log(`📥 API Request: Get affluent areas (top ${limit})`);

    // Common planning areas (you can expand this list)
    const planningAreas = [
      'TAMPINES', 'BEDOK', 'JURONG WEST', 'WOODLANDS', 'HOUGANG',
      'TOA PAYOH', 'YISHUN', 'CHOA CHU KANG', 'PUNGGOL', 'SENGKANG',
      'BUKIT MERAH', 'BUKIT PANJANG', 'ANG MO KIO', 'CLEMENTI', 'BISHAN',
      'KALLANG', 'QUEENSTOWN', 'PASIR RIS', 'SERANGOON', 'MARINE PARADE'
    ];

    const results = [];
    for (const area of planningAreas) {
      try {
        const demographics = await getAreaDemographics(area);
        results.push({
          planningArea: area,
          totalPopulation: demographics.totalPopulation,
          affluentPopulation: demographics.affluentPopulation,
          affluentPercentage: demographics.affluentPercentage,
          workingAgePercentage: demographics.workingAgePercentage
        });
      } catch (error) {
        console.warn(`Skipping ${area}:`, error.message);
      }
    }

    // Sort by affluent percentage
    const affluent = results
      .sort((a, b) => b.affluentPercentage - a.affluentPercentage)
      .slice(0, limit);

    res.status(200).json({
      success: true,
      total: affluent.length,
      areas: affluent
    });
  } catch (error) {
    console.error('Demographics API Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/demographics/high-spending-power
 * Get areas with high spending power (affluent + working age)
 * Query params: limit (default: 10)
 */
router.get('/high-spending-power', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    console.log(`📥 API Request: Get high spending power areas (top ${limit})`);

    const planningAreas = [
      'TAMPINES', 'BEDOK', 'JURONG WEST', 'WOODLANDS', 'HOUGANG',
      'TOA PAYOH', 'YISHUN', 'CHOA CHU KANG', 'PUNGGOL', 'SENGKANG',
      'BUKIT MERAH', 'BUKIT PANJANG', 'ANG MO KIO', 'CLEMENTI', 'BISHAN',
      'KALLANG', 'QUEENSTOWN', 'PASIR RIS', 'SERANGOON', 'MARINE PARADE'
    ];

    const results = [];
    for (const area of planningAreas) {
      try {
        const demographics = await getAreaDemographics(area);

        // Calculate spending power score (weighted combination)
        const spendingPowerScore =
          (demographics.affluentPercentage * 0.6) +
          (demographics.workingAgePercentage * 0.4);

        results.push({
          planningArea: area,
          totalPopulation: demographics.totalPopulation,
          affluentPopulation: demographics.affluentPopulation,
          affluentPercentage: demographics.affluentPercentage,
          workingAgePercentage: demographics.workingAgePercentage,
          spendingPowerScore: Math.round(spendingPowerScore)
        });
      } catch (error) {
        console.warn(`Skipping ${area}:`, error.message);
      }
    }

    // Sort by spending power score
    const topAreas = results
      .sort((a, b) => b.spendingPowerScore - a.spendingPowerScore)
      .slice(0, limit);

    res.status(200).json({
      success: true,
      total: topAreas.length,
      areas: topAreas,
      note: 'Spending power score = (affluent% * 0.6) + (working age% * 0.4)'
    });
  } catch (error) {
    console.error('Demographics API Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/demographics/compare
 * Compare demographics between multiple areas
 * Query params: areas (comma-separated)
 * Example: ?areas=TAMPINES,BEDOK,BISHAN
 */
router.get('/compare', async (req, res) => {
  try {
    const areasParam = req.query.areas;

    if (!areasParam) {
      return res.status(400).json({
        success: false,
        error: 'areas parameter is required',
        example: '?areas=TAMPINES,BEDOK,BISHAN'
      });
    }

    const areas = areasParam.split(',').map(a => a.trim().toUpperCase());

    console.log(`📥 API Request: Compare demographics for ${areas.join(', ')}`);

    const results = [];
    for (const area of areas) {
      try {
        const demographics = await getAreaDemographics(area);
        results.push(demographics);
      } catch (error) {
        console.warn(`Error fetching ${area}:`, error.message);
      }
    }

    res.status(200).json({
      success: true,
      areasCompared: results.length,
      data: results
    });
  } catch (error) {
    console.error('Demographics API Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/demographics/age-distribution/:area
 * Get detailed age distribution for an area
 */
router.get('/age-distribution/:area', async (req, res) => {
  try {
    const { area } = req.params;

    console.log(`📥 API Request: Get age distribution for ${area}`);
    const demographics = await getAreaDemographics(area);

    // Convert to array for easier charting
    const distribution = Object.entries(demographics.ageDistribution).map(([age, pop]) => ({
      ageGroup: age,
      population: pop
    })).sort((a, b) => {
      // Sort by age group
      const ageA = parseInt(a.ageGroup.split('-')[0]);
      const ageB = parseInt(b.ageGroup.split('-')[0]);
      return ageA - ageB;
    });

    res.status(200).json({
      success: true,
      planningArea: demographics.planningArea,
      year: demographics.year,
      totalPopulation: demographics.totalPopulation,
      distribution
    });
  } catch (error) {
    console.error('Demographics API Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
