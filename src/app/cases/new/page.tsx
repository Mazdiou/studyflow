import Link from "next/link";
import { NewCaseForm } from "./new-case-form";

export default function NewCasePage() {
  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Nouveau dossier</h1>
        <Link href="/dashboard" className="text-sm underline">
          Retour au tableau de bord
        </Link>
      </div>
      <NewCaseForm />
    </main>
  );
}
