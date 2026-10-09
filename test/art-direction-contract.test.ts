import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildSurrealPrompt } from "../src/prompt-builders.ts";
import { getImageGenerationPrompt } from "../src/image-prompt.ts";
import { validateArtDirectionData, validateCampaignRules, validateGeneratedArtDirectionData } from "../src/validation.ts";

const campaignRules = validateCampaignRules(JSON.parse(readFileSync("config/campaign-rules.json", "utf8")));
const historicalPath = "data/perfumes/rogue-princess-bac/runs/20261008T121045Z-09841075/art-direction.json";

function historicalDirection() {
  return validateArtDirectionData(JSON.parse(readFileSync(historicalPath, "utf8")));
}

function completeDirection() {
  const direction = historicalDirection();
  for (const note of direction.olfactive_translation.selected_visual_notes) {
    note.quantity = "several";
    note.physical_presence = `compact ${note.note} mass`;
    note.composition_role = `connect ${note.note} to the neighbouring ingredient cluster`;
  }
  Object.assign(direction.immersive_surreal.composition, {
    enveloping_structure: "cedar and fir connect the foreground and background behind the bottle",
    primary_clusters: ["dense fir cluster close to the left side", "smaller cedar cluster near the lower right"],
    foreground_plan: "cropped and softly defocused cedar shavings",
    midground_plan: "saffron and jasmine overlap near both bottle sides",
    background_plan: "fir and cedar recede behind the cap",
    overlap_plan: "fir overlaps cedar behind the bottle; the label remains unobscured",
    negative_space_plan: "small uneven gaps between masses, no empty halo",
  });
  return direction;
}

test("historical directions stay readable without invented quantities or spatial decisions", () => {
  const direction = historicalDirection();
  assert.equal(direction.immersive_surreal.composition.enveloping_structure, undefined);
  assert.equal(direction.olfactive_translation.selected_visual_notes[0].quantity, undefined);
  const prompt = getImageGenerationPrompt(buildSurrealPrompt(direction, campaignRules), "surreal", campaignRules);
  assert.ok(prompt.includes(direction.immersive_surreal.composition.depth));
  assert.ok(prompt.includes(direction.olfactive_translation.selected_visual_notes[0].surreal_use));
  assert.ok(!prompt.includes("undefined"));
  assert.ok(!prompt.includes("Quantity:"));
  assert.throws(() => validateGeneratedArtDirectionData(direction), /quantity|enveloping_structure/);
});

test("new generations require all spatial-plan and note-presence fields", () => {
  const direction = completeDirection();
  assert.equal(validateGeneratedArtDirectionData(direction), direction);
  for (const field of ["enveloping_structure", "primary_clusters", "foreground_plan", "midground_plan", "background_plan", "overlap_plan", "negative_space_plan"] as const) {
    const incomplete = structuredClone(direction);
    delete incomplete.immersive_surreal.composition[field];
    assert.throws(() => validateGeneratedArtDirectionData(incomplete), new RegExp(field));
  }
  for (const field of ["quantity", "physical_presence", "composition_role"] as const) {
    const incomplete = structuredClone(direction);
    delete incomplete.olfactive_translation.selected_visual_notes[0][field];
    assert.throws(() => validateGeneratedArtDirectionData(incomplete), new RegExp(field));
  }
});

test("spatial plans reject empty clusters and malformed new fields even on historical reads", () => {
  for (const clusters of [[], ["one cluster"], ["left", ""], ["one", "two", "three", "four"]]) {
    const direction = completeDirection();
    direction.immersive_surreal.composition.primary_clusters = clusters;
    assert.throws(() => validateGeneratedArtDirectionData(direction), /primary_clusters/);
    assert.throws(() => validateArtDirectionData(direction), /primary_clusters/);
  }
  const direction = completeDirection();
  direction.olfactive_translation.selected_visual_notes[0].quantity = "";
  assert.throws(() => validateGeneratedArtDirectionData(direction), /quantity/);
  assert.throws(() => validateArtDirectionData(direction), /quantity/);
});

test("generation schema accepts exactly the movement types allowed by campaign rules", () => {
  for (const type of campaignRules.immersive_surreal.allowed_movement_types) {
    const direction = completeDirection();
    direction.immersive_surreal.movement.types = [type];
    assert.doesNotThrow(() => validateGeneratedArtDirectionData(direction));
  }
  const direction = completeDirection();
  direction.immersive_surreal.movement.types = ["splashing"];
  assert.throws(() => validateGeneratedArtDirectionData(direction), /movement\/types/);
});
