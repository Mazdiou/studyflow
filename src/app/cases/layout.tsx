import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchCampaignCases } from "@/lib/case-tree-data";
import { requireMember } from "@/lib/auth/require-member";
import {
  CaseTree,
  type TreeCampaign,
  type TreeCase,
  type TreeMember,
} from "./case-tree";

export default async function CasesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const caller = await requireMember();
  if (!caller) redirect("/login");

  // Lecture via le RLS : seuls les dossiers et membres de l'agence reviennent.
  const supabase = await createClient();
  // Supabase limite chaque requête à 1000 lignes : on charge la campagne en
  // cours par pages ; les autres campagnes sont chargées à l'ouverture.
  const [campaignsRes, membersRes] = await Promise.all([
    supabase
      .from("campaigns")
      .select("id, label, is_current")
      .order("label", { ascending: false }),
    supabase
      .from("profiles")
      .select("id, first_name, last_name, is_active")
      .order("first_name"),
  ]);

  if (campaignsRes.error) {
    console.error("[cases layout] campagnes", campaignsRes.error.message);
  }
  if (membersRes.error) {
    console.error("[cases layout] membres", membersRes.error.message);
  }

  const campaigns = (campaignsRes.data ?? []) as TreeCampaign[];
  const current = campaigns.find((c) => c.is_current);
  let cases: TreeCase[] = [];
  try {
    if (current) cases = await fetchCampaignCases(supabase, current.id);
  } catch (e) {
    console.error("[cases layout] dossiers", e instanceof Error ? e.message : e);
  }

  return (
    <div className="flex h-dvh overflow-hidden">
      <CaseTree
        campaigns={campaigns}
        cases={cases}
        loadedCampaignIds={current ? [current.id] : []}
        members={(membersRes.data ?? []) as TreeMember[]}
        currentUserId={caller.user.id}
      />
      <div className="min-w-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
