import type { CampaignRules, PromptImageType, PromptSourceArtDirection } from "./types.ts";

function buildFixedRulesPrompt(imageType: PromptImageType, campaignRules: CampaignRules): string {
  const rules = campaignRules[imageType].rules;

  return `
FIXED CAMPAIGN RULES:
${rules.map((rule: string) => `- ${rule}`).join("\n")}

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

function buildProductRulesPrompt(campaignRules: CampaignRules): string {
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

export function buildEditorialPrompt(artDirection: PromptSourceArtDirection, campaignRules: CampaignRules): string {
  const { fragrance_data, hero_product, shared_visual_identity, editorial_still_life } = artDirection;

  return `
Create a premium editorial perfume campaign photograph for "${fragrance_data.name}".

MAIN PRODUCT:
Use the exact perfume bottle from the reference image:
${hero_product.bottle_reference}

${buildProductRulesPrompt(campaignRules)}

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

${buildFixedRulesPrompt("editorial_still_life", campaignRules)}
`.trim();
}

export function buildSurrealPrompt(artDirection: PromptSourceArtDirection, campaignRules: CampaignRules): string {
  const { fragrance_data, hero_product, olfactive_translation, shared_visual_identity, immersive_surreal } = artDirection;
  const { composition, movement } = immersive_surreal;
  const spatialPlan = [
    ["Enveloping structure", composition.enveloping_structure],
    ["Primary clusters", composition.primary_clusters?.join("; ")],
    ["Foreground plan", composition.foreground_plan],
    ["Midground plan", composition.midground_plan],
    ["Background plan", composition.background_plan],
    ["Overlap plan", composition.overlap_plan],
    ["Negative space plan", composition.negative_space_plan],
  ].filter(([, value]) => value !== undefined)
    .map(([label, value]) => `${label}: ${value}`).join("\n");
  const selectedNotes = olfactive_translation.selected_visual_notes.map((note) => [
    `Note: ${note.note}`,
    `Olfactive role: ${note.olfactive_role}`,
    `Visual representation: ${note.visual_representation}`,
    ...(note.quantity === undefined ? [] : [`Quantity: ${note.quantity}`]),
    ...(note.physical_presence === undefined ? [] : [`Physical presence: ${note.physical_presence}`]),
    ...(note.composition_role === undefined ? [] : [`Composition role: ${note.composition_role}`]),
    `Selection reason: ${note.reason}`,
    `Surreal use: ${note.surreal_use}`,
  ].join("\n")).join("\n\n");

  return `
Create a premium cinematic surreal perfume campaign photograph for "${fragrance_data.name}".

MAIN PRODUCT:
Use the exact perfume bottle from the reference image:
${hero_product.bottle_reference}

${buildProductRulesPrompt(campaignRules)}

SCENE:
${immersive_surreal.concept}

ENVIRONMENT:
${immersive_surreal.environment.description}

COMPOSITION AND SPATIAL PLAN:
Style: ${composition.style}
Element density: ${composition.element_density}
Depth: ${composition.depth}
Bottle priority: ${composition.bottle_priority}
Negative space: ${composition.negative_space}
${spatialPlan}

MOVEMENT:
Enabled: ${movement.enabled}
Types: ${movement.types.join(", ")}
Intensity: ${movement.intensity}

SELECTED OLFACTIVE NOTES — SURREAL TREATMENT:
${selectedNotes}

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

${buildFixedRulesPrompt("immersive_surreal", campaignRules)}
`.trim();
}
