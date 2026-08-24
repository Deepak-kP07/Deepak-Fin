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
function renderInviteEmailShell({ heading, bodyHtml, acceptUrl }) {
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
  <tr>
    <td align="center" style="padding:40px 16px;">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" bgcolor="#141a28" style="width:480px;max-width:480px;background-color:#141a28;border:1px solid rgba(255,255,255,0.08);border-radius:20px;">
        <tr>
          <td style="padding:40px 32px;font-family:${FONT_STACK};">
            <img src="cid:logo" width="44" height="44" alt="Personal Fin" style="display:block;border:0;border-radius:12px;" />
            <h1 style="color:#f1f5f9;font-size:22px;font-weight:600;line-height:1.3;letter-spacing:-0.01em;margin:24px 0 16px;">${heading}</h1>
            <p style="color:rgba(241,245,249,0.65);font-size:15px;line-height:1.6;margin:0 0 28px;">${bodyHtml}</p>
            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr>
                <td bgcolor="#d4af37" style="background-color:#d4af37;border-radius:12px;">
                  <a href="${acceptUrl}" style="display:inline-block;padding:14px 28px;font-family:${FONT_STACK};font-size:14px;font-weight:600;color:#07101c;text-decoration:none;border-radius:12px;">View invite</a>
                </td>
              </tr>
            </table>
            <p style="color:rgba(241,245,249,0.45);font-size:12px;line-height:1.6;margin:28px 0 0;">This invite expires in 7 days. If you weren't expecting this, you can ignore this email.</p>
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

// Attached inline (cid:) rather than linked by URL — this app's preview hosting doesn't serve
// /public statically the way a normal deploy would (it 200s with an HTML fallback page instead
// of the actual PNG), which silently broke the logo in real inboxes. Embedding the file bytes
// directly is also just the more robust choice for email in general: it works the same
// regardless of what domain the app happens to be deployed at, or whether it's reachable at
// send time at all.
async function sendResendEmail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL
  if (!apiKey || !from) throw new Error('RESEND_API_KEY / RESEND_FROM_EMAIL not configured')
  const resend = new Resend(apiKey)
  const logoBuffer = readFileSync(join(process.cwd(), 'public', 'logo.png'))
  const { error } = await resend.emails.send({
    from, to, subject, html,
    attachments: [{ filename: 'logo.png', content: logoBuffer, contentType: 'image/png', contentId: 'logo' }],
  })
  if (error) throw new Error(error.message || 'Failed to send invite email')
}

export async function sendInviteEmail({ to, profileName, role, inviterName, acceptUrl }) {
  const roleLabel = PROFILE_ROLE_LABEL[role] || role
  const safeProfileName = escapeHtml(profileName)
  const safeInviterName = escapeHtml(inviterName || 'Someone')
  const subject = `${safeInviterName} invited you to "${safeProfileName}" on Personal Fin`
  const html = renderInviteEmailShell({
    heading: `You're invited to "${safeProfileName}"`,
    bodyHtml: `${safeInviterName} invited you to ${roleLabel} on <strong style="color:#f1f5f9;">${safeProfileName}</strong>. Accept below to see it in your own Personal Fin account.`,
    acceptUrl,
  })
  await sendResendEmail({ to, subject, html })
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
    bodyHtml: `${safeInviterName} invited you to ${roleLabel} — ${amountLabel} ${verb} <strong style="color:#f1f5f9;">${safePersonName}</strong>. Accept below to see it in your own Personal Fin account.`,
    acceptUrl,
  })
  await sendResendEmail({ to, subject, html })
}
