import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createSimulationApp } from '../src/simulation/app.js';

let server;
let baseUrl;
before(async () => {
  const app = express();
  app.use('/api/simulation', createSimulationApp());
  server = await new Promise((resolve) => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });
  baseUrl = `http://127.0.0.1:${server.address().port}/api/simulation`;
});
after(async () => { await new Promise((resolve) => server.close(resolve)); });
async function score(body) {
  const response = await fetch(`${baseUrl}/score-area`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return { status: response.status, body: await response.json() };
}

test('HubSpot can receive high, medium and low outcomes from the shared scoring rules', async () => {
  for (const [area, expectedScore, expectedPriority] of [['TAMPINES', 86, 'HIGH'], ['BISHAN', 57, 'MEDIUM'], ['BEDOK', 42, 'LOW']]) {
    const result = await score({ planningArea: area });
    assert.equal(result.status, 200);
    assert.equal(result.body.score, expectedScore);
    assert.equal(result.body.priority, expectedPriority);
    assert.equal(result.body.simulation, true);
    assert.equal(result.body.dataSource, 'synthetic-fixtures');
    assert.ok(result.body.recommendationText.length > 0);
  }
});
test('changing request inputs changes the result and repeated calls stay stable', async () => {
  const payload = { planningArea: ' tampines ', includeResale: false, includeBTO: false };
  const first = await score(payload);
  const second = await score(payload);
  assert.equal(first.body.score, 50);
  assert.equal(first.body.priority, 'MEDIUM');
  assert.equal(first.body.planningArea, 'TAMPINES');
  assert.equal(first.body.factors.resaleActivity, undefined);
  assert.equal(first.body.factors.btoActivity, undefined);
  assert.deepEqual(second.body, first.body);
});
test('invalid and unknown inputs fail explicitly instead of returning misleading scores', async () => {
  for (const payload of [{}, { planningArea: 12 }, { planningArea: 'UNKNOWN' }, { planningArea: '__proto__' }, { planningArea: 'TAMPINES', includeBTO: 'false' }]) {
    const result = await score(payload);
    assert.equal(result.status, 400);
    assert.equal(result.body.success, false);
    assert.equal(result.body.simulation, true);
  }
});
test('malformed JSON fails clearly', async () => {
  const response = await fetch(`${baseUrl}/score-area`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' });
  assert.equal(response.status, 400);
  const result = await response.json();
  assert.equal(result.error, 'Request body must be valid JSON');
  assert.equal(result.simulation, true);
});
test('simulation exposes no CRM writes or other intelligence routes', async () => {
  for (const path of ['/api/hubspot/enrich-contact', '/hot-targets', '/webhook/contact-created']) {
    const response = await fetch(`${baseUrl}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(response.status, 404);
  }
});
