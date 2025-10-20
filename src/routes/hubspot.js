import express from 'express';
import { Client } from '@hubspot/api-client';
import { getUpcomingBTOs, getRecentResaleTransactions, getAreaDemographics } from '../services/datagovsg.js';

const router = express.Router();

// Initialize HubSpot client (if credentials available)
let hubspotClient = null;
if (process.env.HUBSPOT_ACCESS_TOKEN) {
  hubspotClient = new Client({
    accessToken: process.env.HUBSPOT_ACCESS_TOKEN
  });
}

/**
 * POST /api/hubspot/enrich-contact
 * Enrich a HubSpot contact with property intelligence data
 * Body: { contactId, address, town, postalCode }
 */
router.post('/enrich-contact', async (req, res) => {
  try {
    if (!hubspotClient) {
      return res.status(400).json({
        success: false,
        error: 'HubSpot integration not configured. Set HUBSPOT_ACCESS_TOKEN in .env'
      });
    }

    const { contactId, town } = req.body;

    if (!contactId || !town) {
      return res.status(400).json({
        success: false,
        error: 'contactId and town are required'
      });
    }

    console.log(`📥 API Request: Enrich contact ${contactId} with ${town} data`);

    // Get area demographics
    const demographics = await getAreaDemographics(town.toUpperCase());

    // Get recent resale activity
    const resale = await getRecentResaleTransactions(3, town);

    // Get upcoming BTOs
    const currentYear = new Date().getFullYear();
    const btos = await getUpcomingBTOs(`${currentYear}Q1`, `${currentYear + 2}Q4`);
    const areaBTO = btos.byTown.find(t => t.town === town.toUpperCase());

    // Prepare enrichment data
    const enrichmentData = {
      sg_area_affluent_percentage: demographics.affluentPercentage,
      sg_area_population: demographics.totalPopulation,
      sg_recent_resale_count: resale.totalTransactions,
      sg_area_avg_resale_price: resale.byTown[0]?.avgPrice || 0,
      sg_upcoming_bto_units: areaBTO?.totalUnits || 0,
      sg_data_last_updated: new Date().toISOString()
    };

    // Update contact in HubSpot
    await hubspotClient.crm.contacts.basicApi.update(contactId, {
      properties: enrichmentData
    });

    console.log(`✅ Contact ${contactId} enriched successfully`);

    res.status(200).json({
      success: true,
      contactId,
      enrichmentData,
      message: 'Contact enriched with Singapore property intelligence data'
    });
  } catch (error) {
    console.error('HubSpot Enrichment Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/hubspot/create-target-list
 * Create a list of contacts to target based on property intelligence
 * Body: { quarterStart, quarterEnd, minScore }
 */
router.post('/create-target-list', async (req, res) => {
  try {
    const { quarterStart, quarterEnd, minScore = 60 } = req.body;

    console.log(`📥 API Request: Create target list (${quarterStart} to ${quarterEnd})`);

    // Get upcoming BTOs
    const btos = await getUpcomingBTOs(quarterStart, quarterEnd);

    // Get recent resale data
    const resales = await getRecentResaleTransactions(3, null);

    // Score all areas
    const targetAreas = [];
    const allAreas = new Set([
      ...btos.byTown.map(t => t.town),
      ...resales.byTown.map(t => t.town)
    ]);

    for (const area of allAreas) {
      try {
        const demographics = await getAreaDemographics(area);
        const areaBTO = btos.byTown.find(t => t.town === area);
        const areaResale = resales.byTown.find(t => t.town === area);

        // Calculate score
        let score = 0;
        score += demographics.affluentPercentage * 0.4;
        if (areaResale) {
          score += Math.min((areaResale.count / resales.totalTransactions) * 100, 30);
        }
        if (areaBTO) {
          score += Math.min((areaBTO.totalUnits / btos.totalUnits) * 100, 30);
        }

        if (score >= minScore) {
          targetAreas.push({
            planningArea: area,
            score: Math.round(score),
            btoUnits: areaBTO?.totalUnits || 0,
            resaleTransactions: areaResale?.count || 0,
            affluentPercentage: demographics.affluentPercentage,
            estimatedLeads: (areaBTO?.totalUnits || 0) + (areaResale?.count || 0)
          });
        }
      } catch (error) {
        console.warn(`Skipping ${area}:`, error.message);
      }
    }

    const sortedTargets = targetAreas.sort((a, b) => b.score - a.score);

    res.status(200).json({
      success: true,
      period: `${quarterStart} to ${quarterEnd}`,
      minScore,
      totalAreas: sortedTargets.length,
      estimatedTotalLeads: sortedTargets.reduce((sum, a) => sum + a.estimatedLeads, 0),
      targetAreas: sortedTargets
    });
  } catch (error) {
    console.error('HubSpot Target List Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/hubspot/webhook/contact-created
 * HubSpot webhook handler - Auto-enrich contacts on creation
 */
router.post('/webhook/contact-created', async (req, res) => {
  try {
    const { objectId } = req.body[0] || req.body;

    console.log(`📥 Webhook: Contact created ${objectId}`);

    if (!hubspotClient) {
      return res.status(200).json({
        success: true,
        message: 'HubSpot not configured, skipping enrichment'
      });
    }

    // Get contact details
    const contact = await hubspotClient.crm.contacts.basicApi.getById(objectId);
    const city = contact.properties.city;

    if (city) {
      // Enrich with area data
      try {
        const demographics = await getAreaDemographics(city.toUpperCase());

        await hubspotClient.crm.contacts.basicApi.update(objectId, {
          properties: {
            sg_area_affluent_percentage: demographics.affluentPercentage,
            sg_area_population: demographics.totalPopulation,
            sg_data_last_updated: new Date().toISOString()
          }
        });

        console.log(`✅ Auto-enriched contact ${objectId} with ${city} data`);
      } catch (error) {
        console.warn(`Could not enrich contact with ${city} data:`, error.message);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Contact processed'
    });
  } catch (error) {
    console.error('Webhook Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/hubspot/custom-properties
 * Get recommended custom properties for HubSpot
 */
router.get('/custom-properties', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Create these custom properties in HubSpot to enable full integration',
    properties: [
      {
        name: 'sg_area_affluent_percentage',
        label: 'SG Area Affluent %',
        type: 'number',
        fieldType: 'number',
        groupName: 'singapore_property_intel',
        description: 'Percentage of affluent population (35-54 years) in the area'
      },
      {
        name: 'sg_area_population',
        label: 'SG Area Population',
        type: 'number',
        fieldType: 'number',
        groupName: 'singapore_property_intel',
        description: 'Total population in the planning area'
      },
      {
        name: 'sg_recent_resale_count',
        label: 'SG Recent Resale Count',
        type: 'number',
        fieldType: 'number',
        groupName: 'singapore_property_intel',
        description: 'Number of recent resale transactions (last 3 months)'
      },
      {
        name: 'sg_area_avg_resale_price',
        label: 'SG Area Avg Resale Price',
        type: 'number',
        fieldType: 'number',
        groupName: 'singapore_property_intel',
        description: 'Average resale price in the area'
      },
      {
        name: 'sg_upcoming_bto_units',
        label: 'SG Upcoming BTO Units',
        type: 'number',
        fieldType: 'number',
        groupName: 'singapore_property_intel',
        description: 'Number of BTO units completing in the area'
      },
      {
        name: 'sg_data_last_updated',
        label: 'SG Data Last Updated',
        type: 'datetime',
        fieldType: 'date',
        groupName: 'singapore_property_intel',
        description: 'When the SG property data was last updated'
      }
    ],
    instructions: [
      '1. Go to HubSpot Settings → Properties → Contact properties',
      '2. Create a new property group: "Singapore Property Intelligence"',
      '3. Create each property listed above',
      '4. Use the /api/hubspot/enrich-contact endpoint to populate data'
    ]
  });
});

export default router;
