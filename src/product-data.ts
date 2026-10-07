export type Gender = "male" | "female" | "unknown";

export type ProductNotes = {
  top: string[];
  heart: string[];
  base: string[];
};

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
  const text = description.toLowerCase();

  if (text.includes("masculino") || text.includes("hombre")) return "male";
  if (text.includes("femenino") || text.includes("mujer")) return "female";
  return "unknown";
}

export function getBottleReference(gender: Gender): string | null {
  if (gender === "male") return "references/bottles/male/bottle-black-cap.png";
  if (gender === "female") return "references/bottles/female/bottle-gold-cap.png";
  return null;
}
