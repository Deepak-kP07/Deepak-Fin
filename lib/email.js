import { Resend } from 'resend'
import { money } from '@/lib/format'
import { monthLabel } from '@/lib/budgets'

// A small, deliberately isolated module — the one place this app talks to an external email
// provider. Everything else (a share row, the accept link) already exists and works without
// this; a Resend failure here should never block the invite itself from being created (see the
// sharing services' callers, which treat this the same best-effort way the rest of the app
// treats non-critical side effects like push notifications).

const PROFILE_ROLE_LABEL = { read: 'view it', edit: 'add and edit entries', admin: 'fully manage it (except deleting it)' }
const LEND_BORROW_ROLE_LABEL = { read: 'view it', admin: 'edit it and manage who else has access (except deleting it)' }

const FONT_STACK = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif"

function baseUrl() {
  return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
}

// A real hosted URL, not a base64 data: URI — Gmail (both the web client and its mobile app,
// the two places this got noticed) strips data: URIs from HTML emails as an anti-phishing
// measure, so the <img> never loads and just shows its alt text with a broken-image icon. A
// plain https URL is what every major client actually renders.
const LOGO_URL = `${baseUrl()}/logo.png`

// User-authored strings (a profile's name, a person's name, an account's full_name) land
// directly in an HTML email body — escape them rather than trust free-text input the way the
// app UI safely can via React.
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}

// Table-based layout throughout, not divs with margin:auto centering — an earlier div-based
// version had no width cap at all, so its dark background painted the full message-pane width in
// Gmail's web client, reading as a giant, broken-looking black rectangle. There's also
// deliberately no full-bleed background color on the outer table — the card (Surface Raised, per
// DESIGN.md) sits on the recipient's own client background instead, the same way most
// dark-branded transactional email sits on a light canvas rather than forcing the whole message
// dark. Shared by every invite email this app sends, so the two templates can't visually drift.
function renderInviteEmailShell({ heading, bodyHtml, ctaUrl, ctaLabel = 'View invite', footerHtml = "This invite expires in 7 days. If you weren't expecting this, you can ignore this email." }) {
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
  <tr>
    <td align="center" style="padding:40px 16px;">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" bgcolor="#141a28" style="width:480px;max-width:480px;background-color:#141a28;border:1px solid rgba(255,255,255,0.08);border-radius:20px;">
        <tr>
          <td style="padding:40px 32px;font-family:${FONT_STACK};">
            <img src="${LOGO_URL}" width="44" height="44" alt="Personal Fin" style="display:block;border:0;border-radius:12px;margin:0 0 24px;" />
            <h1 style="color:#f1f5f9;font-size:22px;font-weight:600;line-height:1.3;letter-spacing:-0.01em;margin:0 0 16px;">${heading}</h1>
            <div style="color:rgba(241,245,249,0.65);font-size:15px;line-height:1.6;margin:0 0 28px;">${bodyHtml}</div>
            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr>
                <td bgcolor="#d4af37" style="background-color:#d4af37;border-radius:12px;">
                  <a href="${ctaUrl}" style="display:inline-block;padding:14px 28px;font-family:${FONT_STACK};font-size:14px;font-weight:600;color:#07101c;text-decoration:none;border-radius:12px;">${ctaLabel}</a>
                </td>
              </tr>
            </table>
            ${footerHtml ? `<p style="color:rgba(241,245,249,0.45);font-size:12px;line-height:1.6;margin:28px 0 0;">${footerHtml}</p>` : ''}
            <div style="border-top:1px solid rgba(255,255,255,0.08);margin:28px 0 20px;line-height:0;font-size:0;">&nbsp;</div>
            <p style="color:rgba(241,245,249,0.6);font-size:13px;line-height:1.6;margin:0;">Thanks,<br>The Personal Fin team</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
  `.trim()
}

async function sendResendEmail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL
  if (!apiKey || !from) throw new Error('RESEND_API_KEY / RESEND_FROM_EMAIL not configured')
  const resend = new Resend(apiKey)
  const { error } = await resend.emails.send({ from, to, subject, html })
  if (error) throw new Error(error.message || 'Failed to send invite email')
}

export async function sendInviteEmail({ to, profileName, role, inviterName, acceptUrl }) {
  const roleLabel = PROFILE_ROLE_LABEL[role] || role
  const safeProfileName = escapeHtml(profileName)
  const safeInviterName = escapeHtml(inviterName || 'Someone')
  const subject = `${safeInviterName} invited you to "${safeProfileName}" on Personal Fin`
  const html = renderInviteEmailShell({
    heading: `You're invited to "${safeProfileName}"`,
    bodyHtml: `<p style="margin:0;">${safeInviterName} invited you to ${roleLabel} on <strong style="color:#f1f5f9;">${safeProfileName}</strong>. Accept below to see it in your own Personal Fin account.</p>`,
    ctaUrl: acceptUrl,
  })
  await sendResendEmail({ to, subject, html })
}

