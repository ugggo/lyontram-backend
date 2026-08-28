const { test } = require('node:test');
const assert = require('node:assert');
const { expandDepartures } = require('../src/expand');

const activeByDate = new Map([['2026-06-02', new Set(['S1'])]]);
const trips = [{ route_id: 'R_A', service_id: 'S1', trip_id: 'T1', trip_headsign: 'Vaulx La Soie' }];
const routes = [{ route_id: 'R_A', route_short_name: 'A' }];
const stopTimes = [
  { trip_id: 'T1', stop_id: '46053', departure_time: '23:40:00' },
  { trip_id: 'T1', stop_id: '46053', departure_time: '24:04:00' },
];
const toTcl = new Map([['46053', '46053']]);

test('déplie un passage à l heure normale', () => {
  const m = expandDepartures({ activeByDate, tripsRows: trips, routesRows: routes, stopTimesRows: stopTimes, toTcl });
  const deps = m.get('46053');
  assert.deepStrictEqual(deps[0], { datetime: '2026-06-02T23:40:00', line: 'A', direction: 'Vaulx La Soie' });
});

test('heure >24h reporte au jour suivant, heure modulo 24', () => {
  const m = expandDepartures({ activeByDate, tripsRows: trips, routesRows: routes, stopTimesRows: stopTimes, toTcl });
  const deps = m.get('46053');
  assert.deepStrictEqual(deps[1], { datetime: '2026-06-03T00:04:00', line: 'A', direction: 'Vaulx La Soie' });
});

test('un service non actif ce jour ne produit rien', () => {
  const m = expandDepartures({ activeByDate: new Map([['2026-06-02', new Set()]]), tripsRows: trips, routesRows: routes, stopTimesRows: stopTimes, toTcl });
  assert.strictEqual(m.size, 0);
});
