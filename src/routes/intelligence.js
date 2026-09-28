import { createIntelligenceRouter } from './intelligence-router.js';
import { getUpcomingBTOs, getRecentResaleTransactions, getAreaDemographics } from '../services/datagovsg.js';

export default createIntelligenceRouter({ getUpcomingBTOs, getRecentResaleTransactions, getAreaDemographics });
