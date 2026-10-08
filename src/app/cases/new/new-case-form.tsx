"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const selectClass =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50";

const LEVELS = [
  ["terminale", "Terminale"],
  ["l1", "L1"],
  ["l2", "L2"],
  ["l3", "L3"],
  ["m1", "M1"],
  ["m2", "M2"],
] as const;

const LANGUAGE_TESTS = [
  ["fr", "Test de français"],
  ["en", "Test d'anglais"],
] as const;

const DIPLOMAS = [
  ["bac", "Baccalauréat"],
  ["licence", "Licence"],
  ["master", "Master"],
] as const;

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-sm text-red-600">{message}</p>;
}

type Member = {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
};

export function NewCaseForm({
  members,
  currentUserId,
  isOwner,
}: {
  members: Member[];
  currentUserId: string;
  isOwner: boolean;
}) {
  const [pastelAccount, setPastelAccount] = useState<"to_create" | "existing">(
    "to_create",
  );
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [createdName, setCreatedName] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setCreatedName(null);

    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const isExisting = pastelAccount === "existing";

    const payload = {
      firstName: String(form.get("firstName") ?? ""),
      lastName: String(form.get("lastName") ?? ""),
      birthDate: String(form.get("birthDate") ?? ""),
      phone: String(form.get("phone") ?? ""),
      email: String(form.get("email") ?? ""),
      educationLevel: String(form.get("educationLevel") ?? ""),
      mainTrack: String(form.get("mainTrack") ?? ""),
      schools: form.get("schools") === "on",
      scope: String(form.get("scope") ?? ""),
      assignedTo: isOwner ? String(form.get("assignedTo") ?? "") : "",
      pastelAccount,
      pastelEmail: isExisting ? String(form.get("pastelEmail") ?? "") : "",
      pastelPassword: isExisting
        ? String(form.get("pastelPassword") ?? "")
        : "",
      languageTests: form.getAll("languageTests").map(String),
      diplomas: form.getAll("diplomas").map(String),
    };

    setLoading(true);
    const res = await fetch("/api/cases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setLoading(false);

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      if (Array.isArray(data?.fields)) {
        const map: Record<string, string> = {};
        for (const f of data.fields as { path: string; message: string }[]) {
          if (!map[f.path]) map[f.path] = f.message;
        }
        setFieldErrors(map);
      }
      setError(data?.error ?? `Erreur serveur (${res.status})`);
      return;
    }

    setCreatedName(`${payload.firstName} ${payload.lastName}`);
    formEl.reset();
    setPastelAccount("to_create");
  }

  return (
    <div className="space-y-4">
      {createdName && (
        <div className="rounded-md border border-green-400 bg-green-50 p-4 text-sm text-green-900">
          <p className="font-medium">Dossier créé pour {createdName}.</p>
          <p className="mt-1">
            Vous pouvez en saisir un autre ci-dessous.{" "}
            <Link href="/dashboard" className="underline">
              Retour au tableau de bord
            </Link>
          </p>
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Candidat</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="firstName">Prénom</Label>
              <Input id="firstName" name="firstName" required />
              <FieldError message={fieldErrors.firstName} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="lastName">Nom</Label>
              <Input id="lastName" name="lastName" required />
              <FieldError message={fieldErrors.lastName} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="birthDate">Date de naissance</Label>
              <Input
                id="birthDate"
                name="birthDate"
                type="date"
                max={new Date().toISOString().slice(0, 10)}
                required
              />
              <FieldError message={fieldErrors.birthDate} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="phone">Téléphone</Label>
              <Input id="phone" name="phone" type="tel" required />
              <FieldError message={fieldErrors.phone} />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="email">E-mail (facultatif)</Label>
              <Input id="email" name="email" type="email" />
              <FieldError message={fieldErrors.email} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Classement du dossier</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="educationLevel">
                Niveau d&apos;études atteint ou en cours
              </Label>
              <select
                id="educationLevel"
                name="educationLevel"
                required
                defaultValue=""
                className={selectClass}
              >
                <option value="" disabled>
                  Choisir...
                </option>
                {LEVELS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <FieldError message={fieldErrors.educationLevel} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="scope">Prestation</Label>
              <select
                id="scope"
                name="scope"
                required
                defaultValue=""
                className={selectClass}
              >
                <option value="" disabled>
                  Choisir...
                </option>
                <option value="application">Candidature</option>
                <option value="visa">Visa</option>
                <option value="both">Candidature et visa</option>
              </select>
              <FieldError message={fieldErrors.scope} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="mainTrack">Procédure</Label>
              <select
                id="mainTrack"
                name="mainTrack"
                defaultValue=""
                className={selectClass}
              >
                <option value="">Aucune</option>
                <option value="dap">DAP</option>
                <option value="non_dap">Hors-DAP</option>
              </select>
              <FieldError message={fieldErrors.mainTrack} />
            </div>
            <div className="flex items-end gap-2 pb-2">
              <input
                id="schools"
                name="schools"
                type="checkbox"
                className="size-4"
              />
              <Label htmlFor="schools">Écoles</Label>
            </div>
            <p className="text-sm text-muted-foreground sm:col-span-2">
              Choisissez au moins une procédure (DAP ou hors-DAP) ou cochez «
              Écoles ».
            </p>
            {isOwner ? (
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="assignedTo">Responsable du dossier</Label>
                <select
                  id="assignedTo"
                  name="assignedTo"
                  defaultValue={currentUserId}
                  className={selectClass}
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.first_name} {m.last_name}
                      {m.id === currentUserId ? " (moi)" : ""}
                    </option>
                  ))}
                </select>
                <FieldError message={fieldErrors.assignedTo} />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground sm:col-span-2">
                Ce dossier vous sera affecté automatiquement.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pièces à prévoir</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-2">
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Diplômes obtenus</legend>
              {DIPLOMAS.map(([value, label]) => (
                <div key={value} className="flex items-center gap-2">
                  <input
                    id={`diploma-${value}`}
                    name="diplomas"
                    type="checkbox"
                    value={value}
                    className="size-4"
                  />
                  <Label htmlFor={`diploma-${value}`}>{label}</Label>
                </div>
              ))}
              <p className="text-sm text-muted-foreground">
                Ne rien cocher si le candidat n&apos;a aucun diplôme.
              </p>
              <FieldError message={fieldErrors.diplomas} />
            </fieldset>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Tests de langue</legend>
              {LANGUAGE_TESTS.map(([value, label]) => (
                <div key={value} className="flex items-center gap-2">
                  <input
                    id={`test-${value}`}
                    name="languageTests"
                    type="checkbox"
                    value={value}
                    className="size-4"
                  />
                  <Label htmlFor={`test-${value}`}>{label}</Label>
                </div>
              ))}
              <FieldError message={fieldErrors.languageTests} />
            </fieldset>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Compte Pastel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="pastelAccount">Compte</Label>
              <select
                id="pastelAccount"
                value={pastelAccount}
                onChange={(e) =>
                  setPastelAccount(e.target.value as "to_create" | "existing")
                }
                className={selectClass}
              >
                <option value="to_create">À créer</option>
                <option value="existing">Existant</option>
              </select>
            </div>

            {pastelAccount === "existing" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="pastelEmail">E-mail du compte Pastel</Label>
                  <Input
                    id="pastelEmail"
                    name="pastelEmail"
                    type="email"
                    autoComplete="off"
                    required
                  />
                  <FieldError message={fieldErrors.pastelEmail} />
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
                    required
                  />
                  <FieldError message={fieldErrors.pastelPassword} />
                </div>
                <p className="text-sm text-muted-foreground sm:col-span-2">
                  Le mot de passe est chiffré avant d&apos;être enregistré et
                  n&apos;apparaît jamais dans les listes.
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Le compte sera créé plus tard. L&apos;e-mail et le mot de passe
                seront à renseigner depuis la fiche du dossier.
              </p>
            )}
          </CardContent>
        </Card>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Création..." : "Créer le dossier"}
        </Button>
      </form>
    </div>
  );
}
