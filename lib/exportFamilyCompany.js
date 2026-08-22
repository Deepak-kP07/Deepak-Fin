const HEADERS = ['Profile', 'Profile type', 'Linked to bank', 'Date', 'Entry type', 'Category', 'Description', 'Paid to / Received from', 'Amount', 'Notes']

function csvEscape(value) {
  const s = value == null ? '' : String(value)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

// One flat CSV across every Family/Company profile's entries — same shape as
// lib/exportInvestments.js, so the export always matches what's on screen.
export function buildFamilyCompanyExportCsv({ profiles, entries }) {
  const profileById = (id) => profiles.find((p) => p.id === id)
  const rows = entries.map((e) => {
    const profile = profileById(e.profile_id)
    return [
      profile?.name || '', profile?.profile_type || '', profile?.linked_account_id ? 'Yes' : 'No',
      e.date, e.entry_type, e.category || '', e.description, e.paid_party || '', Number(e.amount).toFixed(2), e.notes || '',
    ]
  })
  return [HEADERS, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n')
}

// filenameBase names the download itself — the caller passes the profile's own name for a
// single-profile export (e.g. "Acme Pvt Ltd"), or a module-wide name when exporting everything.
export function downloadFamilyCompanyExport(payload, filenameBase, dateStamp) {
  const csv = buildFamilyCompanyExportCsv(payload)
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const slug = String(filenameBase || 'export').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'export'
  const a = document.createElement('a')
  a.href = url; a.download = `${slug}-${dateStamp}.csv`
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
