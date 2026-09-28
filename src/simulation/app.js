import express from 'express';
import { createIntelligenceRouter } from '../routes/intelligence-router.js';
import { fixtures, simulationServices } from './fixtures.js';

const notice = 'Simulation only: all property and demographic inputs are synthetic. No external services or HubSpot records are accessed.';

export function createSimulationApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '16kb' }));
  app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    const json = res.json.bind(res);
    res.json = (body) => json({ ...body,
      ...(Array.isArray(body.recommendation) ? { recommendationText: body.recommendation.join(' | ') } : {}),
      simulation: true, dataSource: 'synthetic-fixtures', notice });
    next();
  });
  app.get(['/', '/health'], (req, res) => res.json({
    success: true,
    service: 'Singapore Property Intelligence — webhook simulation',
    endpoint: 'POST /api/simulation/score-area',
    supportedAreas: Object.keys(fixtures),
    sampleRequest: { planningArea: 'TAMPINES', includeResale: true, includeBTO: true }
  }));
  app.post('/score-area', (req, res, next) => {
    const body = req.body;
    if (!body || Array.isArray(body) || typeof body.planningArea !== 'string' || !body.planningArea.trim()) {
      return res.status(400).json({ success: false, error: 'planningArea must be a non-empty string' });
    }
    body.planningArea = body.planningArea.trim().toUpperCase();
    if (!Object.hasOwn(fixtures, body.planningArea)) {
      return res.status(400).json({ success: false, error: 'Unsupported simulation area', supportedAreas: Object.keys(fixtures) });
    }
    for (const name of ['includeResale', 'includeBTO']) {
      if (body[name] !== undefined && typeof body[name] !== 'boolean') {
        return res.status(400).json({ success: false, error: `${name} must be a boolean` });
      }
    }
    next();
  });
  app.use((req, res, next) => {
    if (req.method !== 'POST' || req.path !== '/score-area') {
      return res.status(404).json({ success: false, error: 'Simulation endpoint not found' });
    }
    next();
  }, createIntelligenceRouter(simulationServices));
  app.use((req, res) => res.status(404).json({ success: false, error: 'Simulation endpoint not found' }));
  app.use((error, req, res, next) => res.status(error.status || 500).json({
    success: false,
    simulation: true,
    dataSource: 'synthetic-fixtures',
    notice,
    error: error.type === 'entity.parse.failed' ? 'Request body must be valid JSON' : error.status === 413 ? 'Request body is too large' : 'Request failed'
  }));
  return app;
}
