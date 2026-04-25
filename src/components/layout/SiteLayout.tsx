'use client';

import { ReactNode } from 'react';
import Header from './Header';
import Footer from './Footer';

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
