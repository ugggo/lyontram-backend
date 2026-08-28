function buildTclMapping(stopsRows, idMappingsRows) {
  const fromTo = new Map();
  for (const row of idMappingsRows || []) {
    fromTo.set(row.from_id, row.to_id);
  }

  const toTcl = new Map();
  const names = new Map();
  let unresolvedCount = 0;

  for (const row of stopsRows) {
    const gtfsId = row.stop_id;
    const tclCode = fromTo.get(gtfsId) || gtfsId;
    toTcl.set(gtfsId, tclCode);
    if (row.stop_name) names.set(tclCode, row.stop_name);
    else unresolvedCount++;
  }

  return { toTcl, names, unresolvedCount };
}

module.exports = { buildTclMapping };
