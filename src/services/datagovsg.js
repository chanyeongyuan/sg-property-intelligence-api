import axios from 'axios';
import dotenv from 'dotenv';
import NodeCache from 'node-cache';

dotenv.config();

const cache = new NodeCache({ stdTTL: parseInt(process.env.CACHE_TTL) || 3600 });

// V1 API client for datastore_search
// Note: V1 API doesn't require authentication or special headers for public datasets
const datagovClient = axios.create({
  baseURL: 'https://data.gov.sg/api/action'
});

// V2 API client for collections
const datagovV2Client = axios.create({
  baseURL: 'https://api-production.data.gov.sg/v2/public/api',
  headers: {
    'Authorization': process.env.DATAGOVSG_API_KEY,
    'Content-Type': 'application/json'
  }
});

/**
 * Fetch data using V1 API (datastore_search)
 * @param {string} resourceId - Resource ID
 * @param {object} queryParams - Query parameters
 * @param {number} limit - Records limit
 * @returns {Promise<Array>} - Records
 */
async function fetchDatastoreSearch(resourceId, queryParams = {}, limit = 1000) {
  const cacheKey = `v1_${resourceId}_${JSON.stringify(queryParams)}_${limit}`;

  const cached = cache.get(cacheKey);
  if (cached) {
    console.log(`📦 Cache hit for resource: ${resourceId}`);
    return cached;
  }

  try {
    const params = {
      resource_id: resourceId,
      limit,
      ...queryParams
    };

    console.log(`🔍 Fetching from Data.gov.sg V1: resource=${resourceId}, limit=${limit}`);

    const response = await datagovClient.get('/datastore_search', { params });

    if (response.data && response.data.result && response.data.result.records) {
      const records = response.data.result.records;
      cache.set(cacheKey, records);
      console.log(`✅ Fetched ${records.length} records`);
      return records;
    }

    return [];
  } catch (error) {
    console.error('Data.gov.sg V1 API Error:', error.response?.data || error.message);
    throw new Error(`Failed to fetch data: ${error.message}`);
  }
}

/**
 * Fetch collection metadata using V2 API
 * @param {string} collectionId - Collection ID
 * @returns {Promise<object>} - Collection data
 */
async function fetchCollection(collectionId) {
  const cacheKey = `v2_collection_${collectionId}`;

  const cached = cache.get(cacheKey);
  if (cached) {
    console.log(`📦 Cache hit for collection: ${collectionId}`);
    return cached;
  }

  try {
    console.log(`🔍 Fetching from Data.gov.sg V2: collection=${collectionId}`);

    const response = await datagovV2Client.get(`/collections/${collectionId}/metadata`);

    if (response.data) {
      cache.set(cacheKey, response.data);
      return response.data;
    }

    return null;
  } catch (error) {
    console.error('Data.gov.sg V2 API Error:', error.response?.data || error.message);
    throw new Error(`Failed to fetch collection: ${error.message}`);
  }
}

/**
 * Get HDB Resale Transactions
 * Resource ID: d_8b84c4ee58e3cfc0ece0d773c8ca6abc
 */
export async function getResaleTransactions(filters = {}, limit = 1000) {
  try {
    const resourceId = 'd_8b84c4ee58e3cfc0ece0d773c8ca6abc';

    // Build query parameters
    const queryParams = {};

    // Add filters (Data.gov.sg uses simple equality filters)
    Object.entries(filters).forEach(([key, value]) => {
      queryParams[key] = value;
    });

    const records = await fetchDatastoreSearch(resourceId, queryParams, limit);

    return records.map(record => ({
      month: record.month,
      town: record.town,
      flatType: record.flat_type,
      block: record.block,
      streetName: record.street_name,
      storeyRange: record.storey_range,
      floorAreaSqm: parseFloat(record.floor_area_sqm) || 0,
      flatModel: record.flat_model,
      leaseCommenceDate: record.lease_commence_date,
      remainingLease: record.remaining_lease,
      resalePrice: parseFloat(record.resale_price) || 0
    }));
  } catch (error) {
    console.error('Error fetching resale transactions:', error);
    throw error;
  }
}

/**
 * Get recent resale transactions (last N months)
 */
