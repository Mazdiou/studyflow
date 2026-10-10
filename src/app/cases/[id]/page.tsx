import { notFound } from "next/navigation";
import {
  DIPLOMA_LABELS,
  LANGUAGE_TEST_LABELS,
  LEVEL_LABELS,
  SCOPE_LABELS,
  procedureLabel,
} from "@/lib/case-labels";
import { getCase } from "./get-case";

function Block({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-medium">{title}</h2>
      <dl className="divide-y rounded-xl border">{children}</dl>
    </section>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[9rem_1fr] gap-3 px-4 py-2.5 text-sm sm:grid-cols-[12rem_1fr]">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}

function listOrNone(values: string[], labels: Record<string, string>) {
  return values.length > 0
    ? values.map((v) => labels[v] ?? v).join(", ")
    : "Aucun";
}

export default async function CaseInfoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getCase(id);
  if (!data) notFound();
  const { c, responsible } = data;

  const birthDate = new Date(`${c.birth_date}T00:00:00Z`).toLocaleDateString(
    "fr-FR",
    { timeZone: "UTC" },
  );
  const createdAt = new Date(c.created_at).toLocaleDateString("fr-FR");

  return (
    <div className="space-y-6">
      <Block title="Identité">
        <Row label="Date de naissance">{birthDate}</Row>
        <Row label="Téléphone">{c.phone}</Row>
        <Row label="E-mail">{c.email ?? "—"}</Row>
      </Block>

      <Block title="Parcours">
        <Row label="Niveau d'études actuel">
          {LEVEL_LABELS[c.education_level] ?? c.education_level}
        </Row>
        <Row label="Diplômes obtenus">
          {listOrNone(c.diplomas, DIPLOMA_LABELS)}
        </Row>
        <Row label="Tests de langue">
          {listOrNone(c.language_tests, LANGUAGE_TEST_LABELS)}
        </Row>
      </Block>

      <Block title="Dossier">
        <Row label="Prestation">{SCOPE_LABELS[c.scope] ?? c.scope}</Row>
        <Row label="Procédure">{procedureLabel(c.main_track, c.schools)}</Row>
        <Row label="Responsable">{responsible ?? "—"}</Row>
        <Row label="Créé le">{createdAt}</Row>
      </Block>
    </div>
  );
}
