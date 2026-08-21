// Quote-aware CSV parser shared by every bulk-import flow (transactions, investments, ...).
// Handles quoted fields, escaped quotes ("") inside them, commas inside quotes, and — critically
// — newlines inside quotes (valid per RFC 4180, and something real broker/spreadsheet exports do
// use, e.g. a header cell literally containing "\nExchange"). A naive `text.split('\n')` before
// tokenizing would cut a quoted field like that in half and misalign every column after it, so
// this scans the raw text in one pass and only treats \n/\r\n as a row break when outside quotes.
export function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let inQ = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQ) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++ }
      else if (ch === '"') inQ = false
      else field += ch
    } else if (ch === '"') inQ = true
    else if (ch === ',') { row.push(field); field = '' }
    else if (ch === '\r') { /* skip — \n (or EOF) ends the row */ }
    else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = '' }
    else field += ch
  }
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row) }

  const trimmed = rows.map((r) => r.map((c) => c.trim())).filter((r) => r.some((c) => c.length > 0))
  if (trimmed.length === 0) return { headers: [], rows: [] }
  const headers = trimmed[0]
  const dataRows = trimmed.slice(1).map((cols) => {
    const obj = {}
    headers.forEach((h, i) => { obj[h] = cols[i] || '' })
    return obj
  })
  return { headers, rows: dataRows }
}
