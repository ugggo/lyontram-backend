const { test } = require('node:test');
const assert = require('node:assert');
const { buildTclMapping } = require('../src/mapping');

const STOPS = [
  { stop_id: '46053', stop_name: 'Foch' },
  { stop_id: 'GTFS_930', stop_name: 'Foch' },
];

test('stop_id sans mapping = code TCL direct (metro)', () => {
  const { toTcl, names } = buildTclMapping(STOPS, []);
  assert.strictEqual(toTcl.get('46053'), '46053');
  assert.strictEqual(names.get('46053'), 'Foch');
});

test('id_mappings traduit vers le code TCL', () => {
  const idm = [{ from_id: 'GTFS_930', to_id: '930' }];
  const { toTcl, names } = buildTclMapping(STOPS, idm);
  assert.strictEqual(toTcl.get('GTFS_930'), '930');
  assert.strictEqual(names.get('930'), 'Foch');
});
