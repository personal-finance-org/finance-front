export type TxType = 'income' | 'expense' | 'transfer';
export type ExpenseKind = 'daily' | 'recurring' | 'debt_payment';
export type AccountType = 'cash' | 'bank' | 'savings' | 'wallet' | 'investment';
export type Frequency = 'weekly' | 'biweekly' | 'monthly' | 'yearly';
export type DebtType = 'credit_card' | 'loan' | 'mortgage' | 'vehicle' | 'personal' | 'store' | 'other';

export interface User { id: string; email: string; name: string; language: 'es' | 'en' | 'pt-BR' | null; currency: string; }
/** Respuesta de GET/PATCH /users/me (documento de Mongo). */
export interface ProfileDoc { _id: string; email: string; name: string; language?: 'es' | 'en' | 'pt-BR'; currency: string; }
export interface Session { accessToken: string; user: User; }

/** Plata apartada dentro de una cuenta: no se puede gastar hasta sacarla. */
export interface Pocket { _id: string; accountId: string | Ref; name: string; balance: number; goal?: number; icon?: string; }
export interface PocketMovement { _id: string; type: 'deposit' | 'withdraw' | 'spend' | 'refund'; amount: number; date: string; balanceAfter: number; note?: string; }

/** `balance` es el saldo DISPONIBLE (lo que se puede gastar); lo apartado está en `pockets`. */
export interface Account {
  _id: string; name: string; type: AccountType; balance: number;
  allowNegative: boolean; archived: boolean; description?: string;
  pockets: Pocket[]; pocketsTotal: number; totalBalance: number;
}
export interface AccountsResponse { total: number; inPockets: number; grandTotal: number; accounts: Account[]; }

export interface Category {
  _id: string; name: string; type: 'income' | 'expense'; icon?: string; color?: string; monthlyBudget?: number;
}

export interface Ref { _id: string; name: string; type?: string; icon?: string; }
export interface Transaction {
  _id: string; type: TxType; amount: number; date: string; description?: string; notes?: string;
  tags: string[]; kind?: ExpenseKind;
  accountId: Ref; toAccountId?: Ref; categoryId?: Ref; pocketId?: Ref | null;
}
export interface Paginated<T> { data: T[]; meta: { total: number; page: number; limit: number; pages: number }; }

export interface TxQuery {
  page?: number; limit?: number; type?: TxType | ''; kind?: ExpenseKind | ''; accountId?: string;
  categoryId?: string; from?: string; to?: string; search?: string;
}

export type RecurringStatus = 'overdue' | 'due_soon' | 'ok' | 'paused';
export interface Recurring {
  _id: string; name: string; amount: number; frequency: Frequency; nextDueDate: string; active: boolean;
  reminderDaysBefore: number; lastPaidAt?: string; notes?: string; status: RecurringStatus;
  accountId: Ref; categoryId: Ref; pocketId?: Ref | null;
}
export interface RecurringResponse { monthlyTotal: number; items: Recurring[]; }

export interface Debt {
  _id: string; name: string; creditor: string; reference?: string; type: DebtType;
  originalAmount: number; currentBalance: number; interestRateAnnual: number; minimumPayment: number;
  paymentDueDay?: number; status: 'active' | 'paid'; notes?: string; paidOffAt?: string;
  paidAmount: number; progressPercent: number; paidThisMonth: number; minimumPaidThisMonth: boolean;
  minimumRemainingThisMonth: number; nextDueDate: string | null; estimatedMonthsToPayoff: number | null;
}
export interface DebtsResponse {
  summary: { activeDebts: number; totalOwed: number; totalMinimumPayments: number; minimumStillPendingThisMonth: number };
  items: Debt[];
}
export interface DebtPayment {
  _id: string; amount: number; date: string; balanceAfter: number; coversMinimum: boolean; note?: string;
  accountId?: Ref; pocketId?: Ref | null;
}

export interface CategoryTotal { categoryId: string; name: string; icon?: string; total: number; count: number; percent: number; }
export interface BudgetRow { categoryId: string; name: string; budget: number; spent: number; remaining: number; percentUsed: number; exceeded: boolean; }
export interface MonthlyReport {
  month: string; income: number; expense: number; net: number; savingsRatePercent: number | null;
  previousMonth: { income: number; expense: number; expenseChangePercent: number | null };
  expenseByKind: { kind: ExpenseKind; total: number; count: number }[];
  expenseByCategory: CategoryTotal[]; incomeByCategory: CategoryTotal[];
  byAccount: { accountId: string; name: string; income: number; expense: number; transfersOut: number }[];
  budgets: BudgetRow[];
  daily: { date: string; income: number; expense: number; net: number; cumulativeNet: number }[];
}
export interface HistoryReport {
  series: { month: string; income: number; expense: number; net: number }[];
  averages: { income: number; expense: number };
}
export interface NetWorth {
  assets: number; available: number; inPockets: number; liabilities: number; netWorth: number;
  accounts: { id: string; name: string; type: string; balance: number; inPockets: number; total: number; pockets: { id: string; name: string; icon?: string; balance: number; goal?: number }[] }[];
  debts: { id: string; name: string; creditor: string; balance: number }[];
}
export interface Dashboard {
  month: { month: string; income: number; expense: number; net: number; savingsRatePercent: number | null };
  topExpenseCategories: CategoryTotal[];
  budgetsExceeded: BudgetRow[];
  netWorth: NetWorth;
  upcomingRecurringExpenses: { id: string; name: string; amount: number; nextDueDate: string }[];
  debtsTotal: number; debtsMinimumTotal: number;
}
