import { z } from "zod";

// Variables lisibles par le navigateur. Chaque variable est citée en toutes
// lettres (process.env.NEXT_PUBLIC_...) : c'est ce qui permet à Next de
// remplacer sa valeur dans le code envoyé au navigateur.
const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

export function publicEnv() {
  const parsed = publicSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
  if (!parsed.success) throw envError(parsed.error);
  return {
    supabaseUrl: parsed.data.NEXT_PUBLIC_SUPABASE_URL,
    supabaseKey: parsed.data.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  };
}

// Message clair, avec les NOMS des variables en cause, jamais leurs valeurs.
export function envError(error: z.ZodError) {
  const names = [...new Set(error.issues.map((i) => String(i.path[0])))];
  return new Error(
    `Variables d'environnement manquantes ou invalides : ${names.join(", ")}. Voir .env.example.`,
  );
}
