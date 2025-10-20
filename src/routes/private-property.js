import express from 'express';
import { getPrivatePropertyPriceIndex } from '../services/datagovsg.js';

const router = express.Router();

/**
 * GET /api/private-property/price-index
 * Get private property price index trends by region
 * Query params: quarters (default 8), region (optional: 'central', 'outside', 'rest')
 */
router.get('/price-index', async (req, res) => {
  try {
    const quarters = parseInt(req.query.quarters) || 8;
    const region = req.query.region || null;

    console.log(`📥 API Request: Get private property price index (${quarters} quarters)`);
    const result = await getPrivatePropertyPriceIndex(quarters, region);

    res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Private Property API Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/private-property/trends
 * Get simplified price trends showing percentage change
 */
router.get('/trends', async (req, res) => {
  try {
    const quarters = parseInt(req.query.quarters) || 8;

    console.log(`📥 API Request: Get private property trends (${quarters} quarters)`);
    const result = await getPrivatePropertyPriceIndex(quarters);

    // Simplify to just show trends
    const trends = result.regions.map(region => ({
      region: region.region,
      latestQuarter: region.latestQuarter,
      latestIndex: region.latestIndex,
      percentChange: parseFloat(region.percentChange),
      trend: parseFloat(region.percentChange) > 0 ? 'up' : 'down'
    }));

    res.status(200).json({
      success: true,
      quarters: result.quarters,
      trends
    });
  } catch (error) {
    console.error('Private Property API Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/private-property/region/:region
 * Get price index for specific region
 * Params: region (e.g., 'central', 'outside')
 * Query: quarters (default 8)
 */
router.get('/region/:region', async (req, res) => {
  try {
    const { region } = req.params;
    const quarters = parseInt(req.query.quarters) || 8;

    console.log(`📥 API Request: Get private property index for ${region} (${quarters} quarters)`);
    const result = await getPrivatePropertyPriceIndex(quarters, region);

    if (result.regions.length === 0) {
      return res.status(404).json({
        success: false,
        error: `No data found for region: ${region}`,
        availableRegions: ['Core Central Region', 'Rest of Central Region', 'Outside Central Region']
      });
    }

    res.status(200).json({
      success: true,
      region: result.regions[0].region,
      quarters: result.quarters,
      ...result.regions[0]
    });
  } catch (error) {
    console.error('Private Property API Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
