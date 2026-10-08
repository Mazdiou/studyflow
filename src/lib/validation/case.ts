import { z } from "zod";

const emptyToUndefined = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : v;

function isRealDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

const optionalEmail = z.preprocess(
  emptyToUndefined,
  z.string().trim().toLowerCase().email().max(254).optional(),
);

export const createCaseSchema = z
  .object({
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().min(1).max(100),
    birthDate: z
      .string()
      .refine(isRealDate, "Date invalide")
      .refine(
        (v) => v > "1900-01-01" && v <= new Date().toISOString().slice(0, 10),
        "Date de naissance hors limites",
      ),
    phone: z.string().trim().min(6).max(30),
    email: optionalEmail,
    educationLevel: z.enum(["terminale", "l1", "l2", "l3", "m1", "m2"]),
    mainTrack: z.preprocess(
      emptyToUndefined,
      z.enum(["dap", "non_dap"]).optional(),
    ),
    schools: z.boolean(),
    scope: z.enum(["application", "visa", "both"]),
    pastelAccount: z.enum(["to_create", "existing"]),
    pastelEmail: optionalEmail,
    pastelPassword: z.preprocess(
      emptyToUndefined,
      z.string().min(1).max(200).optional(),
    ),
    languageTests: z.array(z.enum(["fr", "en"])).max(2),
    diplomas: z.array(z.enum(["bac", "licence", "master"])).max(3),
  })
  .superRefine((d, ctx) => {
    if (!d.mainTrack && !d.schools) {
      ctx.addIssue({
        code: "custom",
        path: ["mainTrack"],
        message: "Choisissez DAP, hors-DAP ou écoles",
      });
    }
    if (d.pastelAccount === "existing") {
      if (!d.pastelEmail) {
        ctx.addIssue({
          code: "custom",
          path: ["pastelEmail"],
          message: "E-mail Pastel requis",
        });
      }
      if (!d.pastelPassword) {
        ctx.addIssue({
          code: "custom",
          path: ["pastelPassword"],
          message: "Mot de passe Pastel requis",
        });
      }
    }
  });
