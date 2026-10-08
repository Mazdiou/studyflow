import "server-only";
import { createClient } from "@/lib/supabase/server";

export async function requireMember() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, agency_id, role, is_active")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.is_active) return null;
  return { user, profile };
}
