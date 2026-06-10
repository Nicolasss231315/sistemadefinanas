import { useSyncExternalStore } from "react";
import type { FinanceState, Transaction, Budget, Bill } from "./types";

const KEY = "finance-app-state-v1";

const seed = (): FinanceState => {
  const now = new Date();
  const ym = now.toISOString().slice(0, 7);
  const today = now.toISOString().slice(0, 10);
  return {
    transactions: [
      { id: crypto.randomUUID(), kind: "income", description: "Salário", amount: 6500, categoryId: "salario", paymentMethod: "transfer", date: `${ym}-05`, reconciled: true },
      { id: crypto.randomUUID(), kind: "expense", description: "Aluguel", amount: 1800, categoryId: "moradia", paymentMethod: "transfer", date: `${ym}-10`, reconciled: true },
      { id: crypto.randomUUID(), kind: "expense", description: "Supermercado", amount: 420, categoryId: "alimentacao", paymentMethod: "debit", date: `${ym}-12` },
      { id: crypto.randomUUID(), kind: "expense", description: "Restaurante", amount: 180, categoryId: "alimentacao", paymentMethod: "credit", date: today, dueDate: `${ym}-28` },
      { id: crypto.randomUUID(), kind: "expense", description: "Uber", amount: 95, categoryId: "transporte", paymentMethod: "credit", date: today, dueDate: `${ym}-28` },
      { id: crypto.randomUUID(), kind: "expense", description: "Cinema", amount: 70, categoryId: "lazer", paymentMethod: "debit", date: `${ym}-14` },
    ],
    budgets: [
      { categoryId: "alimentacao", monthlyLimit: 700 },
      { categoryId: "transporte", monthlyLimit: 300 },
      { categoryId: "lazer", monthlyLimit: 250 },
    ],
    bills: [
      { id: crypto.randomUUID(), type: "credit_invoice", description: "Fatura Cartão Nubank", amount: 275, dueDate: `${ym}-28`, paid: false },
      { id: crypto.randomUUID(), type: "payable", description: "Conta de Luz", amount: 180, dueDate: `${ym}-20`, paid: false },
      { id: crypto.randomUUID(), type: "receivable", description: "Freelance Design", amount: 1200, dueDate: `${ym}-25`, paid: false },
    ],
    profile: { name: "Usuário", email: "voce@exemplo.com" },
  };
};

let state: FinanceState = (() => {
  if (typeof window === "undefined") return seed();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const s = seed();
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
  return s;
})();

const listeners = new Set<() => void>();
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
const emit = () => {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
  listeners.forEach((l) => l());
};
const getSnap = () => state;
const getServer = () => state;

export const useFinance = () => useSyncExternalStore(subscribe, getSnap, getServer);

export const financeActions = {
  addTransaction(t: Omit<Transaction, "id">) {
    state = { ...state, transactions: [{ ...t, id: crypto.randomUUID() }, ...state.transactions] };
    emit();
  },
  updateTransaction(id: string, patch: Partial<Transaction>) {
    state = { ...state, transactions: state.transactions.map((t) => (t.id === id ? { ...t, ...patch } : t)) };
    emit();
  },
  deleteTransaction(id: string) {
    state = { ...state, transactions: state.transactions.filter((t) => t.id !== id) };
    emit();
  },
  reverseTransaction(id: string) {
    const orig = state.transactions.find((t) => t.id === id);
    if (!orig) return;
    const reverse: Transaction = {
      ...orig,
      id: crypto.randomUUID(),
      description: `Estorno: ${orig.description}`,
      kind: orig.kind === "expense" ? "income" : "expense",
      reconciled: false,
      date: new Date().toISOString().slice(0, 10),
    };
    state = { ...state, transactions: [reverse, ...state.transactions] };
    emit();
  },
  setBudget(b: Budget) {
    const exists = state.budgets.find((x) => x.categoryId === b.categoryId);
    state = {
      ...state,
      budgets: exists
        ? state.budgets.map((x) => (x.categoryId === b.categoryId ? b : x))
        : [...state.budgets, b],
    };
    emit();
  },
  deleteBudget(categoryId: string) {
    state = { ...state, budgets: state.budgets.filter((b) => b.categoryId !== categoryId) };
    emit();
  },
  addBill(b: Omit<Bill, "id">) {
    state = { ...state, bills: [{ ...b, id: crypto.randomUUID() }, ...state.bills] };
    emit();
  },
  toggleBillPaid(id: string) {
    state = { ...state, bills: state.bills.map((b) => (b.id === id ? { ...b, paid: !b.paid } : b)) };
    emit();
  },
  deleteBill(id: string) {
    state = { ...state, bills: state.bills.filter((b) => b.id !== id) };
    emit();
  },
  updateProfile(p: Partial<FinanceState["profile"]>) {
    state = { ...state, profile: { ...state.profile, ...p } };
    emit();
  },
  exportData() {
    return JSON.stringify(state, null, 2);
  },
  resetAll() {
    state = seed();
    emit();
  },
};
