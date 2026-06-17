import { useState } from "react";
import { useFinance, financeActions } from "@/lib/finance/store";
import { fmtBRL } from "@/lib/finance/utils";
import { categoryById } from "@/lib/finance/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, RotateCcw, Lock, CreditCard, ArrowUpRight, ArrowDownRight, Pencil } from "lucide-react";
import { toast } from "sonner";
import { EditTransactionDialog } from "./EditTransactionDialog";
import type { Transaction } from "@/lib/finance/types";

const methodLabel: Record<string, string> = {
  cash: "Dinheiro",
  debit: "Débito",
  credit: "Cartão",
  pix: "Pix",
  transfer: "Transferência",
};

export function TransactionList({ limit }: { limit?: number }) {
  const state = useFinance();
  const items = limit ? state.transactions.slice(0, limit) : state.transactions;
  const [editing, setEditing] = useState<Transaction | null>(null);

  const handleDelete = async (id: string, reconciled?: boolean) => {
    if (reconciled) {
      toast.error("Transação conciliada não pode ser excluída.", {
        description: "Crie um estorno para corrigir o registro.",
        action: { label: "Estornar", onClick: async () => { await financeActions.reverseTransaction(id); toast.success("Estorno criado"); } },
      });
      return;
    }
    await financeActions.deleteTransaction(id);
    toast.success("Transação excluída");
  };

  if (items.length === 0) {
    return <div className="text-sm text-muted-foreground py-8 text-center">Nenhuma transação ainda.</div>;
  }

  return (
    <>
      <div className="divide-y divide-border">
        {items.map((t) => {
          const cat = categoryById(t.categoryId);
          const isIncome = t.kind === "income";
          return (
            <div key={t.id} className="flex items-center gap-3 py-3">
              <div
                className="size-9 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: `color-mix(in oklab, ${cat.color} 18%, transparent)`, color: cat.color }}
              >
                {isIncome ? <ArrowUpRight className="size-4" /> : <ArrowDownRight className="size-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium truncate">{t.description}</span>
                  {t.paymentMethod === "credit" && (
                    <Badge variant="outline" className="gap-1 text-[10px]"><CreditCard className="size-3" />Cartão</Badge>
                  )}
                  {t.reconciled && (
                    <Badge variant="secondary" className="gap-1 text-[10px]"><Lock className="size-3" />Conciliada</Badge>
                  )}
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
                <Button variant="ghost" size="icon" onClick={() => setEditing(t)} title="Editar">
                  <Pencil className="size-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={async () => { await financeActions.reverseTransaction(t.id); toast.success("Estorno criado"); }} title="Estornar">
                  <RotateCcw className="size-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(t.id, t.reconciled)} title="Excluir">
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
      <EditTransactionDialog transaction={editing} open={editing !== null} onOpenChange={(v) => !v && setEditing(null)} />
    </>
  );
}
