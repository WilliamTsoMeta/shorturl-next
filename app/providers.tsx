'use client';

import { ReactNode } from 'react';
import { ThemeProvider } from 'next-themes';
import { TeamProvider } from '@/lib/contexts/TeamContext';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TeamProvider>
        {children}
      </TeamProvider>
    </ThemeProvider>
  );
}
