import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { z } from "zod";
import { toast } from "sonner";
import { CATEGORIES, type CategoryId, type PaymentMethod, type TxKind, type Transaction } from "@/lib/finance/types";
import { financeActions } from "@/lib/finance/store";

const schema = z.object({
  description: z.string().trim().min(1, "Descrição obrigatória").max(80),
  amount: z.coerce.number().positive("Valor deve ser positivo").max(1_000_000),
  date: z.string().min(1),
  categoryId: z.string().min(1),
  kind: z.enum(["income", "expense"]),
  paymentMethod: z.enum(["cash", "debit", "credit", "pix", "transfer"]),
  dueDate: z.string().optional(),
});

export function EditTransactionDialog({
  transaction,
  open,
  onOpenChange,
}: {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [kind, setKind] = useState<TxKind>("expense");
  const [method, setMethod] = useState<PaymentMethod>("debit");
  const [category, setCategory] = useState<CategoryId>("alimentacao");
  const [date, setDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (transaction && open) {
      setKind(transaction.kind);
      setMethod(transaction.paymentMethod);
      setCategory(transaction.categoryId);
      setDate(transaction.date);
      setDueDate(transaction.dueDate ?? "");
      setDescription(transaction.description);
      setAmount(String(transaction.amount));
      setErrors({});
    }
  }, [transaction, open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transaction) return;
    const parsed = schema.safeParse({ description, amount, date, categoryId: category, kind, paymentMethod: method, dueDate });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((i) => { errs[i.path[0] as string] = i.message; });
      setErrors(errs);
      return;
    }
    if (parsed.data.kind === "expense" && parsed.data.paymentMethod === "credit" && !parsed.data.dueDate) {
      setErrors({ dueDate: "Vencimento da fatura é obrigatório para cartão de crédito" });
      return;
    }
    setBusy(true);
    try {
      await financeActions.updateTransaction(transaction.id, {
        description: parsed.data.description,
        amount: parsed.data.amount,
        date: parsed.data.date,
        categoryId: parsed.data.categoryId as CategoryId,
        kind: parsed.data.kind,
        paymentMethod: parsed.data.paymentMethod,
        dueDate: parsed.data.paymentMethod === "credit" ? parsed.data.dueDate : undefined,
      });
      toast.success("Transação atualizada");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader><DialogTitle>Editar transação</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="flex gap-2 p-1 bg-muted rounded-lg">
            {(["expense", "income"] as TxKind[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={`flex-1 py-2 text-sm rounded-md transition-colors ${kind === k ? "bg-card shadow-sm font-medium" : "text-muted-foreground"}`}
              >
                {k === "expense" ? "Despesa" : "Receita"}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Descrição</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
              {errors.description && <p className="text-xs text-destructive mt-1">{errors.description}</p>}
            </div>
            <div>
              <Label>Valor (R$)</Label>
              <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
              {errors.amount && <p className="text-xs text-destructive mt-1">{errors.amount}</p>}
            </div>
            <div>
              <Label>Data</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <Label>Categoria</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as CategoryId)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Forma de pagamento</Label>
              <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="debit">Débito</SelectItem>
                  <SelectItem value="credit">Cartão de Crédito</SelectItem>
                  <SelectItem value="pix">Pix</SelectItem>
                  <SelectItem value="cash">Dinheiro</SelectItem>
                  <SelectItem value="transfer">Transferência</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {kind === "expense" && method === "credit" && (
              <div className="col-span-2">
                <Label>Vencimento da fatura</Label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                {errors.dueDate && <p className="text-xs text-destructive mt-1">{errors.dueDate}</p>}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={busy}>{busy ? "Salvando..." : "Salvar alterações"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
