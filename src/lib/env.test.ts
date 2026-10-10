import { afterEach, describe, expect, it } from "vitest";
import { publicEnv } from "./env";

const saved = { ...process.env };
afterEach(() => {
  process.env = { ...saved };
});

describe("variables d'environnement publiques", () => {
  it("accepte une configuration complète", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "abc";
    expect(publicEnv().supabaseUrl).toBe("http://127.0.0.1:54321");
  });

  it("nomme la variable manquante", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "abc";
    expect(() => publicEnv()).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });
});
