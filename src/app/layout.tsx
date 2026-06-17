import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'RankFinder - SEO SERP Rank Tracker',
  description: 'Track Google search rankings for your website keywords with a clean Next.js dashboard.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
