import { useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { FinanceState, Transaction, Budget, Bill, CategoryId, PaymentMethod, TxKind } from "./types";

const empty = (): FinanceState => ({
  transactions: [],
  budgets: [],
  bills: [],
  profile: { name: "", email: "" },
});

let state: FinanceState = empty();
let currentUserId: string | null = null;
let loading = false;

const listeners = new Set<() => void>();
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
const emit = () => listeners.forEach((l) => l());
const getSnap = () => state;

type TxRow = {
  id: string; kind: string; description: string; amount: number | string;
  category_id: string; payment_method: string; date: string; due_date: string | null;
  reconciled: boolean;
};
type BillRow = { id: string; type: string; description: string; amount: number | string; due_date: string; paid: boolean };

const rowToTx = (r: TxRow): Transaction => ({
  id: r.id,
  kind: r.kind as TxKind,
  description: r.description,
  amount: Number(r.amount),
  categoryId: r.category_id as CategoryId,
  paymentMethod: r.payment_method as PaymentMethod,
  date: r.date,
  dueDate: r.due_date ?? undefined,
  reconciled: r.reconciled,
});

const rowToBill = (r: BillRow): Bill => ({
  id: r.id,
  type: r.type as Bill["type"],
  description: r.description,
  amount: Number(r.amount),
  dueDate: r.due_date,
  paid: r.paid,
});

export async function reloadFinance() {
  if (!currentUserId) {
    state = empty();
    emit();
    return;
  }
  loading = true;
  const [tx, bg, bl, pr] = await Promise.all([
    supabase.from("transactions").select("*").order("date", { ascending: false }),
    supabase.from("budgets").select("*"),
    supabase.from("bills").select("*").order("due_date", { ascending: true }),
    supabase.from("profiles").select("name,email").eq("user_id", currentUserId).maybeSingle(),
  ]);
  state = {
    transactions: ((tx.data as TxRow[] | null) ?? []).map(rowToTx),
    budgets: ((bg.data as { category_id: string; monthly_limit: number | string }[] | null) ?? []).map((r) => ({
      categoryId: r.category_id as CategoryId,
      monthlyLimit: Number(r.monthly_limit),
    })),
    bills: ((bl.data as BillRow[] | null) ?? []).map(rowToBill),
    profile: pr.data ?? { name: "", email: "" },
  };
  loading = false;
  emit();
}

if (typeof window !== "undefined") {
  supabase.auth.getSession().then(({ data }) => {
    currentUserId = data.session?.user.id ?? null;
    void reloadFinance();
  });
  supabase.auth.onAuthStateChange((_event, session) => {
    const newId = session?.user.id ?? null;
    if (newId !== currentUserId) {
      currentUserId = newId;
      void reloadFinance();
    }
  });
}

export const useFinance = () => useSyncExternalStore(subscribe, getSnap, getSnap);
export const useFinanceLoading = () => loading;

const requireUser = () => {
  if (!currentUserId) throw new Error("Não autenticado");
  return currentUserId;
};

export const financeActions = {
  async addTransaction(t: Omit<Transaction, "id">) {
    const uid = requireUser();
    const { error } = await supabase.from("transactions").insert({
      user_id: uid,
      kind: t.kind,
      description: t.description,
      amount: t.amount,
      category_id: t.categoryId,
      payment_method: t.paymentMethod,
      date: t.date,
      due_date: t.dueDate ?? null,
      reconciled: t.reconciled ?? false,
    });
    if (error) throw error;
    await reloadFinance();
  },
  async updateTransaction(id: string, patch: Partial<Transaction>) {
    requireUser();
    const row: {
      description?: string; amount?: number; category_id?: string;
      payment_method?: string; date?: string; due_date?: string | null;
      kind?: string; reconciled?: boolean;
    } = {};
    if (patch.description !== undefined) row.description = patch.description;
    if (patch.amount !== undefined) row.amount = patch.amount;
    if (patch.categoryId !== undefined) row.category_id = patch.categoryId;
    if (patch.paymentMethod !== undefined) row.payment_method = patch.paymentMethod;
    if (patch.date !== undefined) row.date = patch.date;
    if (patch.dueDate !== undefined) row.due_date = patch.dueDate ?? null;
    if (patch.kind !== undefined) row.kind = patch.kind;
    if (patch.reconciled !== undefined) row.reconciled = patch.reconciled;
    const { error } = await supabase.from("transactions").update(row).eq("id", id);
    if (error) throw error;
    await reloadFinance();
  },

  async deleteTransaction(id: string) {
    requireUser();
    const { error } = await supabase.from("transactions").delete().eq("id", id);
    if (error) throw error;
    await reloadFinance();
  },
  async reverseTransaction(id: string) {
    const orig = state.transactions.find((t) => t.id === id);
    if (!orig) return;
    await this.addTransaction({
      kind: orig.kind === "expense" ? "income" : "expense",
      description: `Estorno: ${orig.description}`,
      amount: orig.amount,
      categoryId: orig.categoryId,
      paymentMethod: orig.paymentMethod,
      date: new Date().toISOString().slice(0, 10),
      reconciled: false,
    });
  },
  async setBudget(b: Budget) {
    const uid = requireUser();
    const { error } = await supabase.from("budgets").upsert({
      user_id: uid,
      category_id: b.categoryId,
      monthly_limit: b.monthlyLimit,
    });
    if (error) throw error;
    await reloadFinance();
  },
  async deleteBudget(categoryId: string) {
    const uid = requireUser();
    const { error } = await supabase.from("budgets").delete().eq("user_id", uid).eq("category_id", categoryId);
    if (error) throw error;
    await reloadFinance();
  },
  async addBill(b: Omit<Bill, "id">) {
    const uid = requireUser();
    const { error } = await supabase.from("bills").insert({
      user_id: uid,
      type: b.type,
      description: b.description,
      amount: b.amount,
      due_date: b.dueDate,
      paid: b.paid,
    });
    if (error) throw error;
    await reloadFinance();
  },
  async toggleBillPaid(id: string) {
    requireUser();
    const cur = state.bills.find((b) => b.id === id);
    if (!cur) return;
    const { error } = await supabase.from("bills").update({ paid: !cur.paid }).eq("id", id);
    if (error) throw error;
    await reloadFinance();
  },
  async deleteBill(id: string) {
    requireUser();
    const { error } = await supabase.from("bills").delete().eq("id", id);
    if (error) throw error;
    await reloadFinance();
  },
  async updateProfile(p: Partial<FinanceState["profile"]>) {
    const uid = requireUser();
    const { error } = await supabase.from("profiles").update(p).eq("user_id", uid);
    if (error) throw error;
    await reloadFinance();
  },
  exportData() {
    return JSON.stringify(state, null, 2);
  },
  async deleteAccountData() {
    const uid = requireUser();
    await Promise.all([
      supabase.from("transactions").delete().eq("user_id", uid),
      supabase.from("budgets").delete().eq("user_id", uid),
      supabase.from("bills").delete().eq("user_id", uid),
    ]);
    await supabase.auth.signOut();
    state = empty();
    currentUserId = null;
    emit();
  },
};
