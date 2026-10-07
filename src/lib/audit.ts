import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

type Entry = {
  agencyId: string;
  actorId: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  details?: Record<string, unknown>;
};

export async function logActivity(admin: SupabaseClient, e: Entry) {
  const { error } = await admin.from("activity_log").insert({
    agency_id: e.agencyId,
    actor_id: e.actorId,
    action: e.action,
    target_type: e.targetType ?? null,
    target_id: e.targetId ?? null,
    details: e.details ?? {},
  });
  // Un échec du journal n'annule pas l'action déjà réussie,
  // mais il doit se voir dans les logs du serveur.
  if (error) console.error("[activity_log]", error.message);
}
