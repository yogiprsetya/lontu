"use client";

import { signOut } from "next-auth/react";
import { clearOfflineCaches } from "@/lib/offline/clear";

export async function signOutToLogin() {
  // Cached balances and transactions stay readable offline, so they must not outlive the session.
  await clearOfflineCaches();
  return signOut({ redirectTo: "/login" });
}
