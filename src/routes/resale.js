import express from 'express';
import { getResaleTransactions, getRecentResaleTransactions } from '../services/datagovsg.js';

const router = express.Router();

/**
 * GET /api/resale/recent
 * Get recent resale transactions
 * Query params: months (default: 3), town (optional)
 */
router.get('/recent', async (req, res) => {
  try {
    const months = parseInt(req.query.months) || 3;
    const town = req.query.town || null;

    console.log(`📥 API Request: Get recent resale transactions (${months} months${town ? `, town: ${town}` : ''})`);
    const result = await getRecentResaleTransactions(months, town);

    res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Resale API Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/resale/by-town/:town
 * Get resale transactions for a specific town (last 3 months)
 */
router.get('/by-town/:town', async (req, res) => {
  try {
    const { town } = req.params;
    const months = parseInt(req.query.months) || 3;

    console.log(`📥 API Request: Get resale transactions for ${town} (${months} months)`);
    const result = await getRecentResaleTransactions(months, town);

    res.status(200).json({
      success: true,
      town: town.toUpperCase(),
      ...result
    });
  } catch (error) {
    console.error('Resale API Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/resale/high-value
 * Get high-value resale transactions (above threshold)
 * Query params: minPrice (default: 800000), months (default: 3)
 */
router.get('/high-value', async (req, res) => {
  try {
    const minPrice = parseInt(req.query.minPrice) || 800000;
    const months = parseInt(req.query.months) || 3;

    console.log(`📥 API Request: Get high-value resales (min: $${minPrice}, ${months} months)`);
    const result = await getRecentResaleTransactions(months, null);

    // Filter high-value transactions
    const highValueTrans = result.transactions.filter(t => t.resalePrice >= minPrice);

    // Group by town
    const byTown = {};
    highValueTrans.forEach(trans => {
      if (!byTown[trans.town]) {
        byTown[trans.town] = {
          town: trans.town,
          count: 0,
          avgPrice: 0,
          transactions: []
        };
      }
      byTown[trans.town].count++;
      byTown[trans.town].transactions.push(trans);
    });

    // Calculate averages
    Object.values(byTown).forEach(townData => {
      const total = townData.transactions.reduce((sum, t) => sum + t.resalePrice, 0);
      townData.avgPrice = Math.round(total / townData.count);
    });

    res.status(200).json({
      success: true,
      period: `${months} months`,
      minPrice,
      totalHighValue: highValueTrans.length,
      byTown: Object.values(byTown).sort((a, b) => b.count - a.count),
      transactions: highValueTrans.slice(0, 50)
    });
  } catch (error) {
    console.error('Resale API Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/resale/hot-areas
 * Get areas with highest transaction volume
 * Query params: months (default: 3), limit (default: 10)
 */
router.get('/hot-areas', async (req, res) => {
  try {
    const months = parseInt(req.query.months) || 3;
    const limit = parseInt(req.query.limit) || 10;

    console.log(`📥 API Request: Get hot areas (${months} months, top ${limit})`);
    const result = await getRecentResaleTransactions(months, null);

    // Sort by transaction count
    const hotAreas = result.byTown
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    res.status(200).json({
      success: true,
      period: `${months} months`,
      totalTransactions: result.totalTransactions,
      hotAreas
    });
  } catch (error) {
    console.error('Resale API Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/resale/price-range
 * Get transactions within a price range
 * Query params: minPrice, maxPrice, months (default: 3)
 */
router.get('/price-range', async (req, res) => {
  try {
    const minPrice = parseInt(req.query.minPrice);
    const maxPrice = parseInt(req.query.maxPrice);
    const months = parseInt(req.query.months) || 3;

    if (!minPrice || !maxPrice) {
      return res.status(400).json({
        success: false,
        error: 'minPrice and maxPrice are required',
        example: '?minPrice=500000&maxPrice=800000'
      });
    }

    console.log(`📥 API Request: Get resales in price range ($${minPrice} - $${maxPrice})`);
    const result = await getRecentResaleTransactions(months, null);

    const filtered = result.transactions.filter(
      t => t.resalePrice >= minPrice && t.resalePrice <= maxPrice
    );

    // Group by town
    const byTown = {};
    filtered.forEach(trans => {
      if (!byTown[trans.town]) {
        byTown[trans.town] = { town: trans.town, count: 0 };
      }
      byTown[trans.town].count++;
    });

    res.status(200).json({
      success: true,
      period: `${months} months`,
      priceRange: { min: minPrice, max: maxPrice },
      total: filtered.length,
      byTown: Object.values(byTown).sort((a, b) => b.count - a.count),
      transactions: filtered.slice(0, 100)
    });
  } catch (error) {
    console.error('Resale API Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
