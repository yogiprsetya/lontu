'use client';

import { RiCalendarLine } from '@remixicon/react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useSession } from 'next-auth/react';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';

const items = [
  { label: 'Setting', href: '/app/setting' },
  { label: 'Subscription', href: '/app/subscription' },
];

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
        <Button size="lg" variant="outline">
          <RiCalendarLine aria-hidden="true" className="size-4" />
          September 2026
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <div className="bg-primary flex size-10 cursor-pointer items-center justify-center rounded-full text-sm font-semibold">
                <Avatar>
                  <AvatarImage src={data?.user?.image ?? ''} alt={userName} width={40} height={40} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
              </div>
            }
          />

          <DropdownMenuContent className="w-48" align="end">
            <DropdownMenuGroup>
              <DropdownMenuLabel>My Account</DropdownMenuLabel>

              {items.map((item) => (
                <DropdownMenuItem key={item.href} render={<a href={item.href} />}>
                  {item.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
