"use client";

import { LogOutIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOutToLogin } from "@/components/layout/sign-out";

export function LogoutButton() {
  return (
    <Button variant="outline" className="h-11 self-start text-base" onClick={() => void signOutToLogin()}>
      <LogOutIcon aria-hidden />
      Logout
    </Button>
  );
}
