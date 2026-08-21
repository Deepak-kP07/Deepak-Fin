'use client'

import { useEffect, useState } from 'react'
import { Download, ListChecks, X } from 'lucide-react'
import { Select } from '@/components/shared/Select'
import { parseCsv } from '@/lib/csv'
import { parseXlsx } from '@/lib/excel'

// Shared shell for every "upload a CSV, map columns, review, import" flow in the app (currently
// transactions and investment holdings). This owns the generic parts — file upload, the mapping
// dropdowns grid, auto-detect-on-upload, per-row include/exclude selection, the scrollable
// preview table's structure, and the sequential import loop with a toast summary. Everything
// domain-specific (how a row parses, what "duplicate" means here if anything, what the preview
// columns actually show, any extra required inputs like a default account) is supplied by the
// caller — a fully generic table would flatten real differences between what transactions and
// holdings need, so those stay render-props instead of being baked in here.
export function CsvBulkImport({
  open, onClose, onImported, toast,
  title = 'Import from CSV or Excel', subtitle = 'Map your columns, review exactly what gets created, then import',
  itemLabel = 'row', uploadHint = "We'll auto-detect columns",
  fields, extraFields, readyToImport = true, notReadyMessage,
  parseRow, isDuplicate, invalidLabel = 'invalid, will be skipped',
  renderTableHead, renderTableRow, belowTable,
  onDownloadTemplate, onImportRow,
}) {
  const [rows, setRows] = useState([])
  const [headers, setHeaders] = useState([])
  const [mapping, setMapping] = useState(() => Object.fromEntries(fields.map((f) => [f.key, ''])))
  const [busy, setBusy] = useState(false)
  const [excluded, setExcluded] = useState(() => new Set())
  useEffect(() => {
    if (open) { setRows([]); setHeaders([]); setMapping(Object.fromEntries(fields.map((f) => [f.key, '']))); setExcluded(new Set()) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const onFile = async (e) => {
    const file = e.target.files?.[0]; if (!file) return
    let hs, rs
    try {
      if (/\.xlsx$/i.test(file.name)) ({ headers: hs, rows: rs } = await parseXlsx(file))
      else ({ headers: hs, rows: rs } = parseCsv(await file.text()))
    } catch (err) {
      toast.push(`Could not read that file: ${err.message}`, 'error')
      return
    }
    setHeaders(hs); setRows(rs)
    const auto = Object.fromEntries(fields.map((f) => [f.key, '']))
    hs.forEach((h) => {
      const l = h.toLowerCase()
      fields.forEach((f) => {
        if (auto[f.key]) return
        const matches = f.detect ? f.detect(l) : l.includes(f.key.toLowerCase())
        if (matches) auto[f.key] = h
      })
    })
    setMapping(auto)
  }

  const requiredFields = fields.filter((f) => f.required)
  const mappingComplete = requiredFields.every((f) => mapping[f.key])
  const preview = mappingComplete
    ? rows.map((r) => { const parsed = parseRow(r, mapping); return { ...parsed, duplicate: parsed.valid && !!isDuplicate?.(parsed) } })
    : []

  useEffect(() => {
    // Duplicates start unchecked (excluded) by default — everything else starts included.
    setExcluded(new Set(preview.map((p, i) => (p.duplicate ? i : null)).filter((i) => i !== null)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, mapping])

  if (!open) return null

  const toImport = preview.filter((p, i) => p.valid && !excluded.has(i))
  const duplicateCount = preview.filter((p) => p.duplicate).length
  const invalidCount = preview.filter((p) => !p.valid).length

  const doImport = async () => {
    if (!mappingComplete) { toast.push(`Map at least ${requiredFields.map((f) => f.label).join(', ')}`, 'error'); return }
    if (!readyToImport) { toast.push(notReadyMessage || 'Fill in the required fields first', 'error'); return }
    setBusy(true)
    let ok = 0, fail = 0
    for (const p of toImport) {
      const success = await onImportRow(p).catch(() => false)
      if (success) ok++; else fail++
    }
    setBusy(false)
    toast.push(`Imported ${ok} ${itemLabel}${ok === 1 ? '' : 's'}${fail ? ` · ${fail} failed` : ''}`, fail ? 'info' : 'success')
    onImported()
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-white/10 bg-[#141a28] p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-white/5"><X size={18} /></button>
        </div>

        {rows.length === 0 ? (
          <div className="mt-6">
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/10 bg-white/[.02] px-6 py-14 text-center hover:border-cyan-300/40 hover:bg-cyan-300/5">
              <ListChecks size={24} className="text-cyan-300" />
              <div className="mt-3 text-sm font-medium text-white">Choose a CSV or Excel file</div>
              <div className="mt-1 text-xs text-slate-500">{uploadHint}</div>
              <input type="file" accept=".csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={onFile} className="hidden" />
            </label>
            {onDownloadTemplate && (
              <button onClick={onDownloadTemplate} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-400 hover:bg-white/5"><Download size={13} />Download template CSV</button>
            )}
          </div>
        ) : (
          <>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {fields.map((f) => (
                <label key={f.key} className="text-sm text-slate-300">{f.label}
                  <Select value={mapping[f.key]} onChange={(e) => setMapping({ ...mapping, [f.key]: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-[#101621] px-3 py-2.5 text-white outline-none">
                    <option value="">— none —</option>
                    {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                  </Select>
                </label>
              ))}
              {extraFields}
            </div>

            {preview.length === 0 ? (
              <div className="mt-5 rounded-xl border border-amber-300/20 bg-amber-300/5 px-4 py-3 text-xs text-amber-200">Map {requiredFields.map((f) => f.label).join(', ')} to see a preview of what will be imported.</div>
            ) : (
              <>
                <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <span>{preview.length} row{preview.length === 1 ? '' : 's'} detected{duplicateCount ? ` · ${duplicateCount} likely duplicate${duplicateCount === 1 ? '' : 's'} (unchecked by default)` : ''}{invalidCount ? ` · ${invalidCount} ${invalidLabel}` : ''}</span>
                  <button type="button" onClick={() => setExcluded(excluded.size > 0 ? new Set() : new Set(preview.map((_, i) => i)))} className="text-cyan-300 hover:underline">{excluded.size > 0 ? 'Select all' : 'Deselect all'}</button>
                </div>
                <div className="mt-2 max-h-72 overflow-auto rounded-xl border border-white/10 bg-black/20 text-xs">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-[#141a28] text-slate-500"><tr><th className="px-3 py-2" />{renderTableHead()}</tr></thead>
                    <tbody>
                      {preview.map((p, i) => (
                        <tr key={i} className={`border-t border-white/5 ${!p.valid ? 'opacity-40' : excluded.has(i) ? 'opacity-50' : ''}`}>
                          <td className="px-3 py-2">
                            <input type="checkbox" disabled={!p.valid} checked={p.valid && !excluded.has(i)} onChange={() => setExcluded((s) => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n })} />
                          </td>
                          {renderTableRow(p, i)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            {belowTable?.(toImport)}
            <button onClick={doImport} disabled={busy || toImport.length === 0} className="mt-5 w-full rounded-xl bg-gradient-to-r from-cyan-300 to-blue-500 py-3.5 text-sm font-semibold text-[#07101c] disabled:opacity-60">{busy ? 'Importing…' : `Import ${toImport.length} ${itemLabel}${toImport.length === 1 ? '' : 's'}`}</button>
          </>
        )}
      </div>
    </div>
  )
}
