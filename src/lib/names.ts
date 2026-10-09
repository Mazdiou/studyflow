// Pour comparer des noms sans tenir compte de la casse, des accents
// ni des espaces multiples : « Éloïse  DUPONT » = « eloise dupont ».
export function normalizeName(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
