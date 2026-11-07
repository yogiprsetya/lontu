"use client";

import { LogOutIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSignOut } from "@/components/layout/sign-out";

export function LogoutButton() {
  const signOut = useSignOut();
  return (
    <Button variant="outline" className="self-start" onClick={() => void signOut()}>
      <LogOutIcon aria-hidden />
      Logout
    </Button>
  );
}
