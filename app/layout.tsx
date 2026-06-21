import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: 'WorkLog',
  description: 'Track your work hours and earnings',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Prevent dark-mode flash by applying class before paint */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var m=localStorage.getItem('theme');if(m==='dark'||(m!=='light'&&window.matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})()` }} />
      </head>
      <body className={`${inter.variable} bg-background text-foreground`}>
        {children}
        <Toaster position="bottom-center" richColors closeButton />
      </body>
    </html>
  )
}
