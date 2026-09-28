import { createSimulationApp } from './app.js';
import express from 'express';

// No dotenv, live-data services or CRM routes are loaded by this entry point.
const port = Number(process.env.SIMULATION_PORT || process.env.PORT || 4317);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid SIMULATION_PORT');
const app = express();
app.get('/health', (req, res) => res.json({ success: true, simulation: true }));
app.use('/api/simulation', createSimulationApp());
const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1';
const server = app.listen(port, host, () => {
  console.log(`Simulation running on port ${port} at /api/simulation`);
  console.log('POST /api/simulation/score-area — synthetic data only');
});
server.on('error', (error) => { console.error(error.message); process.exitCode = 1; });
