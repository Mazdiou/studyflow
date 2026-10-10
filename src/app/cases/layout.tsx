import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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
  const [campaignsRes, casesRes, membersRes] = await Promise.all([
    supabase
      .from("campaigns")
      .select("id, label, is_current")
      .order("label", { ascending: false }),
    supabase
      .from("cases")
      .select(
        "id, campaign_id, first_name, last_name, phone, education_level, main_track, schools, status, assigned_to",
      ),
    supabase
      .from("profiles")
      .select("id, first_name, last_name, is_active")
      .order("first_name"),
  ]);

  if (campaignsRes.error) {
    console.error("[cases layout] campagnes", campaignsRes.error.message);
  }
  if (casesRes.error) {
    console.error("[cases layout] dossiers", casesRes.error.message);
  }
  if (membersRes.error) {
    console.error("[cases layout] membres", membersRes.error.message);
  }

  return (
    <div className="flex h-dvh overflow-hidden">
      <CaseTree
        campaigns={(campaignsRes.data ?? []) as TreeCampaign[]}
        cases={(casesRes.data ?? []) as TreeCase[]}
        members={(membersRes.data ?? []) as TreeMember[]}
        currentUserId={caller.user.id}
      />
      <div className="min-w-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
