"use client";

import { signOut } from "next-auth/react";

export function signOutToLogin() {
  return signOut({ redirectTo: "/login" });
}
