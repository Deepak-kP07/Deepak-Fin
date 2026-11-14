// The web app's pure modules (../lib in the repo), shared so web and native compute identical
// numbers. Add a file here only if it imports nothing but other pure lib files — no React DOM,
// Next.js, Supabase or browser APIs. Resolved by metro.config.js.
export * from '@/lib/amortization'
export { monthLabel, planTotals, categoryBreakdown, monthTotalSpent } from '@/lib/budgets'
export { utilisationSeverity, nextBillDue, currentSpendingCycle, isBillPaidThisCycle, cardsDueSoon } from '@/lib/creditCards'
export { PROFILE_TYPES, ENTRY_TYPES, profileTotals, categoriesFor, roleFor as moneyProfileRole, canWriteEntries } from '@/lib/moneyProfiles'
export { nextChitFundDueDate } from '@/lib/chitFunds'
export { scholarshipDisplayStatus } from '@/lib/scholarships'
export { currentValueOf, OTHER_INVESTMENT_CATEGORIES } from '@/lib/otherInvestments'
export { resolveModuleSettings, orderedEnabledKeys, resolveDashboardWidgets, resolveMobileNavSlots, resolveQuickActionSlots } from '@/lib/moduleSettings'
export { computeDashboardMetrics } from '@/lib/dashboardMetrics'
export { perspectiveType, canLogRepayment, canDeleteRecord, roleFor as lendRole } from '@/lib/lendBorrowSharing'
export { liveOutstanding, paymentTypeLabel, money as webMoney } from '@/lib/format'
