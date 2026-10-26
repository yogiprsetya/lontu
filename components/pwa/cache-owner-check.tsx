"use client";

import { useEffect } from "react";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { useProfile } from "@/hooks/use-profile";
import { ensureCacheOwner } from "@/lib/offline/clear";

// Drops another user's cached data when a different account signs in on this device.
export function CacheOwnerCheck() {
  const online = useOnlineStatus();
  const { data } = useProfile();
  const userId = data?.id;

  useEffect(() => {
    if (online && userId) void ensureCacheOwner(userId);
  }, [online, userId]);

  return null;
}
