const { extractGtfs, fetchGtfsZip } = require('./fetchGtfs');
const { parseCsv } = require('./parseCsv');
const { activeServicesByDate, addDays } = require('./calendar');
const { buildTclMapping } = require('./mapping');
const { expandDepartures } = require('./expand');
const { writeOutput } = require('./emit');

function rows(files, name) {
  const txt = files.get(name);
  return txt ? parseCsv(txt) : [];
}

async function runPipeline({ zipBuffer, outDir, today, days = 14, minStops = 2000 }) {
  const files = extractGtfs(zipBuffer);

  const stopsRows = rows(files, 'stops.txt');
  const routesRows = rows(files, 'routes.txt');
  const tripsRows = rows(files, 'trips.txt');
  const stopTimesRows = rows(files, 'stop_times.txt');
  const calendarRows = rows(files, 'calendar.txt');
  const calendarDatesRows = rows(files, 'calendar_dates.txt');
  const idMappingsRows = rows(files, 'id_mappings.txt');

  const activeByDate = activeServicesByDate(calendarRows, calendarDatesRows, today, days);
  const { toTcl, names, unresolvedCount } = buildTclMapping(stopsRows, idMappingsRows);
  const byStop = expandDepartures({ activeByDate, tripsRows, routesRows, stopTimesRows, toTcl });

  if (byStop.size < minStops) {
    throw new Error(`Garde-fou: ${byStop.size} arrêts produits < minStops=${minStops}. Sortie non publiée.`);
  }

  const validThrough = addDays(today, days);
  const meta = { generatedAt: new Date().toISOString(), validThrough };
  const { stopsWritten } = writeOutput(outDir, byStop, names, meta);

  console.log(`OK: ${stopsWritten} arrêts, mapping non résolu=${unresolvedCount}, validThrough=${validThrough}`);
  return { stopsWritten, coverage: stopsWritten };
}

function parisToday() {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
  });
  return fmt.format(new Date()); // 'YYYY-MM-DD'
}

async function main() {
  const url = process.env.GTFS_URL;
  if (!url) throw new Error('GTFS_URL manquant');
  const zipBuffer = await fetchGtfsZip(url);
  await runPipeline({ zipBuffer, outDir: 'out', today: parisToday(), days: 14, minStops: 2000 });
}

if (require.main === module) {
  main().catch((e) => { console.error(e); process.exit(1); });
}

module.exports = { runPipeline, parisToday };
