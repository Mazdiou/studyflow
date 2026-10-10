import "server-only";
import { z } from "zod";
import { envError, publicEnv } from "@/lib/env";

const serverSchema = z.object({
  SUPABASE_SECRET_KEY: z.string().min(1),
  PASTEL_ENCRYPTION_KEY: z
    .string()
    .refine(
      (v) => Buffer.from(v, "base64").length === 32,
      "doit faire 32 octets (base64)",
    ),
});

// Validé à chaque appel (rapide) : une variable manquante donne une erreur
// claire au lieu d'un échec obscur plus loin.
export function serverEnv() {
  const parsed = serverSchema.safeParse({
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    PASTEL_ENCRYPTION_KEY: process.env.PASTEL_ENCRYPTION_KEY,
  });
  if (!parsed.success) throw envError(parsed.error);
  return {
    ...publicEnv(),
    secretKey: parsed.data.SUPABASE_SECRET_KEY,
    pastelKey: Buffer.from(parsed.data.PASTEL_ENCRYPTION_KEY, "base64"),
  };
}