const WELCOME_FEATURES = [
  'Log transactions and watch every account balance update in real time',
  'Investments — live Kite-linked pricing for stocks, mutual funds, and more',
  'Loans, credit cards, and budgets, all in one place',
  'Family / Company and Lend / Borrow for money that involves other people',
  'A private Vault for account and card details',
  'Share a profile or a lend/borrow record with someone else, right from the app',
]

// Sent once, right when an email/password account is created (app/api/[[...path]]/route.js's
// /auth/signup handler) — signUp() itself only ever succeeds once per email, so this naturally
// never re-sends on a later login without needing any extra "already welcomed" bookkeeping.
export async function sendWelcomeEmail({ to, name }) {
  const safeName = escapeHtml(name || '')
  const greeting = safeName ? `Welcome, ${safeName}` : 'Welcome to Personal Fin'
  const featuresHtml = WELCOME_FEATURES.map((f) => `
    <tr>
      <td style="padding:6px 0;color:rgba(241,245,249,0.65);font-size:14px;line-height:1.5;" valign="top">
        <span style="color:#e0c25c;">•</span>&nbsp;&nbsp;${f}
      </td>
    </tr>
  `).join('')
  const html = renderInviteEmailShell({
    heading: greeting,
    bodyHtml: `
      <p style="margin:0 0 20px;">Your account is ready — one place for your entire financial life, from daily transactions to investments, loans, and money you're tracking with other people. Here's a quick look at what you can do:</p>
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">${featuresHtml}</table>
    `,
    ctaUrl: baseUrl(),
    ctaLabel: 'Open Personal Fin',
    footerHtml: '',
  })
  await sendResendEmail({ to, subject: 'Welcome to Personal Fin', html })
}

// Formats "3 Aug – 9 Aug" / "1 – 31 Aug" style range labels for the report subject/heading —
// dateStr in, dateStr out, deliberately not routed through Date/toLocaleString to avoid any
// timezone re-interpretation of an already-correct plain YYYY-MM-DD boundary (see lib/reports.js).
function shortDateLabel(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return `${d} ${MONTH_ABBR[m - 1]}`
}
const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Every two-column row in this email (stat rows below, and reportListRow further down) puts an
// explicit padding-right on the LABEL cell rather than relying on the outer table's leftover
// width to separate label from value — with nothing between "<td>label</td><td>value</td>", a
// client that flattens/reflows this table (mobile Gmail's app, a narrow preview pane) can render
// them flush against each other with zero gap ("Net worth-₹2,89,755", "Income₹0"), since neither
// cell reserves any horizontal space of its own.
function reportStatRow(label, valueHtml, subHtml = '', isLast = false) {
  return `
    <tr>
      <td style="padding:14px 0;${isLast ? '' : 'border-bottom:1px solid rgba(255,255,255,0.06);'}">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding-right:16px;color:rgba(241,245,249,0.6);font-size:13px;line-height:1.5;">${label}${subHtml ? `<br><span style="color:rgba(241,245,249,0.4);font-size:12px;">${subHtml}</span>` : ''}</td>
            <td align="right" style="color:#f1f5f9;font-size:16px;font-weight:700;white-space:nowrap;">${valueHtml}</td>
          </tr>
        </table>
      </td>
    </tr>
  `
}

