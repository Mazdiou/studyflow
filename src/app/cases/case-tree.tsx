"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { LEVEL_LABELS, LEVEL_ORDER, displayName } from "@/lib/case-labels";
import { normalizeName } from "@/lib/names";
import { cn } from "@/lib/utils";
import { useUiPrefs } from "@/lib/ui-prefs";
import { createClient } from "@/lib/supabase/client";
import { fetchCampaignCases, type TreeCase } from "@/lib/case-tree-data";

export type { TreeCase };

export type TreeCampaign = { id: string; label: string; is_current: boolean };

export type TreeMember = {
  id: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
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
  closed: "clos",
  abandoned: "abandonné",
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

const selectClass =
  "h-7 min-w-0 flex-1 rounded-lg border bg-background px-2 text-xs outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

export function CaseTree({
  campaigns,
  cases: initialCases,
  loadedCampaignIds,
  members,
  currentUserId,
}: {
  campaigns: TreeCampaign[];
  // Dossiers des campagnes déjà chargées par le serveur (la campagne en cours)
  cases: TreeCase[];
  loadedCampaignIds: string[];
  members: TreeMember[];
  currentUserId: string;
}) {
  const params = useParams<{ id?: string }>();
  const selectedId = params?.id;
  const [prefs, setPrefs] = useUiPrefs();

  const [query, setQuery] = useState("");
  const [dragWidth, setDragWidth] = useState<number | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Ctrl+B (ou Cmd+B) : replier / ouvrir le panneau, comme dans VS Code
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setPrefs((p) => ({ collapsed: !p.collapsed }));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setPrefs]);

  const width = dragWidth ?? prefs.width;

  // --- Autres campagnes : chargées à l'ouverture (ou pendant une recherche) ---
  const [extra, setExtra] = useState<Record<string, TreeCase[]>>({});
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(
    null,
  );
  const inflight = useRef(new Set<string>());
  const loaded = useRef(new Set<string>());
  const lookedUp = useRef(new Set<string>());

  const load = useCallback(async (id: string) => {
    if (inflight.current.has(id)) return;
    inflight.current.add(id);
    try {
      const rows = await fetchCampaignCases(createClient(), id);
      loaded.current.add(id);
      setExtra((e) => ({ ...e, [id]: rows }));
      setErrors((e) => (e[id] ? { ...e, [id]: false } : e));
    } catch {
      setErrors((e) => ({ ...e, [id]: true }));
    } finally {
      inflight.current.delete(id);
    }
  }, []);

  const cases = useMemo(
    () => [...initialCases, ...Object.values(extra).flat()],
    [initialCases, extra],
  );
  const selectedCase = cases.find((c) => c.id === selectedId);

  // Après un router.refresh(), les campagnes déjà chargées sont relues
  useEffect(() => {
    for (const id of loaded.current) void load(id);
  }, [initialCases, load]);

  // Dossier ouvert dont la campagne n'est pas chargée (lien direct) : on
  // cherche sa campagne pour la charger et l'ouvrir
  useEffect(() => {
    if (!selectedId || cases.some((c) => c.id === selectedId)) return;
    if (lookedUp.current.has(selectedId)) return;
    lookedUp.current.add(selectedId);
    void (async () => {
      const { data } = await createClient()
        .from("cases")
        .select("campaign_id")
        .eq("id", selectedId)
        .maybeSingle();
      if (data?.campaign_id) setSelectedCampaignId(data.campaign_id as string);
    })();
  }, [selectedId, cases]);

  // --- Recherche et filtres (côté client, sur les dossiers déjà chargés) ---
  const q = normalizeName(query);
  const qDigits = query.replace(/\D/g, "");
  const searching = q !== "";
  const filtersActive = Boolean(prefs.level || prefs.responsible || prefs.mine);
  const anyActive = searching || filtersActive;

  function isCampOpen(camp: TreeCampaign) {
    if (searching) return true;
    return (
      prefs.open[camp.id] ??
      (camp.is_current ||
        selectedCase?.campaign_id === camp.id ||
        selectedCampaignId === camp.id)
    );
  }
  const serverLoaded = new Set(loadedCampaignIds);
  const isLoaded = (id: string) => serverLoaded.has(id) || id in extra;
  const wantedKey = campaigns
    .filter((c) => !serverLoaded.has(c.id) && isCampOpen(c))
    .map((c) => c.id)
    .join(",");
  const waiting = campaigns.some((c) => !isLoaded(c.id) && !errors[c.id]);
  const failed = campaigns.some((c) => errors[c.id]);

  useEffect(() => {
    const ids = wantedKey
      .split(",")
      .filter((id) => id && !(id in extra) && !errors[id]);
    if (ids.length === 0) return;
    const t = setTimeout(() => ids.forEach((id) => void load(id)), 0);
    return () => clearTimeout(t);
  }, [wantedKey, extra, errors, load]);

  function matches(c: TreeCase) {
    if (searching) {
      const byText =
        normalizeName(`${c.last_name} ${c.first_name}`).includes(q) ||
        normalizeName(`${c.first_name} ${c.last_name}`).includes(q);
      const byPhone =
        qDigits.length >= 3 && c.phone.replace(/\D/g, "").includes(qDigits);
      if (!byText && !byPhone) return false;
    }
    if (prefs.level && c.education_level !== prefs.level) return false;
    if (prefs.responsible && c.assigned_to !== prefs.responsible) return false;
    if (prefs.mine && c.assigned_to !== currentUserId) return false;
    return true;
  }

  const found = cases.filter(matches);
  const resultCount = found.filter(
    (c) => searching || c.status === "active",
  ).length;

  // Responsables proposés : membres actifs, et inactifs seulement s'ils ont des dossiers
  const withCases = new Set(cases.map((c) => c.assigned_to));
  const responsibles = members.filter((m) => m.is_active || withCases.has(m.id));

  function reset() {
    setQuery("");
    setPrefs({ level: "", responsible: "", mine: false });
  }

  function startResize(e: React.PointerEvent) {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = prefs.width;
    let last = startWidth;
    function onMove(ev: PointerEvent) {
      last = Math.min(520, Math.max(220, startWidth + ev.clientX - startX));
      setDragWidth(last);
    }
    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      document.body.style.userSelect = "";
      setPrefs({ width: last });
      setDragWidth(null);
    }
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  // --- Panneau replié : une fine barre d'icônes ---
  if (prefs.collapsed) {
    return (
      <aside className="flex h-full w-12 shrink-0 flex-col items-center gap-1 border-r bg-muted/30 py-2">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setPrefs({ collapsed: false })}
          aria-label="Ouvrir le panneau des dossiers"
          title="Ouvrir le panneau (Ctrl+B)"
        >
          <PanelLeftOpen />
        </Button>
        <Link
          href="/cases/new"
          aria-label="Nouveau dossier"
          title="Nouveau dossier"
          className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
        >
          <Plus />
        </Link>
        <div className="mt-auto flex flex-col items-center gap-1">
          <Link
            href="/dashboard"
            aria-label="Tableau de bord"
            title="Tableau de bord"
            className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
          >
            <LayoutDashboard />
          </Link>
          <ThemeToggle />
        </div>
      </aside>
    );
  }

  return (
    <>
      <aside
        style={{ width }}
        className="relative flex h-full shrink-0 flex-col bg-muted/30"
      >
        {/* En-tête */}
        <div className="flex items-center gap-1 px-3 pt-3 pb-2">
          <Link
            href="/cases"
            className="flex-1 truncate text-sm font-semibold tracking-tight"
          >
            StudyFlow
          </Link>
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setSettingsOpen((o) => !o)}
            aria-expanded={settingsOpen}
            aria-label="Réglages d'affichage"
            title="Réglages d'affichage"
          >
            <SlidersHorizontal />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setPrefs({ collapsed: true })}
            aria-label="Replier le panneau"
            title="Replier le panneau (Ctrl+B)"
          >
            <PanelLeftClose />
          </Button>
        </div>

        {settingsOpen && (
          <div className="absolute top-12 right-3 left-3 z-20 space-y-2 rounded-xl border bg-popover p-3 text-sm shadow-lg">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={prefs.showLevel}
                onChange={(e) => setPrefs({ showLevel: e.target.checked })}
              />
              Afficher le niveau d&apos;études
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={prefs.showClosed}
                onChange={(e) => setPrefs({ showClosed: e.target.checked })}
              />
              Afficher clos et abandonnés
            </label>
            <label className="flex items-center justify-between gap-2">
              Trier par
              <select
                value={prefs.sortBy}
                onChange={(e) =>
                  setPrefs({ sortBy: e.target.value as "name" | "level" })
                }
                className={cn(selectClass, "max-w-36 flex-none")}
              >
                <option value="name">Nom</option>
                <option value="level">Niveau d&apos;études</option>
              </select>
            </label>
          </div>
        )}

        {/* Recherche */}
        <div className="px-3">
          <div className="relative">
            <Search className="pointer-events-none absolute top-2 left-2.5 size-4 text-muted-foreground" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setQuery("");
              }}
              placeholder="Nom, prénom ou téléphone"
              aria-label="Rechercher un dossier"
              className="h-8 w-full rounded-lg border bg-background pr-8 pl-8 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  searchRef.current?.focus();
                }}
                aria-label="Effacer la recherche"
                className="absolute top-1.5 right-1.5 grid size-5 place-items-center rounded text-muted-foreground hover:bg-muted"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </div>

        {searching && (waiting || failed) && (
          <p className="px-3 pt-2 text-xs text-muted-foreground" role="status">
            {waiting
              ? "Recherche dans les autres campagnes..."
              : "Certaines campagnes n'ont pas pu être chargées : résultats incomplets."}
          </p>
        )}

        {/* Filtres */}
        <div className="flex flex-wrap items-center gap-1.5 px-3 pt-2 pb-2">
          <button
            type="button"
            aria-pressed={prefs.mine}
            onClick={() =>
              setPrefs({ mine: !prefs.mine, responsible: "" })
            }
            className={cn(
              "h-7 rounded-full border px-3 text-xs transition-colors",
              prefs.mine
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-background hover:bg-muted",
            )}
          >
            Mes dossiers
          </button>
          <select
            value={prefs.level}
            onChange={(e) => setPrefs({ level: e.target.value })}
            aria-label="Filtrer par niveau d'études"
            className={selectClass}
          >
            <option value="">Tous niveaux</option>
            {LEVEL_ORDER.map((l) => (
              <option key={l} value={l}>
                {LEVEL_LABELS[l]}
              </option>
            ))}
          </select>
          {!prefs.mine && (
            <select
              value={prefs.responsible}
              onChange={(e) => setPrefs({ responsible: e.target.value })}
              aria-label="Filtrer par responsable"
              className={cn(selectClass, "basis-full")}
            >
              <option value="">Tous responsables</option>
              {responsibles.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.first_name} {m.last_name}
                  {m.is_active ? "" : " (désactivé)"}
                </option>
              ))}
            </select>
          )}
        </div>

        {anyActive && (
          <div className="flex items-center justify-between border-y bg-muted/50 px-3 py-1.5 text-xs">
            <span aria-live="polite">
              {resultCount} dossier{resultCount > 1 ? "s" : ""}
              {filtersActive ? " · filtres actifs" : ""}
            </span>
            <button
              type="button"
              onClick={reset}
              className="font-medium underline-offset-2 hover:underline"
            >
              Réinitialiser
            </button>
          </div>
        )}

        {/* Arbre */}
        <nav
          aria-label="Dossiers"
          className="min-h-0 flex-1 overflow-y-auto py-1"
        >
          {campaigns.length === 0 && (
            <p className="px-3 py-2 text-sm text-muted-foreground">
              Aucune campagne.
            </p>
          )}
          {anyActive && found.length === 0 && (
            <p className="px-3 py-3 text-sm text-muted-foreground">
              Aucun dossier ne correspond. Modifiez la recherche ou
              réinitialisez les filtres.
            </p>
          )}

          {campaigns.map((camp) => {
            const campCases = found.filter((c) => c.campaign_id === camp.id);
            if (searching && campCases.length === 0) return null;
            const campOpen = isCampOpen(camp);

            return (
              <div key={camp.id}>
                <button
                  type="button"
                  aria-expanded={campOpen}
                  onClick={() =>
                    setPrefs((p) => ({
                      open: { ...p.open, [camp.id]: !campOpen },
                    }))
                  }
                  className="flex w-full items-center gap-1 px-2 py-1.5 text-left text-sm font-medium hover:bg-muted"
                >
                  {campOpen ? (
                    <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className="truncate">Campagne {camp.label}</span>
                </button>

                {campOpen && !isLoaded(camp.id) && (
                  <div className="py-1 pr-3 pl-9 text-sm text-muted-foreground">
                    {errors[camp.id] ? (
                      <button
                        type="button"
                        onClick={() =>
                          setErrors((e) => ({ ...e, [camp.id]: false }))
                        }
                        className="underline-offset-2 hover:underline"
                      >
                        Chargement impossible. Réessayer
                      </button>
                    ) : (
                      "Chargement..."
                    )}
                  </div>
                )}

                {campOpen &&
                  isLoaded(camp.id) &&
                  FOLDERS.map((folder) => {
                    const key = `${camp.id}:${folder.key}`;
                    const inFolder = campCases.filter(folder.match);
                    if (searching && inFolder.length === 0) return null;
                    // Pendant une recherche, tout ce qui correspond est compté
                    const count = inFolder.filter(
                      (c) => searching || c.status === "active",
                    ).length;
                    const folderOpen = searching
                      ? true
                      : (prefs.open[key] ??
                        inFolder.some((c) => c.id === selectedId));
                    // Le dossier sélectionné reste visible même s'il est clos
                    const visible = inFolder
                      .filter(
                        (c) =>
                          searching ||
                          prefs.showClosed ||
                          c.status === "active" ||
                          c.id === selectedId,
                      )
                      .sort(prefs.sortBy === "level" ? byLevel : byName);

                    return (
                      <div key={key}>
                        <button
                          type="button"
                          aria-expanded={folderOpen}
                          onClick={() =>
                            setPrefs((p) => ({
                              open: { ...p.open, [key]: !folderOpen },
                            }))
                          }
                          className="flex w-full items-center gap-1 py-1 pr-3 pl-6 text-left text-sm hover:bg-muted"
                        >
                          {folderOpen ? (
                            <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                          )}
                          <span className="truncate">{folder.label}</span>
                          <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                            {count}
                          </span>
                        </button>

                        {folderOpen &&
                          visible.map((c) => {
                            const isSelected = c.id === selectedId;
                            const suffix = STATUS_SUFFIX[c.status];
                            return (
                              <Link
                                key={c.id}
                                href={`/cases/${c.id}`}
                                aria-current={isSelected ? "page" : undefined}
                                className={cn(
                                  "mx-1.5 flex items-center gap-2 rounded-md py-1 pr-2 pl-9 text-sm hover:bg-muted",
                                  isSelected &&
                                    "bg-accent font-medium text-accent-foreground",
                                  c.status !== "active" &&
                                    "text-muted-foreground",
                                )}
                              >
                                <span className="truncate">
                                  {displayName(c.first_name, c.last_name)}
                                </span>
                                {suffix && (
                                  <span className="shrink-0 text-xs">
                                    ({suffix})
                                  </span>
                                )}
                                {prefs.showLevel && (
                                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                                    {LEVEL_LABELS[c.education_level] ??
                                      c.education_level}
                                  </span>
                                )}
                              </Link>
                            );
                          })}
                      </div>
                    );
                  })}
              </div>
            );
          })}
        </nav>

        {/* Pied */}
        <div className="flex items-center gap-2 border-t p-3">
          <Link
            href="/cases/new"
            className={cn(buttonVariants(), "flex-1")}
          >
            <Plus /> Nouveau dossier
          </Link>
          <Link
            href="/dashboard"
            aria-label="Tableau de bord"
            title="Tableau de bord"
            className={buttonVariants({ variant: "outline", size: "icon" })}
          >
            <LayoutDashboard />
          </Link>
        </div>
      </aside>

      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Redimensionner le panneau"
        aria-valuenow={width}
        aria-valuemin={220}
        aria-valuemax={520}
        tabIndex={0}
        onPointerDown={startResize}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") setPrefs({ width: width - 16 });
          if (e.key === "ArrowRight") setPrefs({ width: width + 16 });
        }}
        className="w-px shrink-0 cursor-col-resize bg-border outline-none transition-colors hover:w-0.5 hover:bg-primary/40 focus-visible:w-0.5 focus-visible:bg-ring"
      />
    </>
  );
}
