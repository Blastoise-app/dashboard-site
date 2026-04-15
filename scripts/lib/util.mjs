export function parseSv(s) {
  if (s == null) return 0;
  const t = String(s).replace(/,/g, '').trim();
  if (!t) return 0;
  const m = /^([\d.]+)\s*([KMkm])?$/.exec(t);
  if (!m) return parseFloat(t) || 0;
  const n = parseFloat(m[1]);
  const suffix = (m[2] || '').toUpperCase();
  const mult = suffix === 'M' ? 1e6 : suffix === 'K' ? 1e3 : 1;
  return n * mult;
}

export function parseCpc(s) {
  if (!s) return 0;
  return parseFloat(String(s).replace(/[^\d.]/g, '')) || 0;
}

export function normalizeStatus(s) {
  if (!s) return 'notDone';
  const l = String(s).toLowerCase();
  if (l.includes('not done')) return 'notDone';
  if (l.includes('proposed') || l.includes('ready')) return 'proposed';
  if (l.includes('in progress') || l.includes('started') || l.includes('drafting')) return 'inProgress';
  if (l.includes('done') || l.includes('complete') || l.includes('live') || l.includes('published')) return 'done';
  return 'notDone';
}

export function nonEmpty(row) {
  return row.some((c) => c && String(c).trim());
}

export function cell(row, i) {
  return row && row[i] != null ? String(row[i]).trim() : '';
}
