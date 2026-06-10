import { CATEGORIES, type CategoryId, type Transaction } from "./types";

export const fmtBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const monthKey = (d: string | Date) => {
  const dt = typeof d === "string" ? new Date(d + "T00:00:00") : d;
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
};

export const currentMonth = () => monthKey(new Date());

export const categoryById = (id: CategoryId) =>
  CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];

// Saldo consolidado: receitas - despesas, mas despesas no cartão de crédito
// só impactam a partir do dueDate (data de vencimento da fatura).
export function computeConsolidatedBalance(txs: Transaction[], today = new Date()): number {
  const todayStr = today.toISOString().slice(0, 10);
  let bal = 0;
  for (const t of txs) {
    if (t.kind === "income") {
      if (t.date <= todayStr) bal += t.amount;
      continue;
    }
    // expense
    if (t.paymentMethod === "credit") {
      // only impacts after due date
      if (t.dueDate && t.dueDate <= todayStr) bal -= t.amount;
    } else {
      if (t.date <= todayStr) bal -= t.amount;
    }
  }
  return bal;
}

export function monthlyTotals(txs: Transaction[], ym = monthKey(new Date())) {
  let income = 0;
  let expense = 0;
  let creditInvoice = 0;
  for (const t of txs) {
    if (monthKey(t.date) !== ym) continue;
    if (t.kind === "income") income += t.amount;
    else {
      expense += t.amount;
      if (t.paymentMethod === "credit") creditInvoice += t.amount;
    }
  }
  return { income, expense, creditInvoice };
}

export function expensesByCategory(txs: Transaction[], ym = monthKey(new Date())) {
  const map = new Map<CategoryId, number>();
  for (const t of txs) {
    if (t.kind !== "expense" || monthKey(t.date) !== ym) continue;
    map.set(t.categoryId, (map.get(t.categoryId) ?? 0) + t.amount);
  }
  return Array.from(map.entries()).map(([id, value]) => ({
    id,
    label: categoryById(id).label,
    color: categoryById(id).color,
    value,
  }));
}

export function lastMonthsSeries(txs: Transaction[], months = 6) {
  const now = new Date();
  const res: { month: string; receitas: number; despesas: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ym = monthKey(d);
    const { income, expense } = monthlyTotals(txs, ym);
    res.push({
      month: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
      receitas: income,
      despesas: expense,
    });
  }
  return res;
}
