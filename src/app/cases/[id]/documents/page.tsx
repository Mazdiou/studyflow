import { notFound } from "next/navigation";
import { FileText } from "lucide-react";
import { getCase } from "../get-case";
import { ComingSoon } from "../coming-soon";

export default async function DocumentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!(await getCase(id))) notFound();
  return (
    <ComingSoon icon={FileText} title="Les documents arrivent bientôt" />
  );
}
