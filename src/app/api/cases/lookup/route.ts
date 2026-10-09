import { NextResponse } from "next/server";
import { z } from "zod";
import { requireMember } from "@/lib/auth/require-member";
import { createClient } from "@/lib/supabase/server";
import { normalizeName } from "@/lib/names";

const schema = z.object({
  lastName: z.string().trim().min(1).max(100),
  firstName: z.string().trim().min(1).max(100),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

// POST (et non GET) : l'identité du candidat ne doit pas se retrouver
// dans une adresse, donc dans les journaux d'accès.
export async function POST(request: Request) {
  try {
    const caller = await requireMember();
    if (!caller) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
    }
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Renseignez le nom, le prénom et la date de naissance" },
        { status: 400 },
      );
    }
    const d = parsed.data;

    // Lecture via le RLS : seuls les dossiers de l'agence sont visibles.
    const supabase = await createClient();
    const [casesRes, campaignsRes] = await Promise.all([
      supabase
        .from("cases")
        .select(
          "id, campaign_id, first_name, last_name, birth_date, phone, email, education_level, main_track, schools, scope, language_tests, diplomas, pastel_account, pastel_email, status",
        )
        .eq("birth_date", d.birthDate),
      supabase.from("campaigns").select("id, label, is_current"),
    ]);

    if (casesRes.error || campaignsRes.error) {
      console.error(
        "[cases lookup]",
        casesRes.error?.message ?? campaignsRes.error?.message,
      );
      return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }

    const campaigns = new Map(
      (campaignsRes.data ?? []).map((c) => [c.id, c] as const),
    );
    const wantedFirst = normalizeName(d.firstName);
    const wantedLast = normalizeName(d.lastName);

    const matches = (casesRes.data ?? [])
      .filter(
        (c) =>
          normalizeName(c.first_name) === wantedFirst &&
          normalizeName(c.last_name) === wantedLast,
      )
      .map((c) => {
        const camp = campaigns.get(c.campaign_id);
        return {
          id: c.id,
          campaignLabel: camp?.label ?? "?",
          isCurrent: camp?.is_current ?? false,
          status: c.status,
          firstName: c.first_name,
          lastName: c.last_name,
          birthDate: c.birth_date,
          phone: c.phone,
          email: c.email,
          educationLevel: c.education_level,
          mainTrack: c.main_track,
          schools: c.schools,
          scope: c.scope,
          languageTests: c.language_tests,
          diplomas: c.diplomas,
          pastelAccount: c.pastel_account,
          // Seul l'e-mail est proposé à l'import : jamais le mot de passe
          pastelEmail: c.pastel_email,
        };
      })
      .sort((a, b) => b.campaignLabel.localeCompare(a.campaignLabel));

    return NextResponse.json({ matches });
  } catch (e) {
    console.error("[cases lookup]", e instanceof Error ? e.name : "erreur");
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
