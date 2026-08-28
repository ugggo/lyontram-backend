const fs = require('node:fs');
const path = require('node:path');

function writeOutput(outDir, byStop, names, meta) {
  const stopsDir = path.join(outDir, 'stops');
  fs.mkdirSync(stopsDir, { recursive: true });

  let stopsWritten = 0;
  for (const [code, departures] of byStop) {
    const payload = {
      stopId: code,
      stopName: names.get(code) || '',
      generatedAt: meta.generatedAt,
      validThrough: meta.validThrough,
      departures,
    };
    fs.writeFileSync(path.join(stopsDir, `${code}.json`), JSON.stringify(payload));
    stopsWritten++;
  }

  fs.writeFileSync(
    path.join(outDir, 'manifest.json'),
    JSON.stringify({ generatedAt: meta.generatedAt, validThrough: meta.validThrough, stopCount: stopsWritten })
  );

  return { stopsWritten };
}

module.exports = { writeOutput };
