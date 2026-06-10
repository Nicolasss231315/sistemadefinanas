import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/finance/StatCard";
import { useFinance } from "@/lib/finance/store";
import { expensesByCategory, lastMonthsSeries, fmtBRL, monthlyTotals, currentMonth } from "@/lib/finance/utils";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend } from "recharts";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "Relatórios — Finlytic" }] }),
  component: ReportsPage,
});

function ReportsPage() {
  const { transactions } = useFinance();
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return { value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }) };
  });
  const [ym, setYm] = useState(currentMonth());
  const byCat = expensesByCategory(transactions, ym);
  const totals = monthlyTotals(transactions, ym);
  const series = lastMonthsSeries(transactions, 6);

  return (
    <>
      <PageHeader title="Relatórios" description="Análise mensal detalhada dos seus gastos." action={
        <Select value={ym} onValueChange={setYm}>
          <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {months.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
          </SelectContent>
        </Select>
      } />

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          <h2 className="font-semibold mb-4">Gastos por categoria</h2>
          {byCat.length === 0 ? <p className="text-sm text-muted-foreground">Sem despesas no período.</p> : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byCat} dataKey="value" nameKey="label" outerRadius={100} label={(e) => `${Math.round((e.percent ?? 0) * 100)}%`}>
                    {byCat.map((c) => <Cell key={c.id} fill={c.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} formatter={(v: number) => fmtBRL(v)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          <h2 className="font-semibold mb-4">Comparativo 6 meses</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v}`} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} formatter={(v: number) => fmtBRL(v)} />
                <Legend />
                <Bar dataKey="receitas" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="despesas" fill="var(--chart-4)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          <h2 className="font-semibold mb-4">Resumo do mês selecionado</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <Stat label="Receitas" value={fmtBRL(totals.income)} tone="success" />
            <Stat label="Despesas" value={fmtBRL(totals.expense)} tone="danger" />
            <Stat label="Saldo do mês" value={fmtBRL(totals.income - totals.expense)} />
          </div>
          <table className="w-full mt-6 text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="py-2">Categoria</th>
                <th className="py-2 text-right">Total</th>
                <th className="py-2 text-right">% do mês</th>
              </tr>
            </thead>
            <tbody>
              {byCat.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0">
                  <td className="py-2 flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ background: c.color }} />{c.label}</td>
                  <td className="py-2 text-right tabular-nums">{fmtBRL(c.value)}</td>
                  <td className="py-2 text-right tabular-nums text-muted-foreground">{totals.expense ? Math.round((c.value / totals.expense) * 100) : 0}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "success" | "danger" }) {
  const c = tone === "success" ? "text-[color:var(--success)]" : tone === "danger" ? "text-[color:var(--destructive)]" : "";
  return (
    <div className="rounded-xl bg-muted/40 p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-xl font-semibold mt-1 ${c}`}>{value}</div>
    </div>
  );
}
