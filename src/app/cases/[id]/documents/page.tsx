import { notFound } from "next/navigation";
import { requireMember } from "@/lib/auth/require-member";
import { createClient } from "@/lib/supabase/server";
import { formatSize } from "@/lib/documents";
import { getCase } from "../get-case";
import { DocumentsPanel, type DocItem } from "./documents-panel";

const dateFormat = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Africa/Algiers",
});

type Row = {
  id: string;
  name: string;
  size_bytes: number;
  uploaded_by: string;
  locked_at: string | null;
  created_at: string;
};

export default async function DocumentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!(await getCase(id))) notFound();

  const caller = await requireMember();
  const isOwner = caller?.profile.role === "owner";

  // Lecture via le RLS : seuls les documents de l'agence reviennent.
  const supabase = await createClient();
  const { data } = await supabase
    .from("documents")
    .select("id, name, size_bytes, uploaded_by, locked_at, created_at")
    .eq("case_id", id)
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as Row[];

  const names = new Map<string, string>();
  const authorIds = [...new Set(rows.map((r) => r.uploaded_by))];
  if (authorIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, first_name")
      .in("id", authorIds);
    for (const p of (profiles ?? []) as { id: string; first_name: string }[]) {
      names.set(p.id, p.first_name);
    }
  }

  const docs: DocItem[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    sizeLabel: formatSize(r.size_bytes),
    uploadedBy: names.get(r.uploaded_by) ?? "un ancien membre",
    dateLabel: dateFormat.format(new Date(r.created_at)),
    locked: r.locked_at !== null,
  }));

  return <DocumentsPanel caseId={id} docs={docs} isOwner={isOwner} />;
}
