'use client'

import { useState } from 'react'
import {
  BarChart3, Bell, Briefcase, ChevronDown, CreditCard, Heart, KeyRound, Landmark,
  LayoutDashboard, Link2, LineChart, Mountain, Palette, Play, Repeat, ShieldAlert, ShieldCheck,
  Smartphone, Star, Tag, Target, TrendingUp, Users,
} from 'lucide-react'

const GUIDE = [
  {
    icon: LayoutDashboard,
    label: 'Dashboard',
    blurb: "Your money at a glance — net worth, this month's numbers, and quick links.",
    points: [
      'Net worth, a 6-month income/expense chart, and stat cards (savings rate, cash flow, debt, invested + P&L, and more).',
      'A balances panel listing every account, card, and portfolio, plus quick tiles into Investments, Loans, and Bucket list.',
      'Choose which sections and stat cards show up here from Settings → Dashboard — hiding a card only hides it, the underlying data stays real.',
    ],
  },
  {
    icon: BarChart3,
    label: 'Transactions',
    blurb: 'The full ledger — every income, expense, and transfer you log.',
    points: [
      'Add, edit, or delete a transaction; on mobile, long-press to select and bulk-delete several at once.',
      'Filter by type, account, or category, search, and switch between month-by-month or a custom date range.',
      'Import transactions in bulk from a CSV file, or pay a credit card bill directly from here.',
    ],
  },
  {
    icon: Repeat,
    label: 'Recurring',
    blurb: 'Automate repeating transactions — rent, salary, SIPs, subscriptions.',
    points: [
      'Open it from within Transactions, not as its own tab.',
      'Set it up once — description, amount, frequency — and it logs itself on schedule.',
      'Pause, reactivate, edit, or delete a rule any time; each rule shows its next due date.',
    ],
  },
  {
    icon: Landmark,
    label: 'Accounts',
    blurb: 'Your bank accounts, wallets, and cash — the sources every transaction draws from.',
    points: [
      'Add, edit, or delete an account and see its running balance and history.',
      'Reorder accounts from Settings → Accounts — this changes the order everywhere they show up in dropdowns.',
    ],
  },
  {
    icon: CreditCard,
    label: 'Credit cards',
    blurb: 'Track card spends, utilisation, and bill payments across all your cards.',
    points: [
      'Add a card and tap its face to flip it — the back has quick "Log spend" and "Pay bill" buttons.',
      'Open a card for its full activity and repayment history; paying a bill posts as a regular expense.',
      'A card\'s activity feed combines spends you logged directly with any transaction elsewhere that used this card as the payment account.',
    ],
  },
  {
    icon: TrendingUp,
    label: 'Investments',
    blurb: 'Portfolios, holdings, SIPs, and other assets — with live pricing and broker sync.',
    points: [
      'Create a portfolio and add holdings manually, via bulk import, or by syncing a Zerodha Kite account.',
      'Refresh prices for everything at once, and add/edit SIPs or other assets like gold or land.',
      'The same holding held across multiple portfolios is automatically combined so your true profit/loss isn\'t split.',
      'Only one portfolio can be Kite-linked at a time, and Kite sync only pulls orders placed after you connect it.',
    ],
  },
  {
    icon: Briefcase,
    label: 'Loans',
    blurb: 'Loans you\'ve taken and their EMI paydown.',
    points: [
      'Add a loan with its principal, rate, tenure, and EMI, and pick the account it\'s paid from.',
      'Log a payment as a regular EMI or a prepayment, choosing to reduce the EMI or the tenure.',
      'The outstanding amount shown is live — it accrues interest daily since your last logged payment, so it ticks up even if you haven\'t entered anything new.',
    ],
  },
  {
    icon: Users,
    label: 'Family / Company',
    blurb: 'Money you manage on behalf of a family member or a company, kept as its own profile.',
    points: [
      'Create a profile and optionally link it to one of your own bank accounts.',
      'Log income, capital, or expense entries, or bulk import them; close a profile to lock new entries, and reopen it later.',
      'Share a profile with someone else and choose their role — owner/admin can edit and manage sharing, view-only can just look.',
      'If a profile is linked to a bank account, its entries also post as real transactions on that account and count toward your net worth.',
    ],
  },
  {
    icon: Heart,
    label: 'Lend / Borrow',
    blurb: 'Informal money owed between you and other people — both what you\'ve lent and what you owe.',
    points: [
      'Log a record with who, how much, and whether it\'s lent or borrowed.',
      'Log a partial or full repayment against it, and view the complete history for any one person.',
      'Fully settled records hide by default — switch on "View all history" to bring them back.',
      'Share a record with someone as read-only or admin; only the owner can log repayments regardless of role.',
    ],
  },
  {
    icon: ShieldCheck,
    label: 'Scholarships',
    blurb: 'Scholarship money received in batches, and what\'s been forwarded to the college.',
    points: [
      'Add a batch — source, amount, academic year — and optionally link it to the account it was received into.',
      'Log payments made to the college as you forward the money.',
      '"Pending to college" is calculated for you (received minus paid), so unforwarded funds don\'t go unnoticed.',
    ],
  },
  {
    icon: Target,
    label: 'Budgets',
    blurb: 'Monthly and yearly spending plans, tracked against what you actually spend.',
    points: [
      'Set an overall budget and per-category limits for the current or a future month.',
      'Close a month to lock it into history, and reopen a closed month if you need to edit it again.',
      'Dismiss overspend/pace warnings per category, or jump straight to adjusting the budget.',
      'Set separate yearly budgets per category alongside your monthly plans.',
    ],
  },
  {
    icon: Mountain,
    label: 'Bucket list',
    blurb: 'The 30-day rule — log something you\'re tempted to buy and let time decide.',
    points: [
      'Add an item with its estimated cost and your reasons for wanting it.',
      'A progress bar tracks the days elapsed; past 30 days you get a "still want it?" nudge — nothing happens automatically.',
    ],
  },
  {
    icon: LineChart,
    label: 'Insights',
    blurb: 'A read-only summary of this month\'s income, expenses, and spending patterns.',
    points: [
      'Savings amount and rate, income vs. expense, and a chart of your top spending categories.',
      'Auto-generated notes on your savings rate, biggest category, and a simple projection for the rest of the month.',
      'Always shows the current calendar month — there\'s no picker for past months here.',
    ],
  },
  {
    icon: Tag,
    label: 'Categories',
    blurb: 'The income/expense categories used across the whole app.',
    points: [
      'Add, edit, delete, and reorder categories separately for expenses and income.',
      'Choose which modules a category is allowed to appear in — transactions, budgets, recurring, credit card spends, family/company.',
    ],
  },
  {
    icon: Star,
    label: 'Money rules',
    blurb: 'Short reminders you write for yourself — not automated categorization.',
    points: [
      'Type a rule and add it; toggle it active or off, or delete it.',
      'Active rules show up as a widget on your Dashboard (you can turn that widget off in Settings → Dashboard).',
    ],
  },
  {
    icon: KeyRound,
    label: 'Vault',
    blurb: 'A secure place to store sensitive bank, debit, and credit card details for reference.',
    points: [
      'Add an item under Bank accounts, Debit cards, or Credit cards.',
      'Details stay hidden until you tap to reveal them, and are encrypted at rest.',
      'This is a reference store only — it doesn\'t create transactions or link to your real accounts.',
    ],
  },
  {
    icon: Link2,
    label: 'Kite Connect',
    blurb: 'Optional — connect your own Zerodha Kite Connect app instead of the shared default one.',
    points: [
      'Kite sync in Investments already works out of the box; this is only needed if you want to use your own registered app.',
      'Register a free app at developers.kite.trade, set its redirect URL to the one shown here, then paste in your API key and secret.',
    ],
  },
  {
    icon: Smartphone,
    label: 'Mobile nav',
    blurb: 'Choose which 3 destinations sit in your phone\'s bottom nav bar, and the 3 quick actions under the net worth figure.',
    points: [
      'Drag anything from the single "Available" list onto a highlighted spot on the phone — either the bottom nav or the net worth card\'s quick actions.',
      'Drag two spots onto each other to swap them, even across the two areas.',
      'Home always stays in the bottom nav — you can move it to a different position, but not remove it. "Add" always opens the transaction form in the quick-actions row the same way.',
      'Everything not placed anywhere still lives one tap away in the "More" button.',
    ],
  },
  {
    icon: Palette,
    label: 'Profile, appearance & more',
    blurb: 'The rest of this Settings page — the tabs on the left.',
    points: [
      'Profile: your name, age, and avatar.',
      'Appearance: your accent color and light/dark theme.',
      'Guardrails: whether transactions are blocked outright when an account is short on balance.',
      'Notifications: turn on browser push notifications for this device.',
      'Modules: turn optional modules on or off, and reorder them in the sidebar.',
    ],
  },
]

