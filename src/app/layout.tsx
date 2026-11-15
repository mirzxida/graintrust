import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'GrainTrust | Kazakhstan Grain Export Blockchain Escrow',
  description:
    'Permissioned blockchain escrow platform solving railcar demurrage and payment defaults in Kazakhstan grain export logistics.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 antialiased">{children}</body>
    </html>
  );
}
