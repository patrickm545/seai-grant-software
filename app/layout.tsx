import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SEAI Solar Grant Checker',
  description: 'High-converting solar grant intake and review workflow for Irish installers.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
