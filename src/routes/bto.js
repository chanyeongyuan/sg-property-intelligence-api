import express from 'express';
import { getBTOProjects, getUpcomingBTOs } from '../services/datagovsg.js';

const router = express.Router();

/**
 * GET /api/bto/all
 * Get all BTO projects
 */
router.get('/all', async (req, res) => {
  try {
    console.log('📥 API Request: Get all BTO projects');
    const projects = await getBTOProjects();

    res.status(200).json({
      success: true,
      total: projects.length,
      data: projects
    });
  } catch (error) {
    console.error('BTO API Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/bto/upcoming
 * Get upcoming BTO projects by quarter range
 * Query params: quarterStart, quarterEnd
 * Example: ?quarterStart=2024Q1&quarterEnd=2025Q4
 */
router.get('/upcoming', async (req, res) => {
  try {
    const { quarterStart, quarterEnd } = req.query;

    if (!quarterStart || !quarterEnd) {
      return res.status(400).json({
        success: false,
        error: 'quarterStart and quarterEnd are required',
        example: '?quarterStart=2024Q1&quarterEnd=2025Q4'
      });
    }

    console.log(`📥 API Request: Get upcoming BTOs (${quarterStart} to ${quarterEnd})`);
    const result = await getUpcomingBTOs(quarterStart, quarterEnd);

    res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('BTO API Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/bto/by-town/:town
 * Get BTO projects for a specific town
 */
router.get('/by-town/:town', async (req, res) => {
  try {
    const { town } = req.params;

    console.log(`📥 API Request: Get BTOs for ${town}`);
    const allProjects = await getBTOProjects();
    const townProjects = allProjects.filter(
      p => p.town.toLowerCase() === town.toLowerCase()
    );

    const totalUnits = townProjects.reduce((sum, p) => sum + p.numUnits, 0);

    res.status(200).json({
      success: true,
      town: town.toUpperCase(),
      total: townProjects.length,
      totalUnits,
      data: townProjects
    });
  } catch (error) {
    console.error('BTO API Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/bto/current-year
 * Get BTO projects for current year
 */
router.get('/current-year', async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const quarterStart = `${currentYear}Q1`;
    const quarterEnd = `${currentYear}Q4`;

    console.log(`📥 API Request: Get BTOs for ${currentYear}`);
    const result = await getUpcomingBTOs(quarterStart, quarterEnd);

    res.status(200).json({
      success: true,
      year: currentYear,
      ...result
    });
  } catch (error) {
    console.error('BTO API Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/bto/next-6-months
 * Get BTO projects completing in next 6 months
 */
router.get('/next-6-months', async (req, res) => {
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentQuarter = Math.ceil((now.getMonth() + 1) / 3);

    // Calculate next 2 quarters
    const quarters = [];
    for (let i = 0; i < 2; i++) {
      const q = currentQuarter + i;
      const year = q > 4 ? currentYear + 1 : currentYear;
      const quarter = q > 4 ? q - 4 : q;
      quarters.push(`${year}Q${quarter}`);
    }

    console.log(`📥 API Request: Get BTOs for next 6 months (${quarters.join(', ')})`);
    const result = await getUpcomingBTOs(quarters[0], quarters[quarters.length - 1]);

    res.status(200).json({
      success: true,
      period: 'Next 6 months',
      quarters,
      ...result
    });
  } catch (error) {
    console.error('BTO API Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
