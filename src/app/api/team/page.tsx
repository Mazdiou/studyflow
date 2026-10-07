import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireOwner } from "@/lib/auth/require-owner";
import { AddEmployeeForm } from "./add-employee-form";
import { ToggleActiveButton } from "./toggle-active-button";

export default async function TeamPage() {
  const caller = await requireOwner();
  if (!caller) redirect("/dashboard");

  // Lecture via le RLS : uniquement les profils de l'agence du patron
  const supabase = await createClient();
  const { data: members } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, role, is_active")
    .order("created_at");

  // E-mails : lus côté serveur avec la clé admin, pour ces profils seulement
  const admin = createAdminClient();
  const emails = new Map<string, string>();
  await Promise.all(
    (members ?? []).map(async (m) => {
      const { data } = await admin.auth.admin.getUserById(m.id);
      if (data.user?.email) emails.set(m.id, data.user.email);
    }),
  );

  return (
    <main className="mx-auto max-w-3xl space-y-8 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Équipe</h1>
        <Link href="/dashboard" className="text-sm underline">
          Retour au tableau de bord
        </Link>
      </div>

      <ul className="divide-y rounded-md border">
        {(members ?? []).map((m) => (
          <li key={m.id} className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium">
                {m.first_name} {m.last_name}{" "}
                <span className="text-sm text-muted-foreground">
                  ({m.role === "owner" ? "patron" : "employé"})
                </span>
              </p>
              <p className="text-sm text-muted-foreground">
                {emails.get(m.id) ?? ""}
                {!m.is_active && " · désactivé"}
              </p>
            </div>
            {m.id !== caller.user.id && (
              <ToggleActiveButton id={m.id} isActive={m.is_active} />
            )}
          </li>
        ))}
      </ul>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Ajouter un employé</h2>
        <AddEmployeeForm />
      </section>
    </main>
  );
}
