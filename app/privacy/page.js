import Link from 'next/link'
import { SUPPORT_EMAIL } from '@/lib/constants/links'

// Public, no login. Linked from the sign-up screen, Settings > Profile, and the Play Store
// listing. Keep it in step with what the app actually collects — if a feature starts storing a
// new kind of data or uses a new service, update the matching section and LAST_UPDATED.
const LAST_UPDATED = '13 November 2026'

export const metadata = {
  title: 'Privacy policy · Personal Fin',
  description: 'What Personal Fin collects, why, who it is shared with, and how to delete it.',
}

function Section({ title, children }) {
  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold text-white light:text-slate-900">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-6 text-slate-300 light:text-slate-700">{children}</div>
    </section>
  )
}

function List({ items }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5">
      {items.map((item, i) => <li key={i}>{item}</li>)}
    </ul>
  )
}

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#080b12] light:bg-[#eef1f6] px-4 py-12 sm:py-16">
      <article className="mx-auto max-w-2xl">
        <Link href="/" className="text-sm font-medium text-accent-200 light:text-accent-700 hover:underline">← Personal Fin</Link>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-white light:text-slate-900">Privacy policy</h1>
        <p className="mt-2 text-xs text-slate-500">Last updated {LAST_UPDATED}</p>

        <p className="mt-6 text-sm leading-6 text-slate-300 light:text-slate-700">
          Personal Fin is a personal finance tracker, on the web at personalfin.site and as an Android app. This policy
          explains what information the app handles, why, who it is shared with, and how you can delete it. Personal
          Fin does not show ads, does not sell your data, and does not use third-party analytics or tracking.
        </p>

        <Section title="Information you give us">
          <List items={[
            <><strong className="text-white light:text-slate-900">Account details</strong> — your email address and password (stored as a secure hash by our authentication provider, never readable by us), your name, and optionally your age and a profile photo. If you sign in with Google, we receive your name, email and profile picture from Google.</>,
            <><strong className="text-white light:text-slate-900">Financial records you enter</strong> — bank and cash accounts, transactions, categories, budgets, investments, loans, credit cards (name, last four digits, limit and balance), lend/borrow records, chit funds, scholarships, Family/Company ledgers, bucket list items and money rules. Some of these include names of other people you record, such as who you lent money to.</>,
            <><strong className="text-white light:text-slate-900">Vault items</strong> — bank account numbers, IFSC codes, and card numbers and expiry dates you choose to save. These are encrypted (AES-256-GCM) before they are stored and only decrypted when you open an item. We never ask for or store card CVVs, card PINs, UPI PINs, net-banking passwords or OTPs.</>,
            <><strong className="text-white light:text-slate-900">Files you upload</strong> — receipts and documents attached to transactions or scholarships, and your profile photo.</>,
            <><strong className="text-white light:text-slate-900">People you invite</strong> — when you share a Family/Company profile or a lend/borrow record, the email address you send the invite to.</>,
          ]} />
        </Section>

        <Section title="Information collected automatically">
          <List items={[
            <><strong className="text-white light:text-slate-900">Notification tokens</strong> — if you allow notifications, a device or browser push token so we can send reminders (bills, EMIs, budgets) to that device.</>,
            <><strong className="text-white light:text-slate-900">Technical logs</strong> — our hosting provider keeps standard server logs (such as IP address, time and the page requested) for security and troubleshooting.</>,
            <><strong className="text-white light:text-slate-900">On-device storage</strong> — a copy of your data is cached on your device so the app works offline. It is removed when you sign out.</>,
          ]} />
          <p>The Android app does not read your SMS messages, contacts, call logs, location or files outside the app.</p>
        </Section>

        <Section title="Optional connections">
          <p>
            If you connect your Zerodha Kite account, we store the Kite API key you register, its secret (encrypted), and
            the daily access token Zerodha issues, and we read your holdings, mutual funds and order history to show them in
            Investments. The connection is read-only — Personal Fin cannot place orders or move money. You can disconnect it
            at any time in Settings.
          </p>
        </Section>

        <Section title="How we use it">
          <List items={[
            'To run the app: show your balances, totals, charts and reminders, and keep your data in sync across your devices.',
            'To send the emails you expect: sign-up confirmation, share invites, and weekly or monthly summaries (which you can turn off in Settings).',
            'To send push notifications you have allowed.',
            'To provide support and keep the service secure — for example, investigating abuse or a reported problem. The app operator can see account-level details such as your email address, sign-up date and how many records you have, but does not browse your individual financial records.',
          ]} />
        </Section>

        <Section title="Who we share it with">
          <p>Only with the service providers that run the app, and only what each one needs:</p>
          <List items={[
            'Supabase — database, sign-in and file storage.',
            'Vercel — website and server hosting.',
            'Resend — sending email.',
            'Google — Google sign-in (if you use it) and Firebase Cloud Messaging for Android notifications.',
            'Zerodha — only if you connect Kite, as described above.',
            'Yahoo Finance — stock symbols are sent to look up prices. No personal information is included.',
          ]} />
          <p>
            Anyone you explicitly invite to a shared profile or record can see that profile or record, at the access level
            you chose. We may also disclose information if required by law. We never sell your information.
          </p>
        </Section>

        <Section title="Security">
          <p>
            All traffic is encrypted in transit (HTTPS). Every record is tied to your account and the database enforces that
            only you, and people you have shared with, can read it. Vault items and Kite secrets are additionally encrypted
            at rest. No system is perfectly secure, so please keep your password private.
          </p>
        </Section>

        <Section title="Keeping and deleting your data">
          <p>
            We keep your data for as long as your account exists. You can delete your account at any time from{' '}
            <strong className="text-white light:text-slate-900">Settings → Profile → Delete account</strong>, or on the web at{' '}
            <Link href="/delete-account" className="text-accent-200 light:text-accent-700 underline underline-offset-2">personalfin.site/delete-account</Link>.
            Deleting your account immediately and permanently erases your login, every record and every uploaded file.
            Server logs kept by our hosting provider expire on their own schedule. You can also clear all your records
            while keeping your account from Settings → User guide → Clear all data.
          </p>
        </Section>

        <Section title="Children">
          <p>Personal Fin is not intended for children under 13, and we do not knowingly collect information from them.</p>
        </Section>

        <Section title="Changes">
          <p>If this policy changes, we will update the date at the top of this page and, for significant changes, let you know in the app.</p>
        </Section>

        <Section title="Contact">
          <p>
            Questions or requests about your data:{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-accent-200 light:text-accent-700 underline underline-offset-2">{SUPPORT_EMAIL}</a>
          </p>
        </Section>
      </article>
    </main>
  )
}
