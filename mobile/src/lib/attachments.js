import { Alert } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import * as DocumentPicker from 'expo-document-picker'
import * as WebBrowser from 'expo-web-browser'
import { supabase } from './supabase'
import { api } from './api'

// Port of lib/attachments.js (web). Same storage layout: attachments/<userId>/<recordId>/<time>-<name>.
// `endpoint` is the record's API path without /api, e.g. /finance/scholarships/<id>.
export const pickAttachmentFile = () => new Promise((resolve) => {
  Alert.alert('Attach receipt', '', [
    { text: 'Photo', onPress: async () => { const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 }); resolve(!r.canceled && r.assets?.[0] ? { uri: r.assets[0].uri, name: r.assets[0].fileName || `receipt-${Date.now()}.jpg`, mimeType: r.assets[0].mimeType || 'image/jpeg' } : null) } },
    { text: 'Camera', onPress: async () => { const p = await ImagePicker.requestCameraPermissionsAsync(); if (!p.granted) return resolve(null); const r = await ImagePicker.launchCameraAsync({ quality: 0.8 }); resolve(!r.canceled && r.assets?.[0] ? { uri: r.assets[0].uri, name: `receipt-${Date.now()}.jpg`, mimeType: 'image/jpeg' } : null) } },
    { text: 'PDF', onPress: async () => { const r = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true }); resolve(!r.canceled && r.assets?.[0] ? { uri: r.assets[0].uri, name: r.assets[0].name, mimeType: 'application/pdf' } : null) } },
  ], { cancelable: true, onDismiss: () => resolve(null) })
})

export async function uploadAttachment(endpoint, recordId, file) {
  const { data: userData } = await supabase.auth.getUser()
  const path = `${userData.user.id}/${recordId}/${Date.now()}-${file.name}`
  const body = await (await fetch(file.uri)).arrayBuffer()
  const { error } = await supabase.storage.from('attachments').upload(path, body, { contentType: file.mimeType, upsert: true })
  if (error) return { error }
  try { await api(endpoint, { method: 'PATCH', body: { attachment_path: path, attachment_name: file.name } }) } catch (e) { return { error: e } }
  return { ok: true }
}

export async function removeAttachment(endpoint) {
  try { await api(`${endpoint}/attachment`, { method: 'DELETE' }); return { ok: true } } catch { return { ok: false } }
}

export async function viewAttachment(endpoint) {
  try { const { url } = await api(`${endpoint}/attachment`); if (url) await WebBrowser.openBrowserAsync(url) } catch { /* nothing to open */ }
}
