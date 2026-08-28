const AdmZip = require('adm-zip');

function extractGtfs(buffer) {
  const zip = new AdmZip(buffer);
  const map = new Map();
  for (const entry of zip.getEntries()) {
    if (entry.isDirectory) continue;
    const base = entry.entryName.split('/').pop();
    map.set(base, entry.getData().toString('utf8'));
  }
  return map;
}

async function fetchGtfsZip(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GTFS download HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

module.exports = { extractGtfs, fetchGtfsZip };
