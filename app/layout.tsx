import type { Metadata } from 'next'
import { Noto_Sans_SC } from 'next/font/google'
import './globals.css'

const notoSans = Noto_Sans_SC({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-noto-sans',
})

export const metadata: Metadata = {
  title: '智能日志助手',
  description: '记录每日工作，AI智能生成周报',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className={`${notoSans.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  )
}

