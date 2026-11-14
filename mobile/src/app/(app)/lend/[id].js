import { Alert, Text, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Button, Card, EmptyState, ListRow, ProgressBar, Screen, SectionLabel, Stat, styles as ui } from '../../../components/ui'
import { useData } from '../../../state/DataProvider'
import { api } from '../../../lib/api'
import { capitalizeFirst, dayLabel, money } from '../../../lib/format'
import { canDeleteRecord, canLogRepayment, lendRole, perspectiveType } from '../../../lib/shared'
import { colors } from '../../../lib/theme'
import { pendingOf } from '../../../lib/modules'

export default function LendDetail() {
  const { id } = useLocalSearchParams()
  const router = useRouter()
  const { data, refresh } = useData()
  const record = (data.lend_borrow || []).find((r) => r.id === id)
  if (!record) return <Screen title="Lend / Borrow" back><EmptyState title="Record not found" /></Screen>
  const role = lendRole(record)
  const type = perspectiveType(record)
  const pending = pendingOf(record)
  const amount = Number(record.amount || 0)
  const history = [
    ...(data.lend_repayments || []).filter((r) => r.lend_borrow_id === id).map((r) => ({ ...r, kind: 'repayment' })),
    ...(data.lend_borrow_additions || []).filter((r) => r.lend_borrow_id === id).map((r) => ({ ...r, kind: 'addition' })),
  ].sort((a, b) => (b.date || '').localeCompare(a.date || '') || String(b.created_at).localeCompare(String(a.created_at)))

  const remove = () => Alert.alert(`Delete the record for ${record.person_name}?`, 'The money movement it recorded (if any) is removed too.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => {
      try { await api(`/finance/lend_borrow/${id}`, { method: 'DELETE' }); await refresh(); router.back() }
      catch (e) { Alert.alert('Could not delete', e.message) }
    } },
  ])

  return (
    <Screen title={record.person_name} back>
      <Card>
        <Text style={ui.muted}>{type === 'lent' ? `${record.person_name} owes you` : `You owe ${record.person_name}`}</Text>
        <Text style={{ color: record.status === 'returned' ? colors.income : colors.text, fontSize: 30, fontWeight: '700', marginTop: 6 }}>{record.status === 'returned' ? 'Settled' : money(pending)}</Text>
        <ProgressBar pct={amount > 0 ? (Number(record.amount_repaid || 0) / amount) * 100 : 0} color={colors.income} />
        <Text style={[ui.muted, { marginTop: 8 }]}>{money(record.amount_repaid)} of {money(amount)} repaid</Text>
      </Card>
      <View style={[ui.row, { marginTop: 10 }]}>
        <Stat label={type === 'lent' ? 'Lent on' : 'Borrowed on'} value={record.date ? dayLabel(record.date) : '—'} />
        <Stat label="Due" value={record.due_date ? dayLabel(record.due_date) : '—'} />
      </View>
      {record.reason ? <Card style={{ marginTop: 10 }}><Text style={ui.muted}>Reason</Text><Text style={{ color: colors.text, marginTop: 4 }}>{capitalizeFirst(record.reason)}</Text></Card> : null}

      {canLogRepayment(role) && record.status !== 'returned' && (
        <Button label={type === 'lent' ? 'Log money received' : 'Log repayment'} icon="check-circle" style={{ marginTop: 14 }} onPress={() => router.push({ pathname: '/forms/lend-repayment', params: { id } })} />
      )}
      {role !== 'owner' && <Text style={[ui.muted, { marginTop: 12 }]}>Shared with you ({role === 'admin' ? 'admin' : 'view only'}). Only the owner logs repayments.</Text>}

      <SectionLabel>History</SectionLabel>
      <Card style={{ paddingVertical: 2 }}>
        {history.length === 0 ? <EmptyState icon="list" title="No repayments yet" /> : history.map((h, i) => (
          <ListRow
            key={`${h.kind}-${h.id}`}
            title={h.kind === 'repayment' ? 'Repayment' : capitalizeFirst(h.notes) || (type === 'lent' ? 'Lent more' : 'Borrowed more')}
            detail={dayLabel(h.date)}
            value={`${h.kind === 'repayment' ? '−' : '+'}${money(h.amount)}`}
            valueColor={h.kind === 'repayment' ? colors.income : colors.expense}
            last={i === history.length - 1}
          />
        ))}
      </Card>
      {canDeleteRecord(role) && <Button label="Delete record" variant="danger" icon="trash-2" style={{ marginTop: 20 }} onPress={remove} />}
    </Screen>
  )
}
