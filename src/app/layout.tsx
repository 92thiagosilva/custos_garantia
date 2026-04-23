import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Custos de Garantia — Fotus',
  description: 'Dashboard de custos de garantia (RMA) da Fotus Distribuidora Solar',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full bg-background text-foreground">{children}</body>
    </html>
  )
}
