"use client";

import { useOutboxReplay } from "@/hooks/use-outbox-replay";
import { useProfile } from "@/hooks/use-profile";

export function OutboxReplay() {
  const { data } = useProfile();
  useOutboxReplay(data?.id);
  return null;
}