// Groups a section (Top spending categories, Biggest transactions, …) into its own visually
// distinct card — a tinted, rounded, bordered block with an uppercase eyebrow title — instead of
// a flat, undifferentiated list of <p> headers and tables one after another, which is what read
// as "cramped" with no real hierarchy between sections.
function reportSectionCard(title, innerHtml) {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;">
      <tr>
        <td bgcolor="#181f2e" style="padding:18px 20px;background-color:#181f2e;border:1px solid rgba(255,255,255,0.07);border-radius:14px;">
          <p style="margin:0 0 12px;color:rgba(241,245,249,0.5);font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;">${title}</p>
          ${innerHtml}
        </td>
      </tr>
    </table>
  `
}

// Same guaranteed label/value gap as reportStatRow (padding-right, not leftover table width),
// for the plain list sections — a divider between rows except the last, so a multi-row card reads
// as a scannable list instead of the previous 4px-padding rows with nothing separating them.
function reportListRow(labelHtml, valueHtml, isLast = false) {
  return `
    <tr>
      <td style="padding:9px 0;${isLast ? '' : 'border-bottom:1px solid rgba(255,255,255,0.05);'}">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding-right:16px;color:rgba(241,245,249,0.75);font-size:13px;line-height:1.5;">${labelHtml}</td>
            <td align="right" style="color:rgba(241,245,249,0.9);font-size:13px;font-weight:600;white-space:nowrap;">${valueHtml}</td>
          </tr>
        </table>
      </td>
    </tr>
  `
}

function reportEmptyState(text) {
  return `<p style="margin:0;color:rgba(241,245,249,0.45);font-size:13px;">${text}</p>`
}

// Net worth is the one number this whole email exists to answer "did that go up or down" for —
// giving it real hero treatment (a large standalone figure plus a colored change pill) instead of
// burying it as just the first row in a plain list is what actually establishes hierarchy, rather
// than every stat competing at the same visual weight.
function reportHeroNetWorth(nw, periodLabel) {
  const changeColor = nw.change >= 0 ? '#6ee7b7' : '#fda4af'
  const changeBg = nw.change >= 0 ? '#1c3a2e' : '#3a1f26'
  const changeSign = nw.change >= 0 ? '+' : '−'
  return `
    <p style="margin:0 0 6px;color:rgba(241,245,249,0.5);font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;">Net worth</p>
    <p style="margin:0 0 12px;color:#f1f5f9;font-size:34px;font-weight:700;letter-spacing:-0.02em;line-height:1.2;">${money(nw.now)}</p>
    <table role="presentation" cellpadding="0" cellspacing="0">
      <tr>
        <td bgcolor="${changeBg}" style="background-color:${changeBg};border-radius:999px;padding:5px 12px;">
          <span style="color:${changeColor};font-size:12px;font-weight:700;">${changeSign}${money(Math.abs(nw.change)).replace('-', '')} this ${periodLabel}</span>
        </td>
      </tr>
    </table>
  `
}

// Shared by sendWeeklyReportEmail/sendMonthlyReportEmail — builds the stat-row body from a
// lib/reports.js buildFinancialReport() result, reusing renderInviteEmailShell verbatim (see its
// own comment) rather than any new markup, so every email this app sends stays visually one family.
// "₹X last week" plus an explicit "+18%" callout when there's a prior-period figure to compare
// against — pctChange (lib/reports.js) already returns null rather than a misleading "+∞%"/"0%"
// when there wasn't one, so that case just falls back to today's plain wording.
function changeSubLabel(prevAmount, pct, period) {
  if (!prevAmount) return ''
  const periodLabel = period === 'weekly' ? 'week' : 'month'
  const pctLabel = pct === null ? '' : ` · ${pct >= 0 ? '+' : ''}${pct}%`
  return `${money(prevAmount)} last ${periodLabel}${pctLabel}`
}

function renderReportBodyHtml(report) {
  const nw = report.netWorth
  const ie = report.incomeExpense
  const periodLabel = report.period === 'weekly' ? 'week' : 'month'

  const stats = [
    ['Income', money(ie.income), changeSubLabel(ie.prevIncome, ie.incomeChangePct, report.period)],
    ['Expense', money(ie.expense), changeSubLabel(ie.prevExpense, ie.expenseChangePct, report.period)],
    ['Savings rate', `${ie.savingsRatePct}%`, ie.net >= 0 ? `${money(ie.net)} net` : `${money(Math.abs(ie.net))} short`],
  ]
  if (report.avgExpense !== null) {
    stats.push(['Transactions', String(report.txnCount), `${money(report.avgExpense)} avg. expense`])
  }
  if (report.budget) {
    const b = report.budget
    const paceLabel = 'daysLeft' in b ? `${b.pct}% of this month's budget used · ${b.daysLeft} day${b.daysLeft === 1 ? '' : 's'} left` : `${b.pct}% used`
    stats.push(['Budget', money(b.spent) + ' of ' + money(b.budgeted), paceLabel])
  }
  const statRows = stats.map(([label, value, sub], i) => reportStatRow(label, value, sub, i === stats.length - 1))

  const listCard = (title, items, emptyText) => reportSectionCard(
    title,
    items.length
      ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${items.map((it, i) => reportListRow(it.label, it.value, i === items.length - 1)).join('')}</table>`
      : reportEmptyState(emptyText)
  )

  const categoriesHtml = listCard(
    'Top spending categories',
    report.topCategories.map((c) => ({ label: escapeHtml(c.category?.name || 'Uncategorized'), value: money(c.amount) })),
    `No spending this ${periodLabel}.`
  )
  const biggestHtml = listCard(
    'Biggest transactions',
    report.biggestTransactions.map((t) => ({
      label: `${escapeHtml(t.description || t.category?.name || 'Uncategorized')} <span style="color:rgba(241,245,249,0.4);">· ${shortDateLabel(t.date)}</span>`,
      value: money(t.amount),
    })),
    `No spending this ${periodLabel}.`
  )
  const accountsHtml = listCard(
    'By account',
    report.accountActivity.map((a) => ({
      label: `${escapeHtml(a.account?.name || 'Unknown account')} <span style="color:rgba(241,245,249,0.4);">· ${a.count} txn${a.count === 1 ? '' : 's'}</span>`,
      value: money(a.spent),
    })),
    `No spending this ${periodLabel}.`
  )
  const upcomingHtml = listCard(
    'Upcoming',
    [
      ...report.upcoming.cards.map(({ card, days }) => ({
        label: `${escapeHtml(card.name)} bill <span style="color:rgba(241,245,249,0.4);">· ${days < 0 ? `overdue ${Math.abs(days)}d` : days === 0 ? 'due today' : `due in ${days}d`}</span>`,
        value: money(card.current_outstanding),
      })),
      ...report.upcoming.loans.map(({ loan, due }) => ({
        label: `${escapeHtml(loan.name)} EMI <span style="color:rgba(241,245,249,0.4);">· due ${due}</span>`,
        value: money(loan.emi_amount),
      })),
    ],
    'Nothing due soon.'
  )

  return `
    ${reportHeroNetWorth(nw, periodLabel)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">${statRows.join('')}</table>
    ${categoriesHtml}
    ${biggestHtml}
    ${accountsHtml}
    ${upcomingHtml}
    <p style="margin:24px 0 0;color:rgba(241,245,249,0.45);font-size:12px;">Turn these emails off any time in Settings &gt; Notifications.</p>
  `
}

export async function sendWeeklyReportEmail({ to, name, report }) {
  const rangeLabel = `${shortDateLabel(report.range.start)} – ${shortDateLabel(report.range.end)}`
  const safeName = escapeHtml(name || '')
  const html = renderInviteEmailShell({
    heading: safeName ? `${safeName}'s week` : 'Your week',
    bodyHtml: renderReportBodyHtml(report),
    ctaUrl: baseUrl(),
    ctaLabel: 'Open Personal Fin',
    footerHtml: '',
  })
  await sendResendEmail({ to, subject: `Your week in Personal Fin · ${rangeLabel}`, html })
}

