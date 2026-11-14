import { Text, View } from 'react-native'
import { Card, EmptyState, ListRow, Screen, SectionLabel, Stat, styles as ui } from '../../components/ui'
import { useData } from '../../state/DataProvider'
import { money } from '../../lib/format'
import { currentValueOf } from '../../lib/shared'
import { colors } from '../../lib/theme'

const pl = (value, invested) => ({ amount: value - invested, pct: invested > 0 ? ((value - invested) / invested) * 100 : 0 })
const plText = ({ amount, pct }) => `${amount >= 0 ? '+' : '−'}${money(Math.abs(amount))} (${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%)`
const plColor = ({ amount }) => (amount >= 0 ? colors.income : colors.expense)

// Read-only portfolio view. Prices come from the server's Kite/Yahoo sync — refresh them on the web.
export default function Investments() {
  const { data } = useData()
  const portfolios = data.portfolios || []
  const holdings = data.holdings || []
  const sips = data.sips || []
  const others = data.other_investments || []

  const holdingValue = (h) => Number(h.qty || 0) * Number(h.current_price || h.avg_buy_price || 0)
  const holdingCost = (h) => Number(h.qty || 0) * Number(h.avg_buy_price || 0)
  const sipValue = (s) => Number(s.current_value || 0) || Number(s.units_held || 0) * Number(s.nav || 0)
  const sipCost = (s) => Number(s.units_held || 0) * Number(s.average_price || 0)
  const portfolioTotals = (p) => {
    const hs = holdings.filter((h) => h.portfolio_id === p.id)
    const ss = sips.filter((s) => s.portfolio_id === p.id)
    const os = others.filter((o) => o.portfolio_id === p.id)
    const value = hs.reduce((s, h) => s + holdingValue(h), 0) + ss.reduce((s, x) => s + sipValue(x), 0) + os.reduce((s, o) => s + currentValueOf(o), 0)
    const invested = hs.reduce((s, h) => s + holdingCost(h), 0) + ss.reduce((s, x) => s + sipCost(x), 0) + os.reduce((s, o) => s + Number(o.purchase_value || 0), 0)
    return { hs, ss, os, value, invested, cash: Number(p.cash_balance || 0) }
  }
  const all = portfolios.map((p) => ({ p, ...portfolioTotals(p) }))
  const totalValue = all.reduce((s, x) => s + x.value + x.cash, 0)
  const totalInvested = all.reduce((s, x) => s + x.invested, 0)
  const totalPl = pl(all.reduce((s, x) => s + x.value, 0), totalInvested)

  return (
    <Screen title="Investments" back>
      {portfolios.length === 0 ? <EmptyState icon="trending-up" title="No portfolios" message="Add portfolios or connect Zerodha Kite on the web app." /> : (
        <>
          <Card>
            <Text style={ui.muted}>Current value (incl. cash)</Text>
            <Text style={{ color: colors.text, fontSize: 30, fontWeight: '700', marginTop: 6 }}>{money(totalValue)}</Text>
            <Text style={{ color: plColor(totalPl), marginTop: 6, fontVariant: ['tabular-nums'] }}>{plText(totalPl)} on {money(totalInvested)} invested</Text>
          </Card>
          {all.map(({ p, hs, ss, os, value, invested, cash }) => {
            const pPl = pl(value, invested)
            const rows = [
              ...hs.map((h) => ({ key: h.id, title: h.symbol, detail: `${Number(h.qty)} × ${money(h.current_price || h.avg_buy_price)}`, value: holdingValue(h), cost: holdingCost(h) })),
              ...ss.map((s) => ({ key: s.id, title: s.fund_name, detail: `SIP ${money(s.monthly_amount)}/mo`, value: sipValue(s), cost: sipCost(s) })),
              ...os.map((o) => ({ key: o.id, title: o.name, detail: o.category, value: currentValueOf(o), cost: Number(o.purchase_value || 0) })),
            ].sort((a, b) => b.value - a.value)
            return (
              <View key={p.id}>
                <SectionLabel>{p.name}{p.kite_linked ? ' · Kite' : ''}</SectionLabel>
                <View style={ui.row}>
                  <Stat label="Value" value={money(value)} />
                  <Stat label="P&L" value={plText(pPl).split(' ')[0]} color={plColor(pPl)} />
                </View>
                <Card style={{ paddingVertical: 2, marginTop: 8 }}>
                  {rows.length === 0 ? <EmptyState icon="pie-chart" title="Nothing in this portfolio" /> : rows.map((r, i) => {
                    const rPl = pl(r.value, r.cost)
                    return <ListRow key={r.key} title={r.title} detail={r.detail} value={money(r.value)} subValue={r.cost > 0 ? `${rPl.pct >= 0 ? '+' : ''}${rPl.pct.toFixed(1)}%` : null} last={i === rows.length - 1 && cash === 0} />
                  })}
                  {cash !== 0 && <ListRow title="Cash" value={money(cash)} last />}
                </Card>
              </View>
            )
          })}
          <Text style={[ui.muted, { marginTop: 12, fontSize: 12 }]}>Prices update when the web app refreshes them (Kite or Yahoo Finance).</Text>
        </>
      )}
    </Screen>
  )
}
