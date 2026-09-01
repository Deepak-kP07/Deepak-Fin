const TRANSFORMS = {
  stripCommas: (v) => v.replace(/,/g, ''),
  trim: (v) => v.trim(),
}

// Applies one sms_parse_patterns row's field_mapping to a message_regex match's named groups —
// { field: { literal } } for a fixed value (e.g. type is always 'expense' for this pattern), or
// { field: { from: 'groupName', transform } } to pull + normalize a captured value. Kept as a
// pure function (no DB/Supabase access) so parseSms stays trivially unit-testable.
export function applyFieldMapping(pattern, groups) {
  const mapping = pattern.field_mapping || {}
  const result = {}
  for (const [field, spec] of Object.entries(mapping)) {
    if (!spec) continue
    if ('literal' in spec) { result[field] = spec.literal; continue }
    let value = groups[spec.from]
    if (value == null) continue
    const transforms = Array.isArray(spec.transform) ? spec.transform : spec.transform ? [spec.transform] : []
    for (const name of transforms) { const fn = TRANSFORMS[name]; if (fn) value = fn(value) }
    result[field] = value
  }
  return result
}
