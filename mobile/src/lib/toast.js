import { Alert, Platform, ToastAndroid } from 'react-native'

// The PWA's toast.push(message, 'error'?): a short system toast for confirmations, an alert for
// errors so they can't be missed.
export const toast = {
  push(message, tone) {
    if (tone === 'error') { Alert.alert('Something went wrong', String(message || 'Please try again')); return }
    if (Platform.OS === 'android') ToastAndroid.show(String(message), ToastAndroid.SHORT)
  },
}
