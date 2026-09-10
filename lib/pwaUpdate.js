'use client'

// Shared by the one-time "new version available" toast (app/page.js, triggered by the service
// worker's own controllerchange event) and anything that offers a manual/repeatable way to
// trigger the same thing — the Settings > Updates "Update now" button, and the toast shown when
// the app is opened from an "update available" push notification (app/page.js reads ?update=1).
// Serwist's skipWaiting+clientsClaim (app/sw.js) mean a newly found worker takes over on its own;
// this just forces a check instead of waiting for the browser's own polling, then reloads to
// pick it up.
export async function triggerAppUpdate() {
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration()
      await reg?.update()
    }
  } catch {
    // best-effort — reload happens regardless below
  } finally {
    setTimeout(() => window.location.reload(), 400)
  }
}
