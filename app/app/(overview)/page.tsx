import dynamic from 'next/dynamic';
import { OverviewSkeleton } from '~/components/dashboard/overview-skeleton';

const CalendarOverview = dynamic(
  () => import('~/components/dashboard/calendar-overview').then((module) => module.CalendarOverview),
  {
    loading: () => <OverviewSkeleton />,
  }
);
const ExpenseOverview = dynamic(
  () => import('~/components/dashboard/expense-overview').then((module) => module.ExpenseOverview),
  {
    loading: () => <OverviewSkeleton />,
  }
);
const OverviewHeader = dynamic(
  () => import('~/components/dashboard/overview-header').then((module) => module.OverviewHeader),
  {
    loading: () => <OverviewSkeleton />,
  }
);
const OverviewMetrics = dynamic(
  () => import('~/components/dashboard/overview-metrics').then((module) => module.OverviewMetrics),
  {
    loading: () => <OverviewSkeleton />,
  }
);
const SpendingOverview = dynamic(
  () => import('~/components/dashboard/spending-overview').then((module) => module.SpendingOverview),
  {
    loading: () => <OverviewSkeleton />,
  }
);

const AppPage = async () => {
  return (
    <>
      <OverviewHeader />

      <div className="mx-auto w-full max-w-330">
        <OverviewMetrics />

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.75fr)]">
          <SpendingOverview />
          <CalendarOverview />
        </div>

        <ExpenseOverview />
      </div>
    </>
  );
};

export default AppPage;
