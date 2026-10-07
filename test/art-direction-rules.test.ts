import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { applyCampaignRules, validateArtDirection } from "../src/art-direction-rules.ts";

const campaignRules = JSON.parse(readFileSync(path.resolve("config/campaign-rules.json"), "utf8"));
type JsonRecord = Record<string, any>;

function validArtDirection(): JsonRecord {
  return {
    campaign: {},
    format: {},
    fragrance_data: { gender: "male" },
    physical_scale_system: {},
    editorial_still_life: {
      product_position: { floating: false },
      typography: { enabled: true },
    },
    immersive_surreal: {
      product_position: { floating: true, suspended: true },
      typography: { enabled: false },
      movement: { types: [] as string[] },
    },
    camera: {},
  };
}

test("applyCampaignRules copies fixed campaign values into art direction", () => {
  const artDirection = validArtDirection();

  applyCampaignRules(artDirection, campaignRules);

  assert.equal(artDirection.campaign.image_count, campaignRules.campaign.image_count);
  assert.equal(artDirection.format.orientation, campaignRules.format.orientation);
  assert.equal(artDirection.format.aspect_ratio, campaignRules.format.aspect_ratio);
  assert.equal(artDirection.physical_scale_system.bottle_height_cm, campaignRules.physical_scale.bottle_height_cm);
  assert.equal(artDirection.camera.lens, campaignRules.camera.lens);
});

test("validateArtDirection accepts a direction matching fixed rules", () => {
  const artDirection = validArtDirection();
  applyCampaignRules(artDirection, campaignRules);

  assert.equal(validateArtDirection(artDirection, campaignRules), true);
});

test("validateArtDirection rejects a non-horizontal format", () => {
  const artDirection = validArtDirection();
  applyCampaignRules(artDirection, campaignRules);
  artDirection.format.orientation = "vertical";

  assert.throws(() => validateArtDirection(artDirection, campaignRules), /orientación/);
});

test("validateArtDirection rejects floating editorial bottles", () => {
  const artDirection = validArtDirection();
  applyCampaignRules(artDirection, campaignRules);
  artDirection.editorial_still_life.product_position.floating = true;

  assert.throws(() => validateArtDirection(artDirection, campaignRules), /editorial no puede/);
});

test("validateArtDirection rejects unsupported surreal movement", () => {
  const artDirection = validArtDirection();
  applyCampaignRules(artDirection, campaignRules);
  artDirection.immersive_surreal.movement.types = ["teleporting"];

  assert.throws(() => validateArtDirection(artDirection, campaignRules), /movimiento no permitido/);
});
