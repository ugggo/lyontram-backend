const { test } = require('node:test');
const assert = require('node:assert');
const AdmZip = require('adm-zip');
const { extractGtfs } = require('../src/fetchGtfs');

test('extractGtfs mappe basename -> texte', () => {
  const zip = new AdmZip();
  zip.addFile('stops.txt', Buffer.from('stop_id\n1\n'));
  zip.addFile('calendar.txt', Buffer.from('service_id\nS1\n'));
  const map = extractGtfs(zip.toBuffer());
  assert.strictEqual(map.get('stops.txt'), 'stop_id\n1\n');
  assert.strictEqual(map.get('calendar.txt'), 'service_id\nS1\n');
});
