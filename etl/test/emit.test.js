const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { writeOutput } = require('../src/emit');

test('écrit un fichier par arrêt + manifest', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'etl-'));
  const byStop = new Map([['46053', [{ datetime: '2026-06-02T23:40:00', line: 'A', direction: 'Vaulx La Soie' }]]]);
  const names = new Map([['46053', 'Foch']]);
  const res = writeOutput(dir, byStop, names, { generatedAt: '2026-06-02T03:00:00Z', validThrough: '2026-06-16' });

  assert.strictEqual(res.stopsWritten, 1);
  const stop = JSON.parse(fs.readFileSync(path.join(dir, 'stops', '46053.json'), 'utf8'));
  assert.strictEqual(stop.stopId, '46053');
  assert.strictEqual(stop.stopName, 'Foch');
  assert.strictEqual(stop.departures.length, 1);
  assert.strictEqual(stop.departures[0].line, 'A');

  const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
  assert.strictEqual(manifest.stopCount, 1);
});
