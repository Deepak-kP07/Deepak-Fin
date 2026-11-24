// Long-press the app icon → "Add expense" / "Add income" (Android static app shortcuts). Each opens
// personalfin:///transaction?type=…, the same add-transaction screen as the + button.
const fs = require('fs')
const path = require('path')
const { withAndroidManifest, withDangerousMod, AndroidConfig } = require('expo/config-plugins')

const SHORTCUTS = [
  { id: 'add_expense', short: 'Add expense', long: 'Add an expense', type: 'expense', icon: 'ic_shortcut_expense', color: '#e11d48', glyph: 'M7,12h10' },
  { id: 'add_income', short: 'Add income', long: 'Add income', type: 'income', icon: 'ic_shortcut_income', color: '#059669', glyph: 'M12,7v10M7,12h10' },
]

const shortcutsXml = (pkg) => `<?xml version="1.0" encoding="utf-8"?>
<shortcuts xmlns:android="http://schemas.android.com/apk/res/android">
${SHORTCUTS.map((s) => `  <shortcut android:shortcutId="${s.id}" android:enabled="true" android:icon="@drawable/${s.icon}" android:shortcutShortLabel="@string/${s.id}_short" android:shortcutLongLabel="@string/${s.id}_long">
    <intent android:action="android.intent.action.VIEW" android:targetPackage="${pkg}" android:targetClass="${pkg}.MainActivity" android:data="personalfin:///transaction?type=${s.type}" />
  </shortcut>`).join('\n')}
</shortcuts>
`
// Adaptive-icon style: a coloured circle with a white plus/minus.
const iconXml = (s) => `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="48dp" android:height="48dp" android:viewportWidth="24" android:viewportHeight="24">
  <path android:fillColor="${s.color}" android:pathData="M12,2a10,10 0 1,0 0.001,0z" />
  <path android:strokeColor="#FFFFFF" android:strokeWidth="2" android:strokeLineCap="round" android:pathData="${s.glyph}" />
</vector>
`

module.exports = function withAppShortcuts(config) {
  config = withAndroidManifest(config, (c) => {
    const activity = AndroidConfig.Manifest.getMainActivityOrThrow(c.modResults)
    activity['meta-data'] = (activity['meta-data'] || []).filter((m) => m.$['android:name'] !== 'android.app.shortcuts')
    activity['meta-data'].push({ $: { 'android:name': 'android.app.shortcuts', 'android:resource': '@xml/shortcuts' } })
    return c
  })
  config = withDangerousMod(config, ['android', (c) => {
    const res = path.join(c.modRequest.platformProjectRoot, 'app/src/main/res')
    const pkg = c.android?.package || 'com.personalfin.app'
    fs.mkdirSync(path.join(res, 'xml'), { recursive: true })
    fs.mkdirSync(path.join(res, 'drawable'), { recursive: true })
    fs.writeFileSync(path.join(res, 'xml/shortcuts.xml'), shortcutsXml(pkg))
    for (const s of SHORTCUTS) fs.writeFileSync(path.join(res, `drawable/${s.icon}.xml`), iconXml(s))
    const strings = path.join(res, 'values/shortcut_strings.xml')
    fs.mkdirSync(path.dirname(strings), { recursive: true })
    fs.writeFileSync(strings, `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n${SHORTCUTS.map((s) => `  <string name="${s.id}_short">${s.short}</string>\n  <string name="${s.id}_long">${s.long}</string>`).join('\n')}\n</resources>\n`)
    return c
  }])
  return config
}
