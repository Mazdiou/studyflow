import "server-only";
import { NextResponse } from "next/server";

// Enveloppe une route : toute exception devient une réponse JSON propre
// (500 « Erreur serveur »). Seul le nom de l'erreur est écrit dans les logs,
// jamais son message, qui pourrait contenir une donnée personnelle.
export async function safely(
  label: string,
  run: () => Promise<Response>,
): Promise<Response> {
  try {
    return await run();
  } catch (e) {
    console.error(`[${label}]`, e instanceof Error ? e.name : "erreur");
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
