/**
 * Cold → Warm is no longer a special transition — the selected outcome becomes
 * the lead's current temperature directly (Warm/Hot/Cold in, same out).
 * Run with: node --test src/lib/__tests__/coldToWarm.test.js
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLeadStatusPayload } from '../leadTemperatureStatus.js';
import { getLeadListStatusDisplay } from '../executiveStatusDisplay.js';

const coldLead = { status: 'follow_up', temperature: 'cold', statusReason: 'booked_elsewhere' };
const warmLead = { status: 'contacted', temperature: 'warm', statusReason: 'requested_callback' };
const hotLead = { status: 'negotiation', temperature: 'hot', statusReason: 'ready_to_book' };

test('Cold lead picking a Warm outcome behaves exactly like any other Warm pick', () => {
  const fromCold = buildLeadStatusPayload('warm', 'discussed_package', '', coldLead);
  const fromWarm = buildLeadStatusPayload('warm', 'discussed_package', '', warmLead);
  const fromHot = buildLeadStatusPayload('warm', 'discussed_package', '', hotLead);

  assert.deepEqual(fromCold, fromWarm);
  assert.deepEqual(fromCold, fromHot);
  assert.equal(fromCold.status, 'contacted');
  assert.equal(fromCold.temperature, 'warm');
  assert.equal(fromCold.statusReason, 'discussed_package');
  assert.equal(fromCold.fromColdToWarm, undefined);
  assert.equal(fromCold.warmOption, undefined);
  assert.notEqual(fromCold.status, 'working_progress');
});

test('buildLeadStatusPayload never sets status to working_progress or stamps cold_to_warm', () => {
  for (const [category, option] of [['warm', 'discussed_package'], ['warm', 'cnp_same_day'], ['hot', 'ready_to_book'], ['cold', 'booked_elsewhere']]) {
    const payload = buildLeadStatusPayload(category, option, '', coldLead);
    assert.notEqual(payload.status, 'working_progress');
    assert.notEqual(payload.statusReason, 'cold_to_warm');
  }
});

test('Every Warm/Hot/Cold combination maps the outcome straight to that temperature', () => {
  const cases = [
    ['warm', 'discussed_package', 'warm'],
    ['hot', 'ready_to_book', 'hot'],
    ['cold', 'booked_elsewhere', 'cold'],
  ];
  for (const [category, option, expectedTemp] of cases) {
    for (const priorLead of [coldLead, warmLead, hotLead]) {
      const payload = buildLeadStatusPayload(category, option, '', priorLead);
      assert.equal(payload.temperature, expectedTemp, `${priorLead.temperature} -> ${category} should be ${expectedTemp}`);
    }
  }
});

test('getLeadListStatusDisplay shows Warm (no Working in Progress / Cold to Warm) after a Cold -> Warm pick', () => {
  const payload = buildLeadStatusPayload('warm', 'discussed_package', '', coldLead);
  const updatedLead = { ...coldLead, ...payload };

  const display = getLeadListStatusDisplay(updatedLead);

  assert.equal(display.mainLabel, 'Warm');
  assert.equal(display.bucket, 'warm');
  assert.equal(display.subLabel, '');
  assert.notEqual(display.mainLabel, 'Working in Progress');
  assert.notEqual(display.subLabel, 'Cold to Warm');
});

test('getLeadListStatusDisplay never renders the legacy Cold to Warm badge for leftover legacy data', () => {
  const legacyLead = { status: 'working_progress', statusReason: 'cold_to_warm', temperature: 'warm' };
  const display = getLeadListStatusDisplay(legacyLead);

  assert.notEqual(display.mainLabel, 'Working in Progress');
  assert.notEqual(display.subLabel, 'Cold to Warm');
});

test('the unrelated auto_connected_24h pipeline promotion still reports No status', () => {
  const autoPromotedLead = { status: 'working_progress', statusReason: 'auto_connected_24h', temperature: 'warm' };
  const display = getLeadListStatusDisplay(autoPromotedLead);

  assert.equal(display.mainLabel, 'No status');
  assert.equal(display.bucket, 'new');
});

test('Warm -> Cold and Hot -> Cold both land on Cold with the selected reason', () => {
  for (const priorLead of [warmLead, hotLead]) {
    const payload = buildLeadStatusPayload('cold', 'not_interested', '', priorLead);
    const updatedLead = { ...priorLead, ...payload };
    const display = getLeadListStatusDisplay(updatedLead);
    assert.equal(display.bucket, 'cold');
    assert.equal(display.mainLabel, 'Cold');
  }
});
