import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/finance/StatCard";
import { useFinance, financeActions } from "@/lib/finance/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { fmtBRL } from "@/lib/finance/utils";
import { CheckCircle2, CreditCard, Plus, Receipt, ArrowDownToLine, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Bill } from "@/lib/finance/types";

export const Route = createFileRoute("/bills")({
  head: () => ({ meta: [{ title: "Contas & Faturas — Finlytic" }] }),
  component: BillsPage,
});

const typeMeta: Record<Bill["type"], { label: string; icon: typeof Receipt; color: string }> = {
  credit_invoice: { label: "Fatura de Cartão", icon: CreditCard, color: "var(--chart-5)" },
  payable: { label: "A Pagar", icon: ArrowDownToLine, color: "var(--chart-4)" },
  receivable: { label: "A Receber", icon: Receipt, color: "var(--chart-1)" },
};

function BillsPage() {
  const { bills } = useFinance();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<Bill["type"]>("payable");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = parseFloat(amount);
    if (!description.trim() || !n || n <= 0) { toast.error("Preencha todos os campos"); return; }
    financeActions.addBill({ type, description: description.trim(), amount: n, dueDate, paid: false });
    toast.success("Registro criado");
    setOpen(false); setDescription(""); setAmount("");
  };

  const groups: { key: Bill["type"]; title: string }[] = [
    { key: "credit_invoice", title: "Faturas de Cartão" },
    { key: "payable", title: "Contas a Pagar" },
    { key: "receivable", title: "Contas a Receber" },
  ];

  return (
    <>
      <PageHeader title="Contas & Faturas" description="Gerencie faturas de cartão, contas a pagar e a receber." action={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="size-4" /> Novo registro</Button></DialogTrigger>
          <DialogContent className="sm:max-w-[440px]">
            <DialogHeader><DialogTitle>Novo registro</DialogTitle></DialogHeader>
            <form onSubmit={submit} className="space-y-3">
              <div>
                <Label>Tipo</Label>
                <Select value={type} onValueChange={(v) => setType(v as Bill["type"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credit_invoice">Fatura de Cartão</SelectItem>
                    <SelectItem value="payable">Conta a Pagar</SelectItem>
                    <SelectItem value="receivable">Conta a Receber</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Descrição</Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: Fatura Nubank" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Valor (R$)</Label><Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
                <div><Label>Vencimento</Label><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit">Salvar</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      } />

      <div className="grid lg:grid-cols-3 gap-4">
        {groups.map((g) => {
          const list = bills.filter((b) => b.type === g.key);
          const total = list.filter((b) => !b.paid).reduce((s, b) => s + b.amount, 0);
          const Icon = typeMeta[g.key].icon;
          return (
            <div key={g.key} className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
              <div className="flex items-center justify-between mb-1">
                <h2 className="font-semibold flex items-center gap-2"><Icon className="size-4" style={{ color: typeMeta[g.key].color }} />{g.title}</h2>
              </div>
              <div className="text-2xl font-semibold tabular-nums">{fmtBRL(total)}</div>
              <div className="text-xs text-muted-foreground mb-3">em aberto</div>
              {list.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">Nenhum registro.</p>
              ) : (
                <ul className="space-y-2">
                  {list.map((b) => {
                    const overdue = !b.paid && b.dueDate < new Date().toISOString().slice(0, 10);
                    return (
                      <li key={b.id} className="flex items-center gap-2 py-2 border-t border-border first:border-0">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate text-sm">{b.description}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2">
                            Vence em {new Date(b.dueDate + "T00:00:00").toLocaleDateString("pt-BR")}
                            {b.paid && <Badge variant="secondary" className="text-[10px]">Pago</Badge>}
                            {overdue && <Badge variant="destructive" className="text-[10px]">Vencida</Badge>}
                          </div>
                        </div>
                        <span className="text-sm font-semibold tabular-nums">{fmtBRL(b.amount)}</span>
                        <Button variant="ghost" size="icon" title={b.paid ? "Reabrir" : "Marcar como pago"} onClick={() => financeActions.toggleBillPaid(b.id)}>
                          <CheckCircle2 className={`size-4 ${b.paid ? "text-[color:var(--success)]" : ""}`} />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => { financeActions.deleteBill(b.id); toast.success("Removido"); }}><Trash2 className="size-4" /></Button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
