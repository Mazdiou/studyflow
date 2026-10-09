import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireMember } from "@/lib/auth/require-member";
import { displayName } from "@/lib/case-labels";
import { CaseForm, type Member } from "../../case-form";

export default async function EditCasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const caller = await requireMember();
  if (!caller) redirect("/login");

  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();

  // Lecture via le RLS : un dossier d'une autre agence n'est pas trouvé.
  const supabase = await createClient();
  const { data: c } = await supabase
    .from("cases")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!c) notFound();

  const isOwner = caller.profile.role === "owner";

  // Seul le patron choisit le responsable. Le responsable actuel est
  // toujours dans la liste, même s'il est devenu inactif.
  let members: Member[] = [];
  if (isOwner) {
    const filter = c.assigned_to
      ? `is_active.eq.true,id.eq.${c.assigned_to}`
      : "is_active.eq.true";
    const { data } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, role, is_active")
      .or(filter)
      .order("first_name");
    members = (data ?? []) as Member[];
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Modifier le dossier</h1>
        <p className="text-sm text-muted-foreground">
          {displayName(c.first_name, c.last_name)}
        </p>
      </div>
      <CaseForm
        key={c.id}
        mode="edit"
        caseId={c.id}
        initial={{
          firstName: c.first_name,
          lastName: c.last_name,
          birthDate: c.birth_date,
          phone: c.phone,
          email: c.email ?? "",
          educationLevel: c.education_level,
          mainTrack: c.main_track ?? "",
          schools: c.schools,
          scope: c.scope,
          assignedTo: c.assigned_to ?? null,
          diplomas: c.diplomas,
          languageTests: c.language_tests,
        }}
        members={members}
        currentUserId={caller.user.id}
        isOwner={isOwner}
      />
    </div>
  );
}
