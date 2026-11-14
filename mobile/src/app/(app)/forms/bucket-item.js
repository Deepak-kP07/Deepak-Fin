import { useState } from 'react'
import { Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { Button, Field } from '../../../components/ui'
import { FormShell } from '../../../components/forms'
import { useData } from '../../../state/DataProvider'
import { api } from '../../../lib/api'

export default function BucketItemForm() {
  const router = useRouter()
  const { refresh } = useData()
  const [form, setForm] = useState({ title: '', estimated_cost: '', product_url: '', reasons: '' })
  const [busy, setBusy] = useState(false)
  const set = (p) => setForm((f) => ({ ...f, ...p }))
  const save = async () => {
    if (!form.title.trim()) return Alert.alert('What do you want to buy?')
    const url = form.product_url.trim()
    if (url && !/^https?:\/\//i.test(url)) return Alert.alert('Product link should start with https://')
    setBusy(true)
    try {
      await api('/finance/bucket_list', { method: 'POST', body: { title: form.title.trim(), estimated_cost: form.estimated_cost ? Number(form.estimated_cost) : null, product_url: url || null, reasons: form.reasons.trim() || null } })
      await refresh()
      router.back()
    } catch (e) { Alert.alert('Could not save', e.message) } finally { setBusy(false) }
  }
  return (
    <FormShell title="Add to bucket list" onClose={() => router.back()} footer={<Button label="Add" onPress={save} busy={busy} />}>
      <Field label="What is it?" value={form.title} onChangeText={(v) => set({ title: v })} placeholder="e.g. Noise-cancelling headphones" />
      <Field label="Estimated cost (optional)" value={form.estimated_cost} onChangeText={(v) => set({ estimated_cost: v.replace(/[^0-9.]/g, '') })} keyboardType="decimal-pad" />
      <Field label="Product link (optional)" value={form.product_url} onChangeText={(v) => set({ product_url: v })} autoCapitalize="none" keyboardType="url" placeholder="https://" />
      <Field label="Why do you want it? (optional)" value={form.reasons} onChangeText={(v) => set({ reasons: v })} multiline />
    </FormShell>
  )
}