function GuideItem({ item, isOpen, onToggle }) {
  const Icon = item.icon
  return (
    <div className="overflow-hidden rounded-xl bg-black/20 light:bg-black/[.06]">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <Icon size={16} className="shrink-0 text-accent-300 light:text-accent-700" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-white light:text-slate-900">{item.label}</div>
          {!isOpen && <div className="truncate text-xs text-slate-500">{item.blurb}</div>}
        </div>
        <ChevronDown size={15} className={`shrink-0 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="px-4 pb-4 pl-[2.6rem]">
          <div className="text-xs text-slate-400 light:text-slate-600">{item.blurb}</div>
          <ul className="mt-2 space-y-1.5">
            {item.points.map((p, i) => (
              <li key={i} className="flex gap-2 text-xs leading-5 text-slate-400 light:text-slate-600">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-500" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export function SettingsUserGuide({ onReplayTour }) {
  const [openKey, setOpenKey] = useState(null)

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 light:border-black/10 bg-[#0e121c] light:bg-black/[.025] glassy:glass-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-semibold text-white light:text-slate-900">User guide</div>
          {onReplayTour && (
            <button
              onClick={onReplayTour}
              className="flex shrink-0 items-center gap-1.5 rounded-xl border border-white/10 light:border-black/10 px-3 py-1.5 text-xs text-slate-400 light:text-slate-500 hover:bg-white/5"
            >
              <Play size={13} />Replay tour
            </button>
          )}
        </div>
        <div className="mt-1 text-[11px] text-slate-500">What each part of the app does, and how to use it. Tap a section to expand it.</div>
        <div className="mt-3 space-y-2">
          {GUIDE.map((item) => (
            <GuideItem
              key={item.label}
              item={item}
              isOpen={openKey === item.label}
              onToggle={() => setOpenKey(openKey === item.label ? null : item.label)}
            />
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 light:border-black/10 bg-[#0e121c] light:bg-black/[.025] glassy:glass-card p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-white light:text-slate-900">
          <ShieldAlert size={16} className="text-accent-300 light:text-accent-700" />
          Keeping your data safe
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-400 light:text-slate-600">
          We've taken care to keep your data safe — encrypted storage, access limited to what you explicitly
          share, and role-based permissions on anything shared with someone else. Even so, you're responsible
          for your own data: keep your login private, only grant access to people you trust, and use CSV
          exports where available if you want your own backup.
        </p>
      </div>
    </div>
  )
}
