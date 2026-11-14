import { Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { Card, EmptyState, ListRow, ProgressBar, Screen, SectionLabel, styles as ui } from '../../../components/ui'
import { useData } from '../../../state/DataProvider'
import { money } from '../../../lib/format'
import { nextBillDue, utilisationSeverity } from '../../../lib/shared'
import { colors, severityColor } from '../../../lib/theme'

export default function CreditCards() {
  const router = useRouter()
  const { data } = useData()
  const cards = data.credit_cards || []
  const totalLimit = cards.reduce((s, c) => s + Number(c.credit_limit || 0), 0)
  const totalUsed = cards.reduce((s, c) => s + Number(c.current_outstanding || 0), 0)
  const util = totalLimit > 0 ? (totalUsed / totalLimit) * 100 : 0
  const sev = utilisationSeverity(util)

  return (
    <Screen title="Credit cards" back>
      {cards.length === 0 ? <EmptyState icon="credit-card" title="No credit cards" message="Add cards on the web app — they show up here." /> : (
        <>
          <Card>
            <Text style={ui.muted}>Total outstanding</Text>
            <Text style={{ color: colors.text, fontSize: 30, fontWeight: '700', marginTop: 6 }}>{money(totalUsed)}</Text>
            {totalLimit > 0 && (
              <>
                <ProgressBar pct={util} color={severityColor(sev.label)} />
                <Text style={[ui.muted, { marginTop: 8 }]}>{Math.round(util)}% of {money(totalLimit)} used · {sev.label}</Text>
              </>
            )}
          </Card>
          <SectionLabel>Cards</SectionLabel>
          <Card style={{ paddingVertical: 2 }}>
            {cards.map((c, i) => {
              const { days } = nextBillDue(c)
              const used = Number(c.current_outstanding || 0)
              return (
                <ListRow
                  key={c.id}
                  dot={c.color}
                  title={c.name}
                  detail={[c.bank, c.last4 && `•• ${c.last4}`, used > 0 ? `due in ${days} day${days === 1 ? '' : 's'}` : null].filter(Boolean).join(' · ')}
                  value={money(used)}
                  valueColor={used > 0 ? colors.expense : undefined}
                  onPress={() => router.push(`/cards/${c.id}`)}
                  last={i === cards.length - 1}
                />
              )
            })}
          </Card>
        </>
      )}
    </Screen>
  )
}
