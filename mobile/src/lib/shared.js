// The web app's pure modules (../lib in the repo), shared so web and native compute identical
// numbers. Add a file here only if it imports nothing but other pure lib files — no React DOM,
// Next.js, Supabase or browser APIs. Resolved by metro.config.js.
export * from '@/lib/amortization'
export { monthLabel, planTotals, categoryBreakdown, monthTotalSpent, budgetInsights } from '@/lib/budgets'
export { buildBudgetsExportCsv } from '@/lib/exportBudgets'
export { utilisationSeverity, nextBillDue, currentSpendingCycle, isBillPaidThisCycle, cardsDueSoon } from '@/lib/creditCards'
export { PROFILE_TYPES, ENTRY_TYPES, ENTRY_TYPE_STYLE, profileTotals, categoriesFor, roleFor as moneyProfileRole, canWriteEntries, canDeleteEntries, canEditProfile, canManageShares as canManageProfileShares, canDeleteProfile } from '@/lib/moneyProfiles'
export { buildFamilyCompanyExportCsv } from '@/lib/exportFamilyCompany'
export { nextChitFundDueDate } from '@/lib/chitFunds'
export { scholarshipDisplayStatus } from '@/lib/scholarships'
export { currentValueOf, OTHER_INVESTMENT_CATEGORIES } from '@/lib/otherInvestments'
export { resolveModuleSettings, orderedEnabledKeys, resolveDashboardWidgets, resolveMobileNavSlots, resolveQuickActionSlots } from '@/lib/moduleSettings'
export { computeDashboardMetrics } from '@/lib/dashboardMetrics'
export { perspectiveType, canLogRepayment, canDeleteRecord, canEditRecord, canManageShares, roleFor as lendRole } from '@/lib/lendBorrowSharing'
export { buildLendInviteMessage, buildProfileInviteMessage } from '@/lib/inviteMessage'
export { liveOutstanding, paymentTypeLabel, monthAbbr, addMonthsToDate, ordinal, money as webMoney } from '@/lib/format'
