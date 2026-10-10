import { notFound } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { getCase } from "../get-case";
import { ComingSoon } from "../coming-soon";

export default async function FormationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!(await getCase(id))) notFound();
  return (
    <ComingSoon icon={GraduationCap} title="Les formations arrivent bientôt" />
  );
}
