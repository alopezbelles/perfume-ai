import type { Gender, ProductNotes } from "./types.ts";

export type { Gender, ProductNotes } from "./types.ts";

export function splitNotes(value: string): string[] {
  return value
    .split(",")
    .map((note) => note.trim())
    .filter(Boolean);
}

export function extractNotes(text: string): ProductNotes {
  const lines = text
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const notes: ProductNotes = { top: [], heart: [], base: [] };

  for (const line of lines) {
    let match = line.match(/^Notas de salida:\s*(.+)$/i);
    if (match) {
      notes.top = splitNotes(match[1]);
      continue;
    }

    match = line.match(/^Notas de corazón:\s*(.+)$/i);
    if (match) {
      notes.heart = splitNotes(match[1]);
      continue;
    }

    match = line.match(/^Notas de fondo:\s*(.+)$/i);
    if (match) notes.base = splitNotes(match[1]);
  }

  return notes;
}

export function detectGender(description: string): Gender {
  const text = description
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (/\b(?:unisex|unisexo|genderless|para ambos sexos)\b/.test(text)) return "unisex";

  const mentionsMale = /\b(?:masculin[oa]s?|masculine|hombres?|men|male|homme|for him)\b/.test(text);
  const mentionsFemale = /\b(?:femenin[oa]s?|feminine|mujer(?:es)?|wom[ae]n|female|femme|for her)\b/.test(text);

  if (mentionsMale && mentionsFemale) return "unisex";
  if (mentionsMale) return "male";
  if (mentionsFemale) return "female";
  return "unisex";
}

export function getBottleReference(gender: Gender): string {
  if (gender === "female") return "references/bottles/female/bottle-gold-cap.png";
  return "references/bottles/male/bottle-black-cap.png";
}
