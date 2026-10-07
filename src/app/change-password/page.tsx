"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password"));
    const confirm = String(form.get("confirm"));

    if (password.length < 8)
      return setError("Mot de passe trop court (8 minimum).");
    if (password !== confirm)
      return setError("Les mots de passe ne correspondent pas.");

    setLoading(true);
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setLoading(false);

    if (!res.ok)
      return setError(
        (await res.json().catch(() => null))?.error ?? `Erreur ${res.status}`,
      );
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-md p-6">
      <Card>
        <CardHeader>
          <CardTitle>Choisissez votre mot de passe</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="password">Nouveau mot de passe</Label>
              <Input id="password" name="password" type="password" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="confirm">Confirmer le mot de passe</Label>
              <Input id="confirm" name="confirm" type="password" required />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
