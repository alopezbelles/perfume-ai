import assert from "node:assert/strict";
import test from "node:test";
import { buildEditorialPrompt, buildSurrealPrompt } from "../generate-prompts.ts";

const artDirection = {
  fragrance_data: { name: "Perfume de prueba", gender: "female" },
  hero_product: { bottle_reference: "references/bottles/female/bottle-gold-cap.png" },
  shared_visual_identity: { concept: "Botanical light", mood: ["calm", "fresh"] },
  editorial_still_life: {
    concept: "A layered botanical still life",
    environment: { description: "A natural stone surface" },
    visual_elements: ["rose petals", "citrus peel"],
    palette: ["soft green", "warm ivory"],
    materials: ["stone", "glass"],
    lighting: { direction: "soft side light", contrast: "gentle" },
    typography: { elements: ["Perfume de prueba"] },
  },
  immersive_surreal: {
    concept: "A suspended botanical scene",
    environment: { description: "A misty garden" },
    visual_elements: ["floating petals", "fine mist"],
    palette: ["deep green", "silver"],
    materials: ["water", "smoke"],
    lighting: { direction: "cinematic backlight", contrast: "dramatic" },
  },
};

test("editorial prompt includes perfume identity and campaign constraints", () => {
  const prompt = buildEditorialPrompt(artDirection);

  assert.ok(prompt.includes(artDirection.fragrance_data.name));
  assert.ok(prompt.includes("FIXED CAMPAIGN RULES"));
  assert.ok(prompt.includes("TYPOGRAPHY"));
});

test("surreal prompt includes perfume identity and campaign constraints", () => {
  const prompt = buildSurrealPrompt(artDirection);

  assert.ok(prompt.includes(artDirection.fragrance_data.name));
  assert.ok(prompt.includes("FIXED CAMPAIGN RULES"));
});
