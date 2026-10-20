"use client";

import useSWR, { mutate } from "swr";
import { sendJSON } from "@/lib/fetcher";
import type { Profile, ProfileInput } from "@/lib/schemas/profile";

const KEY = "/api/me";

export function useProfile() {
  return useSWR<Profile>(KEY);
}

export async function updateProfile(input: ProfileInput) {
  const profile = await sendJSON<Profile>(KEY, "PATCH", input);
  await mutate(KEY, profile, { revalidate: false });
  return profile;
}
