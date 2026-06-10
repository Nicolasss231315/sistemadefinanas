import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { PageHeader } from "@/components/finance/StatCard";
import { NewTransactionDialog } from "@/components/finance/NewTransactionDialog";
import { TransactionList } from "@/components/finance/TransactionList";
import { useFinance } from "@/lib/finance/store";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORIES } from "@/lib/finance/types";

export const Route = createFileRoute("/transactions")({
  head: () => ({ meta: [{ title: "Transações — Finlytic" }] }),
  component: TransactionsPage,
});

function TransactionsPage() {
  const state = useFinance();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [kind, setKind] = useState<string>("all");

  const filtered = useMemo(() => {
    return state.transactions.filter((t) => {
      if (q && !t.description.toLowerCase().includes(q.toLowerCase())) return false;
      if (cat !== "all" && t.categoryId !== cat) return false;
      if (kind !== "all" && t.kind !== kind) return false;
      return true;
    });
  }, [state.transactions, q, cat, kind]);

  return (
    <>
      <PageHeader title="Transações" description="Histórico completo de receitas e despesas." action={<NewTransactionDialog />} />
      <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <div className="grid sm:grid-cols-3 gap-3 mb-4">
          <Input placeholder="Buscar por descrição..." value={q} onChange={(e) => setQ(e.target.value)} />
          <Select value={cat} onValueChange={setCat}>
            <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {CATEGORIES.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={kind} onValueChange={setKind}>
            <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos tipos</SelectItem>
              <SelectItem value="income">Receitas</SelectItem>
              <SelectItem value="expense">Despesas</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <FilteredList items={filtered} />
      </div>
    </>
  );
}

function FilteredList({ items }: { items: ReturnType<typeof useFinance>["transactions"] }) {
  // reuse TransactionList by temporarily filtering via context; simplest: render inline using the same component shape
  // Here we just rely on TransactionList showing all; alternative: pass items prop. Build a small wrapper.
  return <TransactionListInline items={items} />;
}

import { financeActions } from "@/lib/finance/store";
import { fmtBRL, categoryById } from "@/lib/finance/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowDownRight, ArrowUpRight, CreditCard, Lock, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";

const methodLabel: Record<string, string> = { cash: "Dinheiro", debit: "Débito", credit: "Cartão", pix: "Pix", transfer: "Transferência" };

function TransactionListInline({ items }: { items: ReturnType<typeof useFinance>["transactions"] }) {
  if (items.length === 0) return <div className="text-sm text-muted-foreground py-8 text-center">Nenhuma transação encontrada.</div>;
  return (
    <div className="divide-y divide-border">
      {items.map((t) => {
        const cat = categoryById(t.categoryId);
        const isIncome = t.kind === "income";
        return (
          <div key={t.id} className="flex items-center gap-3 py-3">
            <div className="size-9 rounded-full flex items-center justify-center shrink-0"
              style={{ backgroundColor: `color-mix(in oklab, ${cat.color} 18%, transparent)`, color: cat.color }}>
              {isIncome ? <ArrowUpRight className="size-4" /> : <ArrowDownRight className="size-4" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium truncate">{t.description}</span>
                {t.paymentMethod === "credit" && <Badge variant="outline" className="gap-1 text-[10px]"><CreditCard className="size-3" />Cartão</Badge>}
                {t.reconciled && <Badge variant="secondary" className="gap-1 text-[10px]"><Lock className="size-3" />Conciliada</Badge>}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {cat.label} · {methodLabel[t.paymentMethod]} · {new Date(t.date + "T00:00:00").toLocaleDateString("pt-BR")}
                {t.dueDate && ` · Fatura ${new Date(t.dueDate + "T00:00:00").toLocaleDateString("pt-BR")}`}
              </div>
            </div>
            <div className={`font-semibold tabular-nums ${isIncome ? "text-[color:var(--success)]" : "text-foreground"}`}>
              {isIncome ? "+" : "−"} {fmtBRL(t.amount)}
            </div>
            <div className="flex">
              <Button variant="ghost" size="icon" onClick={() => { financeActions.reverseTransaction(t.id); toast.success("Estorno criado"); }} title="Estornar"><RotateCcw className="size-4" /></Button>
              <Button variant="ghost" size="icon" title="Excluir" onClick={() => {
                if (t.reconciled) {
                  toast.error("Transação conciliada não pode ser excluída.", {
                    description: "Crie um estorno para corrigir o registro.",
                    action: { label: "Estornar", onClick: () => { financeActions.reverseTransaction(t.id); toast.success("Estorno criado"); } },
                  });
                  return;
                }
                financeActions.deleteTransaction(t.id);
                toast.success("Transação excluída");
              }}><Trash2 className="size-4" /></Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
