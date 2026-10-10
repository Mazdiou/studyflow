// Libellés français partagés par l'arbre et la fiche dossier.

export const LEVEL_ORDER = ["terminale", "l1", "l2", "l3", "m1", "m2"] as const;

export const LEVEL_LABELS: Record<string, string> = {
  terminale: "Terminale",
  l1: "L1",
  l2: "L2",
  l3: "L3",
  m1: "M1",
  m2: "M2",
};

export const STATUS_LABELS: Record<string, string> = {
  active: "Actif",
  closed: "Clos",
  abandoned: "Abandonné",
};

export const SCOPE_LABELS: Record<string, string> = {
  application: "Candidature",
  visa: "Visa",
  both: "Candidature et visa",
};

export const TRACK_LABELS: Record<string, string> = {
  dap: "DAP",
  non_dap: "Hors-DAP",
};

export const LANGUAGE_TEST_LABELS: Record<string, string> = {
  fr: "Test de français",
  en: "Test d'anglais",
};

export const DIPLOMA_LABELS: Record<string, string> = {
  bac: "Baccalauréat",
  licence: "Licence",
  master: "Master",
};

export function displayName(firstName: string, lastName: string) {
  return `${lastName.toLocaleUpperCase("fr")} ${firstName}`;
}

export function procedureLabel(track: string | null, schools: boolean) {
  const t = track ? (TRACK_LABELS[track] ?? track) : null;
  if (t && schools) return `${t} et écoles`;
  return t ?? (schools ? "Écoles" : "—");
}