export async function getRecentResaleTransactions(months = 3, town = null) {
  try {
    // Fetch all recent data (Data.gov.sg doesn't support date range filters easily)
    const records = await fetchDatastoreSearch('d_8b84c4ee58e3cfc0ece0d773c8ca6abc', {}, 10000);

    // Calculate date range
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - months, 1);
    const startMonth = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`;

    // Filter by date and town
    let transactions = records
      .filter(r => r.month >= startMonth)
      .map(record => ({
        month: record.month,
        town: record.town,
        flatType: record.flat_type,
        block: record.block,
        streetName: record.street_name,
        storeyRange: record.storey_range,
        floorAreaSqm: parseFloat(record.floor_area_sqm) || 0,
        flatModel: record.flat_model,
        leaseCommenceDate: record.lease_commence_date,
        remainingLease: record.remaining_lease,
        resalePrice: parseFloat(record.resale_price) || 0
      }));

    if (town) {
      transactions = transactions.filter(t => t.town.toUpperCase() === town.toUpperCase());
    }

    // Calculate statistics by town
    const byTown = {};
    transactions.forEach(trans => {
      if (!byTown[trans.town]) {
        byTown[trans.town] = {
          town: trans.town,
          count: 0,
          totalValue: 0,
          avgPrice: 0,
          minPrice: Infinity,
          maxPrice: 0
        };
      }
      const townData = byTown[trans.town];
      townData.count++;
      townData.totalValue += trans.resalePrice;
      townData.minPrice = Math.min(townData.minPrice, trans.resalePrice);
      townData.maxPrice = Math.max(townData.maxPrice, trans.resalePrice);
    });

    // Calculate averages
    Object.values(byTown).forEach(townData => {
      townData.avgPrice = Math.round(townData.totalValue / townData.count);
    });

    return {
      period: `${months} months`,
      totalTransactions: transactions.length,
      byTown: Object.values(byTown).sort((a, b) => b.count - a.count),
      transactions: transactions.slice(0, 100)
    };
  } catch (error) {
    console.error('Error fetching recent resale transactions:', error);
    throw error;
  }
}

/**
 * Get demographics by planning area (Census 2020)
 * Resource ID: d_d95ae740c0f8961a0b10435836660ce0
 * Structure: Number field contains "{Area} - Total" or subzone names
 * Data is in columns like Total_25_29, Males_25_29, Females_25_29
 */
export async function getDemographicsByArea(planningArea) {
  try {
    const resourceId = 'd_d95ae740c0f8961a0b10435836660ce0';
    const records = await fetchDatastoreSearch(resourceId, {}, 5000);

    // Find the area total record (format: "Tampines - Total")
    const searchPattern = `${planningArea} - Total`;
    const areaRecord = records.find(r =>
      r.Number && r.Number.toLowerCase() === searchPattern.toLowerCase()
    );

    if (!areaRecord) {
      throw new Error(`No data found for planning area: ${planningArea}`);
    }

    // Parse age distribution from column names
    const ageGroups = {
      '0-4': parseInt(areaRecord.Total_0_4) || 0,
      '5-9': parseInt(areaRecord.Total_5_9) || 0,
      '10-14': parseInt(areaRecord.Total_10_14) || 0,
      '15-19': parseInt(areaRecord.Total_15_19) || 0,
      '20-24': parseInt(areaRecord.Total_20_24) || 0,
      '25-29': parseInt(areaRecord.Total_25_29) || 0,
      '30-34': parseInt(areaRecord.Total_30_34) || 0,
      '35-39': parseInt(areaRecord.Total_35_39) || 0,
      '40-44': parseInt(areaRecord.Total_40_44) || 0,
      '45-49': parseInt(areaRecord.Total_45_49) || 0,
      '50-54': parseInt(areaRecord.Total_50_54) || 0,
      '55-59': parseInt(areaRecord.Total_55_59) || 0,
      '60-64': parseInt(areaRecord.Total_60_64) || 0,
      '65-69': parseInt(areaRecord.Total_65_69) || 0,
      '70-74': parseInt(areaRecord.Total_70_74) || 0,
      '75-79': parseInt(areaRecord.Total_75_79) || 0,
      '80-84': parseInt(areaRecord.Total_80_84) || 0,
      '85-89': parseInt(areaRecord.Total_85_89) || 0,
      '90+': parseInt(areaRecord.Total_90andOver) || 0
    };

    // Calculate statistics
    const totalPopulation = parseInt(areaRecord.Total_Total) || 0;

    // Working age (25-64)
    const workingAgePopulation =
      ageGroups['25-29'] + ageGroups['30-34'] + ageGroups['35-39'] +
      ageGroups['40-44'] + ageGroups['45-49'] + ageGroups['50-54'] +
      ageGroups['55-59'] + ageGroups['60-64'];

    // Affluent (35-54)
    const affluentPopulation =
      ageGroups['35-39'] + ageGroups['40-44'] +
      ageGroups['45-49'] + ageGroups['50-54'];

    return {
      planningArea: planningArea.charAt(0).toUpperCase() + planningArea.slice(1).toLowerCase(),
      year: 2020,
      totalPopulation,
      workingAgePopulation,
      affluentPopulation,
      workingAgePercentage: totalPopulation > 0 ? Math.round((workingAgePopulation / totalPopulation) * 100) : 0,
      affluentPercentage: totalPopulation > 0 ? Math.round((affluentPopulation / totalPopulation) * 100) : 0,
      ageDistribution: ageGroups
    };
  } catch (error) {
    console.error('Error fetching demographics:', error);
    throw error;
  }
}

/**
 * Get Private Property Price Index by Locality
 * Resource ID: d_f65e490a8ad430f60a9a3d9df2bff2a0
 * Shows quarterly price index trends for private properties by region
 */
export async function getPrivatePropertyPriceIndex(quarters = 8, region = null) {
  try {
    const resourceId = 'd_f65e490a8ad430f60a9a3d9df2bff2a0';
    const records = await fetchDatastoreSearch(resourceId, {}, 500);

    // Sort by quarter descending to get latest data
    const sorted = records.sort((a, b) => b.quarter.localeCompare(a.quarter));

    // Get unique quarters
    const uniqueQuarters = [...new Set(sorted.map(r => r.quarter))];
    const recentQuarters = uniqueQuarters.slice(0, quarters);

    // Filter for recent quarters
    let filtered = sorted.filter(r => recentQuarters.includes(r.quarter));

    // Filter by region if specified
    if (region) {
      filtered = filtered.filter(r =>
        r.market_segment.toLowerCase().includes(region.toLowerCase())
      );
    }

    // Group by region
    const byRegion = {};
    filtered.forEach(record => {
      const segment = record.market_segment;
      if (!byRegion[segment]) {
        byRegion[segment] = {
          region: segment,
          data: []
        };
      }
      byRegion[segment].data.push({
        quarter: record.quarter,
        priceIndex: parseFloat(record.price_index)
      });
    });

    // Calculate trends
    Object.values(byRegion).forEach(regionData => {
      regionData.data.sort((a, b) => a.quarter.localeCompare(b.quarter));

      const latest = regionData.data[regionData.data.length - 1];
      const earliest = regionData.data[0];

      regionData.latestIndex = latest.priceIndex;
      regionData.latestQuarter = latest.quarter;
      regionData.changeFromStart = latest.priceIndex - earliest.priceIndex;
      regionData.percentChange = ((latest.priceIndex - earliest.priceIndex) / earliest.priceIndex * 100).toFixed(2);
    });

    return {
      quarters: recentQuarters.length,
      regions: Object.values(byRegion)
    };
  } catch (error) {
    console.error('Error fetching private property price index:', error);
    throw error;
  }
}

/**
 * Get Age of HDB Residents by Town
 * Resource ID: d_c6edbb9c9c3ed1642a89e7515a6baca7
 */
export async function getHDBResidentAgeByTown(town) {
  try {
    const resourceId = 'd_c6edbb9c9c3ed1642a89e7515a6baca7';
    const records = await fetchDatastoreSearch(resourceId, {}, 5000);

    // Filter for specific town
    const townData = records.filter(r =>
      r.town && r.town.toUpperCase() === town.toUpperCase()
    );

    if (townData.length === 0) {
      throw new Error(`No data found for town: ${town}`);
    }

    // Get latest year
    const latestYear = Math.max(...townData.map(r => parseInt(r.year)));
    const latestData = townData.filter(r => parseInt(r.year) === latestYear);

    // Group by age group
    const ageDistribution = {};
    latestData.forEach(record => {
      const ageGroup = record.age_group;
      const percentage = parseFloat(record.percentage) || 0;
      if (ageGroup) {
        ageDistribution[ageGroup] = percentage;
      }
    });

    return {
      town: town.toUpperCase(),
      year: latestYear,
      ageDistribution
    };
  } catch (error) {
    console.error('Error fetching HDB resident age data:', error);
    throw error;
  }
}

/**
 * Get HDB Projects Under Construction
 * Collection ID: 151
 */
export async function getProjectsUnderConstruction() {
  try {
    const collection = await fetchCollection('151');

    // Note: This returns GeoJSON/KML data
    // You may need additional processing based on the actual structure
    return collection;
  } catch (error) {
    console.error('Error fetching projects under construction:', error);
    throw error;
  }
}

/**
 * Get BTO Price Range
 * Collection ID: 177
 */
export async function getBTOPriceRange() {
  try {
    const collection = await fetchCollection('177');

    // Extract datasets from collection
    return collection;
  } catch (error) {
    console.error('Error fetching BTO price range:', error);
    throw error;
  }
}

/**
 * Get HDB Completion Status by Town/Estate
 * Resource ID: d_9bbcd0c9b0351c7f41c9bfdcdc746668
 * Contains: Financial Year, Town/Estate, HDB/DBSS, Status (Completed/Under Construction), No. of Units
 */
export async function getHDBCompletionStatus(filters = {}) {
  try {
    const resourceId = 'd_9bbcd0c9b0351c7f41c9bfdcdc746668';
    const records = await fetchDatastoreSearch(resourceId, {}, 5000);

    // Apply filters if provided
    let filteredRecords = records;

    if (filters.town) {
      filteredRecords = filteredRecords.filter(r =>
        r.town_or_estate && r.town_or_estate.toUpperCase().includes(filters.town.toUpperCase())
      );
    }

    if (filters.status) {
      filteredRecords = filteredRecords.filter(r =>
        r.status && r.status.toUpperCase() === filters.status.toUpperCase()
      );
    }

    if (filters.financialYear) {
      filteredRecords = filteredRecords.filter(r =>
        r.financial_year && r.financial_year.includes(filters.financialYear)
      );
    }

    return filteredRecords.map(record => ({
      financialYear: record.financial_year,
      town: record.town_or_estate,
      type: record.hdb_or_dbss,
      status: record.status,
      units: parseInt(record.no_of_units) || 0
    }));
  } catch (error) {
    console.error('Error fetching HDB completion status:', error);
    throw error;
  }
}

/**
 * Get all BTO Projects (combines multiple data sources)
 */
export async function getBTOProjects() {
  try {
    // Get completion status data - this shows units under construction and completed
    const completionData = await getHDBCompletionStatus();

    // Group by town and status
    const byTown = {};
    completionData.forEach(project => {
      const key = project.town;
      if (!byTown[key]) {
        byTown[key] = {
          town: project.town,
          underConstruction: 0,
          completed: 0,
          totalUnits: 0,
          projects: []
        };
      }

      if (project.status === 'Under Construction') {
        byTown[key].underConstruction += project.units;
      } else if (project.status === 'Completed') {
        byTown[key].completed += project.units;
      }

      byTown[key].totalUnits += project.units;
      byTown[key].projects.push(project);
    });

    return Object.values(byTown);
  } catch (error) {
    console.error('Error fetching BTO projects:', error);
    throw error;
  }
}

/**
 * Get upcoming BTOs by financial year range
 * Uses HDB Completion Status data to find units under construction
 */
export async function getUpcomingBTOs(quarterStart, quarterEnd) {
  try {
    // Convert quarters to financial years (e.g., "2024Q3" -> "2024/2025")
    const startYear = parseInt(quarterStart.substring(0, 4));
    const endYear = parseInt(quarterEnd.substring(0, 4));

    // Get all completion status data
    const completionData = await getHDBCompletionStatus({ status: 'Under Construction' });

    // Filter by financial year range
    const filteredProjects = completionData.filter(project => {
      if (!project.financialYear) return false;

      // Financial year format is like "2024/2025"
      const fyStart = parseInt(project.financialYear.split('/')[0]);
      return fyStart >= startYear && fyStart <= endYear + 1;
    });

    // Group by town
    const byTown = {};
    filteredProjects.forEach(project => {
      if (!byTown[project.town]) {
        byTown[project.town] = {
          town: project.town,
          totalUnits: 0,
          projects: []
        };
      }
      byTown[project.town].totalUnits += project.units;
      byTown[project.town].projects.push(project);
    });

    const areas = Object.values(byTown).sort((a, b) => b.totalUnits - a.totalUnits);

    return {
      quarterStart,
      quarterEnd,
      totalUnits: filteredProjects.reduce((sum, p) => sum + p.units, 0),
      totalAreas: areas.length,
      areas
    };
  } catch (error) {
    console.error('Error fetching upcoming BTOs:', error);
    throw error;
  }
}

/**
 * Combined area demographics (uses both datasets)
 */
export async function getAreaDemographics(area) {
  try {
    // Try planning area first (more detailed, Census 2020)
    const demographics = await getDemographicsByArea(area);

    // Try to get HDB-specific age data as well
    try {
      const hdbAgeData = await getHDBResidentAgeByTown(area);
      demographics.hdbAgeDistribution = hdbAgeData.ageDistribution;
      demographics.hdbDataYear = hdbAgeData.year;
    } catch (error) {
      // HDB data not available for this area
      console.warn(`HDB age data not available for ${area}`);
    }

    return demographics;
  } catch (error) {
    console.error('Error fetching area demographics:', error);
    throw error;
  }
}

/**
 * Clear cache
 */
export function clearCache() {
  cache.flushAll();
  console.log('🗑️  Cache cleared');
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  return cache.getStats();
}

export default {
  getResaleTransactions,
  getRecentResaleTransactions,
  getDemographicsByArea,
  getHDBResidentAgeByTown,
  getHDBCompletionStatus,
  getPrivatePropertyPriceIndex,
  getProjectsUnderConstruction,
  getBTOPriceRange,
  getBTOProjects,
  getUpcomingBTOs,
  getAreaDemographics,
  clearCache,
  getCacheStats
};
