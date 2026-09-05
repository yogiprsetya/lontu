import { getServerSession } from 'next-auth';
import { authOptions } from '~/auth';

interface SessionUser {
  id?: number;
}

export const getServerAuthSession = async () => {
  return getServerSession(authOptions);
};

export const getServerUserId = async (): Promise<number | null> => {
  const session = await getServerAuthSession();
  return (session?.user as SessionUser | undefined)?.id ?? null;
};
