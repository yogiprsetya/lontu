"use client";

import { useSyncExternalStore } from "react";
import { PageTitle } from "@/components/layout/page-title";
import { useProfile } from "@/hooks/use-profile";
import { greetingInJakarta } from "@/lib/date";

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const noSubscribe = () => () => {};
const todayLine = () => `${greetingInJakarta()} · ${dateFormatter.format(new Date())}`;

export function Greeting() {
  const { data } = useProfile();
  const firstName = data?.displayName?.trim().split(/\s+/)[0];
  // The service worker can serve this page's HTML on a later day while offline, so the clock is
  // read only in the browser; the server snapshot renders a blank line of the same height.
  const today = useSyncExternalStore(noSubscribe, todayLine, () => null);

  return (
    <div className="min-w-0">
      <PageTitle className="truncate">
        {firstName ? `Halo, ${firstName}` : "Halo!"} <span aria-hidden>👋</span>
      </PageTitle>
      <p className="truncate text-sm font-semibold text-muted-foreground">{today ?? "\u00a0"}</p>
    </div>
  );
}
