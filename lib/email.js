import { Resend } from 'resend'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// A small, deliberately isolated module — the one place this app talks to an external email
// provider. Everything else (a share row, the accept link) already exists and works without
// this; a Resend failure here should never block the invite itself from being created (see the
// sharing services' callers, which treat this the same best-effort way the rest of the app
// treats non-critical side effects like push notifications).

const PROFILE_ROLE_LABEL = { read: 'view it', edit: 'add and edit entries', admin: 'fully manage it (except deleting it)' }
const LEND_BORROW_ROLE_LABEL = { read: 'view it', admin: 'edit it and manage who else has access (except deleting it)' }

const FONT_STACK = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif"

// Inlined as a base64 data URI, not a separate file attachment — a CID attachment shows the logo
// as a downloadable file alongside the email body in some clients without reliably rendering
// inline, and this app's preview hosting doesn't serve /public statically (a plain URL 200s with
// an HTML fallback page instead of the actual PNG). A data URI is the only option that's both
// inline-in-the-body and independent of how/where the app happens to be hosted.
const LOGO_DATA_URI = (() => {
  try {
    const buf = readFileSync(join(process.cwd(), 'public', 'logo.png'))
    return `data:image/png;base64,${buf.toString('base64')}`
  } catch {
    return null
  }
})()

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
            ${LOGO_DATA_URI ? `<img src="${LOGO_DATA_URI}" width="44" height="44" alt="Personal Fin" style="display:block;border:0;border-radius:12px;margin:0 0 24px;" />` : ''}
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

function baseUrl() {
  return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
}

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

export async function sendLendBorrowShareEmail({ to, personName, recordType, amount, role, inviterName, acceptUrl }) {
  const roleLabel = LEND_BORROW_ROLE_LABEL[role] || role
  const safePersonName = escapeHtml(personName)
  const safeInviterName = escapeHtml(inviterName || 'Someone')
  const verb = recordType === 'borrowed' ? 'borrowed from' : 'lent to'
  const amountLabel = Number.isFinite(Number(amount)) ? `₹${Number(amount).toLocaleString('en-IN')}` : ''
  const subject = `${safeInviterName} invited you to a lend/borrow record on Personal Fin`
  const html = renderInviteEmailShell({
    heading: `You're invited to a record`,
    bodyHtml: `<p style="margin:0;">${safeInviterName} invited you to ${roleLabel} — ${amountLabel} ${verb} <strong style="color:#f1f5f9;">${safePersonName}</strong>. Accept below to see it in your own Personal Fin account.</p>`,
    ctaUrl: acceptUrl,
  })
  await sendResendEmail({ to, subject, html })
}
