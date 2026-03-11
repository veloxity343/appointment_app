import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Appointment Reminder — Cell Genesis',
  description: 'Appointment management system',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" style={{ height: '100%' }}>
      <body style={{ height: '100%' }}>{children}</body>
    </html>
  )
}
