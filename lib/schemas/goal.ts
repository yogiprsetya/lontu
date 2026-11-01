export type Goal = {
  id: string;
  name: string;
  /** Integer rupiah, 1..1e12. */
  targetAmount: number;
  /** YYYY-MM. */
  targetMonth: string | null;
  /** In the order the client sent them. */
  accountIds: string[];
  archivedAt: string | null;
  createdAt: string;
};

export type GoalProjection = {
  /** max(targetAmount − current, 0). */
  remaining: number;
  reached: boolean;
  /** Net monthly flow into the goal's accounts over the counted months, rounded down. */
  monthlyContribution: number | null;
  /** YYYY-MM; null when reached, without a rate, or with a rate ≤ 0. */
  etaMonth: string | null;
  /** Current month to target month, inclusive; null without a target month. */
  monthsLeft: number | null;
  /** null without a target month or once reached. */
  neededPerMonth: number | null;
  overdue: boolean;
  /** etaMonth ≤ targetMonth; null without either. */
  onTrack: boolean | null;
};

export type GoalProgress = Goal & {
  /** Sum of the balances of the goal's active accounts. */
  current: number;
  /** Sum of the live revaluations of those accounts. */
  marketGain: number;
  /** current − marketGain. */
  contributed: number;
  /** Asset accounts never valued or last valued more than 35 days ago. */
  staleAccountIds: string[];
  projection: GoalProjection;
};
