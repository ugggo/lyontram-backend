const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const AdmZip = require('adm-zip');
const { runPipeline } = require('../src/build');

function makeZip(files) {
  const zip = new AdmZip();
  for (const [name, content] of Object.entries(files)) zip.addFile(name, Buffer.from(content));
  return zip.toBuffer();
}

const FIXTURE = {
  'stops.txt': 'stop_id,stop_name\n46053,Foch\n',
  'routes.txt': 'route_id,route_short_name\nR_A,A\n',
  'trips.txt': 'route_id,service_id,trip_id,trip_headsign\nR_A,S1,T1,Vaulx La Soie\n',
  'stop_times.txt': 'trip_id,stop_id,departure_time\nT1,46053,23:40:00\nT1,46053,24:04:00\n',
  'calendar.txt': 'service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date\nS1,1,1,1,1,1,1,1,20260101,20261231\n',
  'calendar_dates.txt': 'service_id,date,exception_type\n',
  'id_mappings.txt': 'from_id,to_id\n',
};

test('pipeline complet produit un fichier arrêt correct', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'etl-build-'));
  const res = await runPipeline({ zipBuffer: makeZip(FIXTURE), outDir: dir, today: '2026-06-02', days: 2, minStops: 1 });
  assert.strictEqual(res.stopsWritten, 1);

  const stop = JSON.parse(fs.readFileSync(path.join(dir, 'stops', '46053.json'), 'utf8'));
  // 2 passages x 2 jours = 4, triés
  assert.strictEqual(stop.departures[0].datetime, '2026-06-02T23:40:00');
  assert.strictEqual(stop.departures[1].datetime, '2026-06-03T00:04:00');
});

test('garde-fou: échoue si moins de minStops', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'etl-guard-'));
  await assert.rejects(
    () => runPipeline({ zipBuffer: makeZip(FIXTURE), outDir: dir, today: '2026-06-02', days: 2, minStops: 999 }),
    /minStops|couverture|stops/i
  );
});
