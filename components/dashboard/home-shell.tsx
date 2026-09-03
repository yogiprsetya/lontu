import Image from "next/image";
import type { ReactNode } from "react";

interface HomeShellProps {
  user: {
    name: string;
    image: string | null;
  };
}

export default function HomeShell({ user }: HomeShellProps): ReactNode {
  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <main className="bg-background flex min-h-full flex-col px-4 py-6 sm:px-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-muted-foreground text-sm">{today}</p>
          <h1 className="text-foreground text-2xl font-semibold tracking-tight">
            Lontu
          </h1>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-semibold">
          {user.image ? (
            <Image
              src={user.image}
              alt={user.name}
              width={40}
              height={40}
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            initials
          )}
        </div>
      </header>

      <section className="mb-6 rounded-2xl bg-primary p-5 text-primary-foreground">
        <p className="text-sm opacity-90">This month</p>
        <p className="mt-1 text-3xl font-semibold tracking-tight">Rp0</p>
      </section>

      <section className="mb-4">
        <h2 className="text-foreground mb-3 text-base font-semibold">Categories</h2>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {["Food", "Transport", "Shopping", "Bills", "Health", "Other"].map(
            (category) => (
              <button
                key={category}
                type="button"
                className="bg-card text-card-foreground ring-foreground/10 flex aspect-square flex-col items-center justify-center gap-2 rounded-xl text-sm font-medium ring-1"
              >
                <span className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-full">
                  {category[0]}
                </span>
                {category}
              </button>
            ),
          )}
        </div>
      </section>

      <section className="mt-auto">
        <button
          type="button"
          className="bg-primary text-primary-foreground hover:bg-primary/80 h-12 w-full rounded-lg text-sm font-medium transition-colors"
        >
          Add expense
        </button>
      </section>
    </main>
  );
}
