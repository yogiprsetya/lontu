import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '~/auth';
import { HomeShell } from '~/components/dashboard/home-shell';

const AppPage = async () => {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect('/login');
  }

  return (
    <HomeShell
      user={{
        name: session.user.name ?? session.user.email.split('@')[0],
        image: session.user.image ?? null,
      }}
    />
  );
};

export default AppPage;
