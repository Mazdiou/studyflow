"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Eye,
  FileText,
  Loader2,
  Lock,
  LockOpen,
  Pencil,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { DOCUMENTS_BUCKET, MAX_DOCUMENT_BYTES } from "@/lib/documents";
import { cn } from "@/lib/utils";

export type DocItem = {
  id: string;
  name: string;
  sizeLabel: string;
  uploadedBy: string;
  dateLabel: string;
  locked: boolean;
};

type Message = { text: string; error: boolean };

async function call(url: string, init?: RequestInit) {
  const res = await fetch(url, { cache: "no-store", ...init });
  const data = await res.json().catch(() => null);
  return {
    ok: res.ok,
    data,
    error: res.ok ? null : ((data?.error as string) ?? `Erreur ${res.status}`),
  };
}

const JSON_HEADERS = { "Content-Type": "application/json" };

export function DocumentsPanel({
  caseId,
  docs,
  isOwner,
}: {
  caseId: string;
  docs: DocItem[];
  isOwner: boolean;
}) {
  const router = useRouter();
  const base = `/api/cases/${caseId}/documents`;
  const inputRef = useRef<HTMLInputElement>(null);

  const [message, setMessage] = useState<Message | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [working, setWorking] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const say = (text: string, error = false) => setMessage({ text, error });

  async function uploadFiles(files: File[]) {
    if (files.length === 0) return;
    setMessage(null);
    let added = 0;
    let lastError: string | null = null;

    for (const file of files) {
      if (!/\.pdf$/i.test(file.name)) {
        lastError = `${file.name} : seuls les fichiers PDF sont acceptés`;
        continue;
      }
      if (file.size < 1 || file.size > MAX_DOCUMENT_BYTES) {
        lastError = `${file.name} : le fichier doit faire 10 Mo au maximum`;
        continue;
      }
      setUploading(file.name);
      const name =
        file.name.replace(/\.pdf$/i, "").trim().slice(0, 120) || "Document";

      // 1. Le serveur contrôle la demande et renvoie une URL signée
      const step1 = await call(`${base}/upload-url`, {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({
          name,
          originalFileName: file.name,
          sizeBytes: file.size,
        }),
      });
      if (!step1.ok) {
        lastError = `${file.name} : ${step1.error}`;
        continue;
      }

      // 2. Le navigateur envoie le PDF directement au stockage
      const { error: uploadError } = await createClient()
        .storage.from(DOCUMENTS_BUCKET)
        .uploadToSignedUrl(step1.data.path, step1.data.token, file, {
          contentType: "application/pdf",
        });
      if (uploadError) {
        lastError = `${file.name} : l'envoi a échoué, réessayez`;
        continue;
      }

      // 3. Le serveur vérifie le fichier reçu et crée le document
      const step3 = await call(base, {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({
          documentId: step1.data.documentId,
          name,
          originalFileName: file.name,
        }),
      });
      if (!step3.ok) {
        lastError = `${file.name} : ${step3.error}`;
        continue;
      }
      added += 1;
    }

    setUploading(null);
    if (lastError) say(lastError, true);
    else say(added > 1 ? `${added} documents ajoutés` : "Document ajouté");
    if (added > 0) router.refresh();
    if (inputRef.current) inputRef.current.value = "";
  }

  async function open(id: string) {
    setMessage(null);
    // Fenêtre ouverte tout de suite (clic de l'utilisateur) pour éviter le
    // blocage des fenêtres, puis dirigée vers le lien signé d'une minute.
    const win = window.open("about:blank", "_blank");
    const res = await call(`${base}/${id}/open`, { method: "POST" });
    if (!res.ok || typeof res.data?.url !== "string") {
      win?.close();
      say(res.error ?? "Impossible d'ouvrir le document", true);
      return;
    }
    if (!win) {
      say("Le navigateur a bloqué l'ouverture. Autorisez les fenêtres pour ce site.", true);
      return;
    }
    win.opener = null;
    win.location.href = res.data.url;
  }

  function startRename(d: DocItem) {
    if (d.locked) {
      say("Ce document est verrouillé par le patron : il ne peut plus être renommé.", true);
      return;
    }
    setMessage(null);
    setConfirmId(null);
    setEditingId(d.id);
  }

  async function rename(d: DocItem, value: string) {
    const name = value.trim();
    if (!name) {
      say("Saisissez un nom pour le document.", true);
      return;
    }
    if (name === d.name) {
      setEditingId(null);
      return;
    }
    setSaving(true);
    const res = await call(`${base}/${d.id}`, {
      method: "PATCH",
      headers: JSON_HEADERS,
      body: JSON.stringify({ name }),
    });
    setSaving(false);
    if (!res.ok) {
      say(res.error ?? "Erreur", true);
      return;
    }
    setEditingId(null);
    say("Document renommé");
    router.refresh();
  }

  function askDelete(d: DocItem) {
    if (d.locked) {
      say("Ce document est verrouillé par le patron : il ne peut plus être supprimé.", true);
      return;
    }
    setMessage(null);
    setEditingId(null);
    setConfirmId(d.id);
  }

  async function remove(id: string) {
    setWorking(id);
    const res = await call(`${base}/${id}`, { method: "DELETE" });
    setWorking(null);
    setConfirmId(null);
    if (!res.ok) say(res.error ?? "Erreur", true);
    else say("Document supprimé");
    router.refresh();
  }

  async function toggleLock(d: DocItem) {
    setMessage(null);
    setWorking(d.id);
    const res = await call(`${base}/${d.id}/lock`, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ locked: !d.locked }),
    });
    setWorking(null);
    if (!res.ok) say(res.error ?? "Erreur", true);
    else say(d.locked ? "Document déverrouillé" : "Document verrouillé");
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          void uploadFiles(Array.from(e.dataTransfer.files));
        }}
        className={cn(
          "flex flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-6 text-center text-sm text-muted-foreground transition-colors",
          dragOver && "border-primary bg-accent",
        )}
      >
        {uploading ? (
          <p className="flex items-center gap-2" role="status">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Envoi de {uploading}
          </p>
        ) : (
          <>
            <Upload className="size-5" aria-hidden />
            <p>Glissez des PDF ici</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
            >
              Choisir des fichiers
            </Button>
            <p className="text-xs">PDF uniquement, 10 Mo maximum</p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          className="hidden"
          onChange={(e) => void uploadFiles(Array.from(e.target.files ?? []))}
        />
      </div>

      <p
        role="status"
        aria-live="polite"
        className={cn(
          "min-h-5 px-1 text-sm",
          message?.error ? "text-red-600" : "text-muted-foreground",
        )}
      >
        {message?.text}
      </p>

      {docs.length === 0 ? (
        <div className="rounded-xl border px-6 py-10 text-center">
          <FileText className="mx-auto size-8 text-muted-foreground" aria-hidden />
          <p className="mt-3 text-sm font-medium">
            Aucun document pour ce dossier
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Ajoutez un PDF pour commencer.
          </p>
        </div>
      ) : (
        <ul className="divide-y rounded-xl border">
          {docs.map((d) => (
            <li key={d.id} className="flex items-center gap-3 px-3 py-2.5 text-sm">
              <FileText className="size-5 shrink-0 text-muted-foreground" aria-hidden />

              {editingId === d.id ? (
                <input
                  autoFocus
                  defaultValue={d.name}
                  maxLength={120}
                  aria-label="Nom du document"
                  disabled={saving}
                  onFocus={(e) => e.currentTarget.select()}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setEditingId(null);
                    if (e.key === "Enter") void rename(d, e.currentTarget.value);
                  }}
                  onBlur={() => {
                    if (!saving) setEditingId(null);
                  }}
                  className="h-8 min-w-0 flex-1 rounded-lg border bg-background px-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              ) : (
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2">
                    <span className="truncate font-medium">{d.name}</span>
                    {d.locked && (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs text-amber-700 dark:text-amber-400">
                        <Lock className="size-3" aria-hidden /> Verrouillé
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {d.sizeLabel} · ajouté par {d.uploadedBy}, le {d.dateLabel}
                  </p>
                </div>
              )}

              <div className="flex shrink-0 items-center gap-1">
                {confirmId === d.id ? (
                  <>
                    <span className="mr-1 text-xs">Supprimer ce document ?</span>
                    <Button
                      variant="destructive"
                      size="xs"
                      disabled={working === d.id}
                      onClick={() => void remove(d.id)}
                    >
                      Supprimer
                    </Button>
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => setConfirmId(null)}
                    >
                      Annuler
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => void open(d.id)}
                      aria-label={`Ouvrir ${d.name}`}
                      title="Ouvrir dans un nouvel onglet"
                    >
                      <Eye />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => startRename(d)}
                      aria-label={`Renommer ${d.name}`}
                      title="Renommer"
                    >
                      <Pencil />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => askDelete(d)}
                      aria-label={`Supprimer ${d.name}`}
                      title="Supprimer"
                    >
                      <Trash2 />
                    </Button>
                    {isOwner && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={working === d.id}
                        onClick={() => void toggleLock(d)}
                        aria-label={
                          d.locked
                            ? `Déverrouiller ${d.name}`
                            : `Verrouiller ${d.name}`
                        }
                        title={d.locked ? "Déverrouiller" : "Verrouiller"}
                      >
                        {d.locked ? <LockOpen /> : <Lock />}
                      </Button>
                    )}
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
