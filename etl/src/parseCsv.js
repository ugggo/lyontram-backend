// etl/src/parseCsv.js
const { parse } = require('csv-parse/sync');

function parseCsv(text) {
  return parse(text, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    relax_column_count: true,
  });
}

module.exports = { parseCsv };
