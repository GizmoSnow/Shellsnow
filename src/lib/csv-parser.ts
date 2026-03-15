import type { ParsedCSVRow } from './import-types';

export function parseCSV(content: string): ParsedCSVRow[] {
  const lines = content.split(/\r?\n/).filter(line => line.trim());
  if (lines.length === 0) return [];

  const headers = parseCSVLine(lines[0]);
  const rows: ParsedCSVRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0) continue;

    const row: ParsedCSVRow = {};
    headers.forEach((header, idx) => {
      row[header.trim()] = values[idx]?.trim() || '';
    });
    rows.push(row);
  }

  return rows;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

export function detectReportType(headers: string[]): 'orgcs_engagement' | 'org62_support' | 'org62_training' | 'unknown' {
  const headerSet = new Set(headers.map(h => h.toLowerCase().trim()));

  if (
    headerSet.has('engagement name') ||
    headerSet.has('engagement template name') ||
    headerSet.has('engagement template') ||
    headerSet.has('engagement id')
  ) {
    return 'orgcs_engagement';
  }

  if (
    headerSet.has('case number') ||
    headerSet.has('case subject') ||
    headerSet.has('case type') ||
    headerSet.has('case id')
  ) {
    return 'org62_support';
  }

  if (
    headerSet.has('course') ||
    headerSet.has('training title') ||
    headerSet.has('module') ||
    headerSet.has('session title') ||
    headerSet.has('course type')
  ) {
    return 'org62_training';
  }

  return 'unknown';
}

export function findColumn(row: ParsedCSVRow, possibleNames: string[]): string | undefined {
  const lowerKeys = Object.keys(row).reduce((acc, key) => {
    acc[key.toLowerCase().trim()] = key;
    return acc;
  }, {} as Record<string, string>);

  for (const name of possibleNames) {
    const lowerName = name.toLowerCase().trim();
    if (lowerKeys[lowerName]) {
      return row[lowerKeys[lowerName]];
    }
  }

  return undefined;
}
