import type { ReactNode } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import ExpenseDashboard from '../expense/expense-dashboard';

interface HomeShellProps {
  user: {
    name: string;
    image: string | null;
  };
}

export default function HomeShell({ user }: HomeShellProps): ReactNode {
  const initials = user.name
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
    <main className="bg-background flex min-h-full flex-col px-4 py-6 sm:px-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-muted-foreground text-sm">{today}</p>
          <h1 className="text-foreground text-2xl font-semibold tracking-tight">Lontu</h1>
        </div>

        <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold">
          {user.image ? (
            <Avatar>
              <AvatarImage src={user.image} alt={user.name} width={40} height={40} />
              <AvatarFallback>US</AvatarFallback>
            </Avatar>
          ) : (
            initials
          )}
        </div>
      </header>

      <div className="mx-auto w-full max-w-2xl">
        <section className="bg-primary text-primary-foreground mb-6 rounded-2xl p-5">
          <p className="text-sm opacity-90">This month</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight">Rp0</p>
        </section>

        <ExpenseDashboard />
      </div>
    </main>
  );
}
