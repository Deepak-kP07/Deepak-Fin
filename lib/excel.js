import { readSheet } from 'read-excel-file/browser'

// Mirrors parseCsv's {headers, rows} shape so CsvBulkImport can treat an .xlsx upload
// identically to a .csv one — every cell is stringified since the domain-specific parseRow
// implementations already coerce with String()/Number() regardless of source type.
// readSheet() (not the default export) reads just the first sheet as an array of arrays —
// the default export instead returns every sheet in the workbook, which we don't need here.
export async function parseXlsx(file) {
  const sheetRows = await readSheet(file)
  if (sheetRows.length === 0) return { headers: [], rows: [] }
  const headers = sheetRows[0].map((c) => (c == null ? '' : String(c).trim()))
  const rows = sheetRows.slice(1)
    .filter((r) => r.some((c) => c != null && String(c).trim().length > 0))
    .map((cols) => {
      const obj = {}
      headers.forEach((h, i) => { obj[h] = cols[i] == null ? '' : String(cols[i]).trim() })
      return obj
    })
  return { headers, rows }
}
