import type { LucideIcon } from "lucide-react";

export function ComingSoon({
  icon: Icon,
  title,
}: {
  icon: LucideIcon;
  title: string;
}) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed px-6 py-16 text-center">
      <Icon className="size-8 text-muted-foreground" aria-hidden />
      <p className="mt-3 text-sm font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Cet onglet sera disponible dans une prochaine version.
      </p>
    </div>
  );
}
