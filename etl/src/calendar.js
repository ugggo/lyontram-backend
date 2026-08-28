const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

// 'YYYY-MM-DD' -> 'YYYYMMDD'
function compact(dateStr) {
  return dateStr.replace(/-/g, '');
}

// avance une date civile de n jours en restant en UTC (pas d'heure -> pas de DST)
function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function activeServicesByDate(calendarRows, calendarDatesRows, startDate, days) {
  const result = new Map();

  for (let i = 0; i < days; i++) {
    const dateStr = addDays(startDate, i);
    const compactDate = compact(dateStr);
    const weekday = WEEKDAYS[new Date(dateStr + 'T00:00:00Z').getUTCDay()];
    const active = new Set();

    for (const row of calendarRows) {
      if (row[weekday] !== '1') continue;
      if (compactDate < row.start_date || compactDate > row.end_date) continue;
      active.add(row.service_id);
    }

    result.set(dateStr, active);
  }

  // exceptions
  for (const ex of calendarDatesRows) {
    const dateStr = `${ex.date.slice(0, 4)}-${ex.date.slice(4, 6)}-${ex.date.slice(6, 8)}`;
    const set = result.get(dateStr);
    if (!set) continue; // hors fenêtre
    if (ex.exception_type === '1') set.add(ex.service_id);
    else if (ex.exception_type === '2') set.delete(ex.service_id);
  }

  return result;
}

module.exports = { activeServicesByDate, addDays };
