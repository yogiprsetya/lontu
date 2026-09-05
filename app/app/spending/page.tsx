import { BudgetManager } from '~/components/budget/budget-manager';

const SpendingPage = () => (
  <div className="mx-auto w-full max-w-330">
    <header className="mb-6">
      <p className="text-muted-foreground text-sm">Planning</p>
      <h1 className="text-foreground text-2xl font-semibold tracking-tight">Monthly budgets</h1>
    </header>

    <BudgetManager />
  </div>
);

export default SpendingPage;
