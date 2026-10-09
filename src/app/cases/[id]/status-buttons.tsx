"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type Status = "active" | "closed" | "abandoned";

const ACTIONS: Record<
  Status,
  { to: Status; label: string; confirm: string | null }[]
> = {
  active: [
    { to: "closed", label: "Clore", confirm: "Clore ce dossier ?" },
    {
      to: "abandoned",
      label: "Abandonner",
      confirm: "Marquer ce dossier comme abandonné ?",
    },
  ],
  closed: [{ to: "active", label: "Rouvrir", confirm: null }],
  abandoned: [{ to: "active", label: "Rouvrir", confirm: null }],
};

export function StatusButtons({ id, status }: { id: string; status: Status }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function change(to: Status, confirmMessage: string | null) {
    if (confirmMessage && !confirm(confirmMessage)) return;
    setLoading(true);
    const res = await fetch(`/api/cases/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: to }),
    });
    setLoading(false);
    if (!res.ok) {
      alert(
        (await res.json().catch(() => null))?.error ?? `Erreur ${res.status}`,
      );
    }
    // Recharge l'arbre (compteurs, dossiers masqués) et la fiche
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      {ACTIONS[status].map((a) => (
        <Button
          key={a.to}
          variant="outline"
          size="sm"
          disabled={loading}
          onClick={() => change(a.to, a.confirm)}
        >
          {a.label}
        </Button>
      ))}
    </div>
  );
}
