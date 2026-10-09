import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireMember } from "@/lib/auth/require-member";
import { CaseTree, type TreeCampaign, type TreeCase } from "./case-tree";

export default async function CasesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const caller = await requireMember();
  if (!caller) redirect("/login");

  // Lecture via le RLS : seuls les dossiers de l'agence reviennent.
  const supabase = await createClient();
  const [campaignsRes, casesRes] = await Promise.all([
    supabase
      .from("campaigns")
      .select("id, label, is_current")
      .order("label", { ascending: false }),
    supabase
      .from("cases")
      .select(
        "id, campaign_id, first_name, last_name, education_level, main_track, schools, status",
      ),
  ]);

  if (campaignsRes.error) {
    console.error("[cases layout] campagnes", campaignsRes.error.message);
  }
  if (casesRes.error) {
    console.error("[cases layout] dossiers", casesRes.error.message);
  }

  return (
    <div className="flex h-dvh overflow-hidden">
      <CaseTree
        campaigns={(campaignsRes.data ?? []) as TreeCampaign[]}
        cases={(casesRes.data ?? []) as TreeCase[]}
      />
      <div className="min-w-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
