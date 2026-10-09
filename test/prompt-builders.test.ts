import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { buildEditorialPrompt, buildSurrealPrompt } from "../src/prompt-builders.ts";
import { getImageGenerationPrompt } from "../src/image-prompt.ts";
import type { CampaignRules, PromptSourceArtDirection } from "../src/types.ts";

const campaignRules = JSON.parse(readFileSync("config/campaign-rules.json", "utf8")) as CampaignRules;

const artDirection: PromptSourceArtDirection = {
  fragrance_data: { name: "Perfume de prueba" },
  hero_product: { bottle_reference: "references/bottles/female/bottle-gold-cap.png" },
  olfactive_translation: {
    selected_visual_notes: [{
      note: "Rose",
      olfactive_role: "floral heart",
      visual_representation: "natural rose branches and petals",
      quantity: "abundant",
      physical_presence: "dominant secondary masses",
      composition_role: "connect the two clusters behind the bottle",
      reason: "communicates the fragrance's floral identity",
      editorial_use: "EDITORIAL_ONLY_ROSE_TREATMENT",
      surreal_use: "rose branches curve naturally behind the bottle and into the foreground",
    }, {
      note: "Citrus",
      olfactive_role: "fresh top",
      visual_representation: "cut citrus and peel",
      quantity: "moderate",
      physical_presence: "supporting warm accents",
      composition_role: "smaller lower-right grouping",
      reason: "provides the fragrance's fresh accent",
      editorial_use: "EDITORIAL_ONLY_CITRUS_TREATMENT",
      surreal_use: "overlapping citrus pieces nestled beside the rose masses",
    }],
  },
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
    movement: { enabled: true, types: ["suspended", "swirling"], intensity: "controlled" },
    composition: {
      style: "compact asymmetrical botanical enclosure",
      element_density: "dense rose clusters with small gaps",
      depth: "three connected photographic layers",
      bottle_priority: "fully visible with bright edge lighting",
      negative_space: "small irregular pockets between masses",
      enveloping_structure: "curved rose branches link the depths behind the bottle",
      primary_clusters: ["large rose mass close to the left side", "smaller citrus mass close to the lower right"],
      foreground_plan: "cropped defocused overlapping flowers near the camera",
      midground_plan: "sharp ingredient clusters beside the suspended bottle",
      background_plan: "botanical masses recede behind the bottle toward the edges",
      overlap_plan: "citrus overlaps flowers while branches pass behind the cap",
      negative_space_plan: "a small breathing gap above the right cluster, no empty halo",
    },
    palette: ["deep green", "silver"],
    materials: ["water", "smoke"],
    lighting: { direction: "cinematic backlight", contrast: "dramatic" },
  },
};

test("editorial prompt includes perfume identity and campaign constraints", () => {
  const prompt = buildEditorialPrompt(artDirection, campaignRules);

  assert.ok(prompt.includes(artDirection.fragrance_data.name));
  assert.ok(prompt.includes("FIXED CAMPAIGN RULES"));
  assert.ok(prompt.includes("TYPOGRAPHY"));
});

test("surreal prompt includes perfume identity and campaign constraints", () => {
  const prompt = buildSurrealPrompt(artDirection, campaignRules);

  assert.ok(prompt.includes(artDirection.fragrance_data.name));
  assert.ok(prompt.includes("FIXED CAMPAIGN RULES"));
});

test("complete composition, movement and selected-note treatment reach the image generator", () => {
  const prompt = getImageGenerationPrompt(buildSurrealPrompt(artDirection, campaignRules), "surreal", campaignRules);
  for (const value of Object.values(artDirection.immersive_surreal.composition)) {
    for (const instruction of Array.isArray(value) ? value : [value]) {
      assert.ok(prompt.includes(instruction), `Lost composition instruction: ${instruction}`);
    }
  }
  const movement = artDirection.immersive_surreal.movement;
  assert.ok(prompt.includes(`Enabled: ${movement.enabled}`));
  assert.ok(prompt.includes(`Types: ${movement.types.join(", ")}`));
  assert.ok(prompt.includes(`Intensity: ${movement.intensity}`));
  for (const note of artDirection.olfactive_translation.selected_visual_notes) {
    const { editorial_use, ...surrealFields } = note;
    for (const instruction of Object.values(surrealFields)) {
      assert.ok(prompt.includes(instruction), `Lost selected-note instruction: ${instruction}`);
    }
    assert.ok(!prompt.includes(editorial_use));
  }
  assert.ok(prompt.includes("contrast, lighting and focus"));
  assert.ok(prompt.includes("Never create a wide empty halo"));
  assert.ok(prompt.includes("The TOP/CAP of the bottle must lean slightly to the LEFT"));
  assert.ok(prompt.includes("The BASE/BOTTOM of the bottle must lean slightly to the RIGHT"));
  assert.ok(prompt.includes("5–12 degree tilt"));
  assert.ok(prompt.includes("Do NOT cover the bottle"));
  assert.ok(prompt.includes("Do not use typography or text"));
  assert.ok(prompt.includes("19 cm high x 3.5 cm wide x 3.5 cm deep"));
  assert.ok(prompt.includes("Do not create abundance by artificially enlarging ingredients"));
  assert.ok(!prompt.includes("clearly separated from other elements"));
});

test("surreal reference instructions do not affect the editorial image prompt", () => {
  const editorial = getImageGenerationPrompt(buildEditorialPrompt(artDirection, campaignRules), "lifestyle", campaignRules);
  assert.ok(!editorial.includes("COMPOSITION AND SPATIAL PLAN"));
  assert.ok(!editorial.includes("organic enveloping structure"));
  assert.ok(!editorial.includes("Never create a wide empty halo"));
  assert.ok(editorial.includes("Keep generous negative space for Spanish typography"));
});
