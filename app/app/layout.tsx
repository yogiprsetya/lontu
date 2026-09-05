import { AppShell } from '~/components/layout/app-shell';

const RootLayout = ({ children }: LayoutProps<'/app'>) => {
  return <AppShell>{children}</AppShell>;
};

export default RootLayout;
