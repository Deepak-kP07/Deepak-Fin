import { readSheet } from 'read-excel-file/browser'

// Mirrors parseCsv's {headers, rows} shape so CsvBulkImport can treat an .xlsx upload
// identically to a .csv one — every cell is stringified since the domain-specific parseRow
// implementations already coerce with String()/Number() regardless of source type.
// readSheet() (not the default export) reads just the first sheet as an array of arrays —
// the default export instead returns every sheet in the workbook, which we don't need here.
//
// A date-formatted Excel cell comes back as a real JS Date object, not a string — plain
// String(date) produces something like "Wed Jan 15 2026 00:00:00 GMT+0000 (...)", which no
// caller's dd/mm/yyyy-or-ISO date regex can read, silently breaking every row's date on import.
// Converting it to a plain ISO date string here (rather than in every caller) fixes it once.
function cellToString(c) {
  if (c == null) return ''
  if (c instanceof Date) return c.toISOString().slice(0, 10)
  return String(c).trim()
}

export async function parseXlsx(file) {
  const sheetRows = await readSheet(file)
  if (sheetRows.length === 0) return { headers: [], rows: [] }
  const headers = sheetRows[0].map(cellToString)
  const rows = sheetRows.slice(1)
    .filter((r) => r.some((c) => c != null && String(c).trim().length > 0))
    .map((cols) => {
      const obj = {}
      headers.forEach((h, i) => { obj[h] = cellToString(cols[i]) })
      return obj
    })
  return { headers, rows }
}
