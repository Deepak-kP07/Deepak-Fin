import { Card, EmptyState, ListRow, Screen } from '../../components/ui'
import { useData } from '../../state/DataProvider'
import { capitalizeFirst } from '../../lib/format'

export default function MoneyRules() {
  const { data } = useData()
  const rules = (data.money_rules || []).filter((r) => r.is_active !== false).sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
  return (
    <Screen title="Money rules" back>
      {rules.length === 0 ? <EmptyState icon="book-open" title="No money rules" message="Write your personal money rules on the web app (Settings → Money rules)." /> : (
        <Card style={{ paddingVertical: 2 }}>
          {rules.map((r, i) => <ListRow key={r.id} icon="check" title={capitalizeFirst(r.rule_text)} last={i === rules.length - 1} />)}
        </Card>
      )}
    </Screen>
  )
}
