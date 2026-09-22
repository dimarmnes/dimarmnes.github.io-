// Lector de registros ADIF del Libro de Guardia.
function parseAdifRecords(text) {
  const records = [];
  const body = text.split(/<eoh\s*>/i).pop();
  for (const part of body.split(/<eor\s*>/i)) {
    const record = {};
    const pattern = /<([^:>]+):(\d+)(?::[^>]*)?>/gi;
    let match;
    while ((match = pattern.exec(part))) {
      const end = pattern.lastIndex + Number(match[2]);
      record[match[1].toLowerCase()] = part.slice(pattern.lastIndex, end).trim();
      pattern.lastIndex = end;
    }
    if (record.call) records.push(record);
  }
  return records;
}
