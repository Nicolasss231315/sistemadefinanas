export type TxKind = "income" | "expense";
export type PaymentMethod = "cash" | "debit" | "credit" | "pix" | "transfer";

export const CATEGORIES = [
  { id: "alimentacao", label: "Alimentação", color: "var(--chart-3)" },
  { id: "moradia", label: "Moradia", color: "var(--chart-2)" },
  { id: "transporte", label: "Transporte", color: "var(--chart-6)" },
  { id: "lazer", label: "Lazer", color: "var(--chart-5)" },
  { id: "saude", label: "Saúde", color: "var(--chart-4)" },
  { id: "educacao", label: "Educação", color: "var(--chart-1)" },
  { id: "salario", label: "Salário", color: "var(--chart-1)" },
  { id: "outros", label: "Outros", color: "var(--chart-2)" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];

export interface Transaction {
  id: string;
  kind: TxKind;
  description: string;
  amount: number;
  categoryId: CategoryId;
  paymentMethod: PaymentMethod;
  date: string; // ISO yyyy-mm-dd
  dueDate?: string; // for credit card: invoice due date
  reconciled?: boolean;
}

export interface Budget {
  categoryId: CategoryId;
  monthlyLimit: number;
}

export interface Bill {
  id: string;
  type: "credit_invoice" | "payable" | "receivable";
  description: string;
  amount: number;
  dueDate: string;
  paid: boolean;
}

export interface FinanceState {
  transactions: Transaction[];
  budgets: Budget[];
  bills: Bill[];
  profile: { name: string; email: string };
}
