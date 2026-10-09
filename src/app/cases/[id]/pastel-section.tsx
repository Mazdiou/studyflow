"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const HIDE_AFTER_MS = 30_000;

export function PastelSection({
  caseId,
  account,
  email,
}: {
  caseId: string;
  account: "to_create" | "existing";
  email: string | null;
}) {
  const router = useRouter();
  const isExisting = account === "existing";

  const [password, setPassword] = useState<string | null>(null);
  const [revealing, setRevealing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Le mot de passe se masque seul ; il est aussi effacé si on quitte la fiche
  useEffect(() => {
    if (password === null) return;
    const t = setTimeout(() => setPassword(null), HIDE_AFTER_MS);
    return () => clearTimeout(t);
  }, [password]);

  async function reveal() {
    setError(null);
    setCopied(false);
    setRevealing(true);
    const res = await fetch(`/api/cases/${caseId}/pastel/reveal`, {
      method: "POST",
      cache: "no-store",
    });
    const data = await res.json().catch(() => null);
    setRevealing(false);
    if (!res.ok || typeof data?.password !== "string") {
      setError(data?.error ?? `Erreur ${res.status}`);
      return;
    }
    setPassword(data.password);
  }

  async function copy() {
    if (password === null) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
    } catch {
      setError("Copie impossible : copiez le mot de passe à la main.");
    }
  }

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    const form = new FormData(e.currentTarget);

    setSaving(true);
    const res = await fetch(`/api/cases/${caseId}/pastel`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pastelEmail: String(form.get("pastelEmail") ?? ""),
        pastelPassword: String(form.get("pastelPassword") ?? ""),
      }),
    });
    const data = await res.json().catch(() => null);
    setSaving(false);

    if (!res.ok) {
      if (Array.isArray(data?.fields)) {
        const map: Record<string, string> = {};
        for (const f of data.fields as { path: string; message: string }[]) {
          if (!map[f.path]) map[f.path] = f.message;
        }
        setFieldErrors(map);
      }
      setError(data?.error ?? `Erreur ${res.status}`);
      return;
    }

    setEditing(false);
    setPassword(null);
    router.refresh();
  }

  return (
    <section className="rounded-lg border p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Compte Pastel</h2>
        {!editing && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setEditing(true);
              setPassword(null);
              setError(null);
            }}
          >
            {isExisting ? "Modifier" : "Renseigner le compte"}
          </Button>
        )}
      </div>

      {!editing && (
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">Compte</dt>
            <dd className="text-sm">{isExisting ? "Existant" : "À créer"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">E-mail Pastel</dt>
            <dd className="text-sm">{email ?? "—"}</dd>
          </div>
          {isExisting && (
            <div className="sm:col-span-2">
              <dt className="text-xs text-muted-foreground">Mot de passe</dt>
              <dd className="flex flex-wrap items-center gap-2 text-sm">
                {password === null ? (
                  <>
                    <span aria-hidden>••••••••</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={reveal}
                      disabled={revealing}
                    >
                      {revealing ? "Chargement..." : "Afficher"}
                    </Button>
                  </>
                ) : (
                  <>
                    <code className="rounded bg-muted px-2 py-1 break-all">
                      {password}
                    </code>
                    <Button variant="outline" size="sm" onClick={copy}>
                      {copied ? "Copié" : "Copier"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPassword(null)}
                    >
                      Masquer
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      Se masque seul après 30 secondes.
                    </span>
                  </>
                )}
              </dd>
              <p className="mt-1 text-xs text-muted-foreground">
                Chaque affichage est enregistré dans le journal de
                l&apos;agence.
              </p>
            </div>
          )}
        </dl>
      )}

      {editing && (
        <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="pastelEmail">E-mail du compte Pastel</Label>
            <Input
              id="pastelEmail"
              name="pastelEmail"
              type="email"
              autoComplete="off"
              defaultValue={email ?? ""}
              required
            />
            {fieldErrors.pastelEmail && (
              <p className="text-sm text-red-600">{fieldErrors.pastelEmail}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="pastelPassword">
              Mot de passe du compte Pastel
            </Label>
            <Input
              id="pastelPassword"
              name="pastelPassword"
              type="password"
              autoComplete="new-password"
              required={!isExisting}
            />
            {fieldErrors.pastelPassword && (
              <p className="text-sm text-red-600">
                {fieldErrors.pastelPassword}
              </p>
            )}
            {isExisting && (
              <p className="text-xs text-muted-foreground">
                Laissez vide pour garder le mot de passe actuel.
              </p>
            )}
          </div>
          <p className="text-sm text-muted-foreground sm:col-span-2">
            Le mot de passe est chiffré avant d&apos;être enregistré et
            n&apos;apparaît jamais dans les listes ni dans le journal.
          </p>
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? "Enregistrement..." : "Enregistrer"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setEditing(false);
                setError(null);
                setFieldErrors({});
              }}
            >
              Annuler
            </Button>
          </div>
        </form>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </section>
  );
}
