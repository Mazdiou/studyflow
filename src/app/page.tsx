import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { error } = await supabase.auth.getSession();

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">StudyFlow</h1>
      <p className="mt-4">
        Connexion Supabase : {error ? `erreur (${error.message})` : "OK"}
      </p>
    </main>
  );
}
