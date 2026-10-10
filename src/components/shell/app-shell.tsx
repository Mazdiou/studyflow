import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireMember } from "@/lib/auth/require-member";
import { AppRail } from "./app-rail";

// Coquille commune : barre d'icônes + contenu. Utilisée par le tableau de
// bord et l'équipe ; la section dossiers ajoute son arbre à côté.
export async function getShellUser() {
  const caller = await requireMember();
  if (!caller) redirect("/login");
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", caller.user.id)
    .single();
  const first = data?.first_name ?? "";
  const last = data?.last_name ?? "";
  return {
    caller,
    firstName: first,
    isOwner: caller.profile.role === "owner",
    initials: `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase() || "?",
  };
}

export async function AppShell({ children }: { children: React.ReactNode }) {
  const u = await getShellUser();
  return (
    <div className="flex h-dvh flex-col-reverse overflow-hidden md:flex-row">
      <AppRail isOwner={u.isOwner} initials={u.initials} />
      <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
