'use client';

import { redirect } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import { RiGoogleLine } from '@remixicon/react';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';

const LoginPage = () => {
  const { data: session } = useSession();

  if (session) {
    redirect('/');
  }

  return (
    <main className="bg-background relative flex min-h-full items-center justify-center overflow-hidden px-6 py-12">
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="bg-primary/5 h-144 w-xl rounded-full blur-3xl" />
      </div>

      <Card className="relative w-full max-w-sm text-center">
        <CardHeader>
          <CardTitle className="text-card-foreground text-3xl font-semibold tracking-tight">Lontu</CardTitle>
          <CardDescription>Track expenses in three taps.</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <Button
            type="button"
            size="lg"
            onClick={() => signIn('google', { callbackUrl: '/' })}
            className="w-full"
          >
            <RiGoogleLine className="size-5" />
            Sign in with Google
          </Button>

          <p className="text-muted-foreground text-xs">No account required. Free forever.</p>
        </CardContent>
      </Card>
    </main>
  );
};

export default LoginPage;
