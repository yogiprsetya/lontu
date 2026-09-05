'use client';

import { RiCalendarLine, RiDownloadLine } from '@remixicon/react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useSession } from 'next-auth/react';

export const OverviewHeader = () => {
  const { data } = useSession();

  const userName = data?.user?.name ?? 'User';

  const initials = userName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <header className="mx-auto mb-6 flex w-full max-w-330 items-center justify-between lg:mb-7">
      <div>
        <p className="text-muted-foreground text-xs font-medium sm:text-sm">{today}</p>
        <h1 className="text-foreground text-2xl font-semibold tracking-tight sm:text-3xl">Good morning</h1>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="bg-card text-foreground hidden h-9 items-center gap-2 rounded-lg border px-3 text-xs font-medium shadow-sm sm:flex"
        >
          <RiCalendarLine aria-hidden="true" className="size-4" />
          September 2026
        </button>

        <button
          type="button"
          aria-label="Export report"
          className="bg-card text-foreground hidden size-9 items-center justify-center rounded-lg border shadow-sm sm:flex"
        >
          <RiDownloadLine aria-hidden="true" className="size-4" />
        </button>

        <div className="bg-primary flex size-10 items-center justify-center rounded-full text-sm font-semibold">
          {data?.user?.image ? (
            <Avatar>
              <AvatarImage src={data?.user.image} alt={userName} width={40} height={40} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
          ) : (
            initials
          )}
        </div>
      </div>
    </header>
  );
};
