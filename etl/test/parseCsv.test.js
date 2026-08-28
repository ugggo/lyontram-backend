// etl/test/parseCsv.test.js
const { test } = require('node:test');
const assert = require('node:assert');
const { parseCsv } = require('../src/parseCsv');

test('parse en-têtes et valeurs', () => {
  const rows = parseCsv('a,b\n1,2\n3,4\n');
  assert.deepStrictEqual(rows, [{ a: '1', b: '2' }, { a: '3', b: '4' }]);
});

test('gère les virgules entre guillemets', () => {
  const rows = parseCsv('stop_id,stop_name\n1,"Foch, quai A"\n');
  assert.strictEqual(rows[0].stop_name, 'Foch, quai A');
});

test('gère le BOM et les fins de ligne CRLF', () => {
  const rows = parseCsv('﻿a,b\r\n1,2\r\n');
  assert.deepStrictEqual(rows, [{ a: '1', b: '2' }]);
});