export async function sendMonthlyReportEmail({ to, name, report }) {
  const label = monthLabel(Number(report.range.start.slice(0, 4)), Number(report.range.start.slice(5, 7)) - 1)
  const safeName = escapeHtml(name || '')
  const html = renderInviteEmailShell({
    heading: safeName ? `${safeName}'s ${label} recap` : `Your ${label} recap`,
    bodyHtml: renderReportBodyHtml(report),
    ctaUrl: baseUrl(),
    ctaLabel: 'Open Personal Fin',
    footerHtml: '',
  })
  await sendResendEmail({ to, subject: `Your ${label} recap · Personal Fin`, html })
}

export async function sendLendBorrowShareEmail({ to, personName, recordType, amount, role, inviterName, acceptUrl }) {
  const roleLabel = LEND_BORROW_ROLE_LABEL[role] || role
  const safePersonName = escapeHtml(personName)
  const safeInviterName = escapeHtml(inviterName || 'Someone')
  const verb = recordType === 'borrowed' ? 'borrowed from' : 'lent to'
  const amountLabel = Number.isFinite(Number(amount)) ? money(amount) : ''
  const subject = `${safeInviterName} invited you to a lend/borrow record on Personal Fin`
  const html = renderInviteEmailShell({
    heading: `You're invited to a record`,
    bodyHtml: `<p style="margin:0;">${safeInviterName} invited you to ${roleLabel} — ${amountLabel} ${verb} <strong style="color:#f1f5f9;">${safePersonName}</strong>. Accept below to see it in your own Personal Fin account.</p>`,
    ctaUrl: acceptUrl,
  })
  await sendResendEmail({ to, subject, html })
}
