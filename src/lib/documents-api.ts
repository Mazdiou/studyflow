import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireMember } from "@/lib/auth/require-member";
import { createAdminClient } from "@/lib/supabase/admin";

// Réponses sans cache : elles peuvent contenir un lien signé.
const NO_STORE = { "Cache-Control": "no-store" };

export function fail(error: string, status: number, fields?: unknown) {
  return NextResponse.json(
    fields ? { error, fields } : { error },
    { status, headers: NO_STORE },
  );
}

export function ok(body: Record<string, unknown> = { ok: true }, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

export async function readJson(request: Request): Promise<unknown | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export function validationError(error: z.ZodError) {
  const fields = error.issues.map((i) => ({
    path: i.path.join("."),
    message: i.message,
  }));
  return fail(fields[0]?.message ?? "Données invalides", 400, fields);
}

// Vérifie l'appelant, l'identifiant et que le dossier est bien celui de son
// agence. La clé secrète contourne le RLS : tout filtre sur agency_id vient
// de la session, jamais de la requête.
export async function authorizeCase(caseId: string) {
  const caller = await requireMember();
  if (!caller) return { ok: false as const, response: fail("Accès refusé", 403) };

  if (!z.string().uuid().safeParse(caseId).success) {
    return {
      ok: false as const,
      response: fail("Identifiant invalide", 400),
    };
  }

  const agencyId = caller.profile.agency_id as string;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("cases")
    .select("id")
    .eq("id", caseId)
    .eq("agency_id", agencyId)
    .maybeSingle();

  if (error) {
    console.error("[documents] lecture du dossier", error.message);
    return { ok: false as const, response: fail("Erreur serveur", 500) };
  }
  if (!data) {
    return { ok: false as const, response: fail("Dossier introuvable", 404) };
  }
  return { ok: true as const, caller, agencyId, admin };
}
