type SignInIdentity = { email?: string | null; emailVerified: boolean };

export function isAllowedSignIn({ email, emailVerified }: SignInIdentity, allowedEmails: string | undefined): boolean {
  const normalized = email?.trim().toLowerCase();
  if (!normalized || !emailVerified) return false;
  return (allowedEmails ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .includes(normalized);
}
