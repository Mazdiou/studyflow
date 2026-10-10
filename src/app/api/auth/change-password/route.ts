import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { safely } from "@/lib/api-errors";

const schema = z.object({ password: z.string().min(8).max(72) });

async function changePassword(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non connecté" }, { status: 401 });
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
      { error: "Mot de passe invalide (8 caractères minimum)" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const { error: pwError } = await admin.auth.admin.updateUserById(user.id, {
    password: parsed.data.password,
  });
  if (pwError) {
    return NextResponse.json(
      { error: "Changement impossible" },
      { status: 500 },
    );
  }

  const { error: flagError } = await admin
    .from("profiles")
    .update({ must_change_password: false })
    .eq("id", user.id);
  if (flagError) {
    return NextResponse.json(
      { error: "Changement impossible" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  return safely("change-password", () => changePassword(request));
}
