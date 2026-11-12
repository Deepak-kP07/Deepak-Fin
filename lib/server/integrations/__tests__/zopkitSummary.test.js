import { describe, it, expect } from 'vitest'
import { isValidIntegrationKey, todayInIndia, resolveRange, currentFinancialYear, last12Months, buildZopkitSummary } from '../zopkitSummary'

describe('isValidIntegrationKey', () => {
  it('accepts only the exact bearer key and fails closed when unset', () => {
    expect(isValidIntegrationKey('Bearer secret-123', 'secret-123')).toBe(true)
    expect(isValidIntegrationKey('Bearer secret-12', 'secret-123')).toBe(false)
    expect(isValidIntegrationKey('secret-123', 'secret-123')).toBe(false)
    expect(isValidIntegrationKey(null, 'secret-123')).toBe(false)
    expect(isValidIntegrationKey('Bearer ', 'secret-123')).toBe(false)
    expect(isValidIntegrationKey('Bearer anything', undefined)).toBe(false)
  })
})

describe('dates', () => {
  it('uses India date, not UTC', () => {
    // 20:00 UTC on 31 Mar = 01:30 IST on 1 Apr
    expect(todayInIndia(new Date('2026-03-31T20:00:00Z'))).toBe('2026-04-01')
  })
  it('computes the financial year', () => {
    expect(currentFinancialYear('2026-11-12')).toEqual({ from: '2026-04-01', to: '2027-03-31' })
    expect(currentFinancialYear('2027-02-01')).toEqual({ from: '2026-04-01', to: '2027-03-31' })
    expect(currentFinancialYear('2026-04-01')).toEqual({ from: '2026-04-01', to: '2027-03-31' })
  })
  it('defaults and validates the range', () => {
    expect(resolveRange(null, null, '2026-11-12')).toEqual({ from: '2026-04-01', to: '2027-03-31' })
    expect(resolveRange('2026-01-01', '2026-06-30', '2026-11-12')).toEqual({ from: '2026-01-01', to: '2026-06-30' })
    expect(resolveRange('2026-02-30', null, '2026-11-12').error).toBeTruthy()
    expect(resolveRange('26-1-1', null, '2026-11-12').error).toBeTruthy()
    expect(resolveRange('2026-07-01', '2026-06-30', '2026-11-12').error).toBeTruthy()
  })
  it('lists 12 months ending in the month of `to`', () => {
    const months = last12Months('2027-03-31')
    expect(months).toHaveLength(12)
    expect(months[0]).toBe('2026-04')
    expect(months[11]).toBe('2027-03')
  })
})

describe('buildZopkitSummary', () => {
  const profile = { id: 'p1', name: 'Zopkit', status: 'active', opening_balance: '1000.00', created_at: '2026-01-01T00:00:00Z' }
  const entries = [
    { id: 'e1', entry_type: 'income', category_id: 'c1', description: 'Client A', amount: '500.10', date: '2026-05-10', created_at: '2026-05-10T05:00:00Z' },
    { id: 'e2', entry_type: 'expense', category_id: 'c2', description: 'Hosting', amount: '200.20', date: '2026-05-15', created_at: '2026-05-15T05:00:00Z' },
    { id: 'e3', entry_type: 'capital', category_id: null, description: 'Founder', amount: '300', date: '2026-06-01', created_at: '2026-06-01T05:00:00Z' },
    { id: 'e4', entry_type: 'expense', category_id: 'c2', description: 'Old hosting', amount: '0.10', date: '2025-01-01', created_at: '2026-07-01T05:00:00Z' },
  ]
  const recurring = [
    { description: 'AWS', amount: '99.5', entry_type: 'expense', frequency: 'monthly', next_due_date: '2026-11-20' },
    { description: 'Past', amount: '10', entry_type: 'expense', frequency: 'weekly', next_due_date: '2026-11-11' },
  ]
  const categories = [{ id: 'c1', name: 'Sales' }, { id: 'c2', name: 'Infra' }]
  const s = buildZopkitSummary({ profile, entries, recurring, categories, from: '2026-04-01', to: '2027-03-31', today: '2026-11-12' })

  it('computes all-time balance and in-range totals with exact 2-decimal numbers', () => {
    expect(s.accounts[0].balance).toBe(1599.8) // 1000 + 500.10 + 300 - 200.20 - 0.10
    expect(s.accounts[0].updated_at).toBe('2026-07-01T05:00:00.000Z')
    expect(s.totals).toEqual({ income: 500.1, expense: 200.2, capital: 300, net: 299.9 })
  })
  it('fills 12 months including zeros, with capital', () => {
    expect(s.monthly).toHaveLength(12)
    expect(s.monthly[1]).toEqual({ month: '2026-05', income: 500.1, expense: 200.2, capital: 0, net: 299.9 })
    expect(s.monthly[2]).toEqual({ month: '2026-06', income: 0, expense: 0, capital: 300, net: 0 })
    expect(s.monthly[0]).toEqual({ month: '2026-04', income: 0, expense: 0, capital: 0, net: 0 })
  })
  it('groups by category within range only', () => {
    expect(s.byCategory).toEqual([
      { category: 'Sales', type: 'income', amount: 500.1 },
      { category: 'Uncategorized', type: 'capital', amount: 300 },
      { category: 'Infra', type: 'expense', amount: 200.2 },
    ])
  })
  it('lists upcoming items from today on, with frequency', () => {
    expect(s.upcoming).toEqual([{ name: 'AWS', amount: 99.5, due_on: '2026-11-20', kind: 'recurring', type: 'expense', frequency: 'monthly' }])
  })
  it('returns recent transactions newest first without sensitive fields', () => {
    expect(s.recentTransactions.map((t) => t.id)).toEqual(['e3', 'e2', 'e1', 'e4'])
    expect(Object.keys(s.recentTransactions[0]).sort()).toEqual(['account', 'amount', 'category', 'date', 'description', 'id', 'type'])
    expect(s.receivables).toBeNull()
    expect(s.payables).toBeNull()
  })
})
