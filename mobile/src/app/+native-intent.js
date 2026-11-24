// personalfin://kite?status=… is the Kite login's return address. The in-app browser session
// (WebBrowser.openAuthSessionAsync) reads it itself, so the router shouldn't also try to open a
// "/kite" screen that doesn't exist — keep whatever is on screen.
export function redirectSystemPath({ path, initial }) {
  try {
    if (/^(personalfin:\/\/)?\/?kite(\?|$)/.test(path) || /^personalfin:\/\/kite/.test(path)) return initial ? '/' : null
  } catch {}
  return path
}
