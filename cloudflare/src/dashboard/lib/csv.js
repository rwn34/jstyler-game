// RFC 4180 CSV export + JSON export utilities

function escapeCell(val) {
  const s = val == null ? '' : String(val);
  if (s.indexOf(',') >= 0 || s.indexOf('"') >= 0 || s.indexOf('\n') >= 0 || s.indexOf('\r') >= 0) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function getCellValue(row, col) {
  if (col.exportFormat) return col.exportFormat(row[col.key]);
  return row[col.key];
}

export function exportCsv(rows, columns, filename) {
  const header = columns.map(c => escapeCell(c.label)).join(',');
  const lines = rows.map(row =>
    columns.map(c => escapeCell(getCellValue(row, c))).join(',')
  );
  // UTF-8 BOM for Excel compatibility
  const bom = '\uFEFF';
  const csv = bom + header + '\r\n' + lines.join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  triggerDownload(blob, filename || 'export.csv');
}

export function exportJson(rows, filename) {
  const json = JSON.stringify(rows, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  triggerDownload(blob, filename || 'export.json');
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
