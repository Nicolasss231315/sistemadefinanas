import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "success" | "danger" | "warning" | "primary";
  icon?: ReactNode;
}) {
  const toneClass: Record<string, string> = {
    default: "text-foreground",
    success: "text-[color:var(--success)]",
    danger: "text-[color:var(--destructive)]",
    warning: "text-[color:var(--warning-foreground)]",
    primary: "text-primary",
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{label}</div>
        {icon}
      </div>
      <div className={cn("mt-2 text-2xl md:text-3xl font-semibold tracking-tight", toneClass[tone])}>{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
