import type { ParsedCSVRow } from './import-types';

export async function parseExcelFile(file: File): Promise<ParsedCSVRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          reject(new Error('Failed to read file'));
          return;
        }

        const workbook = await parseExcelData(data as ArrayBuffer);
        const rows = extractRowsFromWorkbook(workbook);
        resolve(rows);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

async function parseExcelData(data: ArrayBuffer): Promise<any> {
  const XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.0/package/xlsx.mjs');
  return XLSX.read(data, { type: 'array' });
}

function extractRowsFromWorkbook(workbook: any): ParsedCSVRow[] {
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  const jsonData = workbookSheetToJSON(worksheet);

  return jsonData.map((row: any) => {
    const parsedRow: ParsedCSVRow = {};
    Object.keys(row).forEach(key => {
      parsedRow[key] = String(row[key] || '');
    });
    return parsedRow;
  });
}

function workbookSheetToJSON(worksheet: any): any[] {
  const range = worksheet['!ref'];
  if (!range) return [];

  const XLSX_UTILS = {
    sheet_to_json: (ws: any) => {
      const result: any[] = [];
      const headers: string[] = [];
      const ref = ws['!ref'];
      if (!ref) return result;

      const range = decodeRange(ref);

      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = encodeCell({ r: range.s.r, c: C });
        const cell = ws[cellAddress];
        headers[C] = cell ? String(cell.v) : `Column${C}`;
      }

      for (let R = range.s.r + 1; R <= range.e.r; ++R) {
        const row: any = {};
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellAddress = encodeCell({ r: R, c: C });
          const cell = ws[cellAddress];
          row[headers[C]] = cell ? cell.v : '';
        }
        result.push(row);
      }

      return result;
    }
  };

  return XLSX_UTILS.sheet_to_json(worksheet);
}

function decodeRange(range: string): { s: { r: number; c: number }; e: { r: number; c: number } } {
  const parts = range.split(':');
  const start = decodeCell(parts[0]);
  const end = parts[1] ? decodeCell(parts[1]) : start;
  return { s: start, e: end };
}

function decodeCell(cell: string): { r: number; c: number } {
  const match = cell.match(/^([A-Z]+)(\d+)$/);
  if (!match) return { r: 0, c: 0 };

  const col = match[1];
  const row = parseInt(match[2], 10) - 1;

  let c = 0;
  for (let i = 0; i < col.length; i++) {
    c = c * 26 + (col.charCodeAt(i) - 64);
  }
  c--;

  return { r: row, c };
}

function encodeCell(cell: { r: number; c: number }): string {
  let col = '';
  let c = cell.c + 1;
  while (c > 0) {
    const mod = (c - 1) % 26;
    col = String.fromCharCode(65 + mod) + col;
    c = Math.floor((c - mod) / 26);
  }
  return col + (cell.r + 1);
}

export function isExcelFile(filename: string): boolean {
  const ext = filename.toLowerCase().split('.').pop();
  return ext === 'xlsx' || ext === 'xls';
}
