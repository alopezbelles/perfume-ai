import type { CampaignRules, ImageReferenceType } from "./types.ts";

export function getStyleReferenceInstructions(type: ImageReferenceType): string {
  if (type === "lifestyle") {
    return `
STYLE REFERENCE — EDITORIAL STILL LIFE

The SECOND input image is a STYLE REFERENCE for the
editorial still life.

Use it as a visual language reference, NOT as a composition
template.

The reference should guide:

- premium editorial quality
- rich and materially abundant still-life feeling
- ingredient quantity and grouping
- depth and layered composition
- realistic product scale relationships
- sophisticated lighting
- material richness
- tactile realism
- photographic sophistication
- overall campaign quality

DO NOT COPY from the reference:

- specific ingredients
- exact colors
- exact composition
- exact object placement
- exact bottle position
- exact bottle orientation
- specific perfume identity

The perfume's own art direction and olfactive notes determine
the ingredients, colors, atmosphere and final composition.

Create a NEW composition for this specific perfume while
maintaining the same visual language and campaign quality.

The result must feel like another photograph from the SAME
premium perfume campaign, not like a recreation of the
reference image.

The bottle remains the main visual protagonist.
`;
  }

  if (type === "surreal") {
    return `
STYLE REFERENCE — IMMERSIVE SURREAL

The SECOND input image is a STYLE REFERENCE for the
immersive surreal image.

Use it as a visual language reference, NOT as a composition
template.

The reference should guide:

- premium cinematic quality
- sophisticated surrealism
- bottle scale and visual importance
- suspended or floating product treatment
- quantity and controlled movement of visual elements
- rich local density and compact asymmetric ingredient clusters
- ingredient masses close to the bottle sides and behind its silhouette
- an organic enveloping structure with material continuity across the scene
- overlaps between ingredients and connections between depth layers
- nearby foreground masses partially cropped by the frame and softly defocused
- small irregular breathing areas between masses, without an empty bottle halo
- spatial depth
- layered composition
- cinematic lighting
- atmospheric richness
- dynamic visual energy
- extreme photorealism

DO NOT COPY from the reference:

- specific ingredients
- exact colors
- exact composition
- exact object placement
- exact bottle position
- exact bottle orientation
- specific perfume identity

The perfume's own art direction and olfactive notes determine
the ingredients, colors, atmosphere and visual story.

Create a NEW surreal composition for this specific perfume
while maintaining the same visual language and campaign quality.

The result must feel like another image from the SAME premium
perfume campaign, not like a recreation of the reference image.

The bottle remains the main visual protagonist.

Translate these spatial relationships into the perfume's own selected notes
and composition plan. Use contrast, lighting and focus to keep the fully
visible bottle legible within the enveloping scene. Nothing may obscure
the bottle, cap or label. Naturally curved branches, stems or pods may
frame it organically when supported by the notes; avoid artificial
geometric rings or crowns. Droplets, particles and loose petals remain
secondary accents to the main ingredient masses.
`;
  }

  return "";
}

export function getImageGenerationPrompt(prompt: string, referenceType: ImageReferenceType, campaignRules: CampaignRules): string {
  const styleReferenceInstructions =
    getStyleReferenceInstructions(referenceType);

  const surrealBottleTiltRule =
    referenceType === "surreal"
      ? `
SURREAL BOTTLE ORIENTATION:

- The perfume bottle must have a fixed, consistent lateral tilt.
- The TOP/CAP of the bottle must lean slightly to the LEFT.
- The BASE/BOTTOM of the bottle must lean slightly to the RIGHT.
- Maintain this exact tilt direction in every surreal image.
- Never mirror, reverse or alternate the tilt direction.
- Use a subtle 5–12 degree tilt from vertical.
- Do not interpret dynamic movement as permission to rotate the bottle in another direction.
- The tilt must remain elegant, controlled and physically believable.
- The bottle must never appear to be falling because of this tilt.
`
      : "";

  return `
${prompt}

${styleReferenceInstructions}

${surrealBottleTiltRule}

IMPORTANT PRODUCT REFERENCE:

The FIRST input image is the exact perfume bottle
that must appear in the final campaign image.

The SECOND input image is a STYLE REFERENCE.

The style reference must guide the visual language,
quality, richness, depth, lighting and photographic
treatment.

It must NOT replace, modify or determine the identity
of the perfume or its ingredients.

Use the supplied bottle image as the authoritative
visual reference for the product.

PRESERVE EXACTLY:

- bottle shape
- bottle proportions
- bottle dimensions
- cap design
- cap shape
- cap color
- label design
- label proportions
- label placement
- glass/material appearance
- overall product identity

The bottle must remain recognizable as the exact
same perfume bottle from the reference image.

Do NOT redesign the bottle.

Do NOT invent a different bottle.

Do NOT create additional perfume bottles.

Do NOT duplicate the bottle.

Do NOT distort the bottle.

Do NOT change the cap.

Do NOT change the label.

Do NOT cover the bottle.

The perfume bottle is the MAIN PROTAGONIST
of the composition.

PHYSICAL SCALE:

Bottle:
${campaignRules.physical_scale.bottle_height_cm} cm height
${campaignRules.physical_scale.bottle_width_cm} cm width
${campaignRules.physical_scale.bottle_depth_cm} cm depth

Use the bottle as the physical scale reference
for the entire scene.

Every surrounding ingredient and environmental
object must have realistic physical proportions
relative to the perfume bottle.

Do not create oversized fruits,
flowers, leaves or ingredients.

Do not create giant decorative objects.

Do not make ingredients visually larger
than would be physically plausible in the scene.

ABUNDANCE:

Create richness through:

- multiple units
- natural ingredient clusters
- generous quantities
- overlapping elements
- foreground / midground / background layering
- varied physical states
- tactile material richness

Never create abundance by artificially enlarging
ingredients.

IMAGE QUALITY:

Extreme photorealism.

Premium commercial perfume photography.

Realistic materials.

Realistic glass.

Realistic reflections.

Realistic shadows.

Realistic botanical textures.

Realistic physical proportions.

Realistic depth.

Realistic atmospheric effects.

No illustration.

No cartoon.

No obvious CGI.

No generic stock photography.

No people.

No hands.

No additional products.

No additional perfume bottles.

${campaignRules.format.orientation.toUpperCase()} ${campaignRules.format.aspect_ratio} COMPOSITION.
`;
}

// --------------------------------------------------
