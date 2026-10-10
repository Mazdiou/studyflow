import Link from "next/link";
import { cn } from "@/lib/utils";

// Briques d'interface partagées : en-tête de page, carte à titre, ligne clé/valeur.

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[22px] font-semibold tracking-tight">{title}</h1>
        {subtitle && (
          <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {actions}
    </div>
  );
}

export function Panel({
  title,
  highlight,
  className,
  children,
}: {
  title: string;
  highlight?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border bg-card",
        highlight && "border-primary bg-highlight",
        className,
      )}
    >
      <h2 className="border-b px-[18px] py-3.5 text-[13px] font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function KeyRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b px-[18px] py-3 text-sm last:border-b-0">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-right">{children}</dd>
    </div>
  );
}

export function StatCard({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border bg-card px-5 py-[18px]", className)}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1.5 text-3xl font-semibold tracking-tight tabular-nums">
        {value}
      </p>
    </div>
  );
}

export function StatusPill({
  tone,
  children,
}: {
  tone: "ok" | "off" | "bad";
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium",
        tone === "ok" && "bg-success-bg text-success",
        tone === "off" && "bg-muted text-muted-foreground",
        tone === "bad" && "bg-destructive/10 text-destructive",
      )}
    >
      {children}
    </span>
  );
}

export function NewCaseLink({ className }: { className?: string }) {
  return (
    <Link
      href="/cases/new"
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90",
        className,
      )}
    >
      + Nouveau dossier
    </Link>
  );
}
