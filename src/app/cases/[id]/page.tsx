import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import {
  DIPLOMA_LABELS,
  LANGUAGE_TEST_LABELS,
  LEVEL_LABELS,
  SCOPE_LABELS,
  STATUS_LABELS,
  TRACK_LABELS,
  displayName,
} from "@/lib/case-labels";
import { StatusButtons } from "./status-buttons";
import { PastelSection } from "./pastel-section";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border p-4">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      <dl className="grid gap-4 sm:grid-cols-2">{children}</dl>
    </section>
  );
}

function listOrNone(values: string[], labels: Record<string, string>) {
  return values.length > 0
    ? values.map((v) => labels[v] ?? v).join(", ")
    : "Aucun";
}

export default async function CasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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

  let responsible: string | null = null;
  if (c.assigned_to) {
    const { data: p } = await supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", c.assigned_to)
      .maybeSingle();
    if (p) responsible = `${p.first_name} ${p.last_name}`;
  }

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("label")
    .eq("id", c.campaign_id)
    .maybeSingle();

  const birthDate = new Date(`${c.birth_date}T00:00:00Z`).toLocaleDateString(
    "fr-FR",
    { timeZone: "UTC" },
  );
  const createdAt = new Date(c.created_at).toLocaleDateString("fr-FR");

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            {displayName(c.first_name, c.last_name)}
          </h1>
          <p className="text-sm text-muted-foreground">
            {STATUS_LABELS[c.status] ?? c.status}
            {campaign ? ` · Campagne ${campaign.label}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/cases/${c.id}/edit`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Modifier
          </Link>
          <StatusButtons id={c.id} status={c.status} />
        </div>
      </div>

      <Section title="Candidat">
        <Field label="Date de naissance">{birthDate}</Field>
        <Field label="Téléphone">{c.phone}</Field>
        <Field label="E-mail">{c.email ?? "—"}</Field>
        <Field label="Niveau d'études actuel">
          {LEVEL_LABELS[c.education_level] ?? c.education_level}
        </Field>
      </Section>

      <Section title="Classement du dossier">
        <Field label="Procédure">
          {c.main_track ? (TRACK_LABELS[c.main_track] ?? c.main_track) : "—"}
        </Field>
        <Field label="Écoles">{c.schools ? "Oui" : "Non"}</Field>
        <Field label="Prestation">{SCOPE_LABELS[c.scope] ?? c.scope}</Field>
        <Field label="Responsable">{responsible ?? "—"}</Field>
        <Field label="Créé le">{createdAt}</Field>
      </Section>

      <Section title="Pièces à prévoir">
        <Field label="Diplômes">{listOrNone(c.diplomas, DIPLOMA_LABELS)}</Field>
        <Field label="Tests de langue">
          {listOrNone(c.language_tests, LANGUAGE_TEST_LABELS)}
        </Field>
      </Section>

      <PastelSection
        caseId={c.id}
        account={c.pastel_account}
        email={c.pastel_email ?? null}
      />
    </div>
  );
}
