import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { requireMember } from "@/lib/auth/require-member";
import {
  LEVEL_LABELS,
  STATUS_LABELS,
  displayName,
  procedureLabel,
} from "@/lib/case-labels";
import { cn } from "@/lib/utils";
import { getCase } from "./get-case";
import { PastelPinned } from "./pastel-pinned";
import { StatusButtons } from "./status-buttons";
import { CaseTabs } from "./case-tabs";

const BADGE: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  closed: "bg-muted text-muted-foreground",
  abandoned: "bg-red-500/10 text-red-700 dark:text-red-400",
};

export default async function CaseLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const caller = await requireMember();
  if (!caller) redirect("/login");

  const { id } = await params;
  const data = await getCase(id);
  if (!data) notFound();
  const { c, responsible, campaignLabel } = data;

  const summary = [
    LEVEL_LABELS[c.education_level] ?? c.education_level,
    procedureLabel(c.main_track, c.schools),
    responsible ? `Responsable : ${responsible}` : "Sans responsable",
    campaignLabel ? `Campagne ${campaignLabel}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div>
      {/* En-tête fixe, partagé par tous les onglets */}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-4xl px-6 pt-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-xl font-semibold tracking-tight">
                  {displayName(c.first_name, c.last_name)}
                </h1>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                    BADGE[c.status],
                  )}
                >
                  {STATUS_LABELS[c.status] ?? c.status}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{summary}</p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/cases/${c.id}/edit`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Modifier
              </Link>
              <StatusButtons id={c.id} status={c.status} />
            </div>
          </div>

          <PastelPinned
            key={c.id}
            caseId={c.id}
            account={c.pastel_account}
            email={c.pastel_email}
          />

          <CaseTabs id={c.id} isOwner={caller.profile.role === "owner"} />
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-6">{children}</div>
    </div>
  );
}
