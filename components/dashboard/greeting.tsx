"use client";

import { useProfile } from "@/hooks/use-profile";
import { greetingInJakarta } from "@/lib/date";

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function Greeting() {
  const { data } = useProfile();
  const firstName = data?.displayName?.trim().split(/\s+/)[0];

  return (
    <div className="min-w-0">
      <h1 className="truncate font-heading text-3xl font-extrabold tracking-tight">
        {firstName ? `Halo, ${firstName}` : "Halo!"} <span aria-hidden>👋</span>
      </h1>
      <p className="truncate text-sm font-semibold text-muted-foreground">
        {greetingInJakarta()} · {dateFormatter.format(new Date())}
      </p>
    </div>
  );
}
