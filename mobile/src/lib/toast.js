import { showToast } from '../ui/Dialogs'

// The PWA's toast.push(message, tone?) — tone: 'success' (default) | 'error' | 'warning' | 'info'.
// Drawn by the app's own <ToastHost/>, not Android's system toast.
export const toast = {
  push(message, tone = 'success') {
    showToast(tone === 'error' && !message ? 'Something went wrong — please try again' : message, tone)
  },
}
