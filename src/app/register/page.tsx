"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const fields = [
  { name: "agencyName", label: "Nom de l'agence", type: "text" },
  { name: "city", label: "Ville", type: "text" },
  { name: "phone", label: "Téléphone de l'agence", type: "tel" },
  { name: "firstName", label: "Prénom", type: "text" },
  { name: "lastName", label: "Nom", type: "text" },
  { name: "email", label: "E-mail", type: "email" },
  {
    name: "password",
    label: "Mot de passe (8 caractères minimum)",
    type: "password",
  },
  { name: "confirm", label: "Confirmer le mot de passe", type: "password" },
] as const;

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const data = Object.fromEntries(new FormData(e.currentTarget)) as Record<
      string,
      string
    >;

    if (data.password.length < 8)
      return setError("Mot de passe trop court (8 minimum).");
    if (data.password !== data.confirm)
      return setError("Les mots de passe ne correspondent pas.");

    setLoading(true);
    const payload = { ...data };
    delete payload.confirm;
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setLoading(false);

    if (res.ok) setDone(true);
    else
      setError(
        (await res.json().catch(() => null))?.error ?? `Erreur ${res.status}`,
      );
  }

  if (done) {
    return (
      <main className="space-y-2 p-8">
        <p>Compte créé.</p>
        <Link href="/login" className="underline">
          Se connecter
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md p-6">
      <Card>
        <CardHeader>
          <CardTitle>Inscrire mon agence</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            {fields.map((f) => (
              <div key={f.name} className="space-y-1">
                <Label htmlFor={f.name}>{f.label}</Label>
                <Input id={f.name} name={f.name} type={f.type} required />
              </div>
            ))}
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Création..." : "Créer mon compte"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
