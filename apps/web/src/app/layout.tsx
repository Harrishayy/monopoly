import type { Metadata } from 'next';
import {
  Archivo,
  Bricolage_Grotesque,
  Figtree,
  IBM_Plex_Mono,
  JetBrains_Mono,
  Martian_Mono,
  Onest,
} from 'next/font/google';
import { DirectionSync } from '@/state/DirectionSync';
import './globals.css';

// All three directions' faces load while a direction is still being chosen.
// Once one is picked, delete the other two directions' fonts here and in src/tokens.
const archivo = Archivo({ subsets: ['latin'], axes: ['wdth'], variable: '--ff-archivo' });
const plexMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--ff-plex-mono' });
const martian = Martian_Mono({ subsets: ['latin'], axes: ['wdth'], variable: '--ff-martian' });
const onest = Onest({ subsets: ['latin'], variable: '--ff-onest' });
const bricolage = Bricolage_Grotesque({ subsets: ['latin'], axes: ['opsz'], variable: '--ff-bricolage' });
const figtree = Figtree({ subsets: ['latin'], variable: '--ff-figtree' });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--ff-jetbrains' });

const fontVars = [archivo, plexMono, martian, onest, bricolage, figtree, jetbrains].map((f) => f.variable).join(' ');

export const metadata: Metadata = {
  title: { default: 'Casework', template: '%s · Casework' },
  description: 'An operations agent that resolves what it safely can and hands the rest to a person with full context.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" data-dir="docket" className={fontVars} suppressHydrationWarning>
      <body>
        <DirectionSync />
        {children}
      </body>
    </html>
  );
}
