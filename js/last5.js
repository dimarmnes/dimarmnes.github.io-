const last5Rows = document.querySelector('#last5-rows');
const last5Countries = new Map(DXCC_DATA.entities.map(entity => [String(entity.id), entity.name]));

function qsoTimestamp(record) {
  const date = record.qso_date || '';
  const time = record.time_on || '';
  if (!/^\d{8}$/.test(date) || !/^\d{4}(?:\d{2})?$/.test(time)) return null;
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(4, 6));
  const day = Number(date.slice(6, 8));
  const hour = Number(time.slice(0, 2));
  const minute = Number(time.slice(2, 4));
  const second = Number(time.slice(4, 6) || 0);
  const timestamp = Date.UTC(year, month - 1, day, hour, minute, second);
  const parsed = new Date(timestamp);
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() + 1 === month &&
    parsed.getUTCDate() === day && parsed.getUTCHours() === hour &&
    parsed.getUTCMinutes() === minute && parsed.getUTCSeconds() === second ? timestamp : null;
}

function qsoRow(record) {
  const row = document.createElement('tr');
  const date = record.qso_date;
  const time = record.time_on;
  const values = [
    `${date.slice(6, 8)}/${date.slice(4, 6)}/${date.slice(0, 4)} ${time.slice(0, 2)}:${time.slice(2, 4)}`,
    record.call || '—',
    (record.band || '—').toUpperCase(),
    (record.mode || '—').toUpperCase(),
    last5Countries.get(String(record.dxcc)) || '—'
  ];
  values.forEach((value, index) => {
    const cell = row.insertCell();
    cell.textContent = value;
    cell.title = value;
    if (index === 1) cell.className = 'call';
  });
  return row;
}

function showLast5Message(message) {
  last5Rows.replaceChildren();
  for (let index = 0; index < 5; index++) {
    const row = last5Rows.insertRow();
    const cell = row.insertCell();
    cell.colSpan = 5;
    if (index === 0) {
      cell.className = 'message';
      cell.textContent = message;
    }
  }
}

async function loadLast5() {
  try {
    const response = await fetch('datos/contactos.adi', {cache: 'no-store'});
    if (!response.ok) throw new Error(`ADIF HTTP ${response.status}`);
    const records = parseAdifRecords(await response.text())
      .map(record => ({record, timestamp: qsoTimestamp(record)}))
      .filter(item => item.timestamp !== null)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 5);
    if (!records.length) {
      showLast5Message('Aún no hay contactos disponibles.');
      return;
    }
    last5Rows.replaceChildren(...records.map(item => qsoRow(item.record)));
    for (let index = records.length; index < 5; index++) {
      const row = last5Rows.insertRow();
      const cell = row.insertCell();
      cell.colSpan = 5;
    }
  } catch (error) {
    showLast5Message('No se pudieron cargar los contactos en este momento.');
    console.warn('last5: error al cargar el ADIF', error);
  }
}

loadLast5();
