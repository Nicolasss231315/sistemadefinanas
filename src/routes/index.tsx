import { createFileRoute, Link } from "@tanstack/react-router";
import { useFinance } from "@/lib/finance/store";
import {
  computeConsolidatedBalance,
  monthlyTotals,
  expensesByCategory,
  lastMonthsSeries,
  fmtBRL,
} from "@/lib/finance/utils";
import { PageHeader, StatCard } from "@/components/finance/StatCard";
import { NewTransactionDialog } from "@/components/finance/NewTransactionDialog";
import { TransactionList } from "@/components/finance/TransactionList";
import { Wallet, TrendingUp, TrendingDown, CreditCard, ShieldCheck, AlertTriangle } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, PieChart as RPieChart, Pie, Cell } from "recharts";
import { Progress } from "@/components/ui/progress";
import { categoryById } from "@/lib/finance/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Finlytic" },
      { name: "description", content: "Resumo financeiro do mês: saldo, receitas, despesas e fatura do cartão." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { transactions, budgets } = useFinance();
  const balance = computeConsolidatedBalance(transactions);
  const { income, expense, creditInvoice } = monthlyTotals(transactions);
  const series = lastMonthsSeries(transactions, 6);
  const byCat = expensesByCategory(transactions);

  const alerts = budgets
    .map((b) => {
      const spent = byCat.find((c) => c.id === b.categoryId)?.value ?? 0;
      return { ...b, spent, pct: b.monthlyLimit > 0 ? spent / b.monthlyLimit : 0 };
    })
    .filter((b) => b.pct >= 0.8);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Visão consolidada das suas finanças neste mês."
        action={<NewTransactionDialog />}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Saldo Consolidado"
          value={fmtBRL(balance)}
          hint="Cartão só impacta no vencimento"
          tone={balance >= 0 ? "success" : "danger"}
          icon={<Wallet className="size-4 text-muted-foreground" />}
        />
        <StatCard label="Receitas do mês" value={fmtBRL(income)} tone="success" icon={<TrendingUp className="size-4 text-muted-foreground" />} />
        <StatCard label="Despesas do mês" value={fmtBRL(expense)} tone="danger" icon={<TrendingDown className="size-4 text-muted-foreground" />} />
        <StatCard label="Fatura do cartão" value={fmtBRL(creditInvoice)} hint="Total acumulado no mês" tone="warning" icon={<CreditCard className="size-4 text-muted-foreground" />} />
      </div>

      {alerts.length > 0 && (
        <div className="mt-6 rounded-2xl border border-[color:var(--warning)]/40 bg-[color:var(--warning)]/10 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-[color:var(--warning-foreground)]">
            <AlertTriangle className="size-4" /> Orçamentos próximos do limite
          </div>
          <div className="grid sm:grid-cols-2 gap-3 mt-3">
            {alerts.map((a) => (
              <div key={a.categoryId} className="text-sm">
                <div className="flex justify-between mb-1">
                  <span className="font-medium">{categoryById(a.categoryId).label}</span>
                  <span className="text-muted-foreground">{Math.round(a.pct * 100)}% — {fmtBRL(a.spent)} / {fmtBRL(a.monthlyLimit)}</span>
                </div>
                <Progress value={Math.min(100, a.pct * 100)} className={a.pct >= 1 ? "[&>div]:bg-[color:var(--destructive)]" : "[&>div]:bg-[color:var(--warning)]"} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-4 mt-6">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="font-semibold">Receitas vs Despesas</h2>
            <span className="text-xs text-muted-foreground">Últimos 6 meses</span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gRec" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gDes" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-4)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--chart-4)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v}`} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} formatter={(v: number) => fmtBRL(v)} />
                <Area type="monotone" dataKey="receitas" stroke="var(--chart-1)" fill="url(#gRec)" strokeWidth={2} />
                <Area type="monotone" dataKey="despesas" stroke="var(--chart-4)" fill="url(#gDes)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          <h2 className="font-semibold mb-4">Despesas por categoria</h2>
          {byCat.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem despesas neste mês.</p>
          ) : (
            <>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <RPieChart>
                    <Pie data={byCat} dataKey="value" innerRadius={45} outerRadius={70} paddingAngle={2}>
                      {byCat.map((c) => <Cell key={c.id} fill={c.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} formatter={(v: number) => fmtBRL(v)} />
                  </RPieChart>
                </ResponsiveContainer>
              </div>
              <ul className="space-y-2 mt-2">
                {byCat.map((c) => (
                  <li key={c.id} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className="size-2.5 rounded-full" style={{ background: c.color }} />
                      {c.label}
                    </span>
                    <span className="tabular-nums text-muted-foreground">{fmtBRL(c.value)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 mt-6 shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold">Transações recentes</h2>
          <Link to="/transactions" className="text-sm text-primary hover:underline">Ver todas</Link>
        </div>
        <TransactionList limit={6} />
      </div>

      <div className="mt-6 flex items-start gap-3 text-xs text-muted-foreground rounded-xl border border-border bg-muted/30 px-4 py-3">
        <ShieldCheck className="size-4 text-primary shrink-0 mt-0.5" />
        <p>
          Seus dados e senhas são protegidos com criptografia <strong>AES-256</strong>. Toda a comunicação acontece via <strong>HTTPS</strong>.
          Você pode exportar ou excluir seus dados a qualquer momento em conformidade com a <strong>LGPD</strong>.
        </p>
      </div>
    </>
  );
}
