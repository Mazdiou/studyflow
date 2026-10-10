"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AddEmployeeForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<{
    email: string;
    password: string;
  } | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setCreated(null);
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const email = String(form.get("email"));

    setLoading(true);
    const res = await fetch("/api/team/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: form.get("firstName"),
        lastName: form.get("lastName"),
        email,
      }),
    });
    setLoading(false);

    const data = await res.json().catch(() => null);
    if (!res.ok)
      return setError(data?.error ?? `Erreur serveur (${res.status})`);

    setCreated({ email, password: data.temporaryPassword });
    formEl.reset();
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor="firstName">Prénom</Label>
          <Input id="firstName" name="firstName" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="lastName">Nom</Label>
          <Input id="lastName" name="lastName" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" required />
        </div>
        <div className="sm:col-span-3">
          <Button type="submit" disabled={loading}>
            {loading ? "Création..." : "Créer le compte"}
          </Button>
        </div>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {created && (
        <div className="rounded-md border border-amber-400 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-medium">Compte créé pour {created.email}</p>
          <p className="mt-1">
            Mot de passe temporaire :{" "}
            <code className="font-mono text-base">{created.password}</code>
          </p>
          <p className="mt-1">
            Notez-le maintenant : il ne sera plus affiché. L&apos;employé devra en
            choisir un nouveau à sa première connexion.
          </p>
        </div>
      )}
    </div>
  );
}
