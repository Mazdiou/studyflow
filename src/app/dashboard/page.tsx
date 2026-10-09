import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "./logout-button";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, role, agencies(name, city)")
    .eq("id", user!.id)
    .single();

  return (
    <main className="p-8 space-y-4">
      <h1 className="text-2xl font-bold">Tableau de bord</h1>
      <p>
        Bonjour {profile?.first_name} {profile?.last_name} ({profile?.role})
      </p>
      <LogoutButton />
      <p>
        <Link href="/cases/new" className="underline">
          Nouveau dossier
        </Link>
      </p>
      <p>
        <Link href="/cases" className="underline">
          Dossiers
        </Link>
      </p>
      {profile?.role === "owner" && (
        <p>
          <Link href="/team" className="underline">
            Gérer l'équipe
          </Link>
        </p>
      )}
    </main>
  );
}
