const { addDays } = require('./calendar');

function pad(n) { return String(n).padStart(2, '0'); }

// 'YYYY-MM-DD' + 'HH:MM:SS' (H possible >=24) -> 'YYYY-MM-DDTHH:MM:SS'
function toDatetime(serviceDate, timeStr) {
  const [h, m, s] = timeStr.split(':').map(Number);
  const dayOffset = Math.floor(h / 24);
  const hour = h % 24;
  const clockDate = dayOffset === 0 ? serviceDate : addDays(serviceDate, dayOffset);
  return `${clockDate}T${pad(hour)}:${pad(m)}:${pad(s)}`;
}

function expandDepartures({ activeByDate, tripsRows, routesRows, stopTimesRows, toTcl }) {
  const routeName = new Map(routesRows.map(r => [r.route_id, r.route_short_name]));
  const tripInfo = new Map(
    tripsRows.map(t => [t.trip_id, {
      service_id: t.service_id,
      line: routeName.get(t.route_id) || '',
      direction: t.trip_headsign || '',
    }])
  );

  // service_id -> dates actives dans la fenêtre
  const datesByService = new Map();
  for (const [date, services] of activeByDate) {
    for (const svc of services) {
      if (!datesByService.has(svc)) datesByService.set(svc, []);
      datesByService.get(svc).push(date);
    }
  }

  const byStop = new Map();

  for (const st of stopTimesRows) {
    const trip = tripInfo.get(st.trip_id);
    if (!trip) continue;
    const dates = datesByService.get(trip.service_id);
    if (!dates || !st.departure_time) continue;
    const tclCode = toTcl.get(st.stop_id);
    if (!tclCode) continue;

    for (const serviceDate of dates) {
      const datetime = toDatetime(serviceDate, st.departure_time);
      if (!byStop.has(tclCode)) byStop.set(tclCode, []);
      byStop.get(tclCode).push({ datetime, line: trip.line, direction: trip.direction });
    }
  }

  for (const deps of byStop.values()) {
    deps.sort((a, b) => (a.datetime < b.datetime ? -1 : a.datetime > b.datetime ? 1 : 0));
  }

  return byStop;
}

module.exports = { expandDepartures, toDatetime };
