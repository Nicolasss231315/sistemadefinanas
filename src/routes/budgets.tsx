import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/finance/StatCard";
import { useFinance, financeActions } from "@/lib/finance/store";
import { CATEGORIES, type CategoryId } from "@/lib/finance/types";
import { expensesByCategory, fmtBRL, categoryById } from "@/lib/finance/utils";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, CheckCircle2, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/budgets")({
  head: () => ({ meta: [{ title: "Orçamentos — Finlytic" }] }),
  component: BudgetsPage,
});

function BudgetsPage() {
  const { transactions, budgets } = useFinance();
  const byCat = expensesByCategory(transactions);
  const [cat, setCat] = useState<CategoryId>("alimentacao");
  const [limit, setLimit] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = parseFloat(limit);
    if (!n || n <= 0) { toast.error("Informe um valor válido"); return; }
    financeActions.setBudget({ categoryId: cat, monthlyLimit: n });
    toast.success("Orçamento atualizado");
    setLimit("");
  };

  return (
    <>
      <PageHeader title="Orçamentos" description="Defina limites mensais por categoria. Alertamos ao atingir 80%." />

      <div className="grid lg:grid-cols-3 gap-4">
        <form onSubmit={submit} className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] space-y-3">
          <h2 className="font-semibold">Novo orçamento</h2>
          <div>
            <Label>Categoria</Label>
            <Select value={cat} onValueChange={(v) => setCat(v as CategoryId)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Limite mensal (R$)</Label>
            <Input type="number" step="0.01" placeholder="500,00" value={limit} onChange={(e) => setLimit(e.target.value)} />
          </div>
          <Button type="submit" className="w-full">Salvar limite</Button>
        </form>

        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] space-y-5">
          <h2 className="font-semibold">Acompanhamento do mês</h2>
          {budgets.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum orçamento definido ainda.</p> : (
            <ul className="space-y-5">
              {budgets.map((b) => {
                const spent = byCat.find((c) => c.id === b.categoryId)?.value ?? 0;
                const pct = b.monthlyLimit > 0 ? spent / b.monthlyLimit : 0;
                const warn = pct >= 0.8;
                const over = pct >= 1;
                const cat = categoryById(b.categoryId);
                return (
                  <li key={b.categoryId}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="size-2.5 rounded-full" style={{ background: cat.color }} />
                        <span className="font-medium">{cat.label}</span>
                        {over ? (
                          <span className="inline-flex items-center gap-1 text-xs text-[color:var(--destructive)]"><AlertTriangle className="size-3" />Excedido</span>
                        ) : warn ? (
                          <span className="inline-flex items-center gap-1 text-xs text-[color:var(--warning-foreground)]"><AlertTriangle className="size-3" />Atenção: 80%+</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><CheckCircle2 className="size-3" />No limite</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm tabular-nums text-muted-foreground">{fmtBRL(spent)} / {fmtBRL(b.monthlyLimit)}</span>
                        <Button variant="ghost" size="icon" onClick={() => { financeActions.deleteBudget(b.categoryId); toast.success("Orçamento removido"); }}>
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                    <Progress value={Math.min(100, pct * 100)} className={over ? "[&>div]:bg-[color:var(--destructive)]" : warn ? "[&>div]:bg-[color:var(--warning)]" : "[&>div]:bg-[color:var(--success)]"} />
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
