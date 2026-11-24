import { File } from 'expo-file-system'
import { readSheet } from 'read-excel-file/universal'
import { parseCsv } from '@/lib/csv'

// One reader for every bulk import (transactions, Family/Company entries, holdings): CSV, or the
// first sheet of an Excel .xlsx — the same two formats the PWA's CsvBulkImport accepts, returned
// in parseCsv's { headers, rows } shape. Mirrors the web's lib/excel.js, but reads the picked file
// as an ArrayBuffer (read-excel-file's "universal" build is pure JS and runs on Hermes).
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
export const SPREADSHEET_TYPES = ['text/csv', 'text/comma-separated-values', 'text/plain', XLSX_MIME, '*/*']

// A date-formatted Excel cell comes back as a Date; callers' date parsers expect ISO or dd/mm/yyyy.
function cellToString(c) {
  if (c == null) return ''
  if (c instanceof Date) return c.toISOString().slice(0, 10)
  return String(c).trim()
}

export function isXlsx(asset) {
  return /\.xlsx$/i.test(asset?.name || '') || asset?.mimeType === XLSX_MIME
}

export async function readSpreadsheet(asset) {
  const file = new File(asset.uri)
  if (!isXlsx(asset)) return parseCsv(await file.text())
  const sheetRows = await readSheet(await file.arrayBuffer())
  if (!sheetRows?.length) return { headers: [], rows: [] }
  const headers = sheetRows[0].map(cellToString)
  const rows = sheetRows.slice(1)
    .filter((r) => r.some((c) => c != null && String(c).trim().length > 0))
    .map((cols) => Object.fromEntries(headers.map((h, i) => [h, cellToString(cols[i])])))
  return { headers, rows }
}
