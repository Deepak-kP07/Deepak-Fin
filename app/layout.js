import './globals.css'
import { ThemeProvider } from '@/components/ThemeProvider'

const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
const SITE_TITLE = 'Personal Fin'
const SITE_DESCRIPTION = 'A calm, clear command centre for your money'

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/icons/favicon-32.png',
    apple: '/icons/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Finance',
  },
  // Every page (invite links included, since those are client components that can't declare
  // their own metadata) inherits this unless it overrides — so a pasted link at minimum always
  // unfurls with the app's own branding instead of nothing at all.
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_TITLE,
    images: [{ url: '/logo.png', width: 512, height: 512, alt: SITE_TITLE }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ['/logo.png'],
  },
}

export const viewport = {
  themeColor: '#080b12',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{__html:'window.addEventListener("error",function(e){if(e.error instanceof DOMException&&e.error.name==="DataCloneError"&&e.message&&e.message.includes("PerformanceServerTiming")){e.stopImmediatePropagation();e.preventDefault()}},true);'}} />
      </head>
      <body className="bg-[#080b12] light:bg-[#eef1f6] text-slate-100 light:text-slate-900 antialiased" suppressHydrationWarning>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}