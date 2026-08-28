const { test } = require('node:test');
const assert = require('node:assert');
const { activeServicesByDate } = require('../src/calendar');

const CAL = [{
  service_id: 'S1',
  monday: '1', tuesday: '1', wednesday: '1', thursday: '1',
  friday: '1', saturday: '0', sunday: '0',
  start_date: '20260601', end_date: '20260630',
}];

test('service actif un jour de semaine dans la plage', () => {
  // 2026-06-02 est un mardi
  const m = activeServicesByDate(CAL, [], '2026-06-02', 1);
  assert.ok(m.get('2026-06-02').has('S1'));
});

test('service inactif le week-end', () => {
  // 2026-06-06 est un samedi
  const m = activeServicesByDate(CAL, [], '2026-06-06', 1);
  assert.strictEqual(m.get('2026-06-06').has('S1'), false);
});

test('service inactif hors plage de dates', () => {
  const m = activeServicesByDate(CAL, [], '2026-07-01', 1);
  assert.strictEqual(m.get('2026-07-01').has('S1'), false);
});

test('calendar_dates type 1 ajoute un service', () => {
  const cd = [{ service_id: 'S2', date: '20260606', exception_type: '1' }];
  const m = activeServicesByDate(CAL, cd, '2026-06-06', 1);
  assert.ok(m.get('2026-06-06').has('S2'));
});

test('calendar_dates type 2 retire un service', () => {
  const cd = [{ service_id: 'S1', date: '20260602', exception_type: '2' }];
  const m = activeServicesByDate(CAL, cd, '2026-06-02', 1);
  assert.strictEqual(m.get('2026-06-02').has('S1'), false);
});
