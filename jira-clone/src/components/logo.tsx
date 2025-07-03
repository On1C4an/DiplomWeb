import { Ubuntu } from 'next/font/google';
import Image from 'next/image';
import Link from 'next/link';

import { cn } from '@/lib/utils';

const font = Ubuntu({
  weight: ['700'],
  subsets: ['latin'],
});

export const Logo = () => {
  return (
    <Link href="/" className="flex items-center gap-x-1.5">
      <Image src="/vpi-logo.svg" alt="VPI" height={40} width={40} priority />
      <p className={cn('text-2xl font-bold text-[#111]', font.className)}>VPI Development</p>
    </Link>
  );
};
