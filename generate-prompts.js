const fs = require("fs");
const path = require("path");

const ART_DIRECTION_PATH = path.join(
  __dirname,
  "data",
  "art-direction.json"
);

const OUTPUT_PATH = path.join(
  __dirname,
  "data",
  "prompts.json"
);

const CAMPAIGN_RULES_PATH = path.join(
  __dirname,
  "config",
  "campaign-rules.json"
);

const campaignRules = JSON.parse(
  fs.readFileSync(CAMPAIGN_RULES_PATH, "utf8")
);

function buildFixedRulesPrompt(imageType) {
  const rules = campaignRules[imageType].rules;

  return `
FIXED CAMPAIGN RULES:
${rules.map((rule) => `- ${rule}`).join("\n")}

CAMPAIGN CONTINUITY:
Both images must share: ${campaignRules.campaign.visual_relationship.join(", ")}.

PHYSICAL SCALE:
${campaignRules.physical_scale.rule}
Bottle dimensions: ${campaignRules.physical_scale.bottle_height_cm} cm high x ${campaignRules.physical_scale.bottle_width_cm} cm wide x ${campaignRules.physical_scale.bottle_depth_cm} cm deep.
${campaignRules.physical_scale.proportions}
${campaignRules.physical_scale.abundance_must_not_use}

CAMERA:
${campaignRules.camera.lens} lens, ${campaignRules.camera.depth_of_field} depth of field, focus on ${campaignRules.camera.focus}, ${campaignRules.format.orientation} composition, ${campaignRules.format.aspect_ratio} aspect ratio.

PHOTOREALISM:
${campaignRules.photorealism.level} photorealism. ${campaignRules.photorealism.requirements.join(", ")}.

DO NOT INCLUDE:
${campaignRules.negative_constraints.join(", ")}.
`.trim();
}

function buildProductRulesPrompt() {
  const product = campaignRules.hero_product;

  return `
PRODUCT RULES:
The perfume bottle is the ${product.role} and must remain ${product.visibility}.
Preserve: ${product.preserve.join(", ")}.
Must not be covered: ${product.must_not_be_covered}.
Must not be distorted: ${product.must_not_be_distorted}.
Must not be duplicated: ${product.must_not_be_duplicated}.
`.trim();
}

function buildEditorialPrompt(artDirection) {
  const { fragrance_data, hero_product, shared_visual_identity, editorial_still_life } = artDirection;

  return `
Create a premium editorial perfume campaign photograph for "${fragrance_data.name}".

MAIN PRODUCT:
Use the exact perfume bottle from the reference image:
${hero_product.bottle_reference}

${buildProductRulesPrompt()}

SCENE:
${editorial_still_life.concept}

ENVIRONMENT:
${editorial_still_life.environment.description}

VISUAL ELEMENTS:
${editorial_still_life.visual_elements.join(", ")}

VISUAL IDENTITY:
${shared_visual_identity.concept}

MOOD:
${shared_visual_identity.mood.join(", ")}

PALETTE:
${editorial_still_life.palette.join(", ")}

MATERIALS:
${editorial_still_life.materials.join(", ")}

LIGHTING:
${editorial_still_life.lighting.direction}.
Contrast: ${editorial_still_life.lighting.contrast}.

TYPOGRAPHY:
Use the following campaign-specific information in the negative space:
"${editorial_still_life.typography.elements.join(" | ")}"

${buildFixedRulesPrompt("editorial_still_life")}
`.trim();
}

function buildSurrealPrompt(artDirection) {
  const { fragrance_data, hero_product, shared_visual_identity, immersive_surreal } = artDirection;

  return `
Create a premium cinematic surreal perfume campaign photograph for "${fragrance_data.name}".

MAIN PRODUCT:
Use the exact perfume bottle from the reference image:
${hero_product.bottle_reference}

${buildProductRulesPrompt()}

SCENE:
${immersive_surreal.concept}

ENVIRONMENT:
${immersive_surreal.environment.description}

VISUAL ELEMENTS:
${immersive_surreal.visual_elements.join(", ")}

VISUAL IDENTITY:
${shared_visual_identity.concept}

MOOD:
${shared_visual_identity.mood.join(", ")}

PALETTE:
${immersive_surreal.palette.join(", ")}

MATERIALS:
${immersive_surreal.materials.join(", ")}

LIGHTING:
${immersive_surreal.lighting.direction}.
Contrast: ${immersive_surreal.lighting.contrast}.

${buildFixedRulesPrompt("immersive_surreal")}
`.trim();
}

function generatePrompts() {
  if (!fs.existsSync(ART_DIRECTION_PATH)) {
    throw new Error(`No existe: ${ART_DIRECTION_PATH}`);
  }

  const artDirection = JSON.parse(
    fs.readFileSync(ART_DIRECTION_PATH, "utf8")
  );

  const prompts = {
    perfume: {
      name: artDirection.fragrance_data.name,
      gender: artDirection.fragrance_data.gender,
      bottle_reference: artDirection.hero_product.bottle_reference,
    },
    images: {
      editorial_still_life: {
        prompt: buildEditorialPrompt(artDirection),
      },
      immersive_surreal: {
        prompt: buildSurrealPrompt(artDirection),
      },
    },
  };

  fs.writeFileSync(
    OUTPUT_PATH,
    JSON.stringify(prompts, null, 2),
    "utf8"
  );

  console.log("✨ Prompts generados correctamente.");
  console.log(`📄 Guardados en: ${OUTPUT_PATH}`);
}

generatePrompts();