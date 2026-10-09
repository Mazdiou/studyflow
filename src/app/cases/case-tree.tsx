"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronDown, ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { LEVEL_LABELS, LEVEL_ORDER, displayName } from "@/lib/case-labels";

export type TreeCampaign = { id: string; label: string; is_current: boolean };

export type TreeCase = {
  id: string;
  campaign_id: string;
  first_name: string;
  last_name: string;
  education_level: string;
  main_track: string | null;
  schools: boolean;
  status: string;
};

// Un candidat peut apparaître dans deux dossiers (ex. DAP et École).
const FOLDERS = [
  { key: "dap", label: "DAP", match: (c: TreeCase) => c.main_track === "dap" },
  {
    key: "non_dap",
    label: "Hors-DAP",
    match: (c: TreeCase) => c.main_track === "non_dap",
  },
  { key: "schools", label: "École", match: (c: TreeCase) => c.schools },
];

const STATUS_SUFFIX: Record<string, string> = {
  closed: " (clos)",
  abandoned: " (abandonné)",
};

const collator = new Intl.Collator("fr", { sensitivity: "base" });

function byName(a: TreeCase, b: TreeCase) {
  return (
    collator.compare(a.last_name, b.last_name) ||
    collator.compare(a.first_name, b.first_name)
  );
}

function levelRank(level: string) {
  const i = LEVEL_ORDER.indexOf(level as (typeof LEVEL_ORDER)[number]);
  return i === -1 ? 99 : i;
}

function byLevel(a: TreeCase, b: TreeCase) {
  return (
    levelRank(a.education_level) - levelRank(b.education_level) || byName(a, b)
  );
}

export function CaseTree({
  campaigns,
  cases,
}: {
  campaigns: TreeCampaign[];
  cases: TreeCase[];
}) {
  const params = useParams<{ id?: string }>();
  const selectedId = params?.id;

  const [width, setWidth] = useState(300);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [showLevel, setShowLevel] = useState(false);
  const [showClosed, setShowClosed] = useState(false);
  const [sortBy, setSortBy] = useState<"name" | "level">("name");

  const selectedCase = cases.find((c) => c.id === selectedId);

  function startResize(e: React.PointerEvent) {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = width;
    function onMove(ev: PointerEvent) {
      setWidth(Math.min(520, Math.max(220, startWidth + ev.clientX - startX)));
    }
    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      document.body.style.userSelect = "";
    }
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  return (
    <>
      <aside
        style={{ width }}
        className="flex h-full shrink-0 flex-col bg-muted/30"
      >
        <div className="flex items-center justify-between gap-2 px-3 py-2">
          <Link href="/dashboard" className="text-xs underline">
            Tableau de bord
          </Link>
          <Link href="/cases/new" className={buttonVariants({ size: "sm" })}>
            Nouveau dossier
          </Link>
        </div>

        <div className="space-y-1 border-y px-3 py-2 text-xs">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showLevel}
              onChange={(e) => setShowLevel(e.target.checked)}
            />
            Afficher le niveau d&apos;études
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showClosed}
              onChange={(e) => setShowClosed(e.target.checked)}
            />
            Afficher clos et abandonnés
          </label>
          <label className="flex items-center gap-2">
            Trier par
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "name" | "level")}
              className="rounded border bg-background px-1 py-0.5"
            >
              <option value="name">Nom</option>
              <option value="level">Niveau d&apos;études</option>
            </select>
          </label>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto py-1">
          {campaigns.length === 0 && (
            <p className="px-3 py-2 text-sm text-muted-foreground">
              Aucune campagne.
            </p>
          )}

          {campaigns.map((camp) => {
            const campCases = cases.filter((c) => c.campaign_id === camp.id);
            const campOpen =
              open[camp.id] ??
              (camp.is_current || selectedCase?.campaign_id === camp.id);

            return (
              <div key={camp.id}>
                <button
                  type="button"
                  onClick={() =>
                    setOpen((o) => ({ ...o, [camp.id]: !campOpen }))
                  }
                  className="flex w-full items-center gap-1 px-2 py-1 text-left text-sm font-medium hover:bg-muted"
                >
                  {campOpen ? (
                    <ChevronDown className="size-4 shrink-0" />
                  ) : (
                    <ChevronRight className="size-4 shrink-0" />
                  )}
                  <span className="truncate">Campagne {camp.label}</span>
                </button>

                {campOpen &&
                  FOLDERS.map((folder) => {
                    const key = `${camp.id}:${folder.key}`;
                    const inFolder = campCases.filter(folder.match);
                    // Le compteur ne compte que les dossiers actifs
                    const activeCount = inFolder.filter(
                      (c) => c.status === "active",
                    ).length;
                    const folderOpen =
                      open[key] ?? inFolder.some((c) => c.id === selectedId);
                    // Le dossier sélectionné reste visible même s'il est clos
                    const visible = inFolder
                      .filter(
                        (c) =>
                          showClosed ||
                          c.status === "active" ||
                          c.id === selectedId,
                      )
                      .sort(sortBy === "level" ? byLevel : byName);

                    return (
                      <div key={key}>
                        <button
                          type="button"
                          onClick={() =>
                            setOpen((o) => ({ ...o, [key]: !folderOpen }))
                          }
                          className="flex w-full items-center gap-1 py-1 pr-2 pl-6 text-left text-sm hover:bg-muted"
                        >
                          {folderOpen ? (
                            <ChevronDown className="size-4 shrink-0" />
                          ) : (
                            <ChevronRight className="size-4 shrink-0" />
                          )}
                          <span className="truncate">{folder.label}</span>
                          <span className="ml-auto text-xs text-muted-foreground">
                            {activeCount}
                          </span>
                        </button>

                        {folderOpen &&
                          visible.map((c) => (
                            <Link
                              key={c.id}
                              href={`/cases/${c.id}`}
                              className={`flex items-center py-1 pr-2 pl-12 text-sm hover:bg-muted ${
                                c.id === selectedId
                                  ? "bg-accent text-accent-foreground"
                                  : ""
                              } ${
                                c.status !== "active"
                                  ? "text-muted-foreground"
                                  : ""
                              }`}
                            >
                              <span className="truncate">
                                {displayName(c.first_name, c.last_name)}
                                {showLevel
                                  ? ` · ${LEVEL_LABELS[c.education_level] ?? c.education_level}`
                                  : ""}
                                {STATUS_SUFFIX[c.status] ?? ""}
                              </span>
                            </Link>
                          ))}
                      </div>
                    );
                  })}
              </div>
            );
          })}
        </div>
      </aside>

      <div
        role="separator"
        aria-orientation="vertical"
        onPointerDown={startResize}
        className="w-1 shrink-0 cursor-col-resize bg-border hover:bg-primary/40"
      />
    </>
  );
}
