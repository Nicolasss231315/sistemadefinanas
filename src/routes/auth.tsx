import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Lock } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Finlytic" },
      { name: "description", content: "Acesse sua conta Finlytic com segurança." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/" });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate({ to: "/" });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error("Preencha e-mail e senha"); return; }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            data: { name },
            emailRedirectTo: `${window.location.origin}/`,
          },
        });
        if (error) throw error;
        toast.success("Conta criada! Você já está logado.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bem-vindo de volta!");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao autenticar";
      toast.error(msg.includes("Invalid login") ? "E-mail ou senha incorretos" : msg);
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
      if (result.error) toast.error("Falha no login com Google");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 justify-center mb-8">
          <div className="size-11 rounded-xl flex items-center justify-center bg-primary text-primary-foreground font-bold text-lg">F</div>
          <div>
            <div className="text-xl font-semibold">Finlytic</div>
            <div className="text-xs text-muted-foreground">Suas finanças, sob controle.</div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] p-6">
          <div className="flex gap-1 p-1 bg-muted rounded-lg mb-5">
            {(["signin", "signup"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`flex-1 py-2 text-sm rounded-md transition-colors ${mode === m ? "bg-card shadow-sm font-medium" : "text-muted-foreground"}`}
              >
                {m === "signin" ? "Entrar" : "Criar conta"}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-3">
            {mode === "signup" && (
              <div>
                <Label>Nome</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" />
              </div>
            )}
            <div>
              <Label>E-mail</Label>
              <Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@exemplo.com" />
            </div>
            <div>
              <Label>Senha</Label>
              <Input type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" minLength={6} />
              {mode === "signup" && <p className="text-xs text-muted-foreground mt-1">Mínimo 6 caracteres. Senhas comprometidas são bloqueadas.</p>}
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Aguarde..." : mode === "signin" ? "Entrar" : "Criar minha conta"}
            </Button>
          </form>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">ou</span></div>
          </div>

          <Button type="button" variant="outline" className="w-full" disabled={busy} onClick={google}>
            <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
              <path fill="#EA4335" d="M12 11v3.2h4.5c-.2 1.2-1.4 3.5-4.5 3.5-2.7 0-4.9-2.2-4.9-5s2.2-5 4.9-5c1.6 0 2.6.7 3.2 1.2l2.2-2.1C15.9 5.4 14.1 4.5 12 4.5 7.9 4.5 4.6 7.9 4.6 12s3.3 7.5 7.4 7.5c4.3 0 7.1-3 7.1-7.2 0-.5-.1-.9-.1-1.3H12z" />
            </svg>
            Continuar com Google
          </Button>
        </div>

        <div className="flex items-center justify-center gap-3 mt-5 text-xs text-muted-foreground">
          <ShieldCheck className="size-3.5 text-primary" /> AES-256
          <Lock className="size-3.5" /> HTTPS / TLS 1.3
        </div>
      </div>
    </div>
  );
}
