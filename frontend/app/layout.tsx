import type { Metadata } from 'next'
import { BIZ_UDPGothic } from 'next/font/google'
import './globals.css'
import { SWRProvider } from './swr-provider'

const font = BIZ_UDPGothic({ weight: '400', subsets: ['latin'] });

export const metadata: Metadata = {
  title: '買い物リスト',
  description: '買い物に便利な買い物リスト',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SWRProvider>
      <html lang="ja">
        <body className={font.className}>{children}</body>
      </html>
    </SWRProvider>
  )
}
