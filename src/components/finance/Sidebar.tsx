import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  ArrowLeftRight,
  PieChart,
  Target,
  Receipt,
  Settings,
  ShieldCheck,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean };
const items: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/transactions", label: "Transações", icon: ArrowLeftRight },
  { to: "/reports", label: "Relatórios", icon: PieChart },
  { to: "/budgets", label: "Orçamentos", icon: Target },
  { to: "/bills", label: "Contas & Faturas", icon: Receipt },
  { to: "/settings", label: "Configurações", icon: Settings },
];

export function Sidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside className="hidden md:flex md:w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="px-6 py-6 flex items-center gap-2">
        <div className="size-9 rounded-xl flex items-center justify-center bg-sidebar-primary text-sidebar-primary-foreground font-bold">
          F
        </div>
        <div>
          <div className="text-base font-semibold">Finlytic</div>
          <div className="text-xs text-sidebar-foreground/60">Finanças pessoais</div>
        </div>
      </div>
      <nav className="px-3 flex flex-col gap-0.5 flex-1">
        {items.map((it) => {
          const active = it.exact ? pathname === it.to : pathname.startsWith(it.to);
          const Icon = it.icon;
          return (
            <Link
              key={it.to}
              to={it.to}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="size-4" />
              {it.label}
            </Link>
          );
        })}
      </nav>
      <div className="m-3 rounded-xl bg-sidebar-accent/60 p-4 text-xs space-y-2">
        <div className="flex items-center gap-2 text-sidebar-accent-foreground font-medium">
          <ShieldCheck className="size-4 text-primary" /> Segurança
        </div>
        <p className="text-sidebar-foreground/70 leading-relaxed">
          Dados criptografados em AES-256. Conexão HTTPS.
        </p>
        <div className="flex items-center gap-1.5 text-sidebar-foreground/60">
          <Lock className="size-3" /> LGPD-ready
        </div>
      </div>
    </aside>
  );
}

export function MobileNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="md:hidden sticky bottom-0 z-30 flex bg-sidebar text-sidebar-foreground border-t border-sidebar-border">
      {items.slice(0, 5).map((it) => {
        const active = it.exact ? pathname === it.to : pathname.startsWith(it.to);
        const Icon = it.icon;
        return (
          <Link
            key={it.to}
            to={it.to}
            className={cn(
              "flex-1 flex flex-col items-center gap-1 py-2 text-[10px]",
              active ? "text-primary" : "text-sidebar-foreground/60"
            )}
          >
            <Icon className="size-5" />
            {it.label.split(" ")[0]}
          </Link>
        );
      })}
    </nav>
  );
}
