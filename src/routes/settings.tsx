import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/components/finance/StatCard";
import { useFinance, financeActions } from "@/lib/finance/store";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Lock, Download, Trash2, Globe, KeyRound, LogOut } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Configurações — Finlytic" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const { profile } = useFinance();
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);

  useEffect(() => { setName(profile.name); setEmail(profile.email); }, [profile.name, profile.email]);

  const exportData = () => {
    const json = financeActions.exportData();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `finlytic-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Dados exportados em conformidade com a LGPD");
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  const deleteAccount = async () => {
    try {
      await financeActions.deleteAccountData();
      toast.success("Conta e dados removidos");
      navigate({ to: "/auth" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir");
    }
  };

  return (
    <>
      <PageHeader
        title="Configurações"
        description="Perfil, segurança e privacidade."
        action={<Button variant="outline" onClick={signOut}><LogOut className="size-4" /> Sair</Button>}
      />

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] space-y-3">
          <h2 className="font-semibold">Perfil</h2>
          <div><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label>E-mail</Label><Input type="email" value={email} disabled /></div>
          <Button onClick={async () => { await financeActions.updateProfile({ name }); toast.success("Perfil atualizado"); }}>Salvar perfil</Button>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] space-y-3">
          <h2 className="font-semibold flex items-center gap-2"><ShieldCheck className="size-4 text-primary" />Segurança</h2>
          <SecurityRow icon={<KeyRound className="size-4" />} title="Criptografia AES-256" description="Todos os dados financeiros e senhas são armazenados com criptografia AES-256 em repouso." status="Ativo" />
          <SecurityRow icon={<Globe className="size-4" />} title="Conexão HTTPS" description="Comunicação ponta a ponta protegida com TLS 1.3." status="Ativo" />
          <SecurityRow icon={<Lock className="size-4" />} title="Senhas comprometidas bloqueadas" description="Senhas vazadas em outros serviços são automaticamente rejeitadas." status="Ativo" />
        </div>

        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] space-y-4">
          <div>
            <h2 className="font-semibold">Privacidade & LGPD</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), você pode acessar, exportar ou excluir todos os seus dados a qualquer momento.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={exportData}><Download className="size-4" /> Exportar meus dados</Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive"><Trash2 className="size-4" /> Excluir minha conta</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir conta e todos os dados?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação remove permanentemente todas as suas transações, orçamentos, contas e desconecta sua sessão. Não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={deleteAccount}>Confirmar exclusão</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </>
  );
}

function SecurityRow({ icon, title, description, status }: { icon: React.ReactNode; title: string; description: string; status: string }) {
  return (
    <div className="flex items-start gap-3 py-2 border-t border-border first:border-0">
      <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">{icon}</div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{title}</span>
          <span className="text-[10px] uppercase tracking-wider rounded-full bg-[color:var(--success)]/15 text-[color:var(--success)] px-2 py-0.5 font-semibold">{status}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </div>
  );
}
